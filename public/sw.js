// Remove a service worker left behind by another app previously served from
// the same development origin. This app does not register a service worker.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
