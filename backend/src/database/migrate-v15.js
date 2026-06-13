const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS email VARCHAR(150)`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS foto_url TEXT`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS funcao VARCHAR(60)`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS profissao VARCHAR(100)`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS endereco VARCHAR(300)`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS rg VARCHAR(20)`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS cpf VARCHAR(14)`);
    await client.query(`ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS bio TEXT`);

    await client.query('COMMIT');
    console.log('✅ Migration v15: colunas de colaborador adicionadas em barbeiros');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v15 falhou:', e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();