// Rotas SaaS â€” Planos, Assinaturas, CobranÃ§as (Asaas)
const express = require('express');
const pool    = require('../database/connection');
const asaas   = require('../services/asaas');
const { campo, validar } = require('../validators');

const router = express.Router();

/* GET /billing/planos â€” lista pÃºblica de planos (sem auth) */
router.get('/planos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, codigo, nome, descricao, preco_mensal, limite_agendamentos_mes, limite_barbeiros, recursos FROM planos WHERE ativo = TRUE ORDER BY preco_mensal'
    );
    res.json({ ok: true, planos: rows });
  } catch (e) { res.status(500).json({ ok: false, erro: e.message }); }
});

/* GET /billing/assinatura â€” assinatura atual do tenant */
router.get('/assinatura', async (req, res) => {
  try {
    const tenantId = req.tenantId || 1;
    const r = await pool.query(`
      SELECT a.*, p.nome AS plano_nome, p.codigo AS plano_codigo, p.preco_mensal, p.recursos
      FROM assinaturas a
      JOIN planos p ON p.id = a.plano_id
      WHERE a.tenant_id = $1
      ORDER BY a.criado_em DESC
      LIMIT 1
    `, [tenantId]);
    if (r.rows.length === 0) return res.json({ ok: true, assinatura: null });
    res.json({ ok: true, assinatura: r.rows[0] });
  } catch (e) { res.status(500).json({ ok: false, erro: e.message }); }
});

/* GET /billing/faturas â€” histÃ³rico de faturas do tenant */
router.get('/faturas', async (req, res) => {
  try {
    const tenantId = req.tenantId || 1;
    const r = await pool.query(
      'SELECT * FROM faturas WHERE tenant_id = $1 ORDER BY criado_em DESC LIMIT 50',
      [tenantId]
    );
    res.json({ ok: true, faturas: r.rows });
  } catch (e) { res.status(500).json({ ok: false, erro: e.message }); }
});

/* POST /billing/checkout  body: { plano_id, ciclo, cpf_cnpj }
   Cria customer no Asaas (se preciso) e gera a 1Âª cobranÃ§a (PIX ou boleto). */
router.post('/checkout', validar([
  campo('plano_id').presente().inteiro({ min: 1 }),
  campo('ciclo').opcional().enum(['mensal', 'anual']),
  campo('cpf_cnpj').presente(),
]), async (req, res) => {
  if (!asaas.habilitado()) {
    return res.status(503).json({ ok: false, erro: 'Pagamentos ainda nÃ£o configurados. Defina ASAAS_API_KEY no .env do backend.' });
  }
  const { plano_id, ciclo = 'mensal', cpf_cnpj } = req.body;

  const cpfCnpjLimpo = String(cpf_cnpj).replace(/\D/g, '');
  if (cpfCnpjLimpo.length < 11 || cpfCnpjLimpo.length > 14) {
    return res.status(400).json({ ok: false, erro: 'CPF/CNPJ invÃ¡lido. ForneÃ§a um CPF (11 dÃ­gitos) ou CNPJ (14 dÃ­gitos).' });
  }

  try {
    const tenantId = req.tenantId || 1;
    const t = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (t.rows.length === 0) return res.status(404).json({ ok: false, erro: 'Tenant nÃ£o encontrado.' });
    const tenant = t.rows[0];

    const p = await pool.query('SELECT * FROM planos WHERE id = $1', [plano_id]);
    if (p.rows.length === 0) return res.status(404).json({ ok: false, erro: 'Plano nÃ£o encontrado.' });
    const plano = p.rows[0];

    // 1) customer no Asaas
    const customer = await asaas.garantirCustomer({ ...tenant, cpf_cnpj: cpfCnpjLimpo });
    if (!tenant.asaas_customer_id) {
      await pool.query('UPDATE tenants SET asaas_customer_id = $1, cpf_cnpj = $2 WHERE id = $3', [customer.id, cpfCnpjLimpo, tenantId]);
    }

    // 2) cobranÃ§a avulsa (1Âª mensalidade)
    const hoje = new Date();
    const vencimento = new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 dias
      .toISOString().slice(0, 10);
    const cobranca = await asaas.criarCobranca({
      customer,
      valor: plano.preco_mensal,
      descricao: `Doctor Barbearia SaaS â€” Plano ${plano.nome}`,
      vencimento,
    });

    // 3) QR PIX (se for PIX â€” billingType UNDEFINED o cliente escolhe; Asaas gera ambos)
    let pix = null;
    try { pix = await asaas.pixQrCode(cobranca.id); } catch (_) {}

    // 4) Grava fatura pendente no banco
    const fat = await pool.query(`
      INSERT INTO faturas (tenant_id, asaas_payment_id, valor, status, metodo, data_vencimento, pix_copia_cola, pix_qr_code, fatura_url, boleto_url)
      VALUES ($1, $2, $3, 'pendente', $4, $5, $6, $7, $8, $9) RETURNING *
    `, [
      tenantId, cobranca.id, plano.preco_mensal,
      cobranca.billingType, vencimento,
      pix?.payload || null, pix?.encodedImage || null,
      cobranca.invoiceUrl, cobranca.bankSlipUrl,
    ]);

    // 5) Marca intenÃ§Ã£o de assinatura (criada de fato quando webhook confirmar pagamento)
    await pool.query(`
      UPDATE assinaturas SET plano_id = $1, status = 'ativa', data_proxima_cobranca = $2
      WHERE tenant_id = $3
    `, [plano.id, vencimento, tenantId]);

    res.json({
      ok: true,
      fatura: fat.rows[0],
      checkout: {
        payment_id: cobranca.id,
        invoice_url: cobranca.invoiceUrl,
        bank_slip_url: cobranca.bankSlipUrl,
        pix_copia_cola: pix?.payload,
        pix_qr_code: pix?.encodedImage,
        vencimento,
        valor: plano.preco_mensal,
      },
    });
  } catch (e) {
    console.error('âŒ checkout:', e.response?.data || e.message);
    res.status(500).json({ ok: false, erro: e.response?.data?.errors?.[0]?.description || e.message });
  }
});

