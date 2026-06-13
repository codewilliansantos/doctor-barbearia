const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`UPDATE barbeiros SET
      email = 'luan@doctorbarbearia.com', telefone = '(11) 98765-4321',
      funcao = 'Barbeiro Senior', profissao = 'Cabeleireiro',
      endereco = 'Rua Augusta, 1500 - Consolação, São Paulo - SP',
      rg = '12.345.678-9', cpf = '123.456.789-01',
      bio = 'Especialista em cortes modernos e degradê. 8 anos de experiência.'
      WHERE nome = 'Luan'`);

    await client.query(`UPDATE barbeiros SET
      email = 'braz@doctorbarbearia.com', telefone = '(11) 98765-4322',
      funcao = 'Mestre Barbeiro', profissao = 'Barbeiro Tradicional',
      endereco = 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      rg = '23.456.789-0', cpf = '234.567.890-12',
      bio = 'Mestre da barba, tradicional e na toalha quente. 15 anos de experiência.'
      WHERE nome = 'Braz'`);

    await client.query(`UPDATE barbeiros SET
      email = 'willian@doctorbarbearia.com', telefone = '(11) 98765-4323',
      funcao = 'Barbeiro Pleno', profissao = 'Cabeleireiro',
      endereco = 'Rua Oscar Freire, 500 - Jardins, São Paulo - SP',
      rg = '34.567.890-1', cpf = '345.678.901-23',
      bio = 'Expert em platinado, coloração e cortes criativos. 6 anos de experiência.'
      WHERE nome = 'Willian'`);

    await client.query('COMMIT');
    console.log('✅ Colaboradores atualizados com dados complementares');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();