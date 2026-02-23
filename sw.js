const CACHE_NAME = 'flapfing-static-cache';
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

// Simplified activate: Just take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
