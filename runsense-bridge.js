/* RunSense bridge — opsional. Mengirim snapshot ke Worker MCP dan menampilkan "Saran Claude".
 * Setup sekali (di HP): buka  runsense.html?mcp=https://NAMA.workers.dev&t=APP_TOKEN
 * Tanpa konfigurasi, file ini tidak melakukan apa-apa. API key Intervals.icu tidak pernah dikirim. */
(function () {
  "use strict";
  var CK = "rs_mcp", DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  var cfg = null, timer = null, lastPush = 0;

  try {
    var q = new URLSearchParams(location.search);
    if (q.get("mcp") && q.get("t")) {
      localStorage.setItem(CK, JSON.stringify({ base: q.get("mcp").replace(/\/+$/, ""), token: q.get("t") }));
      q.delete("mcp"); q.delete("t");
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
    }
    cfg = JSON.parse(localStorage.getItem(CK) || "null");
  } catch (_) {}
  if (!cfg || !cfg.base || !cfg.token) return;

  function api(path, method, body) {
    return fetch(cfg.base + path, {
      method: method || "GET",
      headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  function push() {
    if (!window.RSApi || Date.now() - lastPush < 30000) return;
    lastPush = Date.now();
    try { api("/api/snapshot", "POST", window.RSApi.snapshot()).catch(function () {}); } catch (_) {}
    pull();
  }

  function pull() {
    api("/api/rules").then(function (r) { if (window.RSApi) window.RSApi.setRules(r.rules && Object.keys(r.rules).length ? r.rules : null); }).catch(function () {});
    api("/api/inbox").then(function (r) { render(r.items || []); }).catch(function () {});
  }

  /* ---------- kartu Saran Claude ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function describe(it) {
    if (it.kind === "rules") return Object.keys(it.rules).map(function (k) { return k + " → " + it.rules[k]; }).join(" · ");
    if (it.kind === "plan") return it.plan.map(function (p) { return DAYS[p.day] + ": " + [p.type, p.km != null ? p.km + " km" : ""].filter(Boolean).join(" "); }).join(" · ");
    return it.note || "";
  }
  function render(items) {
    var el = document.getElementById("rsClaudeCard");
    if (!items.length) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div"); el.id = "rsClaudeCard";
      el.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9999;max-height:55vh;overflow:auto;background:#141814;color:#f4f7ef;border:1px solid #c6ff38;border-radius:16px;padding:14px;font:14px/1.45 system-ui;box-shadow:0 8px 30px rgba(0,0,0,.5)";
      document.body.appendChild(el);
    }
    el.innerHTML = '<div style="font-weight:700;color:#c6ff38;margin-bottom:8px">Saran Claude (' + items.length + ")</div>" + items.map(function (it) {
      return '<div style="padding:10px 0;border-top:1px solid #2a312a"><div style="font-weight:600">' + esc(it.title) + '</div><div style="opacity:.85;margin:4px 0">' + esc(it.reason) + '</div>' +
        (describe(it) ? '<div style="font-family:ui-monospace,monospace;font-size:12px;background:#0d100d;padding:6px 8px;border-radius:8px;margin:6px 0">' + esc(describe(it)) + "</div>" : "") +
        '<div style="display:flex;gap:8px;margin-top:8px"><button data-a="applied" data-id="' + esc(it.id) + '" style="flex:1;padding:10px;border:0;border-radius:10px;background:#c6ff38;color:#090b09;font-weight:700">' + (it.kind === "note" ? "Oke" : "Terapkan") + '</button>' +
        '<button data-a="rejected" data-id="' + esc(it.id) + '" style="flex:1;padding:10px;border:1px solid #2a312a;border-radius:10px;background:none;color:#f4f7ef">Tolak</button></div></div>';
    }).join("");
    el.onclick = function (e) {
      var b = e.target.closest("button[data-id]"); if (!b) return;
      var it = items.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!it) return;
      b.disabled = true;
      if (b.dataset.a === "applied" && it.kind === "plan" && window.RSApi) {
        it.plan.forEach(function (p) {
          if (p.type) window.RSApi.setPlan(p.day, "t", p.type);
          if (p.km != null) window.RSApi.setPlan(p.day, "km", p.km);
        });
      }
      api("/api/inbox/" + it.id + "/resolve", "POST", { status: b.dataset.a })
        .then(function (r) { if (r.rules && window.RSApi) window.RSApi.setRules(Object.keys(r.rules).length ? r.rules : null); return api("/api/inbox"); })
        .then(function (r) { render(r.items || []); })
        .catch(function () { b.disabled = false; });
    };
  }

  window.RSBridge = { push: push, pull: pull };
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pull(); });
  window.addEventListener("load", function () { setTimeout(function () { pull(); push(); }, 1500); });
})();
