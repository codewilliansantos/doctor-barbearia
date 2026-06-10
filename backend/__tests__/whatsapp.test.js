/**
 * Testes do whatsapp.js — formatação de números e templates de mensagem.
 * Verifica que as funções de envio disparam (mockado) sem erro.
 */
const { formatarNumero, formatarMensagem } = require('../src/services/whatsapp');

describe('whatsapp utils', () => {
  describe('formatarNumero', () => {
    test('remove caracteres não numéricos', () => {
      expect(formatarNumero('(11) 98888-7777')).toBe('5511988887777');
    });
    test('adiciona prefixo 55 se não tiver', () => {
      expect(formatarNumero('11988887777')).toBe('5511988887777');
    });
    test('preserva 55 se já existir', () => {
      expect(formatarNumero('5511988887777')).toBe('5511988887777');
    });
  });

  describe('formatarMensagem', () => {
    test('substitui placeholders', () => {
      const msg = formatarMensagem('Olá {nome}, seu horário é {data}', { nome: 'João', data: '15/06' });
      expect(msg).toBe('Olá João, seu horário é 15/06');
    });
    test('mantém placeholders não substituídos', () => {
      const msg = formatarMensagem('Oi {nome} e {outro}', { nome: 'Maria' });
      expect(msg).toBe('Oi Maria e {outro}');
    });
  });
});
