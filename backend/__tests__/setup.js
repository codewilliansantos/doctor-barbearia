/**
 * Setup global dos testes.
 * Carrega .env.test (cria se não existir) e prepara o app Express sem listener.
 */
require('dotenv').config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
// Desabilita cron em testes
process.env.SKIP_CRON = '1';

// Cria .env.test com defaults se não existir
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '..', '.env.test');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, `PORT=3002
DATABASE_URL=postgres://postgres:admin123@localhost:5432/doctor_barbearia_test
JWT_SECRET=test-secret-key-for-jest-runs
FRONTEND_URL=http://localhost:3000
NODE_ENV=test
`);
  console.log('📝 Criado .env.test');
}
