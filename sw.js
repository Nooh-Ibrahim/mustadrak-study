// الشغل من غير نت. أي تعديل في الموقع: زوّد VERSION بواحد (وزوّد «إصدار الموقع» في index.html).
// - أول فتحة: بيحفظ كل الملفات اللي تحت.
// - صفحات الـ HTML: من النت الأول (عشان التحديث يوصل)، ولو مفيش نت من المحفوظ.
// - الباقي (PDF، وأيقونات، وخطوط): من المحفوظ الأول.
// - مابيلمسش localStorage خالص، فالتقدّم بتاع المواد بيفضل زي ما هو.
const VERSION = 1;
const CACHE = "hub-v" + VERSION;
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "courses/BAS116_Electronics.html",
  "pdfs/BAS116_Electronics.pdf",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/stamp-lg-l.webp",
  "icons/stamp-lg-d.webp",
  "fonts/plex-ar-400.woff2",
  "fonts/plex-ar-700.woff2",
  "fonts/plex-lat-400.woff2",
  "fonts/plex-lat-700.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("hub-v") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isPage(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

// من النت الأول. لو فيه نسخة محفوظة والنت بطيء (أكتر من 6 ثواني)، نفتح المحفوظ والنت يكمّل يحدّثها في الخلفية.
async function networkFirst(e) {
  const req = e.request;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req, { ignoreSearch: true });
  // no-cache: يسأل السيرفر كل مرة لو الملف اتغيّر (GitHub Pages بيخلّي المتصفح يحتفظ بالنسخة 10 دقايق)
  const net = fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => {
    if (res.ok && res.type === "basic") {
      const copy = res.clone();
      e.waitUntil(cache.put(req.url.split(/[?#]/)[0], copy));
    }
    return res;
  });
  if (!cached) return net.catch(() => caches.match("index.html"));
  const slow = new Promise((ok) => setTimeout(() => ok(cached), 6000));
  return Promise.race([net.catch(() => cached), slow]);
}

async function cacheFirst(req) {
  const cached = await caches.match(req, { ignoreSearch: true });
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") {
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone());
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.headers.has("range")) return; // عارض الـ PDF ساعات بيطلب أجزاء: سيبه للنت
  e.respondWith(isPage(req) ? networkFirst(e) : cacheFirst(req));
});
