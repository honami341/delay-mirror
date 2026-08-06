const CACHE_VERSION = 'echo-mirror-v2';
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  if (response && response.ok && new URL(request.url).origin === location.origin) {
    const clone = response.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // ページ本体はネットワーク優先。更新をすぐ受け取れるようにする（圏外ではキャッシュへ）
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => putInCache(event.request, response))
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // それ以外（アイコン等）はキャッシュ優先で速く
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request)
        .then((response) => putInCache(event.request, response))
        .catch(() => cached);
    })
  );
});
