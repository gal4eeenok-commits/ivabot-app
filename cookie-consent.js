/* IvaBot cookie consent v1 — 23 Aug 2026
   Loads GA4, Clarity, Meta Pixel and Reddit Pixel only after the visitor agrees.
   Nothing in here runs a tracker before a choice is made.

   Public API:
     window.ivaCookieSettings()   reopens the preferences panel (wire to a footer link)
     window.ivaTrackSignup()      fires the signup event on Meta and Reddit, if allowed
     window.ivaTrackPurchase(v)   fires the purchase event, optional value in USD
*/
(function () {
  "use strict";

  var GA_ID      = "G-GY70GK1VEE";
  var CLARITY_ID = "xyo9vn4jst";
  var META_ID    = "1741678937060561";
  var REDDIT_ID  = "a2_jk8nfho0mowr";

  var KEY = "iva_cookie_consent";
  var VERSION = 1;
  var MAX_AGE_DAYS = 365;
  var POLICY_URL = "https://ivabot.xyz/privacy";

  var ACCENT = "#6E2BFF";
  var DARK = "#151415";
  var MUTED = "#928E95";

  /* ---------- stored choice ---------- */

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || o.v !== VERSION || !o.t) return null;
      if (Date.now() - o.t > MAX_AGE_DAYS * 864e5) return null;
      return o;
    } catch (e) {
      console.warn("[iva-consent] could not read stored choice", e);
      return null;
    }
  }

  function write(analytics, marketing) {
    var o = { v: VERSION, analytics: !!analytics, marketing: !!marketing, t: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(o));
      console.log("[iva-consent] saved", o);
    } catch (e) {
      console.warn("[iva-consent] could not save choice", e);
    }
    return o;
  }

  /* ---------- Google consent mode, set before anything loads ---------- */

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });

  /* ---------- loaders, each runs once ---------- */

  var loaded = { analytics: false, marketing: false };

  function inject(src, onerror) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    s.onerror = function () { console.warn("[iva-consent] failed to load " + src); if (onerror) onerror(); };
    document.head.appendChild(s);
    return s;
  }

  function loadAnalytics() {
    if (loaded.analytics) return;
    loaded.analytics = true;

    gtag("consent", "update", { analytics_storage: "granted" });
    inject("https://www.googletagmanager.com/gtag/js?id=" + GA_ID);
    gtag("js", new Date());
    gtag("config", GA_ID);

    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    inject("https://www.clarity.ms/tag/" + CLARITY_ID);

    console.log("[iva-consent] analytics loaded");
  }

  function loadMarketing() {
    if (loaded.marketing) return;
    loaded.marketing = true;

    gtag("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });

    if (!window.fbq) {
      var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!window._fbq) window._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      inject("https://connect.facebook.net/en_US/fbevents.js");
    }
    window.fbq("init", META_ID);
    window.fbq("track", "PageView");

    if (!window.rdt) {
      var r = window.rdt = function () { r.sendEvent ? r.sendEvent.apply(r, arguments) : r.callQueue.push(arguments); };
      r.callQueue = [];
      inject("https://www.redditstatic.com/ads/pixel.js");
    }
    window.rdt("init", REDDIT_ID);
    window.rdt("track", "PageVisit");

    console.log("[iva-consent] marketing loaded");
    firePendingPurchase();
  }

  function apply(choice) {
    if (choice.analytics) loadAnalytics();
    if (choice.marketing) loadMarketing();
  }

  /* ---------- conversion events ---------- */

  window.ivaTrackSignup = function () {
    if (!loaded.marketing) { console.log("[iva-consent] signup event skipped, no marketing consent"); return; }
    try {
      window.fbq("track", "CompleteRegistration");
      window.rdt("track", "SignUp");
      console.log("[iva-consent] signup event sent");
    } catch (e) { console.warn("[iva-consent] signup event failed", e); }
  };

  window.ivaTrackPurchase = function (value) {
    if (!loaded.marketing) { console.log("[iva-consent] purchase event skipped, no marketing consent"); return; }
    try {
      var v = Number(value) || 0;
      window.fbq("track", "Purchase", { value: v, currency: "USD" });
      window.rdt("track", "Purchase", { value: v, currency: "USD" });
      console.log("[iva-consent] purchase event sent", v);
    } catch (e) { console.warn("[iva-consent] purchase event failed", e); }
  };

  /* Stripe returns to /dashboard?paid=1 after a successful payment. */
  function firePendingPurchase() {
    try {
      if (location.search.indexOf("paid=1") < 0) return;
      var stamp = location.pathname + location.search;
      if (sessionStorage.getItem("iva_purchase_fired") === stamp) return;
      sessionStorage.setItem("iva_purchase_fired", stamp);
      window.ivaTrackPurchase(0);
    } catch (e) { console.warn("[iva-consent] purchase detection failed", e); }
  }

  /* ---------- interface ---------- */

  var root = null;

  function css() {
    if (document.getElementById("iva-consent-css")) return;
    var st = document.createElement("style");
    st.id = "iva-consent-css";
    st.textContent = [
      ".iva-cc{position:fixed;left:16px;bottom:16px;z-index:99999;width:calc(100% - 32px);max-width:420px;",
      "background:#fff;border:1px solid rgba(21,20,21,0.10);border-radius:16px;",
      "box-shadow:0 12px 40px rgba(21,20,21,0.16);padding:22px 22px 18px;",
      "font-family:'DM Sans',system-ui,sans-serif;color:" + DARK + ";}",
      ".iva-cc h2{font-size:16px;font-weight:600;margin:0 0 8px;letter-spacing:-0.01em;}",
      ".iva-cc p{font-size:13.5px;line-height:1.55;color:" + MUTED + ";margin:0 0 16px;}",
      ".iva-cc a{color:" + ACCENT + ";text-decoration:none;}",
      ".iva-cc a:hover{text-decoration:underline;}",
      ".iva-cc-row{display:flex;gap:8px;flex-wrap:wrap;}",
      ".iva-cc-btn{flex:1 1 0;min-width:120px;border-radius:12px;padding:11px 14px;font-family:inherit;",
      "font-size:14px;font-weight:600;cursor:pointer;border:1px solid rgba(21,20,21,0.16);",
      "background:#fff;color:" + DARK + ";transition:background .15s,border-color .15s;}",
      ".iva-cc-btn:hover{background:#f5f4fd;}",
      ".iva-cc-btn.primary{background:" + DARK + ";color:#fff;border-color:" + DARK + ";}",
      ".iva-cc-btn.primary:hover{background:#333;}",
      ".iva-cc-link{margin-top:12px;text-align:center;}",
      ".iva-cc-link button{background:none;border:none;padding:0;font-family:inherit;font-size:13px;",
      "color:" + MUTED + ";cursor:pointer;text-decoration:underline;}",
      ".iva-cc-opt{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-top:1px solid #f1eef7;}",
      ".iva-cc-opt:first-of-type{border-top:none;}",
      ".iva-cc-opt input{margin-top:3px;width:16px;height:16px;accent-color:" + ACCENT + ";cursor:pointer;}",
      ".iva-cc-opt input:disabled{cursor:default;opacity:.6;}",
      ".iva-cc-opt label{font-size:13.5px;font-weight:600;cursor:pointer;}",
      ".iva-cc-opt span{display:block;font-size:12.5px;font-weight:400;color:" + MUTED + ";line-height:1.5;margin-top:2px;}",
      "@media(max-width:520px){.iva-cc{left:8px;right:8px;bottom:8px;width:auto;max-width:none;padding:18px 16px 14px;}}"
    ].join("");
    document.head.appendChild(st);
  }

  function close() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function showPrefs(current) {
    close(); css();
    root = el("div", { "class": "iva-cc", role: "dialog", "aria-label": "Cookie preferences" });

    root.appendChild(el("h2", null, "Cookie preferences"));

    var opts = el("div");
    opts.appendChild(el("div", { "class": "iva-cc-opt" },
      '<input type="checkbox" checked disabled id="iva-cc-nec">' +
      '<label for="iva-cc-nec">Strictly necessary<span>Sign-in, your saved settings and payment security. The site cannot work without these.</span></label>'));
    opts.appendChild(el("div", { "class": "iva-cc-opt" },
      '<input type="checkbox" id="iva-cc-ana"' + (current && current.analytics ? " checked" : "") + '>' +
      '<label for="iva-cc-ana">Analytics<span>Google Analytics and Microsoft Clarity, including session recordings, so I can see which pages are used and where people get stuck.</span></label>'));
    opts.appendChild(el("div", { "class": "iva-cc-opt" },
      '<input type="checkbox" id="iva-cc-mkt"' + (current && current.marketing ? " checked" : "") + '>' +
      '<label for="iva-cc-mkt">Marketing<span>Meta and Reddit pixels, used to measure which ads bring visitors.</span></label>'));
    root.appendChild(opts);

    var row = el("div", { "class": "iva-cc-row", style: "margin-top:14px" });
    var save = el("button", { "class": "iva-cc-btn primary", type: "button" }, "Save preferences");
    save.onclick = function () {
      var a = document.getElementById("iva-cc-ana").checked;
      var m = document.getElementById("iva-cc-mkt").checked;
      apply(write(a, m));
      close();
    };
    var none = el("button", { "class": "iva-cc-btn", type: "button" }, "Reject all");
    none.onclick = function () { write(false, false); close(); };
    row.appendChild(none);
    row.appendChild(save);
    root.appendChild(row);

    document.body.appendChild(root);
  }

  function showBanner() {
    close(); css();
    root = el("div", { "class": "iva-cc", role: "dialog", "aria-label": "Cookie notice" });

    root.appendChild(el("h2", null, "Cookies on IvaBot"));
    root.appendChild(el("p", null,
      'IvaBot uses cookies that keep you signed in, and, with your permission, cookies that measure how the site is used and which ads bring visitors. ' +
      'Details are in the <a href="' + POLICY_URL + '">Privacy Policy</a>.'));

    var row = el("div", { "class": "iva-cc-row" });
    var reject = el("button", { "class": "iva-cc-btn", type: "button" }, "Reject all");
    reject.onclick = function () { write(false, false); close(); };
    var accept = el("button", { "class": "iva-cc-btn primary", type: "button" }, "Accept all");
    accept.onclick = function () { apply(write(true, true)); close(); };
    row.appendChild(reject);
    row.appendChild(accept);
    root.appendChild(row);

    var link = el("div", { "class": "iva-cc-link" });
    var manage = el("button", { type: "button" }, "Choose what to allow");
    manage.onclick = function () { showPrefs(null); };
    link.appendChild(manage);
    root.appendChild(link);

    document.body.appendChild(root);
  }

  window.ivaCookieSettings = function () { showPrefs(read()); };

  function start() {
    var choice = read();
    if (choice) { apply(choice); return; }
    showBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  console.log("[iva-consent] v1 ready");
})();
