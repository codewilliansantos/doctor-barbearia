const API = process.env.REACT_APP_API_URL || "http://localhost:3001";

export function detectarTenant() {
  const host = window.location.hostname.toLowerCase();
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return localStorage.getItem('tenant_slug') || 'doctor';
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const tenant = detectarTenant();
  const res = await fetch(`${API}${path}`, {
    ...options,
    // Merge de headers: defaults primeiro, depois caller — mas X-Tenant-Slug,
    // Authorization e Content-Type NÃO podem ser sobrescritos pelo caller
    // (proteção contra perda de identidade/tenant).
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Tenant-Slug": tenant,
      ...(options.headers || {}),
    },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.erro || "Erro desconhecido");

  return json.data ?? json;
}

export async function carregarBranding() {
  try {
    const res = await fetch(`${API}/publico/config`, {
      headers: { "X-Tenant-Slug": detectarTenant() },
    });
    const json = await res.json();
    if (json.ok) {
      const root = document.documentElement;
      if (json.brand?.gold) root.style.setProperty('--gold', json.brand.gold);
      if (json.brand?.bg)   root.style.setProperty('--bg',   json.brand.bg);
      if (json.brand?.nome) document.title = `${json.brand.nome} — Agendamento Online`;
      return json;
    }
  } catch {}
  return null;
}
