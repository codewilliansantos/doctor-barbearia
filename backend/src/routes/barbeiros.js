const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

// GET /barbeiros — lista barbeiros ativos
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, especialidade, avaliacao, total_cortes
       FROM barbeiros WHERE ativo = TRUE AND tenant_id = $1 ORDER BY id`,
      [req.tenantId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* POST /lista-espera — cliente entra na lista de espera (público, com nome+whatsapp) */
router.post('/lista-espera', async (req, res) => {
  const { nome, whatsapp, servico_id, barbeiro_id, data_desejada, periodo } = req.body;
  if (!nome || !whatsapp || !data_desejada) {
    return res.status(400).json({ ok: false, erro: 'Campos obrigatórios: nome, whatsapp, data_desejada.' });
  }
  const wppLimpo = String(whatsapp).replace(/\D/g, '');
  if (wppLimpo.length < 10) return res.status(400).json({ ok: false, erro: 'WhatsApp inválido.' });

  try {
    // Garante cliente existente
    let clienteId;
    const ex = await pool.query('SELECT id FROM clientes WHERE whatsapp = $1 AND tenant_id = $2', [wppLimpo, req.tenantId]);
    if (ex.rows.length > 0) {
      clienteId = ex.rows[0].id;
    } else {
      const novo = await pool.query(
        'INSERT INTO clientes (nome, whatsapp, tenant_id) VALUES ($1, $2, $3) RETURNING id',
        [nome, wppLimpo, req.tenantId]
      );
      clienteId = novo.rows[0].id;
    }

    const { rows } = await pool.query(`
      INSERT INTO lista_espera (cliente_id, servico_id, barbeiro_id, data_desejada, periodo)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [clienteId, servico_id || null, barbeiro_id || null, data_desejada, periodo || 'qualquer']);

    res.status(201).json({ ok: true, mensagem: 'Você está na lista de espera! Avisaremos se abrir vaga.', data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// GET /barbeiros/:id/horarios?data=2025-05-21
// Retorna horários disponíveis de um barbeiro em uma data
// Considera: jornada semanal, encaixes (jornada estendida), e horários ocupados
router.get('/:id/horarios', async (req, res) => {
  const { id } = req.params;
  const { data } = req.query;

  if (!data) return res.status(400).json({ ok: false, erro: 'Informe a data (YYYY-MM-DD)' });

  try {
    const dataObj = new Date(data + 'T12:00:00');
    const diaSemana = dataObj.getDay(); // 0=Dom, 6=Sáb

    // 1. Pega jornada semanal do barbeiro nesse dia
    const jornada = await pool.query(
      `SELECT hora_inicio, hora_fim, ativo FROM jornadas
       WHERE barbeiro_id = $1 AND dia_semana = $2 AND ativo = TRUE`,
      [id, diaSemana]
    );

    // 2. Pega encaixes (jornada estendida) para essa data
    const encaixes = await pool.query(
      `SELECT hora_inicio, hora_fim FROM encaixes WHERE barbeiro_id = $1 AND data = $2`,
      [id, data]
    );

    // 3. Pega horários já ocupados
    const ocupadosQ = await pool.query(
      `SELECT TO_CHAR(data_hora, 'HH24:MI') AS hora
       FROM agendamentos
       WHERE barbeiro_id = $1
         AND DATE(data_hora) = $2
         AND status = 'confirmado'
         AND tenant_id = $3`,
      [id, data, req.tenantId]
    );
    const ocupados = ocupadosQ.rows.map(r => r.hora);

    // 4. Monta grade de horários (a cada 30min, das 08:00 às 20:00)
    const ALL_TIMES = [];
    for (let h = 8; h < 20; h++) {
      ALL_TIMES.push(`${String(h).padStart(2,'0')}:00`);
      ALL_TIMES.push(`${String(h).padStart(2,'0')}:30`);
    }

    // 5. Filtra os horários permitidos pela jornada OU encaixes
    // Regra: sem jornada cadastrada = sem horários (a não ser que haja encaixe)
    let horariosPermitidos = [];
    let jornadaTexto = '';

    if (jornada.rows.length > 0) {
      const { hora_inicio, hora_fim } = jornada.rows[0];
      jornadaTexto = `${hora_inicio.slice(0,5)}–${hora_fim.slice(0,5)}`;
      horariosPermitidos = ALL_TIMES.filter(t => t >= hora_inicio.slice(0,5) && t < hora_fim.slice(0,5));
    }

    for (const e of encaixes.rows) {
      const extras = ALL_TIMES.filter(t => t >= e.hora_inicio.slice(0,5) && t < e.hora_fim.slice(0,5));
      horariosPermitidos = Array.from(new Set([...horariosPermitidos, ...extras])).sort();
    }

    // 6. Marca como ocupados os já agendados
    const grade = horariosPermitidos.map(t => ({
      hora: t,
      ocupado: ocupados.includes(t),
    }));

    res.json({ ok: true, jornada: jornadaTexto, grade, ocupados });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
