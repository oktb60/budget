// Service worker for Lappeenranta Student Budget & Tracker.
//
// Strategy:
//  - index.html / navigation requests: NETWORK-FIRST. Whenever the device is
//    online, you always get the latest deployed version — no more waiting on
//    a stale cached copy after an update. Falls back to the cached copy only
//    when the network request fails (i.e. you're offline).
//  - Everything else (the D3 CDN script, etc.): CACHE-FIRST, since those
//    rarely change and don't need to be revalidated on every load.
//
// Bump CACHE_NAME whenever you want to force a clean cutover for existing
// installs (not strictly required anymore for index.html, since that's
// network-first now, but still clears out old cached entries).
const CACHE_NAME = 'lappeenranta-budget-cache-v2';
const APP_SHELL = [
  './',
  './index.html',
  'https://d3js.org/d3.v7.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Best-effort — e.g. offline on first install, or the CDN script is
        // temporarily unreachable. The fetch handler will retry individually.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (isNavigationRequest(event.request)) {
    // Network-first: always try to get the freshest index.html when online.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else (static assets, the D3 script, etc.).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
