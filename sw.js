// الشغل من غير نت. أي تعديل في الموقع: زوّد VERSION بواحد (وزوّد «إصدار الموقع» في index.html).
// - أول فتحة: بيحفظ الصفحة الرئيسية والأيقونات والخط بس (SHELL).
// - كل مادة (وملف الطباعة بتاعها) بتتحفظ أول ما تتفتح بالنت، في حفظ ثابت (CONTENT) مابيتمسحش مع الإصدارات،
//   عشان محدش ينزّل كل المواد مرة واحدة، وعشان التحديث مايمسحش المواد المحفوظة.
// - صفحات الـ HTML: من النت الأول (عشان التحديث يوصل)، ولو مفيش نت من المحفوظ.
// - الباقي (PDF، وأيقونات، وخطوط): من المحفوظ الأول.
// - مابيلمسش localStorage خالص، فالتقدّم بتاع المواد بيفضل زي ما هو.
// الأسامي فيها mustadrak-study لأن كل مواقع nooh-ibrahim.github.io بتتشارك نفس المخزن.
const VERSION = 4;
const PREFIX = "mustadrak-study-";
const SHELL = PREFIX + "v" + VERSION;
const CONTENT = PREFIX + "content";
const FILES = [
  "./",
  "index.html",
  "site.css",
  "stats.js",
  "me.js",
  "guide.html",
  "guide.pdf",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/seal-ai.webp",
  "fonts/plex-ar-400.woff2",
  "fonts/plex-ar-700.woff2",
  "fonts/plex-lat-400.woff2",
  "fonts/plex-lat-700.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

// المواد المحفوظة في الإصدارات القديمة بتتنقل لـ CONTENT قبل ما الإصدار القديم يتمسح.
async function cleanup() {
  const content = await caches.open(CONTENT);
  for (const k of await caches.keys()) {
    if (k.startsWith("hub-")) { await caches.delete(k); continue; } // من اللينكات القديمة
    if (!k.startsWith(PREFIX + "v") || k === SHELL) continue;
    const old = await caches.open(k);
    for (const req of await old.keys()) {
      if (/\/(courses|pdfs)\//.test(req.url) && !(await content.match(req))) await content.put(req, await old.match(req));
    }
    await caches.delete(k);
  }
}

self.addEventListener("activate", (e) => {
  e.waitUntil(cleanup().then(() => self.clients.claim()));
});

// الصفحات وملفات الـ JS والـ CSS من النت الأول (عشان أي تعديل يوصل)، والباقي من المحفوظ الأول.
function isPage(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html") || /\.(js|css)$/.test(new URL(req.url).pathname);
}
function cacheFor(url) {
  return caches.open(/\/(courses|pdfs)\//.test(url) ? CONTENT : SHELL);
}

// من النت الأول. لو فيه نسخة محفوظة والنت بطيء (أكتر من 6 ثواني)، نفتح المحفوظ والنت يكمّل يحدّثها في الخلفية.
async function networkFirst(e) {
  const req = e.request, url = req.url.split(/[?#]/)[0];
  const cache = await cacheFor(url);
  const cached = await caches.match(req, { ignoreSearch: true });
  // no-cache: يسأل السيرفر كل مرة لو الملف اتغيّر (GitHub Pages بيخلّي المتصفح يحتفظ بالنسخة 10 دقايق)
  const net = fetch(url, { cache: "no-cache", credentials: "same-origin" }).then((res) => {
    if (res.ok && res.type === "basic") {
      const copy = res.clone();
      e.waitUntil(cache.put(url, copy));
    }
    return res;
  });
  if (!cached) return net.catch(notSaved);
  const slow = new Promise((ok) => setTimeout(() => ok(cached), 6000));
  return Promise.race([net.catch(() => cached), slow]);
}

// صفحة لسه ماتحفظتش ومفيش نت: رسالة بسيطة، ولينك للصفحة الرئيسية.
function notSaved() {
  const home = self.registration.scope;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>مفيش نت</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F3EA;color:#0F1D3A;font:19px/1.8 "IBM Plex Sans Arabic",Tahoma,sans-serif;text-align:center;padding:16px}
@media (prefers-color-scheme:dark){body{background:#0B1530;color:#EFE7D3}}a{display:inline-block;margin-top:1rem;padding:.6rem 1.4rem;border-radius:1rem;background:#D0AE62;color:#0B1530;font-weight:700;text-decoration:none}</style></head>
<body><div><h1 style="font-size:1.5rem;margin:0">الصفحة دي لسه ماتحفظتش على جهازك</h1><p>افتحها مرة وإنت متوصل بالنت، وبعد كده هتفتح من غير نت.</p><a href="${home}">ارجع للصفحة الرئيسية</a></div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function cacheFirst(req) {
  const cached = await caches.match(req, { ignoreSearch: true });
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") {
    const cache = await cacheFor(req.url);
    cache.put(req.url.split(/[?#]/)[0], res.clone());
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.headers.has("range")) return; // عارض الـ PDF ساعات بيطلب أجزاء: سيبه للنت
  e.respondWith(isPage(req) ? networkFirst(e) : cacheFirst(req));
});
