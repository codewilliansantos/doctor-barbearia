/**
 * Backup full (schema + dados) via node-postgres.
 * Gera um arquivo SQL único com DROP+CREATE+INSERTs para restauração completa.
 */
const pool = require('./src/database/connection');
const fs = require('fs');
const path = require('path');

const TABELAS_SKIP = []; // backup completo, sem skip
const TABELAS_ORDEM = [
  'usuarios', 'barbeiros', 'servicos', 'clientes',
  'agendamentos', 'configuracoes', 'jornadas', 'encaixes',
  'lista_espera', 'pagamentos', 'pacotes', 'pacote_servicos',
  'cliente_pacotes', 'pacote_usos',
  'caixa_sessoes', 'caixa_movimentacoes', 'contas_pagar', 'contas_receber'
];

function escape(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return "'" + v.toISOString() + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

(async () => {
  const tabelas = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  const existe = new Set(tabelas.rows.map(r => r.table_name));
  const ordemFinal = TABELAS_ORDEM.filter(t => existe.has(t) && !TABELAS_SKIP.includes(t));

  let sql = '';
  sql += '-- =========================================\n';
  sql += '-- Doctor Barbearia — Backup completo\n';
  sql += '-- Gerado em: ' + new Date().toISOString() + '\n';
  sql += '-- Restauração: psql -U postgres -d <banco> < backup_full.sql\n';
  sql += '-- =========================================\n\n';
  sql += 'SET client_encoding = \'UTF8\';\n';
  sql += 'SET standard_conforming_strings = \'on\';\n\n';
  sql += 'BEGIN;\n\n';

  for (const tn of ordemFinal) {
    sql += '-- ========================================\n';
    sql += '-- Tabela: ' + tn + '\n';
    sql += '-- ========================================\n';

    const cols = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 ORDER BY ordinal_position
    `, [tn]);

    if (cols.rows.length === 0) continue;

    sql += 'DROP TABLE IF EXISTS "' + tn + '" CASCADE;\n';
    sql += 'CREATE TABLE "' + tn + '" (\n';
    sql += cols.rows.map((c, i) => {
      let s = '  "' + c.column_name + '" ' + c.data_type;
      if (c.character_maximum_length) s += '(' + c.character_maximum_length + ')';
      if (c.is_nullable === 'NO') s += ' NOT NULL';
      if (c.column_default) s += ' DEFAULT ' + c.column_default;
      return s + (i < cols.rows.length - 1 ? ',' : '');
    }).join('\n');
    sql += '\n);\n\n';

    const data = await pool.query('SELECT * FROM "' + tn + '"');
    if (data.rows.length === 0) {
      sql += '-- (sem dados)\n\n';
      continue;
    }

    const colNames = cols.rows.map(c => '"' + c.column_name + '"').join(', ');
    sql += 'INSERT INTO "' + tn + '" (' + colNames + ') VALUES\n';
    sql += data.rows.map((row, i) => {
      const vals = cols.rows.map(c => escape(row[c.column_name])).join(', ');
      return '  (' + vals + ')' + (i < data.rows.length - 1 ? ',' : ';');
    }).join('\n');
    sql += '\n\n';
  }

  sql += '-- Reativar sequences e constraints\n';
  sql += 'SELECT setval(pg_get_serial_sequence(\'usuarios\', \'id\'), COALESCE((SELECT MAX(id) FROM usuarios), 1));\n';
  sql += 'SELECT setval(pg_get_serial_sequence(\'barbeiros\', \'id\'), COALESCE((SELECT MAX(id) FROM barbeiros), 1));\n';
  sql += 'SELECT setval(pg_get_serial_sequence(\'servicos\', \'id\'), COALESCE((SELECT MAX(id) FROM servicos), 1));\n';
  sql += 'SELECT setval(pg_get_serial_sequence(\'clientes\', \'id\'), COALESCE((SELECT MAX(id) FROM clientes), 1));\n';
  sql += 'SELECT setval(pg_get_serial_sequence(\'agendamentos\', \'id\'), COALESCE((SELECT MAX(id) FROM agendamentos), 1));\n';
  sql += 'COMMIT;\n\n';
  sql += '-- Backup concluído.\n';

  const outPath = path.join(__dirname, '..', 'db', 'backup_full.sql');
  fs.writeFileSync(outPath, sql);
  console.log('✅ Backup salvo em: ' + outPath);
  console.log('   Tamanho: ' + (sql.length / 1024).toFixed(1) + ' KB');
  console.log('   Tabelas: ' + ordemFinal.length);
  console.log('   Para restaurar: node backend/restore.js db/backup_full.sql');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
