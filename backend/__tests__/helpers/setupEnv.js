/**
 * Setup executado antes de cada teste.
 * Garante que .env.test está carregado.
 */
require('dotenv').config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
process.env.SKIP_CRON = '1';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido. Verifique .env.test');
}
