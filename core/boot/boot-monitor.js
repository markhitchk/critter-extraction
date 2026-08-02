(() => {
  'use strict';
  const state = window.__CRITTER_BOOT__;
  if (!state) return;
  let slowTimer = 0, fatalTimer = 0, fatalShown = false;
  const elapsed = () => state.detectedElapsedMs ? state.detectedElapsedMs() : 0;
  const record = (stage, detail = '') => {
    state.stage = stage; state.detail = String(detail || '');
    state.history.push({ stage, detail: state.detail, elapsedMs: elapsed() });
    if (state.history.length > 30) state.history.shift();
  };
  const reportFatal = (input) => {
    if (state.ready || fatalShown) return;
    fatalShown = true; state.failed = true; clearTimeout(slowTimer); clearTimeout(fatalTimer);
    const entry = window.CritterErrors && window.CritterErrors.capture ? window.CritterErrors.capture(input) : input;
    state.errors.push(entry); record('failed', entry.message || 'Startup failed');
    if (window.CritterErrorUI && window.CritterErrorUI.show) window.CritterErrorUI.show(entry);
    else if (window.__CRITTER_EMERGENCY__) window.__CRITTER_EMERGENCY__(entry.message || 'Critter Extraction could not start.');
  };
  window.__critterBootReport = (stage, detail) => {
    record(String(stage || 'unknown'), detail);
    if (stage === 'game-script-started') state.gameStarted = true;
    if (stage === 'game-initialized') state.initialized = true;
    if (stage === 'ready') { state.ready = true; state.failed = false; clearTimeout(slowTimer); clearTimeout(fatalTimer); }
    if (stage === 'failure') reportFatal({ code: 'CE-BOOT-JS-001', system: 'boot', stage, message: detail || 'The game reported a startup failure.' });
  };
  addEventListener('error', (event) => {
    const target = event.target;
    if (target && target !== window) {
      const tag = String(target.tagName || '').toUpperCase();
      if (tag === 'SCRIPT' && target.dataset.optionalNetworkScript === 'true') return;
      if (tag === 'SCRIPT' || tag === 'LINK' || tag === 'IMG') reportFatal({ code: tag === 'IMG' ? 'CE-ASSET-MISSING-001' : 'CE-BOOT-FILE-001', system: tag === 'IMG' ? 'asset' : 'boot', stage: 'required-file-load', message: 'A required file failed to load.', sourceRaw: target.src || target.href || '' });
      return;
    }
    reportFatal({ code: 'CE-BOOT-JS-001', system: 'boot', stage: 'game-script-parse', message: 'The game stopped during startup because of a JavaScript error.', nativeMessage: event.message || '', sourceRaw: event.filename || '', line: event.lineno || 0, column: event.colno || 0, stack: event.error && event.error.stack || '' });
  }, true);
  addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    reportFatal({ code: 'CE-BOOT-JS-001', system: 'boot', stage: 'promise-rejection', message: reason.message || String(reason || 'Unhandled promise rejection'), stack: reason.stack || '' });
  });
  addEventListener('DOMContentLoaded', () => {
    record('dom-ready', 'Document loaded');
    slowTimer = setTimeout(() => {
      if (!state.ready && !state.failed && window.CritterErrorUI && window.CritterErrorUI.showSlow) window.CritterErrorUI.showSlow(state);
    }, 20000);
    fatalTimer = setTimeout(() => {
      if (!state.ready && !state.failed) reportFatal({ code: 'CE-BOOT-TIMEOUT-001', system: 'boot', stage: 'startup-timeout', message: 'The game did not finish initialization within 60 seconds.' });
    }, 60000);
  });
})();
