const pool = require('./src/database/connection');
const fs = require('fs');
const path = require('path');

(async () => {
  const tabelas = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );

  console.log('--- TABELAS E CONTAGENS ---');
  const counts = {};
  for (const t of tabelas.rows) {
    const c = await pool.query('SELECT COUNT(*)::int as n FROM "' + t.table_name + '"');
    counts[t.table_name] = c.rows[0].n;
    console.log('  ' + t.table_name.padEnd(30) + ' ' + c.rows[0].n);
  }

  // Exportar schema limpo (DDL puro)
  const dumpFile = path.join(__dirname, '..', '..', 'backup_schema_' + Date.now() + '.sql');
  let sql = '-- Doctor Barbearia - Schema exportado em ' + new Date().toISOString() + '\n\n';

  for (const t of tabelas.rows) {
    const tn = t.table_name;
    if (tn === 'usuarios' || tn.startsWith('caixa_sessoes')) continue; // dados sensíveis voláteis

    const cols = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 ORDER BY ordinal_position
    `, [tn]);

    sql += `\n-- =====================================\n-- Tabela: ${tn}\n-- =====================================\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${tn} (\n`;
    sql += cols.rows.map((c, i) => {
      let s = '  ' + c.column_name + ' ' + c.data_type;
      if (c.character_maximum_length) s += '(' + c.character_maximum_length + ')';
      if (c.is_nullable === 'NO') s += ' NOT NULL';
      if (c.column_default) s += ' DEFAULT ' + c.column_default;
      return s + (i < cols.rows.length - 1 ? ',' : '');
    }).join('\n');
    sql += '\n);\n';
  }

  fs.writeFileSync(dumpFile, sql);
  console.log('\nSchema exportado: ' + dumpFile);
  console.log('Tamanho: ' + (sql.length / 1024).toFixed(1) + ' KB');

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
