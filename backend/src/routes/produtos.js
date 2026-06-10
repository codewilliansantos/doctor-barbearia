/**
 * Rotas de Produtos — público (catálogo) e gestor (CRUD).
 *
 * Público:
 *   GET  /produtos                   — lista ativos (com filtro ?categoria=)
 *   GET  /produtos/destaque          — só os em destaque (home)
 *   GET  /produtos/:id               — detalhes de um produto
 *
 * Gestor:
 *   GET    /produtos/gestor/todos    — lista TODOS (inclusive inativos)
 *   POST   /produtos/gestor          — cria
 *   PUT    /produtos/gestor/:id      — atualiza
 *   PATCH  /produtos/gestor/:id/estoque    — ajuste rápido de estoque
 *   PATCH  /produtos/gestor/:id/reativar   — reativa produto desativado
 *   DELETE /produtos/gestor/:id      — soft delete (ativo=false)
 */
const express = require('express');
const pool    = require('../database/connection');
const { autenticar, soGestor } = require('./auth');
const { campo, validar } = require('../validators');

const router  = express.Router();

/* ──────────── GESTOR (rotas específicas ANTES do catch-all /:id) ──────────── */

router.get('/gestor/todos', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM produtos WHERE tenant_id = $1 ORDER BY ativo DESC, destaque DESC, nome ASC`,
      [req.tenantId]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.post('/gestor', autenticar, soGestor, validar([
  campo('nome').presente().texto({ min: 1, max: 120 }),
  campo('descricao').opcional().texto({ max: 1000 }),
  campo('categoria').opcional().texto({ max: 60 }),
  campo('preco').presente().numero({ min: 0, max: 999999.99 }),
  campo('estoque').opcional().inteiro({ min: 0, max: 99999 }),
  campo('foto_url').opcional().texto({ max: 500 }),
  campo('destaque').opcional().booleano(),
]), async (req, res) => {
  const { nome, descricao, categoria, preco, estoque, foto_url, destaque } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO produtos (nome, descricao, categoria, preco, estoque, foto_url, destaque, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, FALSE), $8)
       RETURNING *`,
      [nome, descricao || null, categoria || null, Number(preco) || 0, estoque ?? null, foto_url || null, destaque, req.tenantId]
    );
    res.status(201).json({ ok: true, data: rows[0], mensagem: 'Produto criado!' });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.put('/gestor/:id', autenticar, soGestor, validar([
  campo('nome').opcional().texto({ min: 1, max: 120 }),
  campo('descricao').opcional().texto({ max: 1000 }),
  campo('categoria').opcional().texto({ max: 60 }),
  campo('preco').opcional().numero({ min: 0, max: 999999.99 }),
  campo('estoque').opcional().inteiro({ min: 0, max: 99999 }),
  campo('foto_url').opcional().texto({ max: 500 }),
  campo('destaque').opcional().booleano(),
  campo('ativo').opcional().booleano(),
]), async (req, res) => {
  const { nome, descricao, categoria, preco, estoque, foto_url, destaque, ativo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE produtos
       SET nome = COALESCE($1, nome),
           descricao = $2,
           categoria = $3,
           preco = COALESCE($4, preco),
           estoque = $5,
           foto_url = $6,
           destaque = COALESCE($7, destaque),
           ativo = COALESCE($8, ativo),
           atualizado_em = NOW()
       WHERE id = $9 AND tenant_id = $10
       RETURNING *`,
      [nome, descricao, categoria, preco, estoque, foto_url, destaque, ativo, req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true, data: rows[0], mensagem: 'Produto atualizado!' });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.patch('/gestor/:id/estoque', autenticar, soGestor, validar([
  campo('estoque').presente().inteiro({ min: 0, max: 99999 }),
]), async (req, res) => {
  const { estoque } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE produtos SET estoque = $1, atualizado_em = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [Number(estoque), req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true, data: rows[0], mensagem: 'Estoque atualizado.' });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.patch('/gestor/:id/reativar', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE produtos SET ativo = TRUE, atualizado_em = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true, data: rows[0], mensagem: 'Produto reativado.' });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.delete('/gestor/:id', autenticar, soGestor, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE produtos SET ativo = FALSE, atualizado_em = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true, mensagem: 'Produto desativado.' });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

/* ──────────── PÚBLICO ──────────── */

router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    let sql = `SELECT id, nome, descricao, categoria, preco, foto_url, destaque
               FROM produtos
               WHERE ativo = TRUE AND tenant_id = $1`;
    const params = [req.tenantId];
    if (categoria) {
      params.push(categoria);
      sql += ` AND categoria = $2`;
    }
    sql += ` ORDER BY destaque DESC, nome ASC`;
    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.get('/destaque', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, descricao, categoria, preco, foto_url
       FROM produtos
       WHERE ativo = TRUE AND destaque = TRUE AND tenant_id = $1
       ORDER BY nome ASC
       LIMIT 8`,
      [req.tenantId]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM produtos WHERE id = $1 AND ativo = TRUE AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, erro: 'Produto não encontrado.' });
    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

module.exports = router;
