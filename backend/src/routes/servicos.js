const express = require('express');
const router  = express.Router();
const pool    = require('../database/connection');

// GET /servicos — lista todos os serviços ativos
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM servicos WHERE ativo = TRUE AND tenant_id = $1 ORDER BY id`,
      [req.tenantId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
