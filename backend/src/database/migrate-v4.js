const pool = require('./connection');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Criando tabela de configuracoes...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id                    SERIAL PRIMARY KEY,
        barbearia_nome        VARCHAR(100) DEFAULT 'Doctor Barbearia',
        barbearia_telefone    VARCHAR(20),
        barbearia_endereco    VARCHAR(200),
        pagseguro_token       TEXT,
        pagseguro_ativo       BOOLEAN DEFAULT FALSE,
        zapi_instance         VARCHAR(100),
        zapi_token            VARCHAR(100),
        zapi_client_token     VARCHAR(100),
        whatsapp_ativo        BOOLEAN DEFAULT FALSE,
        criado_em             TIMESTAMP DEFAULT NOW(),
        atualizado_em         TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insere registro padrão se não existir
    await client.query(`
      INSERT INTO configuracoes (id, barbearia_nome)
      VALUES (1, 'Doctor Barbearia')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('Tabela configuracoes criada!');
    console.log('migrate-v4.js executado com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
