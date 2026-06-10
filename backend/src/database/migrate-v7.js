const pool = require('../database/connection');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* Pacotes de serviços/produtos — compra antecipada, X sessoes */
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacotes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(120) NOT NULL,
        descricao TEXT,
        preco_total NUMERIC(10,2) NOT NULL,
        sessoes INTEGER NOT NULL,
        validade_dias INTEGER DEFAULT 180,
        ativo BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    /* Itens que compõem o pacote (serviços inclusos) */
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacote_servicos (
        id SERIAL PRIMARY KEY,
        pacote_id INTEGER REFERENCES pacotes(id) ON DELETE CASCADE,
        servico_id INTEGER REFERENCES servicos(id) ON DELETE CASCADE,
        quantidade INTEGER DEFAULT 1
      )
    `);

    /* Pacotes comprados por clientes */
    await client.query(`
      CREATE TABLE IF NOT EXISTS cliente_pacotes (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
        pacote_id INTEGER REFERENCES pacotes(id) ON DELETE RESTRICT,
        sessoes_restantes INTEGER NOT NULL,
        sessoes_usadas INTEGER DEFAULT 0,
        data_compra TIMESTAMP DEFAULT NOW(),
        data_validade DATE,
        status VARCHAR(20) DEFAULT 'ativo',
        codigo VARCHAR(20) UNIQUE
      )
    `);

    /* Registro de cada uso (sessão utilizada) */
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacote_usos (
        id SERIAL PRIMARY KEY,
        cliente_pacote_id INTEGER REFERENCES cliente_pacotes(id) ON DELETE CASCADE,
        agendamento_id INTEGER REFERENCES agendamentos(id) ON DELETE SET NULL,
        usado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Migração v7 aplicada (pacotes de serviços)');
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
