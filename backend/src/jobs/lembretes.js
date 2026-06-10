const pool = require('../database/connection');
const { enviarLembrete, enviarRetorno, enviarAniversario } = require('../services/whatsapp');

/* Lê config ativa (só existe 1 row) */
async function getConfig() {
  const { rows } = await pool.query('SELECT * FROM configuracoes LIMIT 1');
  return rows[0] || {};
}

/* ── 1. LEMBRETES (24h e 1h antes) ── */
async function verificarLembretes() {
  try {
    const cfg = await getConfig();

    /* 24h antes: janela de 5 min em torno de 24h */
    if (cfg.lembrete_24h_ativo !== false) {
      const r24 = await pool.query(`
        SELECT
          a.id, c.nome AS cliente_nome, c.whatsapp,
          s.nome AS servico, b.nome AS barbeiro,
          TO_CHAR(a.data_hora, 'HH24:MI') AS hora,
          TO_CHAR(a.data_hora, 'DD/MM')   AS data
        FROM agendamentos a
        JOIN clientes  c ON c.id = a.cliente_id
        JOIN servicos  s ON s.id = a.servico_id
        JOIN barbeiros b ON b.id = a.barbeiro_id
        WHERE a.status = 'confirmado'
          AND a.lembrete_24h_enviado = FALSE
          AND a.data_hora BETWEEN NOW() + INTERVAL '23 hours 55 minutes'
                              AND NOW() + INTERVAL '24 hours 5 minutes'
      `);
      for (const apt of r24.rows) {
        await enviarLembrete({
          clienteNome: apt.cliente_nome,
          whatsapp:    apt.whatsapp,
          servico:     apt.servico,
          barbeiro:    apt.barbeiro,
          hora:        apt.hora,
          data:        apt.data,
          antecedencia: '24h',
        });
        await pool.query('UPDATE agendamentos SET lembrete_24h_enviado = TRUE WHERE id = $1', [apt.id]);
        console.log(`⏰ Lembrete 24h → ${apt.cliente_nome} (${apt.data} ${apt.hora})`);
      }
    }

    /* 1h antes: janela de 5 min em torno de 1h */
    if (cfg.lembrete_1h_ativo !== false) {
      const r1 = await pool.query(`
        SELECT
          a.id, c.nome AS cliente_nome, c.whatsapp,
          s.nome AS servico, b.nome AS barbeiro,
          TO_CHAR(a.data_hora, 'HH24:MI') AS hora
        FROM agendamentos a
        JOIN clientes  c ON c.id = a.cliente_id
        JOIN servicos  s ON s.id = a.servico_id
        JOIN barbeiros b ON b.id = a.barbeiro_id
        WHERE a.status = 'confirmado'
          AND a.lembrete_enviado = FALSE
          AND a.data_hora BETWEEN NOW() + INTERVAL '55 minutes'
                              AND NOW() + INTERVAL '65 minutes'
      `);
      for (const apt of r1.rows) {
        await enviarLembrete({
          clienteNome: apt.cliente_nome,
          whatsapp:    apt.whatsapp,
          servico:     apt.servico,
          barbeiro:    apt.barbeiro,
          hora:        apt.hora,
          antecedencia: '1h',
        });
        await pool.query('UPDATE agendamentos SET lembrete_enviado = TRUE WHERE id = $1', [apt.id]);
        console.log(`⏰ Lembrete 1h → ${apt.cliente_nome} (${apt.hora})`);
      }
    }
  } catch (err) {
    console.error('❌ Cron lembretes:', err.message);
  }
}

