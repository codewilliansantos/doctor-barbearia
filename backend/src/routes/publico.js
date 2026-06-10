const express = require('express');
const pool    = require('../database/connection');
const router  = express.Router();

/* GET /publico/config — branding do tenant atual (sem auth, usado pelo PWA/app) */
router.get('/config', async (req, res) => {
  res.json({
    ok: true,
    tenant: {
      id: req.tenantId,
      slug: req.tenant?.slug,
      nome: req.tenant?.nome || process.env.BRAND_NAME || 'Doctor Barbearia',
    },
    brand: {
      nome:    req.tenant?.nome || process.env.BRAND_NAME    || 'Doctor Barbearia',
      gold:    req.tenant?.cor_primaria || process.env.BRAND_GOLD || '#C9A84C',
      bg:      req.tenant?.cor_fundo     || process.env.BRAND_BG   || '#060606',
      whatsapp: req.tenant?.whatsapp || process.env.BRAND_WHATSAPP || '',
      logo_url: req.tenant?.logo_url || process.env.BRAND_LOGO_URL || '',
    },
  });
});

/* POST /publico/lista-espera — cliente entra na lista (sem login) */
router.post('/lista-espera', async (req, res) => {
  const { nome, whatsapp, servico_id, barbeiro_id, data_desejada, periodo } = req.body;
  if (!nome || !whatsapp || !data_desejada) {
    return res.status(400).json({ ok: false, erro: 'Campos obrigatórios: nome, whatsapp, data_desejada.' });
  }
  const wppLimpo = String(whatsapp).replace(/\D/g, '');
  if (wppLimpo.length < 10) return res.status(400).json({ ok: false, erro: 'WhatsApp inválido.' });

  try {
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
      INSERT INTO lista_espera (cliente_id, servico_id, barbeiro_id, data_desejada, periodo, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [clienteId, servico_id || null, barbeiro_id || null, data_desejada, periodo || 'qualquer', req.tenantId]);

    res.status(201).json({ ok: true, mensagem: 'Você está na lista de espera! Avisaremos se abrir vaga.', data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
