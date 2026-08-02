(() => {
  'use strict';
  const allowed = ['code','stage','source','line','column','missingPath','missingQuery','missingHash','from'];
  function safeParams(source = location.search) {
    const input = new URLSearchParams(source);
    const out = new URLSearchParams();
    for (const key of allowed) {
      if (!input.has(key)) continue;
      out.set(key, String(input.get(key) || '').replace(/[<>]/g, '').slice(0, 500));
    }
    return out;
  }
  function errorCenter(params) {
    const base = window.CritterPaths ? CritterPaths.resolve('core/error-system/index.html') : new URL('./index.html', location.href).href;
    const url = new URL(base);
    url.search = (params || safeParams()).toString();
    return url.href;
  }
  window.CritterErrorRouter = Object.freeze({ safeParams, errorCenter });
})();
