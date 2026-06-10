/**
 * Smoke tests do módulo shared.js (helpers, constantes).
 */
import { formatPreco, formatWhatsapp, whatsappValido, initials, getBarbImg, IMGS } from '../shared';

describe('shared.js helpers', () => {
  describe('formatPreco', () => {
    test('formata como R$ XX', () => {
      expect(formatPreco(40)).toBe('R$ 40');
      expect(formatPreco(99.9)).toBe('R$ 100');
    });
    test('aceita string', () => {
      expect(formatPreco('123.45')).toBe('R$ 123');
    });
  });

  describe('formatWhatsapp', () => {
    test('formata (XX) XXXXX-XXXX', () => {
      const f = formatWhatsapp('11988887777');
      expect(f).toContain('11');
      expect(f).toContain('98888');
      expect(f).toContain('7777');
    });
    test('lida com número curto', () => {
      const f = formatWhatsapp('123');
      expect(typeof f).toBe('string');
    });
  });

  describe('whatsappValido', () => {
    test('aceita 10-11 dígitos', () => {
      expect(whatsappValido('11988887777')).toBe(true);
      expect(whatsappValido('1188887777')).toBe(true);
    });
    test('rejeita número curto', () => {
      expect(whatsappValido('123')).toBe(false);
    });
    test('ignora caracteres não numéricos', () => {
      expect(whatsappValido('(11) 98888-7777')).toBe(true);
    });
  });

  describe('initials', () => {
    test('pega 2 primeiros caracteres', () => {
      expect(initials('João Silva')).toBe('JO');
      expect(initials('Maria')).toBe('MA');
    });
    test('lida com string vazia', () => {
      expect(initials('')).toBe('');
    });
  });

  describe('IMGS + getBarbImg', () => {
    test('IMGS tem chaves para 3 barbeiros', () => {
      expect(IMGS.luan).toBeDefined();
      expect(IMGS.braz).toBeDefined();
      expect(IMGS.willian).toBeDefined();
    });
    test('getBarbImg retorna path para nome conhecido', () => {
      const img = getBarbImg('Luan');
      expect(img).toContain('luan');
    });
    test('getBarbImg retorna fallback para desconhecido', () => {
      const img = getBarbImg('Zé Ninguém');
      expect(typeof img).toBe('string');
    });
  });
});
