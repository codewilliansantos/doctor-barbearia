const pool = require('../database/connection');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Garante que existe a row de config
    await client.query(`INSERT INTO configuracoes DEFAULT VALUES ON CONFLICT DO NOTHING`);

    // Colunas novas na tabela de configurações (lembretes / retorno)
    await client.query(`
      ALTER TABLE configuracoes
        ADD COLUMN IF NOT EXISTS lembrete_24h_ativo BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS lembrete_1h_ativo  BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS msg_retorno_ativo  BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS msg_retorno_dias   INTEGER DEFAULT 15
    `);

    // Coluna para rastrear lembrete de 24h
    await client.query(`
      ALTER TABLE agendamentos
        ADD COLUMN IF NOT EXISTS lembrete_24h_enviado BOOLEAN DEFAULT FALSE
    `);

    // Coluna de data de nascimento no cliente (para aniversariantes)
    await client.query(`
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS data_nascimento DATE
    `);

    // Colunas para lista de espera
    await client.query(`
      CREATE TABLE IF NOT EXISTS lista_espera (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
        servico_id INTEGER REFERENCES servicos(id) ON DELETE SET NULL,
        barbeiro_id INTEGER REFERENCES barbeiros(id) ON DELETE SET NULL,
        data_desejada DATE NOT NULL,
        periodo VARCHAR(20) DEFAULT 'qualquer',
        status VARCHAR(20) DEFAULT 'aguardando',
        notificado_em TIMESTAMP,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Jornada de trabalho dos profissionais
    await client.query(`
      CREATE TABLE IF NOT EXISTS jornadas (
        id SERIAL PRIMARY KEY,
        barbeiro_id INTEGER REFERENCES barbeiros(id) ON DELETE CASCADE,
        dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
        hora_inicio TIME NOT NULL,
        hora_fim TIME NOT NULL,
        ativo BOOLEAN DEFAULT TRUE,
        UNIQUE(barbeiro_id, dia_semana)
      )
    `);

    // Encaixes (jornada estendida em data específica)
    await client.query(`
      CREATE TABLE IF NOT EXISTS encaixes (
        id SERIAL PRIMARY KEY,
        barbeiro_id INTEGER REFERENCES barbeiros(id) ON DELETE CASCADE,
        data DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fim TIME NOT NULL,
        motivo VARCHAR(200),
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Migração v5 aplicada (lembretes 24h + retorno + aniversariantes + lista_espera + jornadas)');
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
