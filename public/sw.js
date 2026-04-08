// Service Worker for Web Push Notifications - GrowUp App
const CACHE_NAME = 'growup-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle Push Notification
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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'growup-notification',
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: {
      url: data.url || '/',
      taskId: data.taskId || null,
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
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
