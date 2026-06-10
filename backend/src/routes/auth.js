const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../database/connection');
const { campo, validar } = require('../validators');
const router   = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'doctor_barbearia_secret_2025';

/* ── POST /auth/cadastro ── */
router.post('/cadastro', validar([
  campo('nome').presente().texto({ min: 1, max: 120 }),
  campo('email').presente().email(),
  campo('senha').presente().senha(),
  campo('whatsapp').opcional().whatsapp(),
]), async (req, res) => {
  const { nome, email, whatsapp, senha } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ ok: false, erro: 'Nome, e-mail e senha são obrigatórios.' });

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0)
      return res.status(409).json({ ok: false, erro: 'E-mail já cadastrado.' });

    const hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, whatsapp, senha_hash, perfil)
       VALUES ($1, $2, $3, $4, 'cliente') RETURNING id, nome, email, whatsapp, perfil`,
      [nome, email, whatsapp || null, hash]
    );

    const usuario = rows[0];
    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil, nome: usuario.nome, whatsapp: usuario.whatsapp || null },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ ok: true, token, usuario });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* ── POST /auth/login ── */
router.post('/login', validar([
  campo('email').presente().email(),
  campo('senha').presente().senha(),
]), async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ ok: false, erro: 'E-mail e senha são obrigatórios.' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1', [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ ok: false, erro: 'E-mail ou senha incorretos.' });

    const usuario = rows[0];
    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk)
      return res.status(401).json({ ok: false, erro: 'E-mail ou senha incorretos.' });

    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil, nome: usuario.nome, whatsapp: usuario.whatsapp },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      ok: true, token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, whatsapp: usuario.whatsapp, perfil: usuario.perfil }
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* ── PATCH /auth/me/whatsapp — atualiza WhatsApp do usuário logado ── */
router.patch('/me/whatsapp', autenticar, validar([
  campo('whatsapp').presente().whatsapp(),
]), async (req, res) => {
  const { whatsapp } = req.body;
  const limpo = String(whatsapp || '').replace(/\D/g, '');

  if (limpo.length < 10 || limpo.length > 13)
    return res.status(400).json({ ok: false, erro: 'WhatsApp inválido. Informe DDD + número.' });

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET whatsapp = $1
       WHERE id = $2
       RETURNING id, nome, email, whatsapp, perfil`,
      [limpo, req.usuario.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });

    res.json({ ok: true, mensagem: 'WhatsApp atualizado.', usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* ── GET /auth/me ── */
router.get('/me', autenticar, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, whatsapp, perfil, criado_em FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });

    res.json({ ok: true, usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/* ── Middleware de autenticação ── */
function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ ok: false, erro: 'Token não informado.' });

  const token = header.replace('Bearer ', '');
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, erro: 'Token inválido ou expirado.' });
  }
}

function soGestor(req, res, next) {
  if (!req.usuario || req.usuario.perfil !== 'gestor')
    return res.status(403).json({ ok: false, erro: 'Acesso restrito a gestores.' });
  next();
}

module.exports = router;
module.exports.autenticar = autenticar;
module.exports.soGestor = soGestor;
