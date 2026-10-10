// الصفحة الرئيسية: كارت الاسم، و«أهلاً يا …»، وقسم «وقتي».
// بيقرا السجل من localStorage (mst-log) اللي stats.js بيكتبه، فبيشتغل من غير نت.
// ?demo=1 بيعرض أرقام تجريبية (من غير ما يحفظ حاجة)، عشان نشوف شكل «وقتي».
(function () {
  "use strict";
  var COURSES = [["bas114", "الفيزياء"], ["csc115", "نظم الحاسب"], ["bas112", "التفاضل والتكامل"], ["bas113", "الجبر الخطي"], ["bas116", "الكهرباء والإلكترونيات"]];
  var DAYS = ["الحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت"];
  var $ = function (id) { return document.getElementById(id); };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function day(t) { return new Date(t + 3 * 3600e3).toISOString().slice(0, 10); }
  var DEMO = /demo=1/.test(location.search);

  // ---------- الاسم ----------
  function first(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }
  function hello() {
    var n = get("mst-name");
    $("hello").hidden = !n;
    if (n) $("hello-name").textContent = first(n);
  }
  function openWho(edit) {
    $("who").hidden = false;
    if (edit) { $("who-name").value = get("mst-name") || ""; $("who-phone").value = get("mst-phone") || ""; }
  }
  function saveWho(e) {
    e.preventDefault();
    var name = $("who-name").value.replace(/\s+/g, " ").trim();
    var phone = $("who-phone").value.replace(/[^\d٠-٩]/g, "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
    var err = $("who-err");
    if (name.split(" ").length < 2) { err.textContent = "اكتب اسمك ثنائي على الأقل."; err.hidden = false; return; }
    if (!/^01[0125]\d{8}$/.test(phone)) { err.textContent = "رقم الواتساب لازم يبقى 11 رقم ويبدأ بـ 01."; err.hidden = false; return; }
    err.hidden = true;
    if (window.MST) window.MST.setWho(name, phone); else { set("mst-name", name); set("mst-phone", phone); set("mst-who-sent", "0"); }
    $("who").hidden = true; document.documentElement.classList.remove("gate"); hello();
  }
  $("who-form").addEventListener("submit", saveWho);
  // المادة المقفولة: الضغط عليها (أو على أي لينك جوّاها) بيودّي لكارت التسجيل
  document.addEventListener("click", function (e) {
    if (!document.documentElement.classList.contains("gate") || !e.target.closest || !e.target.closest(".course")) return;
    e.preventDefault(); $("who").scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { $("who-name").focus(); }, 400);
  }, true);
  // «إلغاء» بيظهر بس وانت بتعدّل اسم موجود (من غير اسم الكارت إجباري ومفيهوش إلغاء)
  $("who-later").addEventListener("click", function () { $("who").hidden = true; });
  $("edit-who").addEventListener("click", function () { openWho(true); $("who").scrollIntoView({ behavior: "smooth", block: "center" }); });
  hello();
  if (!get("mst-name")) openWho(false);

  // ---------- وقتي ----------
  function fmt(s) {
    s = Math.round(s || 0); if (s < 60) return s ? "أقل من دقيقة" : "0 دقيقة";
    var m = Math.round(s / 60); if (m < 60) return m + " دقيقة";
    var h = Math.floor(m / 60); m = m % 60; return h + " ساعة" + (m ? " و " + m + " دقيقة" : "");
  }
  function demoLog() {
    var L = {}, now = Date.now();
    for (var i = 0; i < 30; i++) {
      var d = day(now - i * 864e5), e = (L[d] = {});
      COURSES.forEach(function (c, j) { if (Math.random() < 0.5) e[c[0]] = [Math.round(Math.random() * 3600 * (j % 2 ? 1 : 1.6)), 1]; });
    }
    return L;
  }
  var log = DEMO ? demoLog() : (function () { try { return JSON.parse(get("mst-log")) || {}; } catch (e) { return {}; } })();
  var range = 7;
  function secsOf(d, c) { var e = log[d]; if (!e) return 0; if (c) return e[c] ? e[c][0] : 0; return COURSES.reduce(function (s, k) { return s + (e[k[0]] ? e[k[0]][0] : 0); }, 0); }
  function draw() {
    var now = Date.now(), today = day(now), days = [];
    for (var i = range - 1; i >= 0; i--) days.push(day(now - i * 864e5));
    var all = Object.keys(log).reduce(function (s, d) { return s + secsOf(d); }, 0);
    if (!all) { $("mytime").hidden = true; return; } // لسه مفيش وقت جوّه المواد
    $("mytime").hidden = false;
    var inRange = days.reduce(function (s, d) { return s + secsOf(d); }, 0);
    $("t-today").textContent = fmt(secsOf(today));
    $("t-range").textContent = fmt(inRange);
    $("t-range-l").textContent = range === 7 ? "آخر 7 أيام" : "آخر 30 يوم";
    $("t-all").textContent = fmt(all);
    var mx = Math.max.apply(null, days.map(function (d) { return secsOf(d); }).concat([60]));
    $("t-chart").innerHTML = days.map(function (d, i) {
      var s = secsOf(d), dt = new Date(d + "T12:00:00Z");
      var lab = range === 7 ? DAYS[dt.getUTCDay()] : ((range - 1 - i) % 5 === 0 ? String(dt.getUTCDate()) : "");
      return '<div class="tb' + (d === today ? " now" : "") + '" title="' + d + ': ' + fmt(s) + '"><span class="tv" style="height:' + Math.max(s ? 4 : 0, s / mx * 100) + '%"></span><i>' + lab + '</i></div>';
    }).join("");
    var per = COURSES.map(function (c) { return [c[1], days.reduce(function (s, d) { return s + secsOf(d, c[0]); }, 0)]; }).sort(function (a, b) { return b[1] - a[1]; });
    var pm = Math.max.apply(null, per.map(function (p) { return p[1]; }).concat([1]));
    $("t-per").innerHTML = per.map(function (p) {
      return '<div class="pr"><span class="pn">' + p[0] + '</span><span class="pb"><span style="width:' + (p[1] / pm * 100) + '%"></span></span><span class="pt">' + (p[1] ? fmt(p[1]) : "—") + '</span></div>';
    }).join("");
    [].forEach.call(document.querySelectorAll("[data-range]"), function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-range") === range)); });
  }
  [].forEach.call(document.querySelectorAll("[data-range]"), function (b) {
    b.addEventListener("click", function () { range = +b.getAttribute("data-range"); draw(); });
  });
  draw();
  addEventListener("pageshow", function () { if (!DEMO) { try { log = JSON.parse(get("mst-log")) || {}; } catch (e) {} draw(); } });
})();
