require('dotenv').config();
const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const barbeiros = (await client.query('SELECT id, nome FROM barbeiros ORDER BY id')).rows;
    console.log(`📋 Barbeiros: ${barbeiros.map(b => b.nome).join(', ')}`);

    // Ter(2), Qua(3), Qui(4), Sex(5), Sáb(6) — 09:00 às 18:00
    const dias = [2, 3, 4, 5, 6];

    for (const b of barbeiros) {
      // Remove jornadas existentes
      await client.query('DELETE FROM jornadas WHERE barbeiro_id = $1', [b.id]);

      for (const dia of dias) {
        await client.query(`
          INSERT INTO jornadas (barbeiro_id, dia_semana, hora_inicio, hora_fim, ativo)
          VALUES ($1, $2, '09:00', '18:00', TRUE)
        `, [b.id, dia]);
      }
      console.log(`✅ ${b.nome}: Ter-Sex 09:00–18:00 (5 dias)`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 Jornada padrão aplicada a todos os barbeiros!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
