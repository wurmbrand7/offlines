// Suite service worker — strict offline shell caching for standalone privacy operating suite.
// Application assets are cached for offline operation. User data remains strictly local in IndexedDB/localStorage.
const CACHE_NAME = 'suite-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
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
  // Cache-first strategy for app shell assets. Never fails if offline.
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
      }).catch(() => {
        // Safe offline fallback to app shell if uncached route is requested
        return caches.match('./index.html');
      });
    })
  );
});
