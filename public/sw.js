// Service Worker for Web Push Notifications - GrowUp App
const CACHE_NAME = 'growup-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// ============================================================
// Install & Activate
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  );
});

// ============================================================
// Fetch: Network-first for API, Cache-first for assets
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests and non-GET
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Skip Supabase API calls
  if (url.hostname.includes('supabase')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone & cache successful responses for static assets
        if (response && response.status === 200 && url.pathname.startsWith('/assets/')) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ============================================================
// Push Notification Handler
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'GrowUp',
      body: event.data.text(),
    };
  }

  const title = data.title || 'GrowUp 💪';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.webp',
    badge: data.badge || '/icons/icon-96.webp',
    tag: data.tag || 'growup-notification',
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ============================================================
// Notification Click Handler
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ============================================================
// Push Subscription Change (auto re-subscribe if browser refreshes keys)
// ============================================================
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((subscription) => {
      // Notify the app to update subscription in DB
      return clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: subscription.toJSON(),
          });
        });
      });
    })
  );
});
