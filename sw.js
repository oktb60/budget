// Service worker for Lappeenranta Student Budget & Tracker.
// Cache-first strategy: serve from cache instantly when available, otherwise
// fetch from the network and cache the result for next time. This is what
// makes the app usable offline and installable as a standalone PWA.
//
// Bump CACHE_NAME whenever index.html changes so returning visitors pick up
// the new version instead of a stale cached copy.
const CACHE_NAME = 'lappeenranta-budget-cache-v1';
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

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
