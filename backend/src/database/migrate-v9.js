/**
 * Migration v9 — Produtos (loja)
 *
 * Cria a tabela `produtos` para a loja/mercadinho da barbearia.
 * - Pode ter foto, descrição, preço, estoque
 * - Categoria (pomada, shampoo, óleo, acessório, etc.)
 * - Ativo/inativo (soft delete)
 * - Estoque opcional (NULL = sem controle de estoque)
 */
const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id           SERIAL PRIMARY KEY,
        nome         VARCHAR(120) NOT NULL,
        descricao    TEXT,
        categoria    VARCHAR(60),
        preco        NUMERIC(10,2) NOT NULL DEFAULT 0,
        estoque      INTEGER,
        foto_url     TEXT,
        ativo        BOOLEAN NOT NULL DEFAULT TRUE,
        destaque     BOOLEAN NOT NULL DEFAULT FALSE,
        criado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_ativo   ON produtos (ativo);
      CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (categoria);
    `);

    console.log('✅ Tabela produtos criada');

    // Seed de produtos de exemplo
    const existentes = await client.query('SELECT COUNT(*)::int AS n FROM produtos');
    if (existentes.rows[0].n === 0) {
      await client.query(`
        INSERT INTO produtos (nome, descricao, categoria, preco, estoque, ativo, destaque) VALUES
        ('Pomada Modeladora',     'Fixação forte com brilho. Ideal para cortes clássicos.',  'pomada',   35.00, 20, TRUE, TRUE),
        ('Shampoo Antiqueda',     'Fortalece os fios e reduz a queda. 300ml.',               'shampoo',  48.00, 15, TRUE, FALSE),
        ('Óleo para Barba',       'Hidrata e amacia a barba. Aroma amadeirado. 30ml.',      'barba',    28.00, 25, TRUE, TRUE),
        ('Cera Modeladora',       'Acabamento matte, fixação média. Não deixa resíduo.',     'pomada',   32.00, 18, TRUE, FALSE),
        ('Balde para Barba',      'Limpa e amacia a barba antes da navalha. 150ml.',         'barba',    25.00, 12, TRUE, FALSE),
        ('Pente de Bolso',        'Pente fino de carbono, ideal para acabamento.',          'acessório', 15.00, 50, TRUE, FALSE),
        ('Toalha de Barbeiro',    'Toalha premium 100% algodão, 30x50cm. Uso profissional.', 'acessório', 45.00, 10, TRUE, FALSE),
        ('Spray Brilho',          'Brilho intenso sem deixar oleoso. 200ml.',                'finalizador', 38.00, 14, TRUE, FALSE)
      `);
      console.log('✅ 8 produtos de exemplo inseridos');
    }

    await client.query('COMMIT');
    console.log('🎉 Migration v9 concluída com sucesso!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration v9:', e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();
