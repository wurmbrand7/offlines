// Suite service worker — strict offline shell caching for standalone privacy operating suite.
// Cache Version: suite-cache-v4 — purges all legacy caches on activation.
const CACHE_NAME = 'suite-cache-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './BUILD_INFO.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './standalone/folio.html',
  './standalone/grid.html',
  './standalone/docket.html',
  './standalone/almanac.html',
  './standalone/spot.html',
  './standalone/fill.html',
  './standalone/glides.html',
  './standalone/lockbox.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Navigation requests: Network-first if online to ensure latest HTML deployment, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
      })
    );
    return;
  }

  // Asset requests: Cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
