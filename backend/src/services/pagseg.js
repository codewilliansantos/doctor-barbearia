const axios = require('axios');
const pool  = require('../database/connection');

const PAGSEGURO_URL = 'https://api.pagseguro.com';

/* Busca o token PagSeguro salvo no banco para esta barbearia */
async function getToken() {
  try {
    const { rows } = await pool.query(
      'SELECT pagseguro_token, pagseguro_ativo FROM configuracoes WHERE id = 1'
    );
    const cfg = rows[0];
    if (cfg?.pagseguro_ativo && cfg?.pagseguro_token) {
      return cfg.pagseguro_token;
    }
    return null;
  } catch {
    return null;
  }
}

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Gera QR Code Pix para pagamento
 * @param {Object} dados - { agendamento_id, preco, cliente, cpf, whatsapp, servico }
 * @returns {Promise<Object>}
 */
async function gerarPixQRCode(dados) {
  const { agendamento_id, preco, cliente, cpf, whatsapp, servico } = dados;
  const valor = Math.round(Number(preco) * 100); // centavos

  const token = await getToken();

  /* Modo simulado — sem token configurado */
  if (!token) {
    console.log('📱 [Pix simulado] agendamento', agendamento_id);
    const qrFake = `00020126580014BR.GOV.BCB.PIX0136doctor-barbearia@pix.com5204000053039865406${valor}5802BR5916Doctor Barbearia6009SAO PAULO6304ABCD`;
    return {
      id: `SIM-${agendamento_id}`,
      simulado: true,
      qr_code: qrFake,
      qr_code_image: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrFake)}`,
      valor: preco,
      expira_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  const wppLimpo = String(whatsapp || '').replace(/\D/g, '');
  const cpfLimpo = String(cpf || '00000000000').replace(/\D/g, '');

  const payload = {
    reference_id: `APT-${agendamento_id}`,
    customer: {
      name: cliente,
      tax_id: cpfLimpo,
      phone: {
        country: '55',
        area: wppLimpo.slice(0, 2) || '11',
        number: wppLimpo.slice(2) || '999999999',
      },
    },
    items: [{
      name: `${servico} - Doctor Barbearia`,
      quantity: 1,
      unit_amount: valor,
    }],
    qr_codes: [{
      amount: { value: valor },
      expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }],
    notification_urls: [
      `${process.env.API_URL || 'http://localhost:3001'}/pagamentos/webhook`,
    ],
  };

  try {
    const { data } = await axios.post(`${PAGSEGURO_URL}/orders`, payload, { headers: headers(token) });
    const qr = data.qr_codes?.[0];

    return {
      id: data.id,
      simulado: false,
      qr_code: qr?.text,
      qr_code_image: qr?.links?.find(l => l.media === 'image/png')?.href,
      valor: preco,
      expira_em: qr?.expiration_date,
    };
  } catch (err) {
    const msg = err.response?.data?.error_messages?.[0]?.description || err.message;
    throw new Error(`PagSeguro: ${msg}`);
  }
}

/**
 * Verifica se o token está válido fazendo uma chamada leve à API
 * @param {string} token
 * @returns {Promise<{ok: boolean, erro?: string}>}
 */
async function testarToken(token) {
  try {
    await axios.get(`${PAGSEGURO_URL}/orders?page_size=1`, {
      headers: headers(token),
      timeout: 8000,
    });
    return { ok: true };
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) return { ok: false, erro: 'Token inválido ou sem permissão.' };
    if (status === 403) return { ok: false, erro: 'Token sem permissão para Pix.' };
    const msg = err.response?.data?.error_messages?.[0]?.description || err.message;
    return { ok: false, erro: msg };
  }
}

module.exports = { gerarPixQRCode, testarToken };
