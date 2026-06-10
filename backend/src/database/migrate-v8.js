const pool = require('../database/connection');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* Sessões de caixa (abertura/fechamento diário) */
    await client.query(`
      CREATE TABLE IF NOT EXISTS caixa_sessoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        data_abertura TIMESTAMP DEFAULT NOW(),
        data_fechamento TIMESTAMP,
        saldo_inicial NUMERIC(10,2) DEFAULT 0,
        saldo_final NUMERIC(10,2),
        status VARCHAR(20) DEFAULT 'aberto',
        observacoes TEXT
      )
    `);

    /* Contas a pagar (fornecedores, despesas) — criada antes pois movimentações dependem */
    await client.query(`
      CREATE TABLE IF NOT EXISTS contas_pagar (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(200) NOT NULL,
        fornecedor VARCHAR(120),
        categoria VARCHAR(40),
        valor NUMERIC(10,2) NOT NULL,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        status VARCHAR(20) DEFAULT 'pendente',
        forma_pagamento VARCHAR(30),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    /* Contas a receber (clientes, fiado, pacotes) */
    await client.query(`
      CREATE TABLE IF NOT EXISTS contas_receber (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(200) NOT NULL,
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
        valor NUMERIC(10,2) NOT NULL,
        data_vencimento DATE NOT NULL,
        data_recebimento DATE,
        status VARCHAR(20) DEFAULT 'pendente',
        forma_pagamento VARCHAR(30),
        agendamento_id INTEGER REFERENCES agendamentos(id) ON DELETE SET NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    /* Movimentações de caixa (entradas e saídas) */
    await client.query(`
      CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
        id SERIAL PRIMARY KEY,
        caixa_id INTEGER REFERENCES caixa_sessoes(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL,
        categoria VARCHAR(40),
        descricao VARCHAR(200),
        valor NUMERIC(10,2) NOT NULL,
        forma_pagamento VARCHAR(30),
        agendamento_id INTEGER REFERENCES agendamentos(id) ON DELETE SET NULL,
        conta_pagar_id INTEGER REFERENCES contas_pagar(id) ON DELETE SET NULL,
        conta_receber_id INTEGER REFERENCES contas_receber(id) ON DELETE SET NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Migração v8 aplicada (caixa + contas a pagar/receber)');
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
