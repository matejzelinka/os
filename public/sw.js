const CACHE = "pracovni-os-v1.9";
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((r) => {
        const c = r.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, c));
        return r;
      })
      .catch(() => caches.match(event.request)),
  );
});
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "SHOW_NOTIFICATION") return;

  const title = data.title || "Pracovní OS";
  const options = {
    body: data.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || `os-${Date.now()}`,
    renotify: false,
    data: { url: data.url || "/inbox" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("focus" in client) {
          await client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })(),
  );
});
