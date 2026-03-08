/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Workbox precaching (injected by vite-plugin-pwa)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Skip waiting and claim clients immediately
self.skipWaiting();
clientsClaim();

// Cache static assets
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|woff2|woff|ttf)$/,
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

// ─── Push Notifications ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; url?: string; tag?: string };
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Camellos & Dromedarios', body: event.data.text() };
  }

  const options: NotificationOptions = {
    body: data.body || 'Tienes una nueva notificación',
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: data.tag || 'dromedapp-notification',
    renotify: true,
    data: { url: data.url || '/dashboard' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Camellos & Dromedarios', options)
  );
});

// Open the app when clicking a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
