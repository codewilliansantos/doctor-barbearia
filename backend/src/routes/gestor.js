const express = require('express');
const pool    = require('../database/connection');
const { autenticar } = require('./auth');
const { testarToken } = require('../services/pagseg');
const financeiroRouter = require('./financeiro');
const router  = express.Router();

/* Middleware: sÃ³ gestores */
function soGestor(req, res, next) {
  if (req.usuario.perfil !== 'gestor')
    return res.status(403).json({ ok: false, erro: 'Acesso restrito a gestores.' });
  next();
}

/* GET /gestor/dashboard â€” resumo do dia */
router.get('/dashboard', autenticar, soGestor, async (req, res) => {
  try {
    const hoje = req.query.date || new Date().toISOString().slice(0, 10);
    console.log("ðŸ“… DASHBOARD date recebida:", req.query.date, "| usando:", hoje, "| tenant:", req.tenantId);

    const [agenda, totais, clientes, alerta] = await Promise.all([
      pool.query(`
        SELECT a.id, a.data_hora, a.status,
               TO_CHAR(a.data_hora, 'HH24:MI') AS hora,
               c.nome AS cliente, c.whatsapp,
               s.nome AS servico, s.emoji, s.preco,
               b.nome AS barbeiro
        FROM agendamentos a
        JOIN clientes  c ON c.id = a.cliente_id
        JOIN servicos  s ON s.id = a.servico_id
        JOIN barbeiros b ON b.id = a.barbeiro_id
        WHERE DATE(a.data_hora) = $1 AND a.status = 'confirmado' AND a.tenant_id = $2
        ORDER BY a.data_hora
      `, [hoje, req.tenantId]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE DATE(a.data_hora) = $1 AND a.status = 'confirmado' AND a.tenant_id = $2) AS hoje,
          COUNT(*) FILTER (WHERE DATE(a.data_hora) = $1 AND a.status = 'concluido' AND a.tenant_id = $2) AS concluidos,
          COALESCE(SUM(s.preco) FILTER (WHERE DATE(a.data_hora) = $1 AND a.status = 'concluido' AND a.tenant_id = $2), 0) AS faturamento_hoje
        FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
      `, [hoje, req.tenantId]),
      pool.query('SELECT COUNT(*) AS total FROM clientes WHERE tenant_id = $1', [req.tenantId]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE ativo = TRUE AND estoque IS NOT NULL AND estoque <= 5 AND tenant_id = $1) AS baixo,
          COUNT(*) FILTER (WHERE ativo = TRUE AND estoque IS NOT NULL AND estoque = 0 AND tenant_id = $1) AS esgotado
        FROM produtos
      `, [req.tenantId]),
    ]);

    console.log("ðŸ“… DASHBOARD resposta: agenda tem", agenda.rows.length, "itens");

    res.json({
      ok: true,
      date_used: hoje,
      agenda: agenda.rows,
      stats: totais.rows[0],
      total_clientes: Number(clientes.rows[0].total),
      alerta_estoque: {
        baixo: Number(alerta.rows?.[0]?.baixo || 0),
        esgotado: Number(alerta.rows?.[0]?.esgotado || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* GET /gestor/clientes â€” base de clientes */
router.get('/clientes', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.nome, c.whatsapp, c.data_nascimento,
             COUNT(a.id) AS total_agendamentos,
             COALESCE(SUM(s.preco) FILTER (WHERE a.status = 'concluido'), 0) AS total_gasto
      FROM clientes c
      LEFT JOIN agendamentos a ON a.cliente_id = c.id
      LEFT JOIN servicos s ON s.id = a.servico_id
      WHERE c.tenant_id = $1
      GROUP BY c.id, c.nome, c.whatsapp, c.data_nascimento ORDER BY c.nome
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* PATCH /gestor/agendamentos/:id/concluir */
router.patch('/agendamentos/:id/concluir', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE agendamentos SET status = 'concluido' WHERE id = $1 AND status = 'confirmado' AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenantId]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, erro: 'Agendamento nÃ£o encontrado ou jÃ¡ concluÃ­do.' });
    res.json({ ok: true, mensagem: 'Agendamento concluÃ­do!', data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* PUT /gestor/configuracoes/pagseguro â€” salva token PagSeguro */
router.put('/configuracoes/pagseguro', autenticar, soGestor, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ ok: false, erro: 'Informe o token.' });

  try {
    const teste = await testarToken(token);
    if (!teste.ok) return res.status(400).json({ ok: false, erro: teste.erro || 'Token invÃ¡lido.' });

    await pool.query(
      `UPDATE configuracoes SET pagseguro_token = $1, pagseguro_ativo = TRUE, atualizado_em = NOW() WHERE id = 1`,
      [token]
    );

    res.json({ ok: true, mensagem: 'Token PagSeguro salvo e ativado com sucesso!' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* DELETE /gestor/configuracoes/pagseguro â€” remove token */
router.delete('/configuracoes/pagseguro', autenticar, soGestor, async (req, res) => {
  try {
    await pool.query(
      `UPDATE configuracoes SET pagseguro_token = NULL, pagseguro_ativo = FALSE, atualizado_em = NOW() WHERE id = 1`
    );
    res.json({ ok: true, mensagem: 'Token removido. Pagamentos voltaram ao modo simulado.' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* POST /gestor/configuracoes/pagseguro/testar â€” testa token sem salvar */
router.post('/configuracoes/pagseguro/testar', autenticar, soGestor, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ ok: false, erro: 'Informe o token.' });

  const resultado = await testarToken(token);
  res.json(resultado);
});

/* GET /gestor/configuracoes/lembretes â€” lÃª configs de lembretes */
router.get('/configuracoes/lembretes', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT lembrete_24h_ativo, lembrete_1h_ativo, msg_retorno_ativo, msg_retorno_dias
      FROM configuracoes WHERE id = 1
    `);
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* PUT /gestor/configuracoes/lembretes â€” atualiza configs */
router.put('/configuracoes/lembretes', autenticar, soGestor, async (req, res) => {
  const { lembrete_24h_ativo, lembrete_1h_ativo, msg_retorno_ativo, msg_retorno_dias } = req.body;
  try {
    await pool.query(`
      UPDATE configuracoes SET
        lembrete_24h_ativo = COALESCE($1, lembrete_24h_ativo),
        lembrete_1h_ativo  = COALESCE($2, lembrete_1h_ativo),
        msg_retorno_ativo  = COALESCE($3, msg_retorno_ativo),
        msg_retorno_dias   = COALESCE($4, msg_retorno_dias),
        atualizado_em = NOW()
      WHERE id = 1
    `, [
      lembrete_24h_ativo ?? null,
      lembrete_1h_ativo  ?? null,
      msg_retorno_ativo  ?? null,
      msg_retorno_dias != null ? Number(msg_retorno_dias) : null,
    ]);
    res.json({ ok: true, mensagem: 'ConfiguraÃ§Ãµes de lembretes atualizadas.' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* â”€â”€ JORNADAS â”€â”€ */

/* GET /gestor/jornadas */
router.get('/jornadas', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.id, j.barbeiro_id, b.nome AS barbeiro_nome,
             j.dia_semana, j.hora_inicio, j.hora_fim, j.ativo
      FROM jornadas j
      JOIN barbeiros b ON b.id = j.barbeiro_id
      WHERE j.tenant_id = $1 AND b.tenant_id = $1
      ORDER BY b.nome, j.dia_semana
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* PUT /gestor/jornadas/:barbeiro_id */
router.put('/jornadas/:barbeiro_id', autenticar, soGestor, async (req, res) => {
  const { barbeiro_id } = req.params;
  const { jornadas } = req.body;
  if (!Array.isArray(jornadas)) return res.status(400).json({ ok: false, erro: 'jornadas deve ser um array.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Verifica que o barbeiro pertence ao tenant
    const b = await client.query('SELECT id FROM barbeiros WHERE id = $1 AND tenant_id = $2', [barbeiro_id, req.tenantId]);
    if (b.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, erro: 'Barbeiro nÃ£o encontrado.' });
    }
    await client.query('DELETE FROM jornadas WHERE barbeiro_id = $1 AND tenant_id = $2', [barbeiro_id, req.tenantId]);
    for (const j of jornadas) {
      if (j.ativo && j.hora_inicio && j.hora_fim) {
        await client.query(`
          INSERT INTO jornadas (barbeiro_id, dia_semana, hora_inicio, hora_fim, ativo, tenant_id)
          VALUES ($1, $2, $3, $4, TRUE, $5)
        `, [barbeiro_id, j.dia_semana, j.hora_inicio, j.hora_fim, req.tenantId]);
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true, mensagem: 'Jornadas atualizadas.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

/* POST /gestor/encaixes */
router.post('/encaixes', autenticar, soGestor, async (req, res) => {
  const { barbeiro_id, data, hora_inicio, hora_fim, motivo } = req.body;
  if (!barbeiro_id || !data || !hora_inicio || !hora_fim)
    return res.status(400).json({ ok: false, erro: 'Campos obrigatÃ³rios: barbeiro_id, data, hora_inicio, hora_fim.' });
  try {
    const { rows } = await pool.query(`
      INSERT INTO encaixes (barbeiro_id, data, hora_inicio, hora_fim, motivo, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [barbeiro_id, data, hora_inicio, hora_fim, motivo || null, req.tenantId]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* DELETE /gestor/encaixes/:id */
router.delete('/encaixes/:id', autenticar, soGestor, async (req, res) => {
  try {
    await pool.query('DELETE FROM encaixes WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* GET /gestor/encaixes */
router.get('/encaixes', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.id, e.barbeiro_id, b.nome AS barbeiro_nome,
             e.data, e.hora_inicio, e.hora_fim, e.motivo
      FROM encaixes e
      JOIN barbeiros b ON b.id = e.barbeiro_id
      WHERE e.data >= CURRENT_DATE
        AND e.tenant_id = $1 AND b.tenant_id = $1
      ORDER BY e.data, e.hora_inicio
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* â”€â”€ LISTA DE ESPERA â”€â”€ */
router.get('/lista-espera', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.id, l.cliente_id, c.nome AS cliente_nome, c.whatsapp,
             l.servico_id, s.nome AS servico_nome,
             l.barbeiro_id, b.nome AS barbeiro_nome,
             l.data_desejada, l.periodo, l.status, l.criado_em
      FROM lista_espera l
      JOIN clientes c ON c.id = l.cliente_id
      LEFT JOIN servicos s ON s.id = l.servico_id
      LEFT JOIN barbeiros b ON b.id = l.barbeiro_id
      WHERE l.tenant_id = $1
      ORDER BY l.criado_em DESC
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.delete('/lista-espera/:id', autenticar, soGestor, async (req, res) => {
  try {
    await pool.query('DELETE FROM lista_espera WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* â”€â”€ ANIVERSARIANTES â”€â”€ */
router.get('/aniversariantes', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nome, whatsapp, data_nascimento,
             TO_CHAR(data_nascimento, 'DD/MM') AS dia_mes,
             EXTRACT(DAY FROM data_nascimento) AS dia,
             EXTRACT(MONTH FROM data_nascimento) AS mes
      FROM clientes
      WHERE data_nascimento IS NOT NULL
        AND tenant_id = $1
      ORDER BY mes, dia
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.put('/clientes/:id/nascimento', autenticar, soGestor, async (req, res) => {
  const { data_nascimento } = req.body;
  if (!data_nascimento) return res.status(400).json({ ok: false, erro: 'Informe a data.' });
  try {
    const { rows } = await pool.query(`
      UPDATE clientes SET data_nascimento = $1 WHERE id = $2 AND tenant_id = $3
      RETURNING id, nome, whatsapp, data_nascimento
    `, [data_nascimento, req.params.id, req.tenantId]);
    if (rows.length === 0) return res.status(404).json({ ok: false, erro: 'Cliente nÃ£o encontrado.' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* â”€â”€ RELATÃ“RIOS â”€â”€ */

router.get('/relatorios/agendamentos-por-dia', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT EXTRACT(DOW FROM data_hora) AS dia_semana,
             COUNT(*) AS total
      FROM agendamentos
      WHERE data_hora >= NOW() - INTERVAL '30 days'
        AND status IN ('confirmado', 'concluido')
        AND tenant_id = $1
      GROUP BY dia_semana
      ORDER BY dia_semana
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.get('/relatorios/faturamento', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DATE(data_hora) AS dia,
             COUNT(*) AS total_atendimentos,
             COALESCE(SUM(s.preco), 0) AS faturamento
      FROM agendamentos a
      JOIN servicos s ON s.id = a.servico_id
      WHERE a.status = 'concluido'
        AND a.data_hora >= NOW() - INTERVAL '30 days'
        AND a.tenant_id = $1 AND s.tenant_id = $1
      GROUP BY dia
      ORDER BY dia
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.get('/relatorios/barbeiros', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.nome AS barbeiro,
             COUNT(a.id) AS total_atendimentos,
             COALESCE(SUM(s.preco) FILTER (WHERE a.status = 'concluido'), 0) AS faturamento,
             COALESCE(AVG(a.avaliacao) FILTER (WHERE a.avaliacao IS NOT NULL), 0) AS media_avaliacao
      FROM barbeiros b
      LEFT JOIN agendamentos a ON a.barbeiro_id = b.id AND a.data_hora >= NOW() - INTERVAL '30 days' AND a.tenant_id = b.tenant_id
      LEFT JOIN servicos s ON s.id = a.servico_id
      WHERE b.tenant_id = $1 GROUP BY b.id, b.nome
      ORDER BY faturamento DESC
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* â”€â”€ PACOTES DE SERVIÃ‡OS â”€â”€ */

router.get('/pacotes', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.nome, p.descricao, p.preco_total, p.sessoes, p.validade_dias, p.ativo,
             COALESCE(json_agg(json_build_object('id', s.id, 'nome', s.nome, 'quantidade', ps.quantidade))
               FILTER (WHERE s.id IS NOT NULL), '[]'::json) AS servicos
      FROM pacotes p
      LEFT JOIN pacote_servicos ps ON ps.pacote_id = p.id AND ps.tenant_id = p.tenant_id
      LEFT JOIN servicos s ON s.id = ps.servico_id AND s.tenant_id = p.tenant_id
      WHERE p.tenant_id = $1
      GROUP BY p.id, p.nome, p.descricao, p.preco_total, p.sessoes, p.validade_dias, p.ativo, p.criado_em ORDER BY p.criado_em DESC
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/pacotes', autenticar, soGestor, async (req, res) => {
  const { nome, descricao, preco_total, sessoes, validade_dias, servicos } = req.body;
  if (!nome || !preco_total || !sessoes)
    return res.status(400).json({ ok: false, erro: 'Campos obrigatÃ³rios: nome, preco_total, sessoes.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO pacotes (nome, descricao, preco_total, sessoes, validade_dias, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [nome, descricao || null, Number(preco_total), Number(sessoes), Number(validade_dias) || 180, req.tenantId]);
    const pacoteId = rows[0].id;
    if (Array.isArray(servicos)) {
      for (const s of servicos) {
        await client.query(`
          INSERT INTO pacote_servicos (pacote_id, servico_id, quantidade, tenant_id) VALUES ($1, $2, $3, $4)
        `, [pacoteId, s.servico_id, s.quantidade || 1, req.tenantId]);
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

router.put('/pacotes/:id', autenticar, soGestor, async (req, res) => {
  const { nome, descricao, preco_total, sessoes, validade_dias, ativo, servicos } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE pacotes SET
        nome = COALESCE($1, nome), descricao = COALESCE($2, descricao),
        preco_total = COALESCE($3, preco_total), sessoes = COALESCE($4, sessoes),
        validade_dias = COALESCE($5, validade_dias), ativo = COALESCE($6, ativo)
      WHERE id = $7 AND tenant_id = $8
    `, [nome, descricao, preco_total, sessoes, validade_dias, ativo, req.params.id, req.tenantId]);
    if (Array.isArray(servicos)) {
      await client.query('DELETE FROM pacote_servicos WHERE pacote_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
      for (const s of servicos) {
        await client.query(`INSERT INTO pacote_servicos (pacote_id, servico_id, quantidade, tenant_id) VALUES ($1, $2, $3, $4)`,
          [req.params.id, s.servico_id, s.quantidade || 1, req.tenantId]);
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

router.delete('/pacotes/:id', autenticar, soGestor, async (req, res) => {
  try {
    await pool.query('UPDATE pacotes SET ativo = FALSE WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/pacotes/:id/vender', autenticar, soGestor, async (req, res) => {
  const { cliente_id, whatsapp } = req.body;
  let cid = cliente_id;
  try {
    const pkg = await pool.query('SELECT * FROM pacotes WHERE id = $1 AND ativo = TRUE AND tenant_id = $2', [req.params.id, req.tenantId]);
    if (pkg.rows.length === 0) return res.status(404).json({ ok: false, erro: 'Pacote nÃ£o encontrado.' });
    if (!cid && whatsapp) {
      const wppLimpo = String(whatsapp).replace(/\D/g, '');
      if (wppLimpo.length < 10) return res.status(400).json({ ok: false, erro: 'WhatsApp invÃ¡lido.' });
      const ex = await pool.query('SELECT id FROM clientes WHERE whatsapp = $1 AND tenant_id = $2', [wppLimpo, req.tenantId]);
      if (ex.rows.length > 0) cid = ex.rows[0].id;
      else {
        const novo = await pool.query('INSERT INTO clientes (nome, whatsapp, tenant_id) VALUES ($1, $2, $3) RETURNING id', ['Cliente', wppLimpo, req.tenantId]);
        cid = novo.rows[0].id;
      }
    }
    if (!cid) return res.status(400).json({ ok: false, erro: 'Informe cliente_id ou whatsapp.' });
    const codigo = 'PKG' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    const validade = new Date();
    validade.setDate(validade.getDate() + (pkg.rows[0].validade_dias || 180));
    const { rows } = await pool.query(`
      INSERT INTO cliente_pacotes (cliente_id, pacote_id, sessoes_restantes, data_validade, codigo, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [cid, req.params.id, pkg.rows[0].sessoes, validade, codigo, req.tenantId]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.get('/cliente-pacotes', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT cp.id, cp.codigo, cp.sessoes_restantes, cp.sessoes_usadas,
             cp.data_compra, cp.data_validade, cp.status,
             c.nome AS cliente_nome, c.whatsapp,
             p.nome AS pacote_nome, p.sessoes AS total_sessoes
      FROM cliente_pacotes cp
      JOIN clientes c ON c.id = cp.cliente_id AND c.tenant_id = cp.tenant_id
      JOIN pacotes p ON p.id = cp.pacote_id AND p.tenant_id = cp.tenant_id
      WHERE cp.tenant_id = $1
      ORDER BY cp.data_compra DESC
    `, [req.tenantId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/cliente-pacotes/:id/usar', autenticar, soGestor, async (req, res) => {
  const { agendamento_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cp = await client.query('SELECT * FROM cliente_pacotes WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId]);
    if (cp.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, erro: 'Pacote nÃ£o encontrado.' });
    }
    if (cp.rows[0].status !== 'ativo' || cp.rows[0].sessoes_restantes <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, erro: 'Pacote sem sessÃµes restantes.' });
    }
    await client.query(`
      UPDATE cliente_pacotes SET
        sessoes_restantes = sessoes_restantes - 1,
        sessoes_usadas = sessoes_usadas + 1,
        status = CASE WHEN sessoes_restantes - 1 = 0 THEN 'esgotado' ELSE status END
      WHERE id = $1
    `, [req.params.id]);
    await client.query(`INSERT INTO pacote_usos (cliente_pacote_id, agendamento_id, tenant_id) VALUES ($1, $2, $3)`,
      [req.params.id, agendamento_id || null, req.tenantId]);
    await client.query('COMMIT');
    res.json({ ok: true, mensagem: 'SessÃ£o registrada.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

/* â”€â”€ Monta rotas financeiras no mesmo router /gestor â”€â”€ */
router.use(financeiroRouter);




