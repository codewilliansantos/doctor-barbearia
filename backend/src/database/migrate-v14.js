const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT
    `);
    await client.query(`
      ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS google_calendar_email VARCHAR(200)
    `);
    await client.query(`
      ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS google_calendar_ativo BOOLEAN DEFAULT FALSE
    `);

    await client.query('COMMIT');
    console.log('✅ Migration v14: google calendar columns added to configuracoes');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v14 falhou:', e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();