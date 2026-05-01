// Kilo.Tab Service Worker v2
// Strategy: network-first for HTML (always fresh), cache-first for static assets

const CACHE_NAME = 'kilotab-v2';

const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap',
];

// Install — pre-cache static assets only
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - HTML navigation → network first, fall back to cache
// - Everything else → cache first, fall back to network
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate' ||
    event.request.destination === 'document';

  if(isNavigation) {
    // Network first for HTML — always fresh when online
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('./index.html'))
        )
    );
  } else {
    // Cache first for assets
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if(cached) return cached;
          return fetch(event.request)
            .then(response => {
              if(!response || response.status !== 200 || response.type === 'opaque') return response;
              const clone = response.clone();
              caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
              return response;
            })
            .catch(() => null);
        })
    );
  }
});