/* ── 2. MENSAGENS DE RETORNO (X dias após o serviço concluído) ── */
async function verificarRetornos() {
  try {
    const cfg = await getConfig();
    if (cfg.msg_retorno_ativo === false) return;
    const dias = Number(cfg.msg_retorno_dias) || 15;

    const { rows } = await pool.query(`
      SELECT
        a.id, c.nome AS cliente_nome, c.whatsapp,
        s.nome AS servico, b.nome AS barbeiro,
        TO_CHAR(a.data_hora, 'DD/MM') AS data
      FROM agendamentos a
      JOIN clientes  c ON c.id = a.cliente_id
      JOIN servicos  s ON s.id = a.servico_id
      JOIN barbeiros b ON b.id = a.barbeiro_id
      WHERE a.status = 'concluido'
        AND a.retorno_enviado = FALSE
        AND a.data_hora BETWEEN (NOW() - ($1 || ' days')::INTERVAL - INTERVAL '1 hour')
                            AND (NOW() - ($1 || ' days')::INTERVAL + INTERVAL '1 hour')
    `, [String(dias)]);

    for (const apt of rows) {
      await enviarRetorno({
        clienteNome: apt.cliente_nome,
        whatsapp:    apt.whatsapp,
        servico:     apt.servico,
        barbeiro:    apt.barbeiro,
        data:        apt.data,
        dias,
      });
      await pool.query('UPDATE agendamentos SET retorno_enviado = TRUE WHERE id = $1', [apt.id]);
      console.log(`🔁 Retorno enviado → ${apt.cliente_nome}`);
    }
  } catch (err) {
    console.error('❌ Cron retornos:', err.message);
  }
}

/* ── 3. ANIVERSARIANTES DO DIA ── */
async function verificarAniversariantes() {
  try {
    const { rows } = await pool.query(`
      SELECT nome, whatsapp
      FROM clientes
      WHERE data_nascimento IS NOT NULL
        AND TO_CHAR(data_nascimento, 'MM-DD') = TO_CHAR(NOW(), 'MM-DD')
    `);

    for (const cli of rows) {
      await enviarAniversario({ clienteNome: cli.nome, whatsapp: cli.whatsapp });
      console.log(`🎂 Feliz aniversário → ${cli.nome}`);
    }
  } catch (err) {
    console.error('❌ Cron aniversariantes:', err.message);
  }
}

/* ── 4. LISTA DE ESPERA — notifica quem cabe na vaga que abriu ── */
async function verificarListaEspera() {
  try {
    /* encontra cancelamentos recentes (últimos 30 min) */
    const { rows: livres } = await pool.query(`
      SELECT a.id, a.barbeiro_id, a.data_hora
      FROM agendamentos a
      WHERE a.status = 'cancelado'
        AND a.cancelado_em BETWEEN NOW() - INTERVAL '30 minutes' AND NOW()
        AND NOT EXISTS (
          SELECT 1 FROM lista_espera l
          WHERE l.barbeiro_id = a.barbeiro_id
            AND l.status = 'notificado'
            AND l.data_desejada = a.data_hora::date
        )
    `);

    for (const vaga of livres) {
      const { rows: candidatos } = await pool.query(`
        SELECT l.id, c.nome, c.whatsapp, s.nome AS servico
        FROM lista_espera l
        JOIN clientes  c ON c.id = l.cliente_id
        LEFT JOIN servicos s ON s.id = l.servico_id
        WHERE l.barbeiro_id = $1
          AND l.data_desejada = $2
          AND l.status = 'aguardando'
        ORDER BY l.criado_em ASC
        LIMIT 1
      `, [vaga.barbeiro_id, vaga.data_hora.toISOString().slice(0, 10)]);

      if (candidatos.length > 0) {
        const cand = candidatos[0];
        const { enviarMensagem } = require('../services/whatsapp');
        const { formatarNumero } = require('../services/whatsapp');
        const msg =
          `✨ *Vaga disponível — Doctor Barbearia*\n\n` +
          `Oi *${cand.nome}*! Abriu um horário que você esperava. 💈\n` +
          `📅 *${vaga.data_hora.toLocaleString('pt-BR')}*\n\n` +
          `Corre agendar: http://localhost:3000`;
        await enviarMensagem(formatarNumero(cand.whatsapp), msg);
        await pool.query(
          `UPDATE lista_espera SET status = 'notificado', notificado_em = NOW() WHERE id = $1`,
          [cand.id]
        );
        console.log(`📋 Lista de espera: vaga avisada para ${cand.nome}`);
      }
    }
  } catch (err) {
    console.error('❌ Cron lista de espera:', err.message);
  }
}

/* Inicia os crons (a cada 5 min) */
function iniciarCron() {
  console.log('⏱️  Cron iniciado: lembretes, retornos, aniversariantes, lista de espera');
  verificarLembretes();
  setInterval(() => {
    verificarLembretes();
    verificarRetornos();
    verificarAniversariantes();
    verificarListaEspera();
  }, 5 * 60 * 1000);
}

module.exports = {
  iniciarCron,
  verificarLembretes,
  verificarRetornos,
  verificarAniversariantes,
  verificarListaEspera,
};
