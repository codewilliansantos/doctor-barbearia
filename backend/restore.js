/**
 * Restaura um backup gerado por export_full.js.
 * Uso: node restore.js [caminho/para/backup.sql]
 */
const fs = require('fs');
const pool = require('./src/database/connection');

const file = process.argv[2] || 'db/backup_full.sql';
const sql = fs.readFileSync(file, 'utf8');

(async () => {
  console.log('Restaurando ' + file + '...');
  try {
    await pool.query(sql);
    console.log('✅ Backup restaurado com sucesso.');
  } catch (e) {
    console.error('❌ Erro ao restaurar:', e.message);
    process.exit(1);
  }
  process.exit(0);
})();
