/* service-worker.js (GitHub Pages safe) */
const CACHE_VERSION = "mara-logbook-v11"; // bump this every time you change files

// Build URLs relative to the service worker scope (works on /mara-logbook/)
const scopeUrl = new URL(self.registration.scope);
const APP_SHELL = [
  new URL("./", scopeUrl).toString(),
  new URL("./index.html", scopeUrl).toString(),
  new URL("./manifest.json", scopeUrl).toString(),
  new URL("./icon-192.png", scopeUrl).toString(),
  new URL("./icon-512.png", scopeUrl).toString(),
  new URL("./service-worker.js", scopeUrl).toString(),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // force fresh download (avoids GitHub Pages / Safari cache weirdness)
      await cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: "reload" })));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // only same-origin
  if (url.origin !== self.location.origin) return;

  // cache-first for app shell & navigations (so the app opens offline)
  const isNavigation = req.mode === "navigate";
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(new URL("./index.html", scopeUrl).toString()))
    );
    return;
  }

  // cache-first for everything else
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
