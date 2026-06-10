/**
 * Migration v12 — Completa isolamento multi-tenant (reescrita com Client direto)
 *
 * Tabelas que ainda NÃO tinham tenant_id (v11 cobriu apenas 7 tabelas):
 *   - caixa_sessoes, caixa_movimentacoes
 *   - contas_pagar, contas_receber
 *   - venda_itens
 *   - jornadas, encaixes, lista_espera
 *   - pacotes, pacote_servicos, cliente_pacotes, pacote_usos
 *   - configuracoes (singleton id=1 — adiciona tenant_id, mas mantém id=1)
 *   - pagamentos
 *
 * Migração retroativa: tudo vira tenant_id=1, sem perda de dados.
 *
 * Por que Client direto? Em alguns ambientes o pool fica em estado ruim
 * após SIGKILL e o `client.connect()` trava. Esta versão usa Client,
 * finaliza com end() explícito e cai rápido em caso de erro.
 */
require('dotenv').config();
const { Client } = require('pg');

const TABELAS_NOVAS = [
  'caixa_sessoes',
  'caixa_movimentacoes',
  'contas_pagar',
  'contas_receber',
  'venda_itens',
  'jornadas',
  'encaixes',
  'lista_espera',
  'pacotes',
  'pacote_servicos',
  'cliente_pacotes',
  'pacote_usos',
  'configuracoes',
  'pagamentos',
];

async function main() {
  const c = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'doctor_barbearia',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
  });

  try {
    await c.connect();
    console.log('✅ Conectado ao PostgreSQL');
    await c.query('BEGIN');

    for (const t of TABELAS_NOVAS) {
      const temCol = await c.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [t]);

      if (temCol.rows.length > 0) {
        console.log(`  • ${t}: já tem tenant_id, pulando`);
        continue;
      }
      await c.query(`ALTER TABLE ${t} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE`);
      await c.query(`UPDATE ${t} SET tenant_id = 1 WHERE tenant_id IS NULL`);
      await c.query(`CREATE INDEX IF NOT EXISTS idx_${t}_tenant ON ${t}(tenant_id)`);
      console.log(`  • ${t}: coluna tenant_id adicionada + registros migrados`);
    }

    await c.query('COMMIT');
    console.log('\n🎉 Migration v12 concluída: isolamento multi-tenant completo!');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro na migration v12:', e.message);
    process.exit(1);
  } finally {
    await c.end();
  }
}

main();
