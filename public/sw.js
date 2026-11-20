const CACHE_PREFIX = "hardcore-fighters-";
const CACHE_NAME = `${CACHE_PREFIX}ipad-v2-35-26`;

const OFFLINE_CORE = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-180.png",
  "/icon-512.png",
  "/editor.html",
  "/editor.css",
  "/editor.js",
  "/activity.html",
  "/activity.css",
  "/activity.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(OFFLINE_CORE.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

// A full or unavailable offline cache must not discard a valid network response.
async function storeResponse(key, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(key, response);
  } catch { /* Storage is optional while the game is online. */ }
}

async function cachedResponse(key) {
  try { return await caches.match(key); } catch { return undefined; }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname === "/sw.js") {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok) {
          event.waitUntil(storeResponse(url.pathname === "/" ? "/" : request, response.clone()));
        }
        return response;
      } catch {
        return await cachedResponse(request) || (url.pathname === "/" ? await cachedResponse("/") : undefined) || Response.error();
      }
    })());
    return;
  }

  const isRuntimeCode = url.pathname.startsWith("/_next/") || /\.(?:css|js)$/i.test(url.pathname);
  if (isRuntimeCode) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok) {
          event.waitUntil(storeResponse(request, response.clone()));
        }
        return response;
      } catch {
        return await cachedResponse(request) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(?:png|jpe?g|webp|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await cachedResponse(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        event.waitUntil(storeResponse(request, response.clone()));
      }
      return response;
    })());
  }
});
