const CACHE = 'ccb-shell-v2';
const SHELL = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/assets/app.js', '/assets/app.css', '/assets/bridge-workbench.webp', '/assets/bridge-workbench-720.webp', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // License return URLs contain a credential. Never persist that URL or its
  // response in Cache Storage; the page captures and strips it immediately.
  if (url.searchParams.has('license')) {
    event.respondWith(fetch(request));
    return;
  }
  if (request.mode === 'navigate') {
    const canonical = new Request(url.pathname);
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(canonical, copy));
      return response;
    }).catch(async () => (await caches.match(canonical, { ignoreVary: true })) || (await caches.match('/index.html', { ignoreVary: true })) || caches.match('/offline.html', { ignoreVary: true })));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
