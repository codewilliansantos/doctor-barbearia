/**
 * Smoke tests do módulo de API (apiFetch).
 * Mocka fetch global.
 */
import { apiFetch } from '../api';

describe('apiFetch', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });
  afterEach(() => {
    localStorage.clear();
  });

  test('GET passa URL correta', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: 'x' }),
    });
    const r = await apiFetch('/servicos');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/servicos',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    // apiFetch retorna json.data ?? json → 'x' aqui
    expect(r).toBe('x');
  });

  test('envia Authorization header quando tem token', async () => {
    localStorage.setItem('token', 'jwt-abc');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await apiFetch('/gestor/dashboard');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer jwt-abc');
  });

  test('POST envia body como JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await apiFetch('/agendamentos', { method: 'POST', body: JSON.stringify({ nome: 'A' }) });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{"nome":"A"}');
  });

  test('lança erro com mensagem do backend em status >= 400', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, erro: 'Campo obrigatório.' }),
    });
    await expect(apiFetch('/x')).rejects.toThrow('Campo obrigatório.');
  });
});
