/* PRL service worker: network-first, so the app always gets the latest version,
   with a cached copy to fall back on when offline. */
const CACHE = 'prl-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'cars.js', 'sound.js', 'garage.js', 'data.json', 'assets/logo.png', 'assets/favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sameOrigin = u.origin === location.origin, ghData = u.hostname === 'api.github.com' && u.pathname.endsWith('/contents/data.json') && /raw/.test(e.request.headers.get('accept') || '');
  if (!sameOrigin && !ghData) return;
  const key = ghData ? new Request('gh-data.json') : new Request(u.origin + u.pathname);
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key).then(m => m || caches.match('index.html'))));
});
