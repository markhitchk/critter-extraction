(() => {
  'use strict';
  const startedAt = performance && performance.now ? performance.now() : Date.now();
  const state = window.__CRITTER_BOOT__ = window.__CRITTER_BOOT__ || {
    version: (window.CritterVersion && window.CritterVersion.version) || '0.22.0',
    startedAt, gameStarted: false, initialized: false, ready: false, failed: false,
    stage: 'document-loading', detail: '', history: [], errors: []
  };
  state.detectedElapsedMs = () => Math.max(0, Math.round((performance && performance.now ? performance.now() : Date.now()) - startedAt));
})();
