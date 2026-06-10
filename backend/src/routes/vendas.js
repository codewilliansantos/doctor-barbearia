const express = require('express');
const pool    = require('../database/connection');
const { autenticar } = require('./auth');
const { campo, validar } = require('../validators');

const router = express.Router();

function soGestor(req, res, next) {
  if (!req.usuario || req.usuario.perfil !== 'gestor')
    return res.status(403).json({ ok: false, erro: 'Acesso restrito a gestores.' });
  next();
}

/* POST /gestor/vendas — registra venda de produtos
 * body: { cliente_id, barbeiro_id, agendamento_id?, itens: [{produto_id, quantidade}], desconto, forma_pagamento, observacoes }
 */
router.post('/', autenticar, soGestor, validar([
  campo('itens').presente().array({ min: 1, max: 100 }),
  campo('cliente_id').opcional().inteiro({ min: 1 }),
  campo('barbeiro_id').opcional().inteiro({ min: 1 }),
  campo('agendamento_id').opcional().inteiro({ min: 1 }),
  campo('desconto').opcional().numero({ min: 0, max: 999999.99 }),
  campo('forma_pagamento').opcional().texto({ max: 30 }),
  campo('observacoes').opcional().texto({ max: 500 }),
]), async (req, res) => {
  const { cliente_id, barbeiro_id, agendamento_id, itens, desconto, forma_pagamento, observacoes } = req.body;
  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ ok: false, erro: 'Adicione pelo menos um item à venda.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Valida produtos e calcula total
    let total = 0;
    const itensValidados = [];
    for (const it of itens) {
      if (!it.produto_id || !it.quantidade || it.quantidade <= 0)
        throw new Error('Item inválido.');
      const p = await client.query(
        `SELECT id, nome, preco, estoque, ativo FROM produtos WHERE id = $1 AND tenant_id = $2`,
        [it.produto_id, req.tenantId]
      );
      if (!p.rows[0]) throw new Error(`Produto ${it.produto_id} não encontrado.`);
      if (!p.rows[0].ativo) throw new Error(`Produto "${p.rows[0].nome}" está desativado.`);
      if (p.rows[0].estoque != null && p.rows[0].estoque < it.quantidade) {
        throw new Error(`Estoque insuficiente para "${p.rows[0].nome}" (disponível: ${p.rows[0].estoque}).`);
      }
      const subtotal = Number(p.rows[0].preco) * Number(it.quantidade);
      total += subtotal;
      itensValidados.push({ ...it, preco_unit: p.rows[0].preco, subtotal, nome: p.rows[0].nome });
    }

    const descontoNum = Number(desconto) || 0;
    if (descontoNum < 0 || descontoNum > total) throw new Error('Desconto inválido.');
    const totalFinal = total - descontoNum;

    // Cria venda
    const v = await client.query(`
      INSERT INTO vendas (cliente_id, barbeiro_id, agendamento_id, total, desconto, forma_pagamento, observacoes, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [cliente_id || null, barbeiro_id || null, agendamento_id || null, totalFinal, descontoNum, forma_pagamento || 'dinheiro', observacoes || null, req.tenantId]);
    const vendaId = v.rows[0].id;

    // Insere itens (trigger decrementa estoque)
    for (const it of itensValidados) {
      await client.query(`
        INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unit, subtotal, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [vendaId, it.produto_id, it.quantidade, it.preco_unit, it.subtotal, req.tenantId]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      ok: true,
      data: { ...v.rows[0], itens: itensValidados },
      mensagem: `Venda registrada! Total: R$ ${totalFinal.toFixed(2)}`,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ ok: false, erro: e.message });
  } finally {
    client.release();
  }
});

/* GET /gestor/vendas — lista vendas (com filtros) */
router.get('/', autenticar, soGestor, async (req, res) => {
  const { periodo, cliente_id, barbeiro_id, limit } = req.query;
  const params = [req.tenantId];
  const conds = ['v.tenant_id = $1'];
  if (periodo) {
    params.push(`${periodo} days`);
    conds.push(`v.criado_em >= NOW() - $${params.length}::interval`);
  }
  if (cliente_id) { params.push(cliente_id); conds.push(`v.cliente_id = $${params.length}`); }
  if (barbeiro_id) { params.push(barbeiro_id); conds.push(`v.barbeiro_id = $${params.length}`); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const lim = Math.min(Number(limit) || 100, 500);

  try {
    const { rows } = await pool.query(`
      SELECT v.id, v.cliente_id, v.barbeiro_id, v.agendamento_id,
             v.total, v.desconto, v.forma_pagamento, v.observacoes, v.criado_em,
             c.nome AS cliente_nome, c.whatsapp,
             b.nome AS barbeiro_nome,
             COALESCE(
               (SELECT json_agg(json_build_object(
                  'id', vi.id, 'produto_id', vi.produto_id, 'nome', p.nome,
                  'quantidade', vi.quantidade, 'preco_unit', vi.preco_unit, 'subtotal', vi.subtotal
                ) ORDER BY vi.id)
                FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id
                WHERE vi.venda_id = v.id AND vi.tenant_id = v.tenant_id),
               '[]'::json
             ) AS itens
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN barbeiros b ON b.id = v.barbeiro_id
      ${where}
      ORDER BY v.criado_em DESC
      LIMIT ${lim}
    `, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* GET /gestor/vendas/resumo — KPIs de vendas de produtos */
router.get('/resumo', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_vendas,
        COALESCE(SUM(total), 0) AS faturamento_total,
        COALESCE(SUM(total) FILTER (WHERE criado_em >= date_trunc('month', NOW())), 0) AS faturamento_mes,
        COUNT(*) FILTER (WHERE criado_em >= date_trunc('month', NOW()))::int AS vendas_mes,
        COUNT(DISTINCT cliente_id) FILTER (WHERE criado_em >= date_trunc('month', NOW()))::int AS clientes_mes,
        COALESCE(AVG(total), 0) AS ticket_medio
      FROM vendas
      WHERE tenant_id = $1
    `, [req.tenantId]);
    // Top produtos vendidos no mês
    const top = await pool.query(`
      SELECT p.nome, SUM(vi.quantidade)::int AS qtd, SUM(vi.subtotal) AS receita
      FROM venda_itens vi
      JOIN vendas v ON v.id = vi.venda_id
      JOIN produtos p ON p.id = vi.produto_id
      WHERE v.criado_em >= date_trunc('month', NOW())
        AND v.tenant_id = $1
      GROUP BY p.nome
      ORDER BY receita DESC
      LIMIT 5
    `, [req.tenantId]);
    res.json({ ok: true, data: { ...rows[0], top_produtos: top.rows } });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* DELETE /gestor/vendas/:id — cancela venda (estorna estoque) */
router.delete('/:id', autenticar, soGestor, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const v = await client.query(`SELECT id FROM vendas WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, [req.params.id, req.tenantId]);
    if (!v.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, erro: 'Venda não encontrada.' });
    }
    // Estorna estoque manualmente
    await client.query(`
      UPDATE produtos p SET
        estoque = CASE WHEN p.estoque IS NULL THEN NULL ELSE p.estoque + vi.quantidade END,
        atualizado_em = NOW()
      FROM venda_itens vi
      WHERE vi.venda_id = $1 AND vi.produto_id = p.id AND vi.tenant_id = $2
    `, [req.params.id, req.tenantId]);
    // Deleta itens e venda
    await client.query(`DELETE FROM venda_itens WHERE venda_id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    await client.query(`DELETE FROM vendas WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    await client.query('COMMIT');
    res.json({ ok: true, mensagem: 'Venda cancelada e estoque estornado.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
