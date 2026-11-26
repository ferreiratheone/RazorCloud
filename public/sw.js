// Service Worker para PWA da Fratres Barbearia - Equipe
const CACHE_NAME = 'fratres-equipe-v1';

// Recursos estáticos básicos para cache do shell
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.webp',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

// Instalação do Service Worker e pré-cache inicial
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW PRECACHE]', err);
      });
    })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de requisições:
// 1. Chamadas de API (Supabase, Cloudflare, etc.) -> Network First (Sempre buscar dados em tempo real)
// 2. Recursos estáticos locais (JS, CSS, Imagens) -> Stale While Revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não interceptar requisições para Supabase ou Cloudflare
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('cloudflare.com') ||
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/functions/v1') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Para navegações de página (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') as Promise<Response>;
      })
    );
    return;
  }

  // Para assets estáticos locais
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna o cache e revalida em segundo plano
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.warn('[SW FETCH]', err);
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
