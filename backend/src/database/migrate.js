const pool = require('./connection');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Criando/atualizando tabelas...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id          SERIAL PRIMARY KEY,
        nome        VARCHAR(100) NOT NULL,
        email       VARCHAR(150) NOT NULL UNIQUE,
        whatsapp    VARCHAR(20),
        senha_hash  VARCHAR(255) NOT NULL,
        perfil      VARCHAR(20) DEFAULT 'cliente' CHECK (perfil IN ('cliente','gestor')),
        criado_em   TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clientes (
        id        SERIAL PRIMARY KEY,
        nome      VARCHAR(100) NOT NULL,
        whatsapp  VARCHAR(20) NOT NULL UNIQUE,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS barbeiros (
        id            SERIAL PRIMARY KEY,
        nome          VARCHAR(100) NOT NULL,
        especialidade VARCHAR(100),
        avaliacao     DECIMAL(2,1) DEFAULT 5.0,
        total_cortes  INT DEFAULT 0,
        ativo         BOOLEAN DEFAULT TRUE,
        criado_em     TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS servicos (
        id          SERIAL PRIMARY KEY,
        nome        VARCHAR(100) NOT NULL,
        descricao   VARCHAR(200),
        duracao_min INT NOT NULL,
        preco       DECIMAL(8,2) NOT NULL,
        emoji       VARCHAR(10),
        ativo       BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS agendamentos (
        id               SERIAL PRIMARY KEY,
        cliente_id       INT REFERENCES clientes(id),
        barbeiro_id      INT REFERENCES barbeiros(id),
        servico_id       INT REFERENCES servicos(id),
        data_hora        TIMESTAMP NOT NULL,
        status           VARCHAR(20) DEFAULT 'confirmado'
                         CHECK (status IN ('confirmado','concluido','cancelado')),
        avaliacao        INT CHECK (avaliacao BETWEEN 1 AND 5),
        lembrete_enviado BOOLEAN DEFAULT FALSE,
        observacao       TEXT,
        criado_em        TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_agendamentos_data    ON agendamentos(data_hora);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_barb    ON agendamentos(barbeiro_id);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_status  ON agendamentos(status);
    `);

    await client.query(`
      ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_enviado BOOLEAN DEFAULT FALSE;
    `);

    console.log('✅ Tabelas prontas!');
  } catch (err) {
    console.error('❌ Erro na migration:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
