const pool   = require('./connection');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🧹 Limpando banco...');

    await client.query('DELETE FROM agendamentos');
    await client.query('DELETE FROM clientes');
    await client.query('DELETE FROM servicos');
    await client.query('DELETE FROM barbeiros');
    await client.query('ALTER SEQUENCE barbeiros_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE servicos_id_seq RESTART WITH 1');

    console.log('✅ Banco limpo!');
    console.log('🌱 Inserindo dados...');

    // 5 barbeiros
    await client.query(`
      INSERT INTO barbeiros (nome, especialidade, avaliacao, total_cortes) VALUES
        ('Carlos Silva',   'Especialista em Degradê',      4.9, 1240),
        ('Rafael Souza',   'Mestre em Barba Clássica',     5.0, 2100),
        ('Diego Mendes',   'Cortes Modernos e Navalhados', 4.8,  980),
        ('Bruno Costa',    'Platinado e Coloração',        4.7,  750),
        ('Thiago Alves',   'Corte Infantil e Tesoura',     4.9,  630)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ 5 barbeiros inseridos!');

    // 8 serviços sem duplicatas
    await client.query(`
      INSERT INTO servicos (nome, descricao, duracao_min, preco, emoji) VALUES
        ('Corte Clássico',   'Tesoura ou máquina',           30,  40.00, '✂️'),
        ('Corte + Barba',    'Combo completo',                55,  70.00, '🪒'),
        ('Barba Completa',   'Navalha + toalha quente',       35,  40.00, '🧔'),
        ('Degradê',          'Low fade, mid fade ou high',    40,  50.00, '💈'),
        ('Platinado',        'Descoloração profissional',     90, 130.00, '⚡'),
        ('Sobrancelha',      'Design e aparagem',             15,  20.00, '👁️'),
        ('Hidratação',       'Barba + cabelo com óleos',      45,  55.00, '🧴'),
        ('Pezinho',          'Acabamento do pescoço',         15,  25.00, '💇')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ 8 serviços inseridos!');

    // Gestor padrão
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO usuarios (nome, email, whatsapp, senha_hash, perfil)
      VALUES ('Administrador', 'luan@doctorbarbearia.com', '5512982671917', $1, 'gestor')
      ON CONFLICT (email) DO UPDATE SET senha_hash = $1;
    `, [hash]);
    console.log('✅ Gestor atualizado!');

    console.log('\n🎉 Banco populado com sucesso!');
    console.log('   👨 Gestor: luan@doctorbarbearia.com / admin123');
    console.log('   ✂️  5 barbeiros e 8 serviços cadastrados');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
