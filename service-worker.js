// Kilo.Tab Service Worker
// Caches all app files so it works offline after first load

const CACHE_NAME = 'kilotab-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap',
];

// Install — cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache what we can, ignore failures for external resources
        return Promise.allSettled(
          ASSETS.map(url => cache.add(url).catch(() => {}))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if(event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if(cached) return cached;
        // Not in cache — fetch from network and cache it
        return fetch(event.request)
          .then(response => {
            if(!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }
            // Cache the new resource
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            // Offline fallback for navigation requests
            if(event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
