import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const entry = Object.values(manifest).find((item) => item.isEntry);
if (!entry) throw new Error('Vite manifest has no application entry.');

const assets = new Set(['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/assets/bridge-workbench.webp', '/assets/bridge-workbench-720.webp', '/icons/icon-192.png', '/icons/icon-512.png']);
for (const item of Object.values(manifest)) {
  assets.add(`/${item.file}`);
  for (const css of item.css ?? []) assets.add(`/${css}`);
  for (const asset of item.assets ?? []) assets.add(`/${asset}`);
}
const shell = [...assets].sort();
const version = createHash('sha256').update(JSON.stringify(shell)).digest('hex').slice(0, 12);

const worker = `const CACHE = 'ccb-shell-${version}';
const SHELL = ${JSON.stringify(shell)};

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
  // A returned license is a credential. Fetch it for the app to capture, but
  // never place the URL (or its response) in Cache Storage.
  if (url.searchParams.has('license')) {
    event.respondWith(fetch(request));
    return;
  }
  if (request.mode === 'navigate') {
    const canonical = new Request(url.pathname);
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(canonical, response.clone()));
      return response;
    }).catch(async () => (await caches.match(canonical, { ignoreVary: true })) || (await caches.match('/index.html', { ignoreVary: true })) || caches.match('/offline.html', { ignoreVary: true })));
    return;
  }
  event.respondWith(caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
`;

await writeFile('dist/sw.js', worker);
