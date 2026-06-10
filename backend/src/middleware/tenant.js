// Resolve o tenant atual a partir do subdomÃ­nio (ou path).
// Cada cliente do SaaS tem seu prÃ³prio subdomÃ­nio (ex: doctor.doctorbarbearia.com).
// Em dev (localhost) usa DEFAULT_TENANT_SLUG.
const pool = require('../database/connection');

const cache = new Map();
const TTL = 60_000; // 1 min

function extrairSlug(req) {
  // 1) SubdomÃ­nio
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  const baseDomain = (process.env.BASE_DOMAIN || 'localhost:3000').toLowerCase();
  if (host && host !== baseDomain && host.endsWith('.' + baseDomain)) {
    return host.slice(0, -1 - baseDomain.length);
  }
  // 2) Header explÃ­cito (Capacitor/PWA/iframe)
  const hdrSlug = req.headers['x-tenant-slug'];
  if (hdrSlug) return String(hdrSlug).toLowerCase();
  // 3) Fallback dev
  return process.env.DEFAULT_TENANT_SLUG || 'doctor';
}

async function carregarTenant(slug) {
  if (cache.has(slug)) {
    const { data, ts } = cache.get(slug);
    if (Date.now() - ts < TTL) return data;
  }
  const r = await pool.query('SELECT * FROM tenants WHERE slug_subdominio = $1 AND ativo = TRUE', [slug]);
  const tenant = r.rows[0] || { id: 1, slug: 'doctor', nome: process.env.BRAND_NAME || 'Doctor Barbearia' };
  cache.set(slug, { data: tenant, ts: Date.now() });
  return tenant;
}

async function tenantMiddleware(req, res, next) {
  try {
    const slug = extrairSlug(req);
    const tenant = await carregarTenant(slug);
    req.tenantId = tenant.id;
    req.tenant  = tenant;
    res.setHeader('X-Tenant', tenant.slug);
    next();
  } catch (e) {
    console.error('tenant middleware erro:', e.message, e.stack), e.message);
    req.tenantId = 1;
    req.tenant  = { id: 1, slug: 'doctor' };
    next();
  }
}

module.exports = { tenantMiddleware, extrairSlug, clearCache: () => cache.clear() };

