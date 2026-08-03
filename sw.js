/* Service worker for the L&R app.
   Pages stay network-first so live database data is never stale; the
   cache is a fallback for a poor signal or no signal at all.
   Bump CACHE when the shell changes so old copies are cleared. */

const CACHE = "lr-v1";

const SHELL = [
  "/menu/",
  "/tracker/",
  "/rings/",
  "/stationery/",
  "/music/",
  "/app.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k !== CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);
  // Anything off our own origin (fonts, database, previews) is left alone.
  if(url.origin !== self.location.origin) return;

  // Pages: network first, cache as the fallback, menu as the last resort.
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(res=>{
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
          return res;
        })
        .catch(()=>caches.match(req).then(hit=>hit || caches.match("/menu/")))
    );
    return;
  }

  // Our own assets: serve from cache, refresh in the background.
  e.respondWith(
    caches.match(req).then(hit=>{
      const net = fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=>hit);
      return hit || net;
    })
  );
});
