/**
 * service-worker.js - PWA 離線靜態快取
 */
const CACHE_NAME = '21master-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/tokens.css',
  './css/base.css',
  './css/table.css',
  './css/counting.css',
  './css/strategy.css',
  './css/modal.css',
  './js/app.js',
  './js/i18n/translations.js',
  './js/i18n/I18nManager.js',
  './js/engine/Card.js',
  './js/engine/Deck.js',
  './js/engine/StrategyEngine.js',
  './js/engine/CountingEngine.js',
  './js/engine/SoundEngine.js',
  './js/modules/TableSimulator.js',
  './js/modules/CountingDrill.js',
  './js/modules/StrategyQuiz.js',
  './js/modules/Analytics.js',
  './js/modules/RiskOfRuinSimulator.js',
  './js/modules/ShareModal.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => cachedResponse);
    })
  );
});
