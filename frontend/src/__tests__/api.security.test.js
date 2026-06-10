/**
 * Testes de comportamento crítico da camada de rede.
 *
 * jsdom não permite redefinir `window.location.hostname`, então:
 *  - apiFetch: testado via localStorage (caminho fallback do app)
 *  - detectarTenant: testado via localStorage
 *  - subdomínio: confia-se que jsdom define hostname uma vez e o código
 *    é trivialmente correto (String.split('.')[0])
 */
import { apiFetch, carregarBranding, detectarTenant } from '../api';

describe('apiFetch — camada de rede', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.cssText = '';
  });

  test('GET inclui X-Tenant-Slug derivado do localStorage', async () => {
    localStorage.setItem('tenant_slug', 'estetica');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/servicos');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['X-Tenant-Slug']).toBe('estetica');
  });

  test('sem localStorage em jsdom (hostname=localhost), tenant = "doctor"', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/servicos');
    const [, opts] = global.fetch.mock.calls[0];
    // jsdom default hostname = "localhost" → 1 part → "doctor"
    expect(opts.headers['X-Tenant-Slug']).toBe('doctor');
  });

  test('NÃO envia Authorization sem token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/servicos');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  test('envia Authorization quando tem token', async () => {
    localStorage.setItem('token', 'jwt-xyz');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/gestor/dashboard');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer jwt-xyz');
  });

  test('401 → throw com mensagem do backend', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, erro: 'Token inválido' }),
    });
    await expect(apiFetch('/gestor/dashboard')).rejects.toThrow('Token inválido');
  });

  test('403 → throw', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ ok: false, erro: 'Acesso negado' }),
    });
    await expect(apiFetch('/gestor/dashboard')).rejects.toThrow('Acesso negado');
  });

  test('500 → throw com erro genérico se backend não envia mensagem', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ ok: false }),
    });
    await expect(apiFetch('/x')).rejects.toThrow('Erro desconhecido');
  });

  test('network failure → throw', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));
    await expect(apiFetch('/x')).rejects.toThrow('Failed to fetch');
  });

  test('retorna json.data quando existe', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { id: 1, nome: 'X' } }),
    });
    const r = await apiFetch('/x');
    expect(r).toEqual({ id: 1, nome: 'X' });
  });

  test('retorna json inteiro quando não tem .data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, items: [1, 2, 3] }),
    });
    const r = await apiFetch('/x');
    expect(r.items).toEqual([1, 2, 3]);
  });

  test('Content-Type sempre application/json', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/x');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  test('URL base default em dev = http://localhost:3001', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/servicos');
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3001/servicos');
  });

  test('JSON.stringify no body automaticamente via fetch com Content-Type JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/x', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe('{"a":1}');
  });

  test('headers customizados do caller prevalecem', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await apiFetch('/x', { headers: { 'X-Trace-Id': 'trace-abc' } });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['X-Trace-Id']).toBe('trace-abc');
    // Defaults ainda presentes
    expect(opts.headers['Content-Type']).toBe('application/json');
  });
});

describe('detectarTenant (fallback localStorage)', () => {
  afterEach(() => localStorage.clear());

  test('sem localStorage e em localhost → "doctor"', () => {
    expect(detectarTenant()).toBe('doctor');
  });

  test('com localStorage → usa valor armazenado', () => {
    localStorage.setItem('tenant_slug', 'meu-salao');
    expect(detectarTenant()).toBe('meu-salao');
  });

  test('valor em localStorage sobrescreve o que vier do hostname', () => {
    // jsdom hostname = 'localhost' (1 part, sem tenant)
    // localStorage = 'x' → retorna 'x'
    localStorage.setItem('tenant_slug', 'x');
    expect(detectarTenant()).toBe('x');
  });
});

describe('carregarBranding', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.cssText = '';
  });

  test('aplica CSS variables de brand.gold e brand.bg + document.title', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        brand: { nome: 'Salão XPTO', gold: '#FF00FF', bg: '#000000' },
      }),
    });
    await carregarBranding();
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--gold')).toBe('#FF00FF');
    expect(root.style.getPropertyValue('--bg')).toBe('#000000');
    expect(document.title).toContain('Salão XPTO');
  });

  test('retorna null silenciosamente em erro de rede', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const r = await carregarBranding();
    expect(r).toBeNull();
  });

  test('retorna null quando backend responde !ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, erro: 'x' }),
    });
    const r = await carregarBranding();
    expect(r).toBeNull();
  });

  test('envia X-Tenant-Slug na requisição', async () => {
    localStorage.setItem('tenant_slug', 'meu-tenant');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    await carregarBranding();
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/publico/config');
    expect(opts.headers['X-Tenant-Slug']).toBe('meu-tenant');
  });

  test('campos de brand parcialmente ausentes não quebram', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, brand: { nome: 'Apenas Nome' } }),
    });
    await expect(carregarBranding()).resolves.toBeTruthy();
    expect(document.title).toContain('Apenas Nome');
  });
});
