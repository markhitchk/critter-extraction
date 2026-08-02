(() => {
  'use strict';
  const allowedParams = new Set(['code','stage','source','line','column','missingPath','from']);
  const text = (value, max = 2000) => String(value == null ? '' : value).replace(/[<>]/g, '').slice(0, max);
  const safeUrl = (value) => {
    try { const u = new URL(value || location.href, location.href); const q = new URLSearchParams(); for (const [k,v] of u.searchParams) if (allowedParams.has(k)) q.set(k, text(v, 500)); u.search = q.toString(); u.hash = ''; return u.href; } catch (_) { return ''; }
  };
  const sourceDisplay = (value) => { try { const u = new URL(value, location.href); return u.pathname.split('/').filter(Boolean).slice(-4).join('/') || text(value); } catch (_) { return text(value); } };
  window.CritterSanitizer = Object.freeze({ text, safeUrl, sourceDisplay, allowedParams });
})();
