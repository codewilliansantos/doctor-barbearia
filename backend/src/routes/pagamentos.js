const express = require('express');
const axios   = require('axios');
const pool    = require('../database/connection');
const { autenticar } = require('./auth');
const { campo, validar } = require('../validators');
const router  = express.Router();

const PAGSEGURO_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.pagseguro.com'
  : 'https://sandbox.api.pagseguro.com';

const HEADERS = {
  'Authorization': `Bearer ${process.env.PAGSEGURO_TOKEN}`,
  'Content-Type': 'application/json',
};

/* â”€â”€ POST /pagamentos/pix â€” gerar QR Code Pix â”€â”€ */
router.post('/pix', validar([
  campo('agendamento_id').presente().inteiro({ min: 1 }),
]), async (req, res) => {
  const { agendamento_id } = req.body;
  if (!agendamento_id)
    return res.status(400).json({ ok: false, erro: 'Informe o agendamento_id.' });

  try {
    /* Buscar dados do agendamento */
    const { rows } = await pool.query(`
      SELECT a.id, a.status, a.pagamento_status,
             s.preco, s.nome AS servico,
             c.nome AS cliente, c.whatsapp,
             b.nome AS barbeiro
      FROM agendamentos a
      JOIN servicos  s ON s.id = a.servico_id
      JOIN clientes  c ON c.id = a.cliente_id
      JOIN barbeiros b ON b.id = a.barbeiro_id
      WHERE a.id = $1 AND a.tenant_id = $2`, [agendamento_id, req.tenantId]);

    if (rows.length === 0)
      return res.status(404).json({ ok: false, erro: 'Agendamento nÃ£o encontrado.' });

    const apt = rows[0];

    if (apt.pagamento_status === 'pago')
      return res.status(400).json({ ok: false, erro: 'Este agendamento jÃ¡ foi pago.' });

    /* Criar cobranÃ§a Pix no PagSeguro */
    const valor = Math.round(Number(apt.preco) * 100); // centavos

    const payload = {
      reference_id: `APT-${agendamento_id}`,
      customer: {
        name: apt.cliente,
        tax_id: req.body.cpf || '00000000000', // CPF obrigatÃ³rio no PagSeguro
        phone: { country: '55', area: apt.whatsapp?.slice(0,2) || '11', number: apt.whatsapp?.slice(2) || '999999999' },
      },
      items: [{
        name: `${apt.servico} - Doctor Barbearia`,
        quantity: 1,
        unit_amount: valor,
      }],
      qr_codes: [{
        amount: { value: valor },
        expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      }],
      notification_urls: [
        `${process.env.API_URL || 'http://localhost:3001'}/pagamentos/webhook`
      ],
    };

    /* Modo sandbox â€” simula QR Code sem chamar API real */
    if (!process.env.PAGSEGURO_TOKEN || process.env.PAGSEGURO_TOKEN === 'seu_token_pagseg') {
      console.log('ðŸ“± [Pagamento simulado] Pix gerado para agendamento', agendamento_id);
      return res.json({
        ok: true,
        simulado: true,
        data: {
          id: `SIM-${agendamento_id}`,
          qr_code: '00020126580014BR.GOV.BCB.PIX0136doctor-barbearia@pix.com0217Doctor Barbearia5204000053039865406' + valor + '5802BR5916Doctor Barbearia6009SAO PAULO62140510' + agendamento_id + '6304ABCD',
          qr_code_image: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX-DOCTOR-BARBEARIA-${agendamento_id}-R$${apt.preco}`,
          valor: apt.preco,
          expira_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }
      });
    }

    const { data } = await axios.post(`${PAGSEGURO_URL}/orders`, payload, { headers: HEADERS });

    const qrCode = data.qr_codes?.[0];

    /* Salvar referÃªncia do pagamento */
    await pool.query(
      `UPDATE agendamentos SET pagamento_ref = $1 WHERE id = $2 AND tenant_id = $3`,
      [data.id, agendamento_id, req.tenantId]
    );

    res.json({
      ok: true,
      data: {
        id: data.id,
        qr_code: qrCode?.text,
        qr_code_image: qrCode?.links?.find(l => l.media === 'image/png')?.href,
        valor: apt.preco,
        expira_em: qrCode?.expiration_date,
      }
    });
  } catch (err) {
    const msg = err.response?.data?.error_messages?.[0]?.description || err.message;
    res.status(500).json({ ok: false, erro: msg });
  }
});

/* â”€â”€ GET /pagamentos/status/:agendamento_id â€” verificar pagamento â”€â”€ */
router.get('/status/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pagamento_status, pagamento_ref FROM agendamentos WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (rows.length === 0)
      return res.status(404).json({ ok: false, erro: 'Agendamento nÃ£o encontrado.' });

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* â”€â”€ POST /pagamentos/webhook â€” receber confirmaÃ§Ã£o do PagSeguro â”€â”€ */
router.post('/webhook', async (req, res) => {
  const { reference_id, charges } = req.body;

  try {
    const agendamento_id = reference_id?.replace('APT-', '');
    const status = charges?.[0]?.status;

    if (agendamento_id && status === 'PAID') {
      // Webhook sem autenticaÃ§Ã£o: tenant vem do prÃ³prio agendamento
      await pool.query(
        `UPDATE agendamentos SET pagamento_status = 'pago' WHERE id = $1`,
        [agendamento_id]
      );
      console.log(`âœ… Pagamento confirmado â†’ Agendamento #${agendamento_id}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook erro:', err.message);
    res.status(500).json({ ok: false });
  }
});

/* â”€â”€ POST /pagamentos/confirmar-manual â€” gestor confirma pagamento presencial â”€â”€ */
router.post('/confirmar-manual', autenticar, validar([
  campo('agendamento_id').presente().inteiro({ min: 1 }),
  campo('metodo').opcional().texto({ max: 30 }),
]), async (req, res) => {
  const { agendamento_id, metodo } = req.body; // metodo: 'dinheiro', 'cartao', 'pix_presencial'

  if (req.usuario.perfil !== 'gestor')
    return res.status(403).json({ ok: false, erro: 'Acesso restrito.' });

  try {
    const { rows } = await pool.query(
      `UPDATE agendamentos
       SET pagamento_status = 'pago', pagamento_metodo = $1
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [metodo || 'presencial', agendamento_id, req.tenantId]
    );
    if (rows.length === 0)
      return res.status(404).json({ ok: false, erro: 'Agendamento nÃ£o encontrado.' });

    res.json({ ok: true, mensagem: 'Pagamento confirmado!', data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;

