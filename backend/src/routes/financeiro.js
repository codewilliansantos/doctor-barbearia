const express = require('express');
const pool    = require('../database/connection');
const { autenticar } = require('./auth');
const { campo, validar } = require('../validators');
const router  = express.Router();

function soGestor(req, res, next) {
  if (req.usuario.perfil !== 'gestor') return res.status(403).json({ ok: false, erro: 'Acesso restrito a gestores.' });
  next();
}

/* ──────────────────── CAIXA ──────────────────── */

/* GET /gestor/caixa/atual — caixa aberto agora */
router.get('/caixa/atual', autenticar, soGestor, async (req, res) => {
  try {
    const cx = await pool.query(`SELECT * FROM caixa_sessoes WHERE status = 'aberto' AND tenant_id = $1 ORDER BY data_abertura DESC LIMIT 1`, [req.tenantId]);
    if (cx.rows.length === 0) return res.json({ ok: true, caixa: null });

    const movs = await pool.query(`
      SELECT m.*, c.nome AS cliente_nome
      FROM caixa_movimentacoes m
      LEFT JOIN agendamentos a ON a.id = m.agendamento_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      WHERE m.caixa_id = $1 AND m.tenant_id = $2
      ORDER BY m.criado_em DESC
    `, [cx.rows[0].id, req.tenantId]);

    // Calcula saldo
    const totaisQ = await pool.query(`
      SELECT
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0) AS entradas,
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0)   AS saidas
      FROM caixa_movimentacoes WHERE caixa_id = $1 AND tenant_id = $2
    `, [cx.rows[0].id, req.tenantId]);
    const totais = totaisQ.rows[0];
    const saldo = Number(cx.rows[0].saldo_inicial) + Number(totais.entradas) - Number(totais.saidas);

    res.json({
      ok: true,
      caixa: cx.rows[0],
      saldo_atual: saldo,
      totais: { entradas: Number(totais.entradas), saidas: Number(totais.saidas) },
      movimentacoes: movs.rows,
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* POST /gestor/caixa/abrir */
router.post('/caixa/abrir', autenticar, soGestor, validar([
  campo('saldo_inicial').opcional().numero({ min: 0, max: 999999.99 }),
  campo('observacoes').opcional().texto({ max: 500 }),
]), async (req, res) => {
  const { saldo_inicial, observacoes } = req.body;
  try {
    // Fecha qualquer caixa aberto do tenant
    await pool.query(`UPDATE caixa_sessoes SET status = 'fechado', data_fechamento = NOW() WHERE status = 'aberto' AND tenant_id = $1`, [req.tenantId]);

    const { rows } = await pool.query(`
      INSERT INTO caixa_sessoes (usuario_id, saldo_inicial, observacoes, tenant_id)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [req.usuario.id, Number(saldo_inicial) || 0, observacoes || null, req.tenantId]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* POST /gestor/caixa/fechar */
router.post('/caixa/fechar', autenticar, soGestor, validar([
  campo('observacoes').opcional().texto({ max: 500 }),
]), async (req, res) => {
  const { observacoes } = req.body;
  try {
    const cx = await pool.query(`SELECT id FROM caixa_sessoes WHERE status = 'aberto' AND tenant_id = $1`, [req.tenantId]);
    if (cx.rows.length === 0) return res.status(400).json({ ok: false, erro: 'Nenhum caixa aberto.' });

    const caixaId = cx.rows[0].id;
    const totais = await pool.query(`
      SELECT
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0) AS entradas,
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0)   AS saidas
      FROM caixa_movimentacoes WHERE caixa_id = $1 AND tenant_id = $2
    `, [caixaId, req.tenantId]);
    const { rows: caixaRow } = await pool.query(`SELECT saldo_inicial FROM caixa_sessoes WHERE id = $1 AND tenant_id = $2`, [caixaId, req.tenantId]);
    const saldoFinal = Number(caixaRow[0].saldo_inicial) + Number(totais.rows[0].entradas) - Number(totais.rows[0].saidas);

    await pool.query(`
      UPDATE caixa_sessoes SET status = 'fechado', data_fechamento = NOW(), saldo_final = $1, observacoes = COALESCE($2, observacoes)
      WHERE id = $3 AND tenant_id = $4
    `, [saldoFinal, observacoes, caixaId, req.tenantId]);

    res.json({ ok: true, mensagem: 'Caixa fechado.', saldo_final: saldoFinal });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* POST /gestor/caixa/movimentacao */
router.post('/caixa/movimentacao', autenticar, soGestor, validar([
  campo('tipo').presente().enum(['entrada', 'saida']),
  campo('categoria').opcional().texto({ max: 60 }),
  campo('descricao').opcional().texto({ max: 200 }),
  campo('valor').presente().numero({ min: 0.01, max: 999999.99 }),
  campo('forma_pagamento').opcional().texto({ max: 30 }),
  campo('agendamento_id').opcional().inteiro({ min: 1 }),
  campo('conta_pagar_id').opcional().inteiro({ min: 1 }),
  campo('conta_receber_id').opcional().inteiro({ min: 1 }),
]), async (req, res) => {
  const { tipo, categoria, descricao, valor, forma_pagamento, agendamento_id, conta_pagar_id, conta_receber_id } = req.body;

  try {
    const cx = await pool.query(`SELECT id FROM caixa_sessoes WHERE status = 'aberto' AND tenant_id = $1`, [req.tenantId]);
    if (cx.rows.length === 0) return res.status(400).json({ ok: false, erro: 'Abra o caixa antes de movimentar.' });

    const { rows } = await pool.query(`
      INSERT INTO caixa_movimentacoes (caixa_id, tipo, categoria, descricao, valor, forma_pagamento, agendamento_id, conta_pagar_id, conta_receber_id, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `, [cx.rows[0].id, tipo, categoria || null, descricao || null, Number(valor), forma_pagamento || null,
        agendamento_id || null, conta_pagar_id || null, conta_receber_id || null, req.tenantId]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* GET /gestor/caixa/historico */
router.get('/caixa/historico', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, u.nome AS usuario_nome,
             (SELECT COALESCE(SUM(valor), 0) FROM caixa_movimentacoes WHERE caixa_id = c.id AND tenant_id = c.tenant_id AND tipo = 'entrada') AS total_entradas,
             (SELECT COALESCE(SUM(valor), 0) FROM caixa_movimentacoes WHERE caixa_id = c.id AND tenant_id = c.tenant_id AND tipo = 'saida')   AS total_saidas
      FROM caixa_sessoes c
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.tenant_id = $1
      ORDER BY c.data_abertura DESC
      LIMIT 30
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* ──────────────────── CONTAS A PAGAR ──────────────────── */

router.get('/contas-pagar', autenticar, soGestor, async (req, res) => {
  const { status } = req.query;
  try {
    let where = 'WHERE tenant_id = $1';
    const params = [req.tenantId];
    if (status) { where += ' AND status = $2'; params.push(status); }
    const { rows } = await pool.query(`
      SELECT *,
             CASE
               WHEN status = 'pago' THEN 0
               WHEN data_vencimento < CURRENT_DATE THEN data_vencimento - CURRENT_DATE
               ELSE 0
             END AS dias_atraso
      FROM contas_pagar ${where}
      ORDER BY
        CASE status WHEN 'pendente' THEN 1 WHEN 'atrasado' THEN 0 ELSE 2 END,
        data_vencimento
    `, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/contas-pagar', autenticar, soGestor, validar([
  campo('descricao').presente().texto({ min: 1, max: 200 }),
  campo('fornecedor').opcional().texto({ max: 120 }),
  campo('categoria').opcional().texto({ max: 40 }),
  campo('valor').presente().numero({ min: 0.01, max: 999999.99 }),
  campo('data_vencimento').presente().data(),
  campo('observacoes').opcional().texto({ max: 500 }),
]), async (req, res) => {
  const { descricao, fornecedor, categoria, valor, data_vencimento, observacoes } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO contas_pagar (descricao, fornecedor, categoria, valor, data_vencimento, observacoes, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [descricao, fornecedor || null, categoria || null, Number(valor), data_vencimento, observacoes || null, req.tenantId]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.put('/contas-pagar/:id', autenticar, soGestor, async (req, res) => {
  const { descricao, fornecedor, categoria, valor, data_vencimento, observacoes } = req.body;
  try {
    await pool.query(`
      UPDATE contas_pagar SET
        descricao = COALESCE($1, descricao), fornecedor = COALESCE($2, fornecedor),
        categoria = COALESCE($3, categoria), valor = COALESCE($4, valor),
        data_vencimento = COALESCE($5, data_vencimento), observacoes = COALESCE($6, observacoes)
      WHERE id = $7 AND tenant_id = $8
    `, [descricao, fornecedor, categoria, valor ? Number(valor) : null, data_vencimento, observacoes, req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/contas-pagar/:id/pagar', autenticar, soGestor, validar([
  campo('forma_pagamento').opcional().texto({ max: 30 }),
  campo('data_pagamento').opcional().data(),
]), async (req, res) => {
  const { forma_pagamento, data_pagamento, conta_pagar_id_externo } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cp = await client.query('SELECT * FROM contas_pagar WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId]);
    if (cp.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, erro: 'Conta não encontrada.' }); }
    if (cp.rows[0].status === 'pago') { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, erro: 'Já está paga.' }); }

    await client.query(`
      UPDATE contas_pagar SET status = 'pago', data_pagamento = COALESCE($1, CURRENT_DATE), forma_pagamento = $2
      WHERE id = $3 AND tenant_id = $4
    `, [data_pagamento || null, forma_pagamento || 'dinheiro', req.params.id, req.tenantId]);

    // Lança saída no caixa
    const cx = await client.query(`SELECT id FROM caixa_sessoes WHERE status = 'aberto' AND tenant_id = $1`, [req.tenantId]);
    if (cx.rows.length > 0) {
      await client.query(`
        INSERT INTO caixa_movimentacoes (caixa_id, tipo, categoria, descricao, valor, forma_pagamento, conta_pagar_id, tenant_id)
        VALUES ($1, 'saida', 'conta_pagar', $2, $3, $4, $5, $6)
      `, [cx.rows[0].id, cp.rows[0].descricao, cp.rows[0].valor, forma_pagamento || 'dinheiro', req.params.id, req.tenantId]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, mensagem: 'Conta paga e saída lançada no caixa.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

router.delete('/contas-pagar/:id', autenticar, soGestor, async (req, res) => {
  try {
    await pool.query('DELETE FROM contas_pagar WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* ──────────────────── CONTAS A RECEBER ──────────────────── */

router.get('/contas-receber', autenticar, soGestor, async (req, res) => {
  const { status } = req.query;
  try {
    let where = 'WHERE cr.tenant_id = $1';
    const params = [req.tenantId];
    if (status) { where += ' AND cr.status = $2'; params.push(status); }
    const { rows } = await pool.query(`
      SELECT cr.*, c.nome AS cliente_nome,
             CASE
               WHEN cr.status = 'recebido' THEN 0
               WHEN cr.data_vencimento < CURRENT_DATE THEN cr.data_vencimento - CURRENT_DATE
               ELSE 0
             END AS dias_atraso
      FROM contas_receber cr
      LEFT JOIN clientes c ON c.id = cr.cliente_id
      ${where}
      ORDER BY
        CASE cr.status WHEN 'pendente' THEN 1 WHEN 'atrasado' THEN 0 ELSE 2 END,
        cr.data_vencimento
    `, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/contas-receber', autenticar, soGestor, validar([
  campo('descricao').presente().texto({ min: 1, max: 200 }),
  campo('cliente_id').opcional().inteiro({ min: 1 }),
  campo('valor').presente().numero({ min: 0.01, max: 999999.99 }),
  campo('data_vencimento').presente().data(),
  campo('observacoes').opcional().texto({ max: 500 }),
]), async (req, res) => {
  const { descricao, cliente_id, valor, data_vencimento, observacoes } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO contas_receber (descricao, cliente_id, valor, data_vencimento, observacoes, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [descricao, cliente_id || null, Number(valor), data_vencimento, observacoes || null, req.tenantId]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/contas-receber/:id/receber', autenticar, soGestor, validar([
  campo('forma_pagamento').opcional().texto({ max: 30 }),
  campo('data_recebimento').opcional().data(),
]), async (req, res) => {
  const { forma_pagamento, data_recebimento } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cr = await client.query('SELECT * FROM contas_receber WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId]);
    if (cr.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, erro: 'Conta não encontrada.' }); }
    if (cr.rows[0].status === 'recebido') { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, erro: 'Já foi recebida.' }); }

    await client.query(`
      UPDATE contas_receber SET status = 'recebido', data_recebimento = COALESCE($1, CURRENT_DATE), forma_pagamento = $2
      WHERE id = $3 AND tenant_id = $4
    `, [data_recebimento || null, forma_pagamento || 'dinheiro', req.params.id, req.tenantId]);

    const cx = await client.query(`SELECT id FROM caixa_sessoes WHERE status = 'aberto' AND tenant_id = $1`, [req.tenantId]);
    if (cx.rows.length > 0) {
      await client.query(`
        INSERT INTO caixa_movimentacoes (caixa_id, tipo, categoria, descricao, valor, forma_pagamento, conta_receber_id, tenant_id)
        VALUES ($1, 'entrada', 'conta_receber', $2, $3, $4, $5, $6)
      `, [cx.rows[0].id, cr.rows[0].descricao, cr.rows[0].valor, forma_pagamento || 'dinheiro', req.params.id, req.tenantId]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, mensagem: 'Recebimento lançado no caixa.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

router.delete('/contas-receber/:id', autenticar, soGestor, async (req, res) => {
  try {
    await pool.query('DELETE FROM contas_receber WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* GET /gestor/financeiro/movimentos — movimentos detalhados dos últimos 30 dias */
router.get('/financeiro/movimentos', autenticar, soGestor, async (req, res) => {
  const { tipo } = req.query;
  try {
    let where = `m.tenant_id = $1 AND s.data_abertura >= NOW() - INTERVAL '30 days'`;
    const params = [req.tenantId];
    if (tipo === 'entrada' || tipo === 'saida') {
      params.push(tipo);
      where += ` AND m.tipo = $2`;
    }
    const { rows } = await pool.query(`
      SELECT m.*, c.nome AS cliente_nome,
             TO_CHAR(m.criado_em, 'DD/MM/YYYY HH24:MI') AS data_fmt
      FROM caixa_movimentacoes m
      JOIN caixa_sessoes s ON s.id = m.caixa_id
      LEFT JOIN agendamentos a ON a.id = m.agendamento_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      WHERE ${where}
      ORDER BY m.criado_em DESC
      LIMIT 200
    `, params);
    const total = rows.reduce((acc, r) => acc + Number(r.valor), 0);
    res.json({ ok: true, data: rows, total });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* ──────────────────── RESUMO FINANCEIRO ──────────────────── */

router.get('/financeiro/resumo', autenticar, soGestor, async (req, res) => {
  try {
    const [entradasMes, saidasMes, aPagar, aReceber, cxAberto] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(m.valor), 0) AS total
        FROM caixa_movimentacoes m
        JOIN caixa_sessoes s ON s.id = m.caixa_id
        WHERE m.tipo = 'entrada' AND s.data_abertura >= NOW() - INTERVAL '30 days'
          AND m.tenant_id = $1
      `, [req.tenantId]),
      pool.query(`
        SELECT COALESCE(SUM(m.valor), 0) AS total
        FROM caixa_movimentacoes m
        JOIN caixa_sessoes s ON s.id = m.caixa_id
        WHERE m.tipo = 'saida' AND s.data_abertura >= NOW() - INTERVAL '30 days'
          AND m.tenant_id = $1
      `, [req.tenantId]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pendente') AS pendentes,
          COUNT(*) FILTER (WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE) AS atrasadas,
          COALESCE(SUM(valor) FILTER (WHERE status = 'pendente'), 0) AS valor_total
        FROM contas_pagar
        WHERE tenant_id = $1
      `, [req.tenantId]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pendente') AS pendentes,
          COUNT(*) FILTER (WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE) AS atrasadas,
          COALESCE(SUM(valor) FILTER (WHERE status = 'pendente'), 0) AS valor_total
        FROM contas_receber
        WHERE tenant_id = $1
      `, [req.tenantId]),
      pool.query(`
        SELECT
          COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'entrada'), 0) AS entradas,
          COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'saida'), 0) AS saidas
        FROM caixa_movimentacoes m
        JOIN caixa_sessoes s ON s.id = m.caixa_id
        WHERE s.status = 'aberto' AND m.tenant_id = $1
      `, [req.tenantId]),
    ]);

    res.json({
      ok: true,
      mes: {
        entradas: Number(entradasMes.rows[0].total),
        saidas: Number(saidasMes.rows[0].total),
        lucro: Number(entradasMes.rows[0].total) - Number(saidasMes.rows[0].total),
      },
      a_pagar: aPagar.rows[0],
      a_receber: aReceber.rows[0],
      caixa_atual: {
        entradas: Number(cxAberto.rows[0].entradas),
        saidas: Number(cxAberto.rows[0].saidas),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
