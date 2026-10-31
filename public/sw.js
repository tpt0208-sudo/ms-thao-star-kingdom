// Service Worker for Ms. Thao's Star Kingdom - Cache Buster & Purger
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch directly from network to ensure latest updates
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
