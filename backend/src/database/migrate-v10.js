/**
 * Migration v10 — Vendas de produtos
 *
 * Cria as tabelas para registrar vendas da loja/mercadinho.
 * - `vendas`     — cabeçalho (cliente, barbeiro, total, forma de pgto, agendamento opcional)
 * - `venda_itens`— itens (produto, qtd, preço unit, subtotal)
 *
 * Decremento de estoque feito via trigger no INSERT dos itens.
 */
const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendas (
        id              SERIAL PRIMARY KEY,
        cliente_id      INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
        barbeiro_id     INTEGER REFERENCES barbeiros(id) ON DELETE SET NULL,
        agendamento_id  INTEGER REFERENCES agendamentos(id) ON DELETE SET NULL,
        total           NUMERIC(10,2) NOT NULL DEFAULT 0,
        desconto        NUMERIC(10,2) NOT NULL DEFAULT 0,
        forma_pagamento VARCHAR(30) DEFAULT 'dinheiro',
        observacoes     TEXT,
        criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vendas_cliente  ON vendas (cliente_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vendas_criado   ON vendas (criado_em)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vendas_agendamento ON vendas (agendamento_id)`);
    console.log('✅ Tabela vendas criada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS venda_itens (
        id          SERIAL PRIMARY KEY,
        venda_id    INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
        produto_id  INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
        quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
        preco_unit  NUMERIC(10,2) NOT NULL,
        subtotal    NUMERIC(10,2) NOT NULL,
        criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_venda_itens_venda   ON venda_itens (venda_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_venda_itens_produto ON venda_itens (produto_id)`);
    console.log('✅ Tabela venda_itens criada');

    // Trigger que decrementa estoque automaticamente ao inserir item
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_decrementa_estoque() RETURNS trigger AS $$
      BEGIN
        UPDATE produtos
        SET estoque = CASE
              WHEN estoque IS NULL THEN NULL
              ELSE GREATEST(0, estoque - NEW.quantidade)
            END,
            atualizado_em = NOW()
        WHERE id = NEW.produto_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS tg_decrementa_estoque ON venda_itens;
      CREATE TRIGGER tg_decrementa_estoque
      AFTER INSERT ON venda_itens
      FOR EACH ROW EXECUTE FUNCTION trg_decrementa_estoque();
    `);
    console.log('✅ Trigger de decremento de estoque criada');

    await client.query('COMMIT');
    console.log('🎉 Migration v10 concluída com sucesso!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration v10:', e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();
