require('dotenv').config();
const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    // Coloca 1 produto esgotado e 1 com estoque baixo pra testar o alerta
    await client.query(`UPDATE produtos SET estoque = 0 WHERE nome = 'Pomada Modeladora'`);
    await client.query(`UPDATE produtos SET estoque = 3 WHERE nome = 'Shampoo Antiqueda'`);
    const r = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE ativo = TRUE AND estoque IS NOT NULL AND estoque <= 5) AS baixo,
        COUNT(*) FILTER (WHERE ativo = TRUE AND estoque IS NOT NULL AND estoque = 0) AS esgotado
      FROM produtos
    `);
    console.log('📊 Alerta de estoque:', r.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
})();
