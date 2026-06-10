// Integração com Asaas (gateway de pagamento BR — PIX, cartão, boleto).
// Docs: https://docs.asaas.com/
// - PIX:   resposta imediata com QR code + copia-cola
// - Cartão: tokeniza via SDK frontend; aqui só processa o token
// - Boleto: retorna URL para o cliente pagar
// - Assinatura: cria subscription mensal/anual
// - Webhook: /webhooks/asaas recebe notificações de status
const axios = require('axios');

const ASAAS_API = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

const asaas = axios.create({
  baseURL: ASAAS_API,
  headers: {
    'access_token': process.env.ASAAS_API_KEY || '',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

function habilitado() {
  return !!process.env.ASAAS_API_KEY;
}

// Cria ou recupera cliente no Asaas
async function garantirCustomer(tenant) {
  if (tenant.asaas_customer_id) {
    try {
      const r = await asaas.get(`/customers/${tenant.asaas_customer_id}`);
      return r.data;
    } catch (_) { /* id pode estar inválido, recriar */ }
  }
const r = await asaas.post('/customers', {
    name: tenant.nome,
    email: tenant.email || `cobranca+${tenant.slug}@doctorbarbearia.com`,
    mobilePhone: tenant.whatsapp ? String(tenant.whatsapp).replace(/\D/g, '') : undefined,
    cpfCnpj: tenant.cpf_cnpj || undefined,
    externalReference: `tenant_${tenant.id}`,
    notificationDisabled: false,
  });
  return r.data;
}

// Cria uma cobrança avulsa (mensalidade) — retorna PIX/boleto/url
async function criarCobranca({ customer, valor, descricao, vencimento, metodo = 'PIX' }) {
  // billingType: PIX, CREDIT_CARD, BOLETO, UNDEFINED (cliente escolhe)
  const map = { pix: 'PIX', cartao: 'CREDIT_CARD', boleto: 'BOLETO' };
  const billingType = map[metodo] || 'UNDEFINED';
  const r = await asaas.post('/payments', {
    customer: customer.id,
    billingType,
    value: Number(valor).toFixed(2),
    dueDate: vencimento, // YYYY-MM-DD
    description: descricao,
    externalReference: `tenant_${customer.externalReference || ''}`,
  });
  return r.data;
}

// Cria assinatura recorrente (mensal/anual) — Asaas gera as faturas sozinho
async function criarAssinatura({ customer, plano, ciclo = 'MONTHLY' }) {
  const r = await asaas.post('/subscriptions', {
    customer: customer.id,
    billingType: 'UNDEFINED', // cliente escolhe na hora do pagamento
    value: Number(plano.preco_mensal).toFixed(2),
    nextDueDate: plano.proxima_cobranca,
    cycle: ciclo, // MONTHLY, YEARLY
    description: `Assinatura ${plano.nome} - Doctor Barbearia SaaS`,
    externalReference: `tenant_${customer.externalReference || ''}`,
  });
  return r.data;
}

// Cancela assinatura no Asaas
async function cancelarAssinatura(asaasSubscriptionId) {
  const r = await asaas.delete(`/subscriptions/${asaasSubscriptionId}`);
  return r.data;
}

// Busca QR code PIX de uma cobrança
async function pixQrCode(paymentId) {
  const r = await asaas.get(`/payments/${paymentId}/pixQrCode`);
  return r.data; // { encodedImage: 'base64...', payload: 'copia-cola', expirationDate }
}

module.exports = { asaas, habilitado, garantirCustomer, criarCobranca, criarAssinatura, cancelarAssinatura, pixQrCode };
