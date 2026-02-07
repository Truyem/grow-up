const CACHE_NAME = 'growup-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const EXCLUDED_ORIGINS = [
  'generativelanguage.googleapis.com',
  'supabase.co'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (EXCLUDED_ORIGINS.some(origin => url.hostname.includes(origin))) return;

  // Navigation (HTML): Stale-While-Revalidate
  // 1. Return from cache immediately (FAST)
  // 2. Fetch from network to update cache for NEXT time
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match('/index.html');

        // Background update
        const networkFetch = fetch(event.request).then((res) => {
          // Only cache valid responses
          if (res.status === 200) {
            cache.put(event.request, res.clone());
          }
          return res;
        }).catch(() => {
          // Network failure - just ignore, we served cache
        });

        // Return cache if available, else wait for network
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // Static Assets: Cache First / Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      const fetched = fetch(event.request).then((res) => {
        if (res.status === 200 && res.type === 'basic') {
          cache.put(event.request, res.clone());
        }
        return res;
      }).catch(() => { }); // Ignore network errors if we have cache

      return cached || fetched;
    })
  );
});
