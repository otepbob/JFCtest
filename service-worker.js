const CACHE_NAME = 'jabra-floorwalk-v1';

// All files to cache for full offline support
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './image.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: pre-cache all app assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy (offline support)
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For external sync URLs (Google Sheets / Power Automate), always go network
  const url = event.request.url;
  if (
    url.includes('script.google.com') ||
    url.includes('logic.azure.com') ||
    url.includes('googleapis.com')
  ) {
    return; // Let the browser handle network-only requests
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache valid responses for app assets
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() => {
        // If network fails and no cache, return cached index as fallback
        return caches.match('./index.html');
      });
    })
  );
});
