(() => {
  'use strict';

  const VERSION = window.__CRITTER_FASTBOOT_VERSION__ || '2026-08-03-direct-runtime-1';
  const BUILD_ID = String(window.CritterBuildInfo?.buildId || VERSION).replace(/[^A-Za-z0-9._-]/g, '');
  const RUNTIME = `./core/game/game-runtime.js?v=${BUILD_ID}`;

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.dataset.critterRuntime = 'direct';
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Could not load required runtime: ${url}`));
      document.head.appendChild(script);
    });
  }

  function mark(name) {
    try { performance.mark(name); } catch (_) { }
  }

  function measure(name, start, end) {
    try {
      performance.measure(name, start, end);
      return performance.getEntriesByName(name).at(-1)?.duration || 0;
    } catch (_) {
      return 0;
    }
  }

  (async () => {
    mark('critter-direct-runtime-start');
    try {
      window.__CRITTER_PREBUILT_RUNTIME__ = false;
      await loadScript(RUNTIME);

      if (!window.__CRITTER_DEBUG__ || typeof window.__CRITTER_DEBUG__ !== 'object') {
        throw new Error('The required prebuilt game runtime loaded but did not initialize.');
      }

      window.__CRITTER_PREBUILT_RUNTIME__ = true;
      mark('critter-direct-runtime-end');
      window.__CRITTER_FASTBOOT_METRICS__ = Object.freeze({
        mode: 'direct-prebuilt-runtime',
        buildId: BUILD_ID,
        totalMs: measure('Critter Direct Runtime', 'critter-direct-runtime-start', 'critter-direct-runtime-end')
      });
    } catch (error) {
      console.error('Critter Extraction direct runtime failed', error);
      window.__critterBootReport?.('failure', error?.message || String(error));
      window.__CRITTER_EMERGENCY__?.(error?.message || 'The required game runtime could not be loaded.');
    }
  })();
})();
