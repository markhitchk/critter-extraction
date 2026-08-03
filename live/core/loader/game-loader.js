(() => {
  'use strict';

  const BASE_LOADER_URL = './core/loader/game-loader-base.js?v=2026-08-03-live-vs-arena-fix';
  const PATCH_SOURCES = [
    './core/loader/patches/live-patches-1.js?v=2026-08-03',
    './core/loader/patches/live-patches-2.js?v=2026-08-03',
    './core/loader/patches/live-patches-3.js?v=2026-08-03',
    './core/loader/patches/live-patches-4.js?v=2026-08-03'
  ];
  const nativeFetch = window.fetch.bind(window);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  }

  function patchRequired(source, patch) {
    const first = source.indexOf(patch.find);
    if (first < 0) throw new Error(`Live patch target missing: ${patch.name}`);
    if (source.indexOf(patch.find, first + patch.find.length) >= 0) {
      throw new Error(`Live patch target is ambiguous: ${patch.name}`);
    }
    return source.slice(0, first) + patch.replace + source.slice(first + patch.find.length);
  }

  async function boot() {
    window.__CRITTER_LIVE_PATCHES__ = [];
    for (const src of PATCH_SOURCES) await loadScript(src);
    const patches = window.__CRITTER_LIVE_PATCHES__;

    window.fetch = function patchedFetch(input, init) {
      const requestUrl = typeof input === 'string' ? input : String(input?.url || '');
      const responsePromise = nativeFetch(input, init);
      if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(requestUrl)) return responsePromise;

      return responsePromise.then(async response => {
        if (!response.ok) return response;
        let source = await response.text();
        for (const patch of patches) source = patchRequired(source, patch);
        return new Response(source, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      });
    };

    await loadScript(BASE_LOADER_URL);
    window.fetch = nativeFetch;
  }

  boot().catch(error => {
    window.fetch = nativeFetch;
    console.error('Critter Extraction live VS Arena hotfix failed', error);
    window.__critterBootReport?.('failure', error.message);
  });
})();