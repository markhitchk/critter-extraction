(() => {
  'use strict';
  const allowed = ['code','stage','source','line','column','missingPath','from'];
  function safeParams(source = location.search) { const input = new URLSearchParams(source); const out = new URLSearchParams(); for (const key of allowed) if (input.has(key)) out.set(key, input.get(key).slice(0,500)); return out; }
  function errorCenter(params) { const base = window.CritterPaths ? CritterPaths.resolve('core/error-system/index.html') : new URL('./index.html', location.href).href; const u = new URL(base); u.search = (params || safeParams()).toString(); return u.href; }
  window.CritterErrorRouter = Object.freeze({ safeParams, errorCenter });
})();
