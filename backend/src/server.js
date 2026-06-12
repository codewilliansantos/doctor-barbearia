require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');

if (process.env.NODE_ENV === 'production') {
  const requiredEnv = ['JWT_SECRET', 'FRONTEND_URL', 'PAGSEGURO_WEBHOOK_SECRET'];
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Variáveis obrigatórias ausentes em produção: ${missing.join(', ')}`);
  }
}

// Sentry (opcional — só ativa se SENTRY_DSN definido)
const Sentry = require('./services/sentry');
const { tenantMiddleware } = require('./middleware/tenant');

const app = express();
const startedAt = Date.now();

// Railway / load balancer — confia no X-Forwarded-For
app.set('trust proxy', 1);

process.on('uncaughtException',  err => { console.error('❌', err.message); Sentry.captureException(err); });
process.on('unhandledRejection', err => { console.error('❌', err.message); Sentry.captureException(err); });

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
const rateWindowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const globalRateLimitMax = Number(process.env.RATE_LIMIT_GLOBAL_MAX || 300);
const authRateLimitMax = Number(process.env.RATE_LIMIT_AUTH_MAX || 20);
const rateWindowMs = rateWindowMinutes * 60 * 1000;

const globalLimiter = rateLimit({
  windowMs: rateWindowMs,
  max: globalRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: rateWindowMs,
  max: authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

app.use(helmet());
app.use(globalLimiter);
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(tenantMiddleware);

if (process.env.SENTRY_DSN) {
  const SentryHandlers = require('@sentry/node').Handlers;
  app.use(SentryHandlers.requestHandler());
  app.use(SentryHandlers.tracingHandler());
}

app.use('/auth',         authLimiter, require('./routes/auth'));
app.use('/servicos',     require('./routes/servicos'));
app.use('/barbeiros',    require('./routes/barbeiros'));
app.use('/agendamentos', require('./routes/agendamentos'));
app.use('/gestor',       require('./routes/gestor'));
app.use('/pagamentos',   require('./routes/pagamentos'));
app.use('/publico',      require('./routes/publico'));
app.use('/produtos',     require('./routes/produtos'));
app.use('/gestor/vendas',require('./routes/vendas'));
app.use('/billing',      require('./routes/billing'));
app.use('/gestor/google-calendar', require('./routes/googleCalendar'));

app.get('/', (req, res) => {
  res.json({ ok: true, app: '💈 Doctor Barbearia API', versao: '4.0.0', status: 'online' });
});

// Health check (usado por Docker, Railway, Kubernetes, UptimeRobot)
app.get('/health', async (req, res) => {
  const checks = { api: 'ok', db: 'unknown', uptime_seconds: Math.floor((Date.now() - startedAt) / 1000) };
  try {
    const pool = require('./database/connection');
    const r = await pool.query('SELECT 1 AS ok');
    checks.db = r.rows[0].ok === 1 ? 'ok' : 'fail';
  } catch (e) {
    checks.db = 'fail: ' + e.message;
  }
  const status = checks.db === 'ok' ? 200 : 503;
  res.status(status).json({ ok: checks.db === 'ok', checks, timestamp: new Date().toISOString() });
});

// Métricas básicas (sem Prometheus — só contadores úteis)
const metrics = { requests: 0, errors: 0, startedAt: new Date().toISOString() };
app.use((req, res, next) => {
  metrics.requests++;
  res.on('finish', () => { if (res.statusCode >= 500) metrics.errors++; });
  next();
});
app.get('/metrics', (req, res) => {
  res.json({
    requests_total: metrics.requests,
    errors_total: metrics.errors,
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    started_at: metrics.startedAt,
  });
});

if (process.env.SENTRY_DSN) {
  const SentryHandlers = require('@sentry/node').Handlers;
  app.use(SentryHandlers.errorHandler());
}

app.use((req, res) => res.status(404).json({ ok: false, erro: 'Rota não encontrada.' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  Sentry.captureException(err);
  res.status(500).json({ ok: false, erro: 'Erro interno.' });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Só inicia o listener se executado diretamente (não em testes)
if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`\n💈 Doctor Barbearia API → http://${HOST}:${PORT}`);
    if (process.env.SKIP_CRON !== '1') {
      setTimeout(() => {
        try {
          const { iniciarCron } = require('./jobs/lembretes');
          iniciarCron();
        } catch(e) {
          console.error('❌ Cron erro:', e.message);
        }
      }, 3000);
    }
  });
}

module.exports = app;
