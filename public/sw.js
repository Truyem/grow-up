const CACHE_NAME = 'growup-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const EXCLUDED_ORIGINS = [
  'generativelanguage.googleapis.com',
  'supabase.co'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // 2. Skip excluded origins (API calls)
  if (EXCLUDED_ORIGINS.some(origin => url.hostname.includes(origin))) {
    return;
  }

  // 3. Navigation Request (HTML) - Network First, allow offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 4. Static Assets (Images, JS, CSS) - Stale-While-Revalidate
  // This allows fast load from cache while updating in background
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Validation: Only cache valid 200 responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        // Network failed, nothing to do if we have cache
        console.log('Network fetch failed for', event.request.url);
      });

      return cachedResponse || fetchPromise;
    })
  );
});
