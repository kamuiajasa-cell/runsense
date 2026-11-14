// RunSense service worker v2: selalu ambil versi terbaru dari server, cache hanya cadangan offline.
const CACHE = "runsense-v2";
const ASSETS = [
  "./runsense.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/badge-96.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((u) =>
        fetch(u, { cache: "no-store" }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first tanpa cache HTTP browser (no-store); cache dipakai hanya saat offline.
// Request lintas domain (Intervals.icu API, Google Fonts) tidak disentuh.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-store" })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./runsense.html")))
  );
});

// Notifikasi (dipakai tahap 2 untuk Web Push; sudah siap dengan icon + badge)
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data && e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(data.title || "RunSense", {
      body: data.body || "Cek sesi lari hari ini.",
      icon: "icons/icon-192.png",
      badge: "icons/badge-96.png",
      tag: data.tag || "runsense",
      data: { url: data.url || "./runsense.html" }
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "./runsense.html", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      return self.clients.openWindow(target);
    })
  );
});
