(() => {
  'use strict';
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
  function resolve(value = '') { return new URL(String(value).replace(/^\/+/, ''), projectRoot()).href; }
  function relative(value = '') { return resolve(value); }
  window.CritterPaths = Object.freeze({ projectRoot, resolve, relative });
})();

(() => {
  'use strict';
  const load = (id, path, done) => {
    if (document.getElementById(id)) { done?.(); return; }
    const script = document.createElement('script');
    script.id = id;
    script.src = window.CritterPaths.resolve(path);
    script.async = false;
    if (done) script.addEventListener('load', done, { once:true });
    script.addEventListener('error', () => console.warn(`Could not load ${path}.`), { once:true });
    document.head.appendChild(script);
  };
  load('new-critter-runtime-patch-loader', 'core/ui/new-critter-runtime-patch.js?v=2026-08-03-1', () => {
    load('new-critter-appearance-loader', 'core/ui/new-critter-appearance.js?v=2026-08-03-1');
  });
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
