const CACHE_NAME = 'laptx-shell-v1';
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(()=>{})
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
  const req = event.request;

  // Only handle same-origin GET requests for the app shell itself.
  // Everything else (Supabase API calls, third-party CDN scripts, POSTs)
  // passes straight through to the network untouched, so data is always
  // fresh and nothing breaks.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Network-first for the HTML document itself, so app updates show up
  // immediately instead of serving a stale cached version. Falls back to
  // cache only when offline.
  if (req.mode === 'navigate' || req.url.endsWith('/index.html') || req.url.endsWith('/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for static icons — they never change.
  if (req.url.includes('/icons/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
