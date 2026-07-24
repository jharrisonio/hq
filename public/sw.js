// Minimal service worker — no offline caching yet, just enough for the app
// to be installable and to give the browser an active registration that a
// future push subscription (Notification/PushManager) can attach to.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Intentionally not calling event.respondWith — every request falls
  // through to the network exactly as it would with no service worker.
})
