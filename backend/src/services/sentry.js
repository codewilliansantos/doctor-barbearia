/**
 * Sentry integration para o backend.
 * O Sentry é OPCIONAL — só ativa se SENTRY_DSN estiver definido.
 *
 * Setup:
 * 1. Crie conta em https://sentry.io (free tier)
 * 2. Crie um projeto Node.js
 * 3. Copie o DSN e adicione em .env: SENTRY_DSN=https://...@sentry.io/...
 * 4. Reinicie o backend
 */
const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;
const env = process.env.NODE_ENV || 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    profilesSampleRate: env === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.prismaIntegration(),
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ shouldHandleError: () => true }),
    ],
  });
  console.log(`📡 Sentry inicializado [${env}]`);
}

module.exports = Sentry;
