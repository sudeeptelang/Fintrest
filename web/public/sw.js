// Self-unregistering service worker.
//
// Fintrest is not a PWA in MVP-1. Some users may have a cached service
// worker registration from an earlier build — their browsers will keep
// polling /sw.js for updates, producing 404s in the server log. This
// file lives at /sw.js, returns 200, and unregisters itself so the
// browser stops polling.
//
// Delete this file if and when we ship a real PWA service worker.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Clear any caches this (or a prior) SW left behind.
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* caches API not available or quota issue — ignore */
      }
      // Unregister this worker so the browser stops polling /sw.js.
      try {
        await self.registration.unregister();
      } catch {
        /* already unregistered — ignore */
      }
      // Force any open tabs to drop this controller on the next nav.
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});
