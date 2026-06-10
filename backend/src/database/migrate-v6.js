const pool = require('../database/connection');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE agendamentos
        ADD COLUMN IF NOT EXISTS retorno_enviado BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS cancelado_em    TIMESTAMP
    `);

    console.log('✅ Migração v6 aplicada (retorno_enviado + cancelado_em)');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

migrate().then(() => pool.end()).catch(err => {
  console.error('❌ Erro:', err.message);
  pool.end();
});
