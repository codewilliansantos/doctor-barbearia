// Service Worker do Doctor Barbearia
// Estratégia:
//   - API: sempre rede (zero cache de dados sensíveis)
//   - Páginas HTML: network-first, cacheia SÓ respostas 2xx
//   - Assets: stale-while-revalidate, com expiração (max 30 dias, 60 itens)
//   - Pre-cache: shell mínimo do app
const CACHE_VERSION = "v3";
const CACHE_NAME    = `doctor-barbearia-${CACHE_VERSION}`;
const RUNTIME_CACHE = `doctor-runtime-${CACHE_VERSION}`;
const ASSET_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const ASSET_MAX_ITEMS = 60;

// Caminhos que NUNCA devem ser cacheados (dados sensíveis + API)
const NEVER_CACHE = [
  /^\/auth(\/|$)/,
  /^\/gestor(\/|$)/,
  /^\/agendamentos(\/|$)/,
  /^\/servicos(\/|$)/,
  /^\/barbeiros(\/|$)/,
  /^\/produtos(\/|$)/,
  /^\/publico(\/|$)/,
  /^\/billing(\/|$)/,
  /^\/pagamentos(\/|$)/,
];

// Pre-cache de arquivos essenciais (shell do app)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.svg",
  "/logo192.png",
  "/logo512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.all(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] falhou pre-cache de ${url}:`, err.message);
              return null;
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map(k => {
            console.log(`[SW] removendo cache antigo: ${k}`);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Bloqueia cache para API e dados sensíveis
  if (NEVER_CACHE.some(re => re.test(url.pathname))) {
    event.respondWith(fetch(request).catch(() => new Response(null, { status: 503 })));
    return;
  }

  // Páginas HTML: network-first com fallback
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(res => {
          // Só cacheia 2xx (NUNCA 4xx/5xx — senão usuário fica preso em página de erro offline)
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match("/index.html").then(r => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Assets: stale-while-revalidate com expiração
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
            limitarCache(RUNTIME_CACHE, ASSET_MAX_ITEMS);
          }
          return res;
        })
        .catch(() => cached);

      // Se tem cache válido (≤ 30 dias), retorna imediatamente
      if (cached) {
        const dateHeader = cached.headers.get("date");
        const cacheTime = dateHeader ? new Date(dateHeader).getTime() : 0;
        if (Date.now() - cacheTime < ASSET_MAX_AGE_MS) {
          // Devolve cache, mas atualiza em background
          networkFetch.catch(() => null);
          return cached;
        }
      }
      return networkFetch;
    })
  );
});

// Limita tamanho do cache runtime (FIFO: remove os mais antigos)
async function limitarCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxItems) return;
    const excedente = keys.length - maxItems;
    for (let i = 0; i < excedente; i++) {
      await cache.delete(keys[i]);
    }
  } catch (e) {
    // Silencioso: limpeza é best-effort
  }
}

// Mensagem para pular waiting (forçar update)
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
