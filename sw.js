const CACHE_NAME = 'flapfing-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/css/style.css',
  './src/js/main.js',
  './src/js/game.js',
  './src/js/assets.js',
  './src/js/audio.js',
  './src/js/entities/background.js',
  './src/js/entities/bird.js',
  './src/js/entities/pipe.js',
  './public/assets/bird.svg',
  './public/assets/background.svg',
  './public/assets/music.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Clear old caches to ensure fresh data
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("ServiceWorker: Clearing old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
