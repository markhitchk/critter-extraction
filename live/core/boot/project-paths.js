(() => {
  'use strict';

  const FASTBOOT_VERSION = '2026-08-03-fastboot-1';

  function scriptBase() {
    const current = document.currentScript && document.currentScript.src;
    if (current) return new URL('../../', current);
    return new URL('./', location.href);
  }

  function projectRoot() {
    if (location.protocol === 'file:') {
      const pathname = location.pathname.replace(/\\/g, '/');
      const markers = ['/core/', '/reset/', '/invite/', '/portable/'];
      for (const marker of markers) {
        const index = pathname.lastIndexOf(marker);
        if (index >= 0) return new URL('file://' + pathname.slice(0, index + 1));
      }
      return new URL('./', location.href);
    }
    return scriptBase();
  }

  function resolve(value = '') {
    return new URL(String(value).replace(/^\/+/, ''), projectRoot()).href;
  }

  function relative(value = '') {
    return resolve(value);
  }

  function addHint({ rel = 'preload', path, as, crossOrigin = '', priority = '' }) {
    if (!path || location.protocol === 'file:') return;
    const href = resolve(path);
    if ([...document.head.querySelectorAll('link[href]')].some(link => link.href === href)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (as) link.as = as;
    if (crossOrigin) link.crossOrigin = crossOrigin;
    if (priority && 'fetchPriority' in link) link.fetchPriority = priority;
    link.dataset.critterFastbootHint = 'true';
    document.head.appendChild(link);
  }

  window.CritterPaths = Object.freeze({ projectRoot, resolve, relative });
  window.__CRITTER_FASTBOOT_VERSION__ = FASTBOOT_VERSION;

  addHint({ path: `core/game/game-runtime.js?v=${FASTBOOT_VERSION}`, as: 'script', priority: 'high' });
  addHint({ path: `core/loader/live-patches.bundle.js?v=${FASTBOOT_VERSION}`, as: 'script', priority: 'high' });
  addHint({ path: `core/loader/game-loader-base.js?v=${FASTBOOT_VERSION}`, as: 'script' });
  addHint({ path: 'core/game/game-core.js?v=2026-08-03-main-menu-fix-1', as: 'fetch', crossOrigin: 'anonymous', priority: 'high' });
  addHint({ path: 'assets/branding/HTG.png', as: 'image' });
})();

(() => {
  'use strict';
  if (document.getElementById('critter-system-ui-loader')) return;
  const script = document.createElement('script');
  script.id = 'critter-system-ui-loader';
  script.src = window.CritterPaths.resolve('core/ui/system-ui-refresh.js');
  script.async = false;
  script.dataset.optionalUi = 'true';
  script.addEventListener('error', () => console.warn('Critter Extraction UI refresh could not be loaded.'));
  document.head.appendChild(script);
})();
