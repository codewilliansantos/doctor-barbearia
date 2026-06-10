/**
 * Testes do módulo de auth — login, registro, token.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth', () => {
  let app;
  let pool;
  const TEST_USUARIO = { id: 999, nome: 'Teste', email: 'teste@auth.com', whatsapp: '11999990000', senha: '123456' };
  const SENHA_HASH = bcrypt.hashSync(TEST_USUARIO.senha, 10);

  beforeAll(() => {
    jest.mock('../src/database/connection', () => require('./helpers/mockPool'));
    pool = require('../src/database/connection');
    app = require('../src/server');
  });

  beforeEach(() => {
    pool.setupTest();
  });

  describe('POST /auth/login', () => {
    test('login com credenciais válidas retorna token', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ...TEST_USUARIO, senha_hash: SENHA_HASH, tipo: 'cliente', ativo: true }] });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: TEST_USUARIO.email, senha: TEST_USUARIO.senha });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.usuario.email).toBe(TEST_USUARIO.email);

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(TEST_USUARIO.id);
    });

    test('login com senha inválida retorna 401', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ...TEST_USUARIO, senha_hash: SENHA_HASH, tipo: 'cliente', ativo: true }] });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: TEST_USUARIO.email, senha: 'senha-errada' });

      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    test('login com email inexistente retorna 401', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'naoexiste@email.com', senha: 'qualquer' });

      expect(res.status).toBe(401);
    });

    test('login sem email/senha retorna 400', async () => {
      const res = await request(app).post('/auth/login').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    test('rota protegida rejeita sem token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    test('rota protegida aceita token válido', async () => {
      const token = jwt.sign({ id: TEST_USUARIO.id, perfil: 'cliente' }, process.env.JWT_SECRET);
      // O /auth/me busca: id, nome, email, whatsapp, tipo do banco
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: TEST_USUARIO.id,
          nome: TEST_USUARIO.nome,
          email: TEST_USUARIO.email,
          whatsapp: TEST_USUARIO.whatsapp,
          tipo: 'cliente',
        }],
      });

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // O body do /auth/me é o próprio row (pode ser o row inteiro ou apenas alguns campos)
      expect(res.body.email || res.body.usuario?.email).toBe(TEST_USUARIO.email);
    });
  });
});
