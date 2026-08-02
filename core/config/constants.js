(() => {
  'use strict';

  window.CritterConstants = Object.freeze({
    PETAL_CAP: 1000000,
    PROJECT_NAME: 'Critter Extraction'
  });

  const uiAssetVersion = '0.22.0-3';

  const loadStyle = (id, href) => {
    if (document.getElementById(id)) return;
    const style = document.createElement('link');
    style.id = id;
    style.rel = 'stylesheet';
    style.href = `${href}?v=${uiAssetVersion}`;
    document.head.appendChild(style);
  };

  const loadScript = (id, src, hooks = {}) => {
    const existing = document.getElementById(id);
    if (existing) return existing;
    const script = document.createElement('script');
    script.id = id;
    script.src = `${src}?v=${uiAssetVersion}`;
    script.async = false;
    if (typeof hooks.onload === 'function') script.addEventListener('load', hooks.onload, { once: true });
    if (typeof hooks.onerror === 'function') script.addEventListener('error', hooks.onerror, { once: true });
    document.head.appendChild(script);
    return script;
  };

  loadStyle('settingsAccountsRevampStyles', './core/ui/settings-accounts-revamp.css');
  loadScript('settingsAccountsRevampScript', './core/ui/settings-accounts-revamp.js');
  loadStyle('critterUiMotionStyles', './core/ui/ui-motion.css');
  loadScript('critterUiMotionScript', './core/ui/ui-motion.js');
  loadStyle('critterGraphicsEnhancementsStyles', './core/rendering/graphics-enhancements.css');

  let finishGraphicsLoad;
  const graphicsReady = new Promise(resolve => {
    let settled = false;
    finishGraphicsLoad = value => {
      if (settled) return;
      settled = true;
      resolve(value || null);
    };
    setTimeout(() => finishGraphicsLoad(null), 3000);
  });
  window.__CRITTER_GRAPHICS_READY__ = graphicsReady;

  if (!window.__CRITTER_GRAPHICS_FETCH_HOOK__ && typeof window.fetch === 'function') {
    window.__CRITTER_GRAPHICS_FETCH_HOOK__ = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await nativeFetch(input, init);
      let requestUrl = '';
      try {
        requestUrl = typeof input === 'string' ? input : input?.url || String(input || '');
      } catch (_) { }
      if (!/(?:^|\/)core\/game\/game-core\.js(?:[?#]|$)/.test(requestUrl) || !response.ok) return response;

      const enhancer = await graphicsReady;
      if (!enhancer || typeof enhancer.patchCoreSource !== 'function') return response;

      const fallbackResponse = response.clone();
      try {
        const source = await response.text();
        const patched = enhancer.patchCoreSource(source);
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.delete('content-encoding');
        return new Response(patched, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        console.warn('[Critter Graphics] Enhanced source patch failed; loading the standard renderer.', error);
        return fallbackResponse;
      }
    };
  }

  loadScript('critterGraphicsEnhancementsScript', './core/rendering/graphics-enhancements.js', {
    onload: () => finishGraphicsLoad(window.CritterGraphicsEnhancements),
    onerror: () => finishGraphicsLoad(null)
  });
})();
