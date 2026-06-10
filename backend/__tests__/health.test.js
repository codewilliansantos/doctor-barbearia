/**
 * Testes do /health e rotas básicas (sem auth).
 */
const request = require('supertest');

describe('API Health & Root', () => {
  let app;
  beforeAll(() => {
    jest.mock('../src/database/connection', () => require('./helpers/mockPool'));
    const pool = require('../src/database/connection');
    pool.query.mockResolvedValue({ rows: [{ ok: 1 }] });
    app = require('../src/server');
  });

  test('GET / responde com status da API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.app).toContain('Doctor Barbearia');
  });

  test('GET /health retorna checks de API e DB', async () => {
    const pool = require('../src/database/connection');
    pool.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.checks.api).toBe('ok');
    expect(res.body.checks.db).toBe('ok');
  });

  test('GET /metrics retorna contadores', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(typeof res.body.requests_total).toBe('number');
    expect(typeof res.body.errors_total).toBe('number');
  });

  test('Rota inexistente retorna 404', async () => {
    const res = await request(app).get('/rota-inexistente-xyz');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});
