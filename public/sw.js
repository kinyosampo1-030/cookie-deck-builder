const CACHE_NAME = 'braverse-deck-v1';

// PWA 安裝時的基礎快取 (可確保即使斷網也能看到基本框架)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('[Service Worker] Install');
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  return self.clients.claim();
});

// 基礎的網路請求攔截，這裡採「直接放行」策略
// 若未來要做離線完整版，可在此加入快取邏輯
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
