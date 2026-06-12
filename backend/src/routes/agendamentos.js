const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');
const { enviarConfirmacao } = require('../services/whatsapp');
const { autenticar } = require('./auth');
const { campo, validar } = require('../validators');

// POST /agendamentos — criar novo agendamento (autenticado OU guest com nome+whatsapp)
router.post('/', validar([
  campo('servico_id').presente().inteiro({ min: 1 }),
  campo('barbeiro_id').presente().inteiro({ min: 1 }),
  campo('data_hora').presente().datetime(),
  campo('nome').opcional().texto({ min: 1, max: 120 }),
  campo('whatsapp').opcional().whatsapp(),
]), async (req, res) => {
  const { servico_id, barbeiro_id, data_hora, nome, whatsapp } = req.body;

  if (!servico_id || !barbeiro_id || !data_hora) {
    return res.status(400).json({ ok: false, erro: 'Preencha todos os campos obrigatórios.' });
  }

  let userNome = null;
  let wppBruto = null;

  // Tenta autenticar opcionalmente (se houver token)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'doctor_barbearia_secret_2025');
      const userRow = await pool.query('SELECT nome, whatsapp FROM usuarios WHERE id = $1', [decoded.id]);
      if (userRow.rows[0]) {
        userNome = userRow.rows[0].nome;
        wppBruto = userRow.rows[0].whatsapp;
      }
    } catch { /* token inválido → cai no guest */ }
  }

  // Guest: usa o que veio no body
  if (!userNome) userNome = nome;
  if (!wppBruto) wppBruto = whatsapp;

  if (!userNome || !String(userNome).trim()) {
    return res.status(400).json({ ok: false, erro: 'Informe seu nome.' });
  }
  if (!wppBruto) {
    return res.status(400).json({ ok: false, erro: 'Informe seu WhatsApp.' });
  }

  const wppLimpo = String(wppBruto).replace(/\D/g, '');
  if (wppLimpo.length < 10) {
    return res.status(400).json({ ok: false, erro: 'WhatsApp inválido. Informe DDD + número.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verificar conflito de horário (multi-tenant)
    const conflito = await client.query(
      `SELECT id FROM agendamentos
       WHERE barbeiro_id = $1
         AND data_hora   = $2
         AND status      = 'confirmado'
         AND tenant_id   = $3`,
      [barbeiro_id, data_hora, req.tenantId]
    );
    if (conflito.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, erro: 'Horário já ocupado. Escolha outro.' });
    }

    // 2. Criar/buscar cliente pelo WhatsApp (isolado por tenant)
    let clienteId;
    const clienteExiste = await client.query(
      `SELECT id FROM clientes WHERE whatsapp = $1 AND tenant_id = $2`, [wppLimpo, req.tenantId]
    );
    if (clienteExiste.rows.length > 0) {
      clienteId = clienteExiste.rows[0].id;
      await client.query(`UPDATE clientes SET nome = $1 WHERE id = $2`, [userNome, clienteId]);
    } else {
      const novoCliente = await client.query(
        `INSERT INTO clientes (nome, whatsapp, tenant_id) VALUES ($1, $2, $3) RETURNING id`,
        [userNome, wppLimpo, req.tenantId]
      );
      clienteId = novoCliente.rows[0].id;
    }

    // 3. Criar agendamento
    const { rows } = await client.query(
      `INSERT INTO agendamentos (cliente_id, barbeiro_id, servico_id, data_hora, tenant_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [clienteId, barbeiro_id, servico_id, data_hora, req.tenantId]
    );
    const agendamento = rows[0];

    // 4. Buscar detalhes para o WhatsApp
    const detalhes = await client.query(
      `SELECT s.nome AS servico, b.nome AS barbeiro,
              TO_CHAR(a.data_hora, 'DD/MM/YYYY às HH24:MI') AS data_fmt,
              s.preco
       FROM agendamentos a
       JOIN servicos  s ON s.id = a.servico_id
       JOIN barbeiros b ON b.id = a.barbeiro_id
       WHERE a.id = $1`,
      [agendamento.id]
    );
    const d = detalhes.rows[0];

    await client.query('COMMIT');

    // 5. Enviar WhatsApp (assíncrono, não bloqueia a resposta)
    enviarConfirmacao({
      clienteNome: userNome,
      whatsapp: wppLimpo,
      servico:  d.servico,
      barbeiro: d.barbeiro,
      dataHora: d.data_fmt,
      preco:    d.preco,
    }).catch(console.error);

    // 6. Criar evento no Google Calendar (assíncrono, não bloqueia)
    try {
      const cfgRow = await pool.query(
        'SELECT google_calendar_refresh_token FROM configuracoes WHERE id = 1'
      );
      const refreshToken = cfgRow.rows[0]?.google_calendar_refresh_token;
      if (refreshToken) {
        const { createEvent, refreshTokens } = require('../services/googleCalendar');
        const servicoRow = await pool.query('SELECT duracao_min FROM servicos WHERE id = $1', [servico_id]);
        const duracaoMin = servicoRow.rows[0]?.duracao_min || 60;
        const startTime = new Date(data_hora);
        const endTime = new Date(startTime.getTime() + duracaoMin * 60000);
        const tokens = await refreshTokens(refreshToken);
        createEvent(tokens, {
          summary: `\u2702\uFE0F ${d.servico} - ${userNome}`,
          description: `Cliente: ${userNome} | WhatsApp: ${wppLimpo}\nBarbeiro: ${d.barbeiro}\nServi\u00e7o: ${d.servico} - R$ ${d.preco}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          serviceName: d.servico,
          barberName: d.barbeiro,
          clientName: userNome,
          clientWhatsapp: wppLimpo,
        }).catch(console.error);
      }
    } catch {}

    res.status(201).json({
      ok: true,
      mensagem: 'Agendamento criado! Confirmação enviada via WhatsApp.',
      data: { ...agendamento, ...d },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, erro: err.message });
  } finally {
    client.release();
  }
});

