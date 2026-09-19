/* Sudoku Mentor service worker: offline play of the built-in library.
 *
 * Strategy, deliberately conservative:
 * - Navigations: network first, so a new deploy is picked up on the next
 *   visit; the cached shell is served only when the network fails.
 * - Hashed build assets under /assets/: cache first (immutable by name).
 * - Icons and the manifest: stale-while-revalidate.
 * - Anything under /api/ or on another origin (Base44 auth, entities,
 *   uploads): never touched, never cached.
 */
const VERSION = 'sm-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.svg', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const isSameOrigin = (url) => url.origin === self.location.origin;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!isSameOrigin(url) || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
      )
    );
    return;
  }

  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return response;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
  }
});
