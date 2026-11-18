// Тіл таспа — service worker.
// Сайт файлдарын кэште сақтайды, сондықтан қосымша интернетсіз де ашылады.
// Мазмұнды өзгерткенде (data/cards.json, аудио) бұл файлды өзгертудің қажеті жоқ:
// cards.json әрқашан алдымен желіден алынады.
// index.html-ді үлкен өзгерткенде ғана VERSION санын бір көбейт.
const VERSION = "til-taspa-v3";
const SHELL = [
  "./",
  "index.html",
  "data/cards.json",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Audio: the browser asks for byte ranges; let those go straight to the network.
  if (req.headers.has("range")) return;

  // Pages and content: network first, so GitHub edits show up; cache as offline fallback.
  if (req.mode === "navigate" || url.pathname.endsWith(".json") || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // Everything else (icons, audio heard once): cache first.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
    )
  );
});
