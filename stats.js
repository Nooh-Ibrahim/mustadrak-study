// العدّاد: بيسجّل «الصفحة اتفتحت» و«الثواني اللي الصفحة كانت ظاهرة فيها».
// - على الجهاز (mst-log): عشان الطالب يشوف وقته في «وقتي»، ويشتغل من غير نت.
// - وبيبعتها لعدّاد مُستدرِك على Cloudflare (ومن غير نت بتستنى في mst-q لحد ما النت يرجع).
// - mst-dev رقم عشوائي للجهاز، و mst-name و mst-phone اللي الطالب كتبهم في كارت الاسم.
// مابيلمسش أي مفتاح تاني في localStorage (تقدّم المواد زي ما هو).
// ملفات المواد فيها نفس المنطق (core/stats.js في المحرّك)، بنفس المفاتيح، فالوقت جوّه المواد بيظهر في «وقتي» لوحده.
(function () {
  "use strict";
  var EP = "https://mustadrak-stats.mustadrak.workers.dev";
  // لينك التجربة مابيبعتش حاجة للعدّاد، عشان مايلخبطش الأرقام
  var SEND = /(^|\.)nooh-ibrahim\.github\.io$|^localhost$/.test(location.hostname);
  var me = document.currentScript, PAGE = (me && me.getAttribute("data-page")) || "home";
  function rid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function getJ(k, d) { try { return JSON.parse(get(k)) || d; } catch (e) { return d; } }
  function day(t) { return new Date(t + 3 * 3600e3).toISOString().slice(0, 10); } // بتوقيت مصر

  var dev = get("mst-dev"); if (!dev) { dev = rid(); set("mst-dev", dev); }
  var ses = rid();
  var app = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var mob = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var q = getJ("mst-q", []);

  // سجل الجهاز: { "2026-10-09": { "bas114": [ثواني, مرات فتح] } }
  function addLog(page, secs, opens) {
    var L = getJ("mst-log", {}), d = day(Date.now()), e = (L[d] = L[d] || {}), r = (e[page] = e[page] || [0, 0]);
    r[0] += secs; r[1] += opens; set("mst-log", JSON.stringify(L));
  }
  function push(page, kind, secs) {
    addLog(page, kind === "beat" ? secs : 0, kind === "view" ? 1 : 0);
    if (!SEND) return;
    q.push({ dev: dev, ses: ses, page: page, kind: kind, secs: secs || 0, t: Date.now(), app: app, mob: mob });
    if (q.length > 3000) q = q.slice(-3000); // من غير نت: لحد حوالي يومين مذاكرة بيستنوا النت
    set("mst-q", JSON.stringify(q));
  }
  var busy = false;
  function flush(leaving) {
    if (!SEND || !q.length || busy || navigator.onLine === false) return;
    var batch = q.slice(0, 50), body = JSON.stringify(batch);
    // text/plain عشان الطلب يبقى بسيط (من غير طلب استئذان قبله)
    if (leaving && navigator.sendBeacon) {
      if (navigator.sendBeacon(EP + "/hit", new Blob([body], { type: "text/plain" }))) { q = q.slice(batch.length); set("mst-q", JSON.stringify(q)); }
      return;
    }
    busy = true;
    fetch(EP + "/hit", { method: "POST", headers: { "Content-Type": "text/plain" }, body: body, keepalive: true })
      .then(function (r) { busy = false; if (r.ok) { q = q.slice(batch.length); set("mst-q", JSON.stringify(q)); if (q.length) flush(); } })
      .catch(function () { busy = false; });
    sendWho();
  }

  // الاسم والرقم: بيتبعتوا مرة، ولو مفيش نت بيتبعتوا بعدين
  function sendWho() {
    if (!SEND || get("mst-who-sent") === "1" || !get("mst-name")) return;
    fetch(EP + "/who", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ dev: dev, name: get("mst-name"), phone: get("mst-phone") || "" }) })
      .then(function (r) { if (r.ok) set("mst-who-sent", "1"); }).catch(function () {});
  }

  // الوقت: كل 15 ثانية والصفحة ظاهرة بنزوّد، وكل 60 ثانية بنسجّل
  var acc = 0, last = Date.now();
  function tick() {
    var now = Date.now();
    if (document.visibilityState === "visible") acc += Math.min(now - last, 20000) / 1000;
    last = now;
    if (acc >= 60) { push(PAGE, "beat", Math.round(acc)); acc = 0; flush(); }
  }
  setInterval(tick, 15000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      tick(); if (acc >= 3) { push(PAGE, "beat", Math.round(acc)); acc = 0; }
      flush(true);
    } else { last = Date.now(); flush(); }
  });
  addEventListener("online", function () { flush(); });

  // فتح المادة ووقتها بيتحسبوا من جوّه ملف المادة نفسه (core/stats.js في المحرّك)، فالرئيسية مابتحسبهمش عشان مايتحسبوش مرتين

  window.MST = {
    log: function () { return getJ("mst-log", {}); },
    who: function () { return { name: get("mst-name") || "", phone: get("mst-phone") || "" }; },
    setWho: function (name, phone) { set("mst-name", name); set("mst-phone", phone); set("mst-who-sent", "0"); sendWho(); },
    day: day
  };

  push(PAGE, "view");
  flush();
  if (window.onMST) window.onMST();
})();