// GET /agendamentos — histórico do cliente autenticado
router.get('/', autenticar, async (req, res) => {
  try {
    const whatsapp = req.usuario.whatsapp;
    if (!whatsapp) {
      return res.status(400).json({ ok: false, erro: 'Seu usuário não possui WhatsApp cadastrado.' });
    }

    const wppLimpo = String(whatsapp).replace(/\D/g, '');
    const { rows } = await pool.query(
      `SELECT a.id, a.status, a.avaliacao, a.pagamento_status,
              TO_CHAR(a.data_hora, 'DD/MM/YYYY às HH24:MI') AS data_fmt,
              s.nome AS servico, s.emoji, s.preco,
              b.nome AS barbeiro
       FROM agendamentos a
       JOIN clientes  c ON c.id = a.cliente_id
       JOIN servicos  s ON s.id = a.servico_id
       JOIN barbeiros b ON b.id = a.barbeiro_id
       WHERE c.whatsapp = $1 AND c.tenant_id = $2
       ORDER BY a.data_hora DESC`,
      [wppLimpo, req.tenantId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// PATCH /agendamentos/:id/cancelar — cliente autenticado só pode cancelar o que é dele
router.patch('/:id/cancelar', autenticar, async (req, res) => {
  try {
    const whatsapp = req.usuario.whatsapp;
    const wppLimpo = whatsapp ? String(whatsapp).replace(/\D/g, '') : null;

    const { rows } = await pool.query(
      `UPDATE agendamentos a
       SET status = 'cancelado',
           cancelado_em = NOW()
       WHERE a.id = $1
         AND a.status = 'confirmado'
         AND EXISTS (
           SELECT 1
           FROM clientes c
           WHERE c.id = a.cliente_id
             AND c.whatsapp = $2
         )
       RETURNING a.*`,
      [req.params.id, wppLimpo]
    );
    if (rows.length === 0)
      return res.status(404).json({ ok: false, erro: 'Agendamento não encontrado ou já cancelado.' });

    // Buscar dados para o WhatsApp
    const detalhe = await pool.query(`
      SELECT c.nome AS cliente_nome, c.whatsapp,
             s.nome AS servico,
             TO_CHAR(a.data_hora, 'DD/MM/YYYY às HH24:MI') AS data_fmt
      FROM agendamentos a
      JOIN clientes c ON c.id = a.cliente_id
      JOIN servicos s ON s.id = a.servico_id
      WHERE a.id = $1
    `, [req.params.id]);
    if (detalhe.rows[0]) {
      const { enviarCancelamento } = require('../services/whatsapp');
      enviarCancelamento({
        clienteNome: detalhe.rows[0].cliente_nome,
        whatsapp:    detalhe.rows[0].whatsapp,
        servico:     detalhe.rows[0].servico,
        dataHora:    detalhe.rows[0].data_fmt,
      }).catch(console.error);
    }

    res.json({ ok: true, mensagem: 'Agendamento cancelado.', data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// PATCH /agendamentos/:id/avaliar — cliente só avalia o que é dele
router.patch('/:id/avaliar', autenticar, validar([
  campo('avaliacao').presente().inteiro({ min: 1, max: 5 }),
]), async (req, res) => {
  const { avaliacao } = req.body;
  if (!avaliacao || avaliacao < 1 || avaliacao > 5)
    return res.status(400).json({ ok: false, erro: 'Avaliação deve ser entre 1 e 5.' });

  try {
    const whatsapp = req.usuario.whatsapp;
    const wppLimpo = whatsapp ? String(whatsapp).replace(/\D/g, '') : null;

    const { rows } = await pool.query(
      `UPDATE agendamentos a
       SET avaliacao = $1
       WHERE a.id = $2
         AND a.status = 'concluido'
         AND EXISTS (
           SELECT 1
           FROM clientes c
           WHERE c.id = a.cliente_id
             AND c.whatsapp = $3
         )
       RETURNING a.*`,
      [avaliacao, req.params.id, wppLimpo]
    );
    if (rows.length === 0)
      return res.status(404).json({ ok: false, erro: 'Agendamento não encontrado ou ainda não concluído.' });

    res.json({ ok: true, mensagem: 'Avaliação registrada!', data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
