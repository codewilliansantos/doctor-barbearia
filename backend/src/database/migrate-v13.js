const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20)
    `);

    await client.query('COMMIT');
    console.log('✅ Migration v13: adicionado campo cpf_cnpj na tabela tenants');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v13 falhou:', e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();