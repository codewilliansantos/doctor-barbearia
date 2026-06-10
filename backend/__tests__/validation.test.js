/**
 * Teste de validação de entrada e segurança.
 *
 * Verifica:
 *   - Tipos errados (string onde deveria ser número) → 400
 *   - Campos obrigatórios ausentes → 400
 *   - Limites (min/max) respeitados
 *   - SQL injection (em strings) bloqueado pelo parser + parametrização
 *   - XSS (HTML/JS) sanitizado em strings antes do INSERT
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Validação de entrada', () => {
  let app;
  let pool;
  const GESTOR = jwt.sign({ id: 1, perfil: 'gestor' }, process.env.JWT_SECRET);

  beforeAll(() => {
    jest.mock('../src/database/connection', () => require('./helpers/mockPool'));
    pool = require('../src/database/connection');
    app = require('../src/server');
  });

  beforeEach(() => {
    pool.setupTest();
  });

  describe('Auth', () => {
    test('cadastro sem nome → 400', async () => {
      const res = await request(app).post('/auth/cadastro').send({ email: 'a@b.com', senha: '123456' });
      expect(res.status).toBe(400);
    });

    test('cadastro com email inválido → 400', async () => {
      const res = await request(app).post('/auth/cadastro').send({ nome: 'X', email: 'nao-eh-email', senha: '123456' });
      expect(res.status).toBe(400);
    });

    test('cadastro com senha curta (< 6) → 400', async () => {
      const res = await request(app).post('/auth/cadastro').send({ nome: 'X', email: 'a@b.com', senha: '123' });
      expect(res.status).toBe(400);
    });

    test('login com email vazio → 400', async () => {
      const res = await request(app).post('/auth/login').send({ email: '', senha: '123456' });
      expect(res.status).toBe(400);
    });

    test('whatsapp com letras → 400', async () => {
      const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
      const res = await request(app)
        .patch('/auth/me/whatsapp')
        .set('Authorization', `Bearer ${token}`)
        .send({ whatsapp: 'abc123' });
      expect(res.status).toBe(400);
    });
  });

  describe('Agendamentos', () => {
    test('POST sem servico_id → 400', async () => {
      const res = await request(app)
        .post('/agendamentos')
        .send({ barbeiro_id: 1, data_hora: '2026-06-15T14:00:00' });
      expect(res.status).toBe(400);
    });

    test('POST com data_hora inválida → 400', async () => {
      const res = await request(app)
        .post('/agendamentos')
        .send({ servico_id: 1, barbeiro_id: 1, data_hora: 'amanhã' });
      expect(res.status).toBe(400);
    });

    test('avaliação fora de 1-5 → 400', async () => {
      const token = jwt.sign({ id: 1, whatsapp: '11988887777' }, process.env.JWT_SECRET);
      const res = await request(app)
        .patch('/agendamentos/1/avaliar')
        .set('Authorization', `Bearer ${token}`)
        .send({ avaliacao: 10 });
      expect(res.status).toBe(400);
    });
  });

  describe('Financeiro — valores absurdos', () => {
    test('caixa/movimentacao com valor negativo → 400', async () => {
      const res = await request(app)
        .post('/gestor/caixa/movimentacao')
        .set('Authorization', `Bearer ${GESTOR}`)
        .send({ tipo: 'entrada', valor: -100 });
      expect(res.status).toBe(400);
    });

    test('caixa/movimentacao com tipo inválido → 400', async () => {
      const res = await request(app)
        .post('/gestor/caixa/movimentacao')
        .set('Authorization', `Bearer ${GESTOR}`)
        .send({ tipo: 'roubo', valor: 100 });
      expect(res.status).toBe(400);
    });

    test('caixa/movimentacao com valor string → 400', async () => {
      const res = await request(app)
        .post('/gestor/caixa/movimentacao')
        .set('Authorization', `Bearer ${GESTOR}`)
        .send({ tipo: 'entrada', valor: 'muito' });
      expect(res.status).toBe(400);
    });

    test('contas-pagar com data inválida → 400', async () => {
      const res = await request(app)
        .post('/gestor/contas-pagar')
        .set('Authorization', `Bearer ${GESTOR}`)
        .send({ descricao: 'X', valor: 100, data_vencimento: 'ontem' });
      expect(res.status).toBe(400);
    });

    test('contas-pagar com valor > 1M → 400', async () => {
      const res = await request(app)
        .post('/gestor/contas-pagar')
        .set('Authorization', `Bearer ${GESTOR}`)
        .send({ descricao: 'X', valor: 999999999, data_vencimento: '2026-07-10' });
      expect(res.status).toBe(400);
    });
  });

  describe('SQL injection / XSS — strings não devem vazar', () => {
    test('cadastro com nome contendo <script> → é sanitizado antes do INSERT', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // SELECT email
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, nome: 'Foo', email: 'a@b.com', whatsapp: null, perfil: 'cliente' }],
      });
      const res = await request(app)
        .post('/auth/cadastro')
        .send({ nome: '<script>alert(1)</script>Foo', email: 'a@b.com', senha: '123456' });
      expect(res.status).toBe(201);
      // O INSERT é a 2ª query (1ª foi o SELECT email)
      const insertCall = pool.query.mock.calls[1];
      expect(insertCall[1][0]).not.toContain('<script>');
    });

    test('contas-pagar com tentativa de injection em descricao → parametrizado', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, descricao: "'; DROP TABLE contas_pagar; --", valor: 100 }],
      });
      const res = await request(app)
        .post('/gestor/contas-pagar')
        .set('Authorization', `Bearer ${GESTOR}`)
        .send({ descricao: "'; DROP TABLE contas_pagar; --", valor: 100, data_vencimento: '2026-07-10' });
      expect(res.status).toBe(201);
      // A query não contém o SQL injection literal concatenado
      const insertCall = pool.query.mock.calls[1];
      expect(insertCall[0]).toMatch(/INSERT INTO contas_pagar/);
      // O valor está parametrizado (em $2, $3...), não concatenado na string SQL
      expect(insertCall[0]).not.toContain('DROP TABLE');
    });
  });

  describe('Limites de tamanho', () => {
    test('nome com 5000 caracteres → 400', async () => {
      const res = await request(app)
        .post('/auth/cadastro')
        .send({ nome: 'a'.repeat(5000), email: 'a@b.com', senha: '123456' });
      expect(res.status).toBe(400);
    });

    test('descricao de produto com 5000 caracteres → 400', async () => {
      const res = await request(app)
        .post('/produtos/gestor')
        .set('Authorization', `Bearer ${GESTOR}`)
        .send({ nome: 'X', preco: 10, descricao: 'a'.repeat(5000) });
      expect(res.status).toBe(400);
    });
  });
});
