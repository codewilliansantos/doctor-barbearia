const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');
const { autenticar, soGestor } = require('./auth');
const { campo, validar } = require('../validators');

router.get('/', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, email, telefone, foto_url, especialidade AS funcao, profissao,
              endereco, rg, cpf, bio, ativo, avaliacao, total_cortes, criado_em
       FROM barbeiros WHERE tenant_id = $1 ORDER BY ativo DESC, nome ASC`,
      [req.tenantId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.post('/', autenticar, soGestor, validar([
  campo('nome').presente().texto({ min: 1, max: 120 }),
  campo('email').opcional().texto({ max: 150 }),
  campo('telefone').opcional().texto({ max: 20 }),
  campo('foto_url').opcional().texto({ max: 500 }),
  campo('funcao').opcional().texto({ max: 60 }),
  campo('profissao').opcional().texto({ max: 100 }),
  campo('endereco').opcional().texto({ max: 300 }),
  campo('rg').opcional().texto({ max: 20 }),
  campo('cpf').opcional().texto({ max: 14 }),
  campo('bio').opcional().texto({ max: 2000 }),
]), async (req, res) => {
  const { nome, email, telefone, foto_url, funcao, profissao, endereco, rg, cpf, bio } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO barbeiros (nome, email, telefone, foto_url, especialidade, profissao, endereco, rg, cpf, bio, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [nome, email || null, telefone || null, foto_url || null, funcao || null, profissao || null, endereco || null, rg || null, cpf || null, bio || null, req.tenantId]
    );
    res.status(201).json({ ok: true, data: rows[0], mensagem: 'Colaborador criado!' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.put('/:id', autenticar, soGestor, validar([
  campo('nome').opcional().texto({ min: 1, max: 120 }),
  campo('email').opcional().texto({ max: 150 }),
  campo('telefone').opcional().texto({ max: 20 }),
  campo('foto_url').opcional().texto({ max: 500 }),
  campo('funcao').opcional().texto({ max: 60 }),
  campo('profissao').opcional().texto({ max: 100 }),
  campo('endereco').opcional().texto({ max: 300 }),
  campo('rg').opcional().texto({ max: 20 }),
  campo('cpf').opcional().texto({ max: 14 }),
  campo('bio').opcional().texto({ max: 2000 }),
  campo('ativo').opcional().booleano(),
]), async (req, res) => {
  const { nome, email, telefone, foto_url, funcao, profissao, endereco, rg, cpf, bio, ativo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE barbeiros SET
        nome = COALESCE($1, nome),
        email = $2,
        telefone = $3,
        foto_url = $4,
        especialidade = $5,
        profissao = $6,
        endereco = $7,
        rg = $8,
        cpf = $9,
        bio = $10,
        ativo = COALESCE($11, ativo),
        criado_em = criado_em
       WHERE id = $12 AND tenant_id = $13 RETURNING *`,
      [nome, email, telefone, foto_url, funcao, profissao, endereco, rg, cpf, bio, ativo, req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, erro: 'Colaborador não encontrado.' });
    res.json({ ok: true, data: rows[0], mensagem: 'Colaborador atualizado!' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

router.delete('/:id', autenticar, soGestor, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM barbeiros WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, erro: 'Colaborador não encontrado.' });
    res.json({ ok: true, mensagem: 'Colaborador excluído.' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;