/**
 * Testes do helper formatarNumero + formatarMensagem (mockando whatsapp.js real).
 */
import { formatarNumero, formatarMensagem } from '../whatsappMirror';

describe('WhatsApp utils (frontend mirror)', () => {
  describe('formatarNumero', () => {
    test('remove caracteres não numéricos', () => {
      expect(formatarNumero('(11) 98888-7777')).toBe('5511988887777');
    });
    test('adiciona prefixo 55', () => {
      expect(formatarNumero('11988887777')).toBe('5511988887777');
    });
    test('preserva 55', () => {
      expect(formatarNumero('5511988887777')).toBe('5511988887777');
    });
    test('lida com undefined', () => {
      expect(formatarNumero(undefined)).toBe('55');
      expect(formatarNumero(null)).toBe('55');
      expect(formatarNumero('')).toBe('55');
    });
  });

  describe('formatarMensagem', () => {
    test('substitui placeholders', () => {
      expect(formatarMensagem('Oi {nome}', { nome: 'João' })).toBe('Oi João');
    });
    test('preserva placeholders não substituídos', () => {
      expect(formatarMensagem('Oi {nome} e {x}', { nome: 'Ana' })).toBe('Oi Ana e {x}');
    });
  });
});
