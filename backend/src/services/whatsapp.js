const axios = require('axios');

const BASE    = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}`;
const HEADERS = { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN };

const SIMULANDO = !process.env.ZAPI_INSTANCE || process.env.ZAPI_INSTANCE === 'sua_instancia';

function formatarNumero(whatsapp) {
  const limpo = String(whatsapp || '').replace(/\D/g, '');
  return limpo.startsWith('55') ? limpo : `55${limpo}`;
}

function formatarMensagem(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars) ? String(vars[k]) : m);
}

/* ── Envio base ── */
async function enviarMensagem(numero, mensagem) {
  if (SIMULANDO) {
    console.log(`\n📱 [WhatsApp simulado] → ${numero}`);
    console.log(`   ${mensagem.slice(0, 100).replace(/\n/g, ' ')}...`);
    return { ok: true, simulado: true };
  }

  try {
    const { data } = await axios.post(
      `${BASE}/send-text`,
      { phone: numero, message: mensagem },
      { headers: HEADERS, timeout: 8000 }
    );
    console.log(`✅ WhatsApp enviado → ${numero}`);
    return { ok: true, data };
  } catch (err) {
    const detalhe = err.response?.data?.message || err.message;
    console.error(`❌ Erro WhatsApp → ${numero}: ${detalhe}`);
    return { ok: false, erro: detalhe };
  }
}

/* ── 1. Confirmação de agendamento ── */
async function enviarConfirmacao({ clienteNome, whatsapp, servico, barbeiro, dataHora, preco }) {
  const numero   = formatarNumero(whatsapp);
  const mensagem =
    `✅ *Agendamento confirmado!*\n\n` +
    `Olá, *${clienteNome}*! Seu horário na *Doctor Barbearia* está garantido. 💈\n\n` +
    `✂️ *Serviço:* ${servico}\n` +
    `👨 *Barbeiro:* ${barbeiro}\n` +
    `📅 *Data/Hora:* ${dataHora}\n` +
    `💰 *Valor:* R$ ${Number(preco).toFixed(2)}\n\n` +
    `_Precisando cancelar ou reagendar, responda esta mensagem._`;

  return enviarMensagem(numero, mensagem);
}

/* ── 2. Lembrete 24h ou 1h antes ── */
async function enviarLembrete({ clienteNome, whatsapp, servico, barbeiro, hora, data, antecedencia = '1h' }) {
  const numero = formatarNumero(whatsapp);
  let mensagem;
  if (antecedencia === '24h') {
    mensagem =
      `⏰ *Lembrete — Doctor Barbearia*\n\n` +
      `Oi *${clienteNome}*! Você tem horário *amanhã* com a gente. 💈\n\n` +
      `✂️ *${servico}* com *${barbeiro}*\n` +
      `📅 *${data}* às *${hora}*\n\n` +
      `Confirma pra gente? Responda *SIM* ✋`;
  } else {
    mensagem =
      `⏰ *Lembrete — Doctor Barbearia*\n\n` +
      `Oi *${clienteNome}*! Seu horário é em *1 hora*. 😉\n\n` +
      `✂️ *${servico}* com *${barbeiro}* às *${hora}*\n\n` +
      `Te esperamos! 💈`;
  }
  return enviarMensagem(numero, mensagem);
}

/* ── 3. Confirmação de cancelamento ── */
async function enviarCancelamento({ clienteNome, whatsapp, servico, dataHora }) {
  const numero   = formatarNumero(whatsapp);
  const mensagem =
    `❌ *Agendamento cancelado*\n\n` +
    `Olá, *${clienteNome}*. Seu agendamento foi cancelado.\n\n` +
    `✂️ *${servico}* — ${dataHora}\n\n` +
    `Para remarcar, acesse o app ou responda esta mensagem. 😊`;

  return enviarMensagem(numero, mensagem);
}

/* ── 4. Verificar status da conexão ── */
async function verificarConexao() {
  if (SIMULANDO) return { conectado: false, simulando: true };

  try {
    const { data } = await axios.get(`${BASE}/status`, { headers: HEADERS, timeout: 5000 });
    return { conectado: data?.connected === true, status: data };
  } catch {
    return { conectado: false };
  }
}

/* ── 5. Mensagem de retorno (X dias após o serviço) ── */
async function enviarRetorno({ clienteNome, whatsapp, servico, barbeiro, data, dias = 15 }) {
  const numero = formatarNumero(whatsapp);
  const mensagem =
    `🔁 *Doctor Barbearia — Hora de voltar!*\n\n` +
    `Oi *${clienteNome}*! Já fazem *${dias} dias* desde seu *${servico}* (${data}) com *${barbeiro}*. ✂️\n\n` +
    `Que tal manter o estilo em dia? 😉\n` +
    `📲 Agende seu retorno: http://localhost:3000\n\n` +
    `_Responda PARAR pra não receber mais._`;
  return enviarMensagem(numero, mensagem);
}

/* ── 6. Aniversariante do dia ── */
async function enviarAniversario({ clienteNome, whatsapp }) {
  const numero = formatarNumero(whatsapp);
  const mensagem =
    `🎂 *Feliz aniversário, ${clienteNome}!*\n\n` +
    `A Doctor Barbearia te deseja um dia incrível! ✨\n\n` +
    `Presentão: *10% OFF* em qualquer serviço esta semana. 💈\n` +
    `📲 Agende: http://localhost:3000`;
  return enviarMensagem(numero, mensagem);
}

module.exports = {
  enviarConfirmacao,
  enviarLembrete,
  enviarCancelamento,
  enviarRetorno,
  enviarAniversario,
  enviarMensagem,
  formatarNumero,
  formatarMensagem,
  verificarConexao,
};
