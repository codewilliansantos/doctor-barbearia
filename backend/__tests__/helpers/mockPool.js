/**
 * Mock do pool do PostgreSQL para testes Jest.
 * Substitui o módulo real e oferece query() mockado com encadeamento.
 *
 * Uso no setup:
 *   jest.mock('../src/database/connection', () => require('./__tests__/helpers/mockPool'));
 *
 * Estratégia:
 *   - mockResolvedValueOnce é FIFO: a primeira chamada consome o primeiro item
 *     da fila, mesmo se a chamada for do tenantMiddleware. Por isso, o helper
 *     setupTest() reseta os mocks e PRÉ-ENFILEIRA a resposta do tenant.
 *   - Testes específicos adicionam mocks adicionais na ordem em que são
 *     consumidos pelo código testado.
 */
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => Promise.resolve({ query: mockQuery, release: mockRelease }));

const DEFAULT_TENANT = {
  id: 1,
  slug: 'doctor',
  slug_subdominio: 'doctor',
  nome: 'Doctor Barbearia',
  ativo: true,
};

const pool = {
  query: mockQuery,
  connect: mockConnect,
  on: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
};

/**
 * Reseta o estado do mock e pré-enfileira a resposta do tenantMiddleware.
 * Chame no beforeEach (após o require da app) para começar cada teste
 * com o middleware do tenant já satisfeito.
 */
const setupTest = () => {
  mockQuery.mockReset();
  mockRelease.mockReset();
  mockConnect.mockClear();
  mockConnect.mockImplementation(() => Promise.resolve({ query: mockQuery, release: mockRelease }));
  // Fallback padrão: queries não mockadas retornam rows vazias
  mockQuery.mockImplementation(() => Promise.resolve({ rows: [] }));
  // 1ª chamada: tenantMiddleware → consome este mock
  mockQuery.mockResolvedValueOnce({ rows: [DEFAULT_TENANT] });
  // Limpa cache de tenants entre testes
  try { require('../../src/middleware/tenant').clearCache(); } catch { /* middleware ainda não carregado */ }
};

module.exports = pool;
module.exports.setupTest = setupTest;
module.exports.DEFAULT_TENANT = DEFAULT_TENANT;
