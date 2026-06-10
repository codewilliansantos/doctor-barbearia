const pool = require('./connection');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Atualizando tabelas...');

    /* Adiciona colunas de pagamento na tabela agendamentos */
    await client.query(`
      ALTER TABLE agendamentos
        ADD COLUMN IF NOT EXISTS pagamento_status  VARCHAR(20) DEFAULT 'pendente'
          CHECK (pagamento_status IN ('pendente','pago','reembolsado')),
        ADD COLUMN IF NOT EXISTS pagamento_metodo  VARCHAR(30),
        ADD COLUMN IF NOT EXISTS pagamento_ref     VARCHAR(100),
        ADD COLUMN IF NOT EXISTS lembrete_enviado  BOOLEAN DEFAULT FALSE;
    `);

    console.log('✅ Colunas de pagamento adicionadas!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
