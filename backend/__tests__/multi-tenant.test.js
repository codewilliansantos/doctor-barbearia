/**
 * Teste de isolamento multi-tenant.
 *
 * Garante que as rotas filtram por req.tenantId em INSERTs/UPDATEs/DELETEs
 * e que o middleware resolve o tenant corretamente.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Isolamento multi-tenant', () => {
  let app;
  let pool;
  const GESTOR_TENANT_A = jwt.sign({ id: 1, perfil: 'gestor' }, process.env.JWT_SECRET);

  beforeAll(() => {
    jest.mock('../src/database/connection', () => require('./helpers/mockPool'));
    pool = require('../src/database/connection');
    app = require('../src/server');
  });

  beforeEach(() => {
    pool.setupTest();
  });

  describe('Middleware de tenant', () => {
    test('rota pública recebe X-Tenant no response header', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] }); // SELECT 1 do /health
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      // O middleware sempre seta X-Tenant no response
      expect(res.headers['x-tenant']).toBe('doctor');
    });

    test('header X-Tenant-Slug é aceito pelo middleware', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] }); // SELECT 1 do /health
      const res = await request(app)
        .get('/health')
        .set('X-Tenant-Slug', 'outro-slug');
      expect(res.status).toBe(200);
    });
  });

  describe('Financeiro — isolamento em escritas', () => {
    test('POST /gestor/contas-pagar inclui tenant_id no INSERT', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, descricao: 'Aluguel', valor: 1500 }],
      });
      const res = await request(app)
        .post('/gestor/contas-pagar')
        .set('Authorization', `Bearer ${GESTOR_TENANT_A}`)
        .send({ descricao: 'Aluguel', valor: 1500, data_vencimento: '2026-07-10' });
      expect(res.status).toBe(201);
      // Pula a 1ª chamada (tenant middleware), checa a 2ª (INSERT)
      const insertCall = pool.query.mock.calls[1];
      expect(insertCall[0]).toMatch(/INSERT INTO contas_pagar/);
      expect(insertCall[0]).toMatch(/tenant_id/);
      expect(insertCall[1]).toContain(1); // tenantId=1
    });

    test('GET /gestor/financeiro/resumo filtra todas as queries por tenant', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })  // entradas
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })   // saidas
        .mockResolvedValueOnce({ rows: [{ pendentes: '0', atrasadas: '0', valor_total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ pendentes: '0', atrasadas: '0', valor_total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ entradas: '0', saidas: '0' }] });

      const res = await request(app)
        .get('/gestor/financeiro/resumo')
        .set('Authorization', `Bearer ${GESTOR_TENANT_A}`);
      expect(res.status).toBe(200);
      // Pula a 1ª (tenant), checa as 5 paralelas
      const parallelCalls = pool.query.mock.calls.slice(1, 6);
      expect(parallelCalls.length).toBe(5);
      for (const call of parallelCalls) {
        expect(call[1]).toContain(1); // cada uma com tenant_id=1
      }
    });
  });

  describe('Vendas — isolamento', () => {
    test('GET /gestor/vendas sempre filtra por tenant', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get('/gestor/vendas')
        .set('Authorization', `Bearer ${GESTOR_TENANT_A}`);
      expect(res.status).toBe(200);
      // Pula a 1ª (tenant), checa a 2ª (SELECT vendas)
      const call = pool.query.mock.calls[1];
      expect(call[0]).toMatch(/v\.tenant_id = \$1/);
      expect(call[1][0]).toBe(1);
    });
  });

  describe('Gestor — jornadas, pacotes e relatórios isolados', () => {
    test('GET /gestor/jornadas filtra por tenant', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get('/gestor/jornadas')
        .set('Authorization', `Bearer ${GESTOR_TENANT_A}`);
      expect(res.status).toBe(200);
      const call = pool.query.mock.calls[1];
      expect(call[0]).toMatch(/j\.tenant_id = \$1/);
      expect(call[1][0]).toBe(1);
    });

    test('GET /gestor/lista-espera filtra por tenant', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get('/gestor/lista-espera')
        .set('Authorization', `Bearer ${GESTOR_TENANT_A}`);
      expect(res.status).toBe(200);
      const call = pool.query.mock.calls[1];
      expect(call[0]).toMatch(/l\.tenant_id = \$1/);
      expect(call[1][0]).toBe(1);
    });

    test('GET /gestor/aniversariantes filtra por tenant', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get('/gestor/aniversariantes')
        .set('Authorization', `Bearer ${GESTOR_TENANT_A}`);
      expect(res.status).toBe(200);
      const call = pool.query.mock.calls[1];
      expect(call[0]).toMatch(/tenant_id = \$1/);
      expect(call[1][0]).toBe(1);
    });

    test('GET /gestor/relatorios/faturamento filtra por tenant', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get('/gestor/relatorios/faturamento')
        .set('Authorization', `Bearer ${GESTOR_TENANT_A}`);
      expect(res.status).toBe(200);
      const call = pool.query.mock.calls[1];
      expect(call[0]).toMatch(/a\.tenant_id = \$1/);
      expect(call[1][0]).toBe(1);
    });
  });
});
