(() => {
  'use strict';

  const state = window.__CRITTER_BOOT__;
  if (!state || window.__CRITTER_BOOT_MONITOR_ACTIVE__) return;
  window.__CRITTER_BOOT_MONITOR_ACTIVE__ = true;

  const SLOW_TIMEOUT_MS = 12000;
  const FATAL_TIMEOUT_MS = 90000;

  let slowTimer = 0;
  let fatalTimer = 0;
  let fatalShown = false;
  let slowShown = false;

  function clearTimers() {
    clearTimeout(slowTimer);
    clearTimeout(fatalTimer);
    slowTimer = 0;
    fatalTimer = 0;
  }

  function paint(stage, detail, progress) {
    const status = document.getElementById('bootStatus');
    const bar = document.getElementById('bootBar');
    if (status && detail) status.textContent = detail;
    if (bar && Number.isFinite(progress)) bar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    document.documentElement.dataset.critterBootStage = String(stage || 'unknown');
  }

  function record(stage, detail = '', progress) {
    const next = typeof state.report === 'function'
      ? state.report(stage, detail, Number.isFinite(progress) ? { progress } : {})
      : null;
    if (!next) {
      state.stage = String(stage || 'unknown');
      state.detail = String(detail || '');
      if (Number.isFinite(progress)) state.progress = progress;
    }
    paint(state.stage, state.detail, state.progress);
  }

  function capture(input) {
    return window.CritterErrors?.capture ? window.CritterErrors.capture(input) : input;
  }

  function reportFatal(input) {
    if (state.ready || fatalShown) return;
    fatalShown = true;
    clearTimers();
    const entry = capture(input);
    try { state.markFailed?.(entry); } catch (_) {
      state.failed = true;
      state.ready = false;
      state.lastError = entry;
    }
    paint('failed', entry.message || 'Startup failed', state.progress || 78);
    if (window.CritterErrorUI?.show) window.CritterErrorUI.show(entry);
    else window.__CRITTER_EMERGENCY__?.(entry.message || 'Critter Extraction could not start.');
  }

  window.__CRITTER_SHOW_ERROR__ = reportFatal;
  window.__critterBootReport = (stage, detail) => {
    const name = String(stage || 'unknown');
    if (name === 'game-script-started') state.gameStarted = true;
    if (name === 'game-initialized') state.initialized = true;
    if (name === 'ready') {
      state.ready = true;
      state.failed = false;
      clearTimers();
      record('ready', detail || 'The menu and local game systems finished initializing.', 100);
      window.CritterErrorUI?.clear?.();
      return;
    }
    if (name === 'failure' || name === 'failed') {
      reportFatal({
        code: 'CE-BOOT-JS-001',
        system: 'boot',
        stage: name,
        message: detail || 'The game reported a startup failure.'
      });
      return;
    }
    const progressByStage = {
      'document-loading': 6,
      'dom-ready': 20,
      'core-loading': 38,
      'game-script-started': 62,
      'game-initialized': 84
    };
    record(name, detail, progressByStage[name]);
  };

  addEventListener('error', event => {
    const target = event.target;
    if (target && target !== window) {
      const tag = String(target.tagName || '').toUpperCase();
      if (tag === 'SCRIPT' && target.dataset.optionalNetworkScript === 'true') return;
      if (tag === 'SCRIPT' || tag === 'LINK') {
        reportFatal({
          code: 'CE-BOOT-FILE-001',
          system: 'boot',
          stage: 'required-file-load',
          message: `A required ${tag === 'SCRIPT' ? 'script' : 'stylesheet'} failed to load.`,
          sourceRaw: target.src || target.href || ''
        });
      }
      return;
    }
    reportFatal({
      code: 'CE-BOOT-JS-001',
      system: 'boot',
      stage: 'game-script-parse',
      message: event.message || 'The game stopped during startup because of a JavaScript error.',
      nativeMessage: event.message || '',
      sourceRaw: event.filename || '',
      line: event.lineno || 0,
      column: event.colno || 0,
      stack: event.error?.stack || ''
    });
  }, true);

  addEventListener('unhandledrejection', event => {
    const reason = event.reason || {};
    reportFatal({
      code: 'CE-BOOT-PROMISE-001',
      system: 'boot',
      stage: 'promise-rejection',
      message: reason.message || String(reason || 'Unhandled startup promise rejection'),
      stack: reason.stack || ''
    });
  });

  function armTimers() {
    clearTimers();
    slowTimer = setTimeout(() => {
      if (state.ready || state.failed || slowShown) return;
      slowShown = true;
      record('slow', state.detail || 'Startup is taking longer than expected.', Math.max(72, state.progress || 0));
      window.CritterErrorUI?.showSlow?.(state);
    }, SLOW_TIMEOUT_MS);

    fatalTimer = setTimeout(() => {
      if (state.ready || state.failed) return;
      reportFatal({
        code: 'CE-BOOT-TIMEOUT-001',
        system: 'boot',
        stage: state.stage || 'startup-timeout',
        message: `The game did not finish initialization within ${Math.round(FATAL_TIMEOUT_MS / 1000)} seconds. Last stage: ${state.detail || state.stage || 'unknown'}.`
      });
    }, FATAL_TIMEOUT_MS);
  }

  if (document.readyState === 'loading') {
    addEventListener('DOMContentLoaded', () => {
      record('dom-ready', 'Document loaded. Starting required game files…', 20);
      armTimers();
    }, { once: true });
  } else {
    record('dom-ready', 'Document loaded. Starting required game files…', 20);
    armTimers();
  }

  addEventListener('pagehide', clearTimers, { once: true });
})();
