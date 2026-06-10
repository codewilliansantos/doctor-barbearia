/**
 * Testes do módulo financeiro — caixa, contas a pagar/receber.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Gestor - Financeiro', () => {
  let app;
  let pool;
  const GESTOR_TOKEN = jwt.sign({ id: 1, perfil: 'gestor' }, process.env.JWT_SECRET);

  beforeAll(() => {
    jest.mock('../src/database/connection', () => require('./helpers/mockPool'));
    pool = require('../src/database/connection');
    app = require('../src/server');
  });

  beforeEach(() => {
    pool.setupTest();
  });

  describe('GET /gestor/financeiro/resumo', () => {
    test('retorna resumo mensal e pendências', async () => {
      // 5 queries paralelas: entradas, saidas, a_pagar, a_receber, cx_aberto
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '500' }] }) // entradas
        .mockResolvedValueOnce({ rows: [{ total: '200' }] }) // saidas
        .mockResolvedValueOnce({ rows: [{ pendentes: '2', atrasadas: '0', valor_total: '150' }] })
        .mockResolvedValueOnce({ rows: [{ pendentes: '3', atrasadas: '1', valor_total: '800' }] })
        .mockResolvedValueOnce({ rows: [{ entradas: '50', saidas: '30' }] });

      const res = await request(app)
        .get('/gestor/financeiro/resumo')
        .set('Authorization', `Bearer ${GESTOR_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // A rota converte com Number() no response
      expect(res.body.mes.entradas).toBe(500);
      expect(res.body.mes.saidas).toBe(200);
      expect(res.body.mes.lucro).toBe(300);
      // a_pagar e a_receber permanecem como vêm do banco (strings)
      expect(res.body.a_pagar.pendentes).toBe('2');
      expect(res.body.a_receber.atrasadas).toBe('1');
    });

    test('rejeita sem token', async () => {
      const res = await request(app).get('/gestor/financeiro/resumo');
      expect(res.status).toBe(401);
    });

    test('rejeita cliente (não gestor)', async () => {
      const clienteToken = jwt.sign({ id: 7, perfil: 'cliente' }, process.env.JWT_SECRET);
      const res = await request(app)
        .get('/gestor/financeiro/resumo')
        .set('Authorization', `Bearer ${clienteToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /gestor/caixa/abrir', () => {
    test('abre caixa com saldo inicial', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // fecha caixas abertos
        .mockResolvedValueOnce({ rows: [{ id: 1, saldo_inicial: 100 }] }); // insert

      const res = await request(app)
        .post('/gestor/caixa/abrir')
        .set('Authorization', `Bearer ${GESTOR_TOKEN}`)
        .send({ saldo_inicial: 100, observacoes: 'Abertura' });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
    });

    test('rejeita saldo_inicial inválido (validador)', async () => {
      // saldo_inicial como string não-numérica: o validador rejeita antes de chegar no DB
      const res = await request(app)
        .post('/gestor/caixa/abrir')
        .set('Authorization', `Bearer ${GESTOR_TOKEN}`)
        .send({ saldo_inicial: 'abc' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /gestor/contas-pagar', () => {
    test('cria conta a pagar', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, descricao: 'Aluguel', valor: 1500, data_vencimento: '2026-06-10' }],
      });

      const res = await request(app)
        .post('/gestor/contas-pagar')
        .set('Authorization', `Bearer ${GESTOR_TOKEN}`)
        .send({ descricao: 'Aluguel', valor: 1500, data_vencimento: '2026-06-10' });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
    });

    test('rejeita sem descrição', async () => {
      const res = await request(app)
        .post('/gestor/contas-pagar')
        .set('Authorization', `Bearer ${GESTOR_TOKEN}`)
        .send({ valor: 100, data_vencimento: '2026-06-10' });

      expect(res.status).toBe(400);
    });
  });
});
