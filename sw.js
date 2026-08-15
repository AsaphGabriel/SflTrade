const CACHE_NAME = 'sfl-tracker-v1.3.0';
const ASSETS_TO_CACHE = [
  '/SflTrade/',
  '/SflTrade/index.html',
  '/SflTrade/manifest.json',
  '/SflTrade/crop.png',
  '/SflTrade/icon-192.png',
  '/SflTrade/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purgando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 1. NÃO intercepta chamadas de API externas nem Supabase
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('corsproxy.io') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('api.sunflower-land.com')
  ) {
    return;
  }

  // 2. Se for navegação de página (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/SflTrade/index.html'))
    );
    return;
  }

  // 3. Para assets estáticos locais (mesmo origin)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 4. Para imagens externas (ex: sfl.world/img/...)
  if (
    event.request.destination === 'image' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => {
            // Em caso de falha de rede para imagens, NÃO retorna HTML
            return new Response('', { status: 408, statusText: 'Image Request Failed' });
          });
      })
    );
    return;
  }
});
