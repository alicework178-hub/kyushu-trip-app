// service-worker.js
const CACHE_NAME = 'kyushu-trip-v1';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'icon.png',
  'apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 註冊安裝時進行靜態快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell and assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截並使用緩存/網路請求 (Stale-while-revalidate 策略)
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* 離線時忽略取得網路失敗 */});
        
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (event.request.method === 'GET' && response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch((err) => {
        console.warn('[Service Worker] Fetch failed, network offline:', err);
      });
    })
  );
});
