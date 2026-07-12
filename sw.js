/* Service worker : cache de l'app shell pour le hors-ligne */
const CACHE = 'mon-calendrier-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/ics.js',
  './js/location.js',
  './js/weather.js',
  './js/activities.js',
  './js/calendar.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Les appels API (météo, activités, géocodage) : réseau d'abord, sans mise en cache
  const isApi = /open-meteo\.com|overpass-api\.de|bigdatacloud\.net/.test(url.hostname);
  if (isApi) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      })));
    return;
  }

  // App shell : cache d'abord, repli réseau
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(res => {
        if (event.request.method === 'GET' && res.ok && url.origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
