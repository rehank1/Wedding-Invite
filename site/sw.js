// Offline support: the invite opens instantly on the second visit and keeps working on a weak venue network.
// Pages and content.json: network first (always fresh when online). Everything else: cache first, filled as used.
const CACHE = 'invite-v8';
const CORE = ['./', './index.html', './content/content.json', './assets/js/core.js', './assets/js/invite.js', './assets/js/royal.js', './assets/js/moments.js', './assets/js/watch.js', './assets/js/duas.js', './assets/js/botanic.js', './assets/js/watercolor.js', './assets/js/music.js',
  './assets/fonts/bodoni-400.woff2', './assets/fonts/bodoni-400i.woff2', './assets/fonts/jost-400.woff2', './assets/fonts/jost-500.woff2', './assets/img/favicon.svg'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return; // never touch third parties or video ranges
  const fresh = req.mode === 'navigate' || url.pathname.endsWith('/content.json');
  if (fresh) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && !url.pathname.match(/\.(mp4|webm)$/)) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