/* POST /billing/cancelar â€” cancela assinatura do tenant */
router.post('/cancelar', async (req, res) => {
  try {
    const tenantId = req.tenantId || 1;
    const r = await pool.query(`
      UPDATE assinaturas SET status = 'cancelada', data_fim = NOW()
      WHERE tenant_id = $1 AND status IN ('ativa','trial','inadimplente')
      RETURNING *
    `, [tenantId]);
    res.json({ ok: true, assinatura: r.rows[0] || null });
  } catch (e) { res.status(500).json({ ok: false, erro: e.message }); }
});

/* POST /webhooks/asaas â€” recebe notificaÃ§Ãµes de pagamento
   Asaas envia eventos: PAYMENT_CREATED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, etc.
   Validamos o token de seguranÃ§a (ASAAS_WEBHOOK_TOKEN) e atualizamos faturas/assinaturas. */
router.post('/webhooks/asaas', express.json({ type: '*/*' }), async (req, res) => {
  const token = req.query.token || req.headers['asaas-access-token'];
  if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ ok: false, erro: 'token invÃ¡lido' });
  }
  const ev = req.body;
  try {
    if (ev?.event === 'PAYMENT_RECEIVED' || ev?.event === 'PAYMENT_CONFIRMED') {
      const payment = ev.payment;
      const status = 'paga';
      const dataPag = payment.paymentDate || new Date().toISOString();
      await pool.query(`
        UPDATE faturas
        SET status = $1, data_pagamento = $2, metodo = COALESCE(metodo, $3)
        WHERE asaas_payment_id = $4
      `, [status, dataPag, payment.billingType, payment.id]);
      // estende assinatura por +30 dias
      await pool.query(`
        UPDATE assinaturas
        SET status = 'ativa', data_proxima_cobranca = NOW() + INTERVAL '30 days'
        WHERE tenant_id = (SELECT tenant_id FROM faturas WHERE asaas_payment_id = $1 LIMIT 1)
      `, [payment.id]);
    } else if (ev?.event === 'PAYMENT_OVERDUE') {
      await pool.query(`UPDATE faturas SET status = 'atrasada' WHERE asaas_payment_id = $1`, [ev.payment.id]);
    } else if (ev?.event === 'PAYMENT_REFUNDED') {
      await pool.query(`UPDATE faturas SET status = 'reembolsada' WHERE asaas_payment_id = $1`, [ev.payment.id]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('âŒ webhook asaas:', e.message);
    res.status(500).json({ ok: false, erro: e.message });
  }
});


module.exports = router;
