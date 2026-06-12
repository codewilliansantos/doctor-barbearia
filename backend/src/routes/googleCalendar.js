const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { autenticar, soGestor } = require('./auth');
const googleCalendar = require('../services/googleCalendar');

router.get('/auth-url', autenticar, soGestor, async (req, res) => {
  try {
    const url = googleCalendar.getAuthUrl();
    res.json({ ok: true, url });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ ok: false, erro: 'Código de autorização não informado.' });

  try {
    const tokens = await googleCalendar.getTokensFromCode(code);

    const oauth = require('googleapis').google.auth.OAuth2;
    const client = new oauth(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    client.setCredentials({ access_token: tokens.access_token });
    const plus = require('googleapis').google.oauth2({ version: 'v2', auth: client });
    const userInfo = await plus.userinfo.get();
    const email = userInfo.data.email;

    await pool.query(
      `UPDATE configuracoes SET
        google_calendar_refresh_token = $1,
        google_calendar_email = $2,
        google_calendar_ativo = TRUE,
        atualizado_em = NOW()
       WHERE id = 1`,
      [tokens.refresh_token, email]
    );

    if (state === 'api') {
      return res.json({ ok: true, mensagem: 'Google Agenda conectada!', data: { email, ativo: true } });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/gestor`);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.get('/status', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT google_calendar_ativo, google_calendar_email FROM configuracoes WHERE id = 1`
    );
    const cfg = rows[0] || {};
    res.json({
      ok: true,
      data: {
        ativo: !!cfg.google_calendar_ativo,
        email: cfg.google_calendar_email || null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.delete('/', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT google_calendar_refresh_token FROM configuracoes WHERE id = 1`
    );
    if (rows[0]?.google_calendar_refresh_token) {
      try {
        await googleCalendar.revokeTokens(rows[0].google_calendar_refresh_token);
      } catch {}
    }

    await pool.query(
      `UPDATE configuracoes SET
        google_calendar_refresh_token = NULL,
        google_calendar_email = NULL,
        google_calendar_ativo = FALSE,
        atualizado_em = NOW()
       WHERE id = 1`
    );
    res.json({ ok: true, mensagem: 'Google Agenda desconectada.' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;