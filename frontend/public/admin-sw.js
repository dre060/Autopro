// Auto Pro Admin service worker (scope /admin).
// - Push notifications (new bookings, messages, approvals)
// - Opens the right screen when a notification is tapped
// - Offline screen instead of the browser's error page
// Data is always live from the server; pages are not cached for offline use.

const VERSION = "autopro-admin-v1";
const OFFLINE_URL = "/admin-offline.html";
const PRECACHE = [OFFLINE_URL, "/android-chrome-192x192.png", "/brand-emblem.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Page loads: network first, offline screen if there's no connection.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Build assets are content-hashed: cache-first is safe and fast.
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Auto Pro", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Auto Pro";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/android-chrome-192x192.png",
      badge: data.badge || "/favicon-32x32.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url.includes("/admin"));
      if (existing) {
        existing.focus();
        return existing.navigate ? existing.navigate(target) : null;
      }
      return self.clients.openWindow(target);
    })
  );
});
