/**
 * Testes de agendamentos — guest booking e listagem.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock do whatsapp para não fazer chamadas reais (preserva funções utilitárias)
jest.mock('../src/services/whatsapp', () => {
  const actual = jest.requireActual('../src/services/whatsapp');
  return {
    ...actual,
    enviarConfirmacao: jest.fn().mockResolvedValue({ ok: true, simulado: true }),
    enviarLembrete:    jest.fn().mockResolvedValue({ ok: true, simulado: true }),
    enviarCancelamento: jest.fn().mockResolvedValue({ ok: true, simulado: true }),
    enviarRetorno:     jest.fn().mockResolvedValue({ ok: true, simulado: true }),
    enviarAniversario: jest.fn().mockResolvedValue({ ok: true, simulado: true }),
    enviarMensagem:    jest.fn().mockResolvedValue({ ok: true, simulado: true }),
  };
});

describe('Agendamentos', () => {
  let app;
  let pool;
  const CLIENTE_TOKEN = jwt.sign({ id: 7, perfil: 'cliente' }, process.env.JWT_SECRET);

  beforeAll(() => {
    jest.mock('../src/database/connection', () => require('./helpers/mockPool'));
    pool = require('../src/database/connection');
    app = require('../src/server');
  });

  beforeEach(() => {
    pool.setupTest();
  });

  describe('POST /agendamentos (guest)', () => {
    test('guest sem token pode agendar', async () => {
      // A rota usa client.query() via pool.connect().
      // Como mockPool retorna { query: mockQuery } do connect(), todas as queries
      // (BEGIN, conflito, clienteExiste, insert agendamento, detalhes, COMMIT)
      // consomem a fila de mockResolvedValueOnce na ordem.
      pool.query
        .mockResolvedValueOnce({ rows: [] })                                                  // BEGIN
        .mockResolvedValueOnce({ rows: [] })                                                  // conflito (vazio)
        .mockResolvedValueOnce({ rows: [] })                                                  // cliente existe (vazio → INSERT)
        .mockResolvedValueOnce({ rows: [{ id: 50 }] })                                        // INSERT clientes
        .mockResolvedValueOnce({ rows: [{ id: 1, cliente_id: 50 }] })                         // INSERT agendamentos
        .mockResolvedValueOnce({ rows: [{ servico: 'Corte', barbeiro: 'Luan', data_fmt: '15/06/2026 às 14:00', preco: 40 }] }) // detalhes
        .mockResolvedValueOnce({ rows: [] });                                                 // COMMIT

      const res = await request(app)
        .post('/agendamentos')
        .send({
          nome: 'João',
          whatsapp: '11988887777',
          servico_id: 1,
          barbeiro_id: 6,
          data_hora: '2026-06-15T14:00:00',
        });

      if (res.status !== 201) console.log('DEBUG body:', res.body);
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensagem).toContain('WhatsApp');
    });

    test('rejeita sem campos obrigatórios', async () => {
      const res = await request(app)
        .post('/agendamentos')
        .send({ nome: 'João' });

      expect(res.status).toBe(400);
    });

    test('rejeita WhatsApp inválido', async () => {
      const res = await request(app)
        .post('/agendamentos')
        .send({
          nome: 'João',
          whatsapp: '123',
          servico_id: 1,
          barbeiro_id: 6,
          data_hora: '2026-06-15T14:00:00',
        });

      expect(res.status).toBe(400);
    });

    test('detecta conflito de horário', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })                // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 99 }] })      // conflito encontrado
        .mockResolvedValueOnce({ rows: [] });               // ROLLBACK

      const res = await request(app)
        .post('/agendamentos')
        .send({
          nome: 'João',
          whatsapp: '11988887777',
          servico_id: 1,
          barbeiro_id: 6,
          data_hora: '2026-06-15T14:00:00',
        });

      expect(res.status).toBe(409);
      expect(res.body.erro).toContain('ocupado');
    });
  });

  describe('GET /agendamentos (autenticado)', () => {
    test('rejeita sem token', async () => {
      const res = await request(app).get('/agendamentos');
      expect(res.status).toBe(401);
    });

    test('retorna histórico do cliente com WhatsApp', async () => {
      // O /agendamentos precisa que req.usuario.whatsapp exista
      const tokenComWhatsapp = jwt.sign(
        { id: 7, perfil: 'cliente', whatsapp: '11988887777' },
        process.env.JWT_SECRET
      );
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, status: 'concluido', servico: 'Corte', barbeiro: 'Luan', data_fmt: '01/06/2026 às 14:00' },
        ],
      });

      const res = await request(app)
        .get('/agendamentos')
        .set('Authorization', `Bearer ${tokenComWhatsapp}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    test('rejeita cliente sem WhatsApp cadastrado', async () => {
      const res = await request(app)
        .get('/agendamentos')
        .set('Authorization', `Bearer ${CLIENTE_TOKEN}`);
      expect(res.status).toBe(400);
    });
  });
});
