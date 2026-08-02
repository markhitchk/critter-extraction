(() => {
  'use strict';

  const now = () => globalThis.performance?.now?.() ?? Date.now();
  const startedAt = now();
  const listeners = new Set();
  const previous = window.__CRITTER_BOOT__ && typeof window.__CRITTER_BOOT__ === 'object'
    ? window.__CRITTER_BOOT__
    : {};

  const STAGES = Object.freeze({
    'document-loading': Object.freeze({ progress: 6, terminal: false }),
    'dom-ready': Object.freeze({ progress: 22, terminal: false }),
    'core-loading': Object.freeze({ progress: 42, terminal: false }),
    'game-script-started': Object.freeze({ progress: 64, terminal: false }),
    'game-initialized': Object.freeze({ progress: 84, terminal: false }),
    slow: Object.freeze({ progress: 72, terminal: false }),
    stalled: Object.freeze({ progress: 78, terminal: false }),
    ready: Object.freeze({ progress: 100, terminal: true }),
    failed: Object.freeze({ progress: 78, terminal: true })
  });

  const safeModeFromLocation = () => {
    try {
      const query = new URL(location.href).searchParams;
      if (query.get('safe') === '0') {
        sessionStorage.removeItem('critter.boot.safeMode');
        return false;
      }
      if (query.get('safe') === '1') {
        sessionStorage.setItem('critter.boot.safeMode', '1');
        return true;
      }
      return sessionStorage.getItem('critter.boot.safeMode') === '1';
    } catch (_) {
      return false;
    }
  };

  const state = Object.assign(previous, {
    systemVersion: 2,
    version: window.CritterVersion?.version || previous.version || '0.22.0',
    attemptId: `boot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt,
    safeMode: safeModeFromLocation(),
    gameStarted: false,
    initialized: false,
    ready: false,
    failed: false,
    stage: 'document-loading',
    detail: 'Checking browser and startup files…',
    progress: 6,
    history: [],
    errors: [],
    lastError: null
  });

  const snapshot = () => ({
    systemVersion: state.systemVersion,
    version: state.version,
    attemptId: state.attemptId,
    startedAt: state.startedAt,
    safeMode: state.safeMode,
    gameStarted: state.gameStarted,
    initialized: state.initialized,
    ready: state.ready,
    failed: state.failed,
    stage: state.stage,
    detail: state.detail,
    progress: state.progress,
    history: state.history.slice(),
    errors: state.errors.slice(),
    lastError: state.lastError
  });

  const emit = () => {
    const value = snapshot();
    listeners.forEach(listener => {
      try { listener(value); } catch (error) { console.warn('Critter startup listener failed', error); }
    });
    try {
      window.dispatchEvent(new CustomEvent('critter:boot-state', { detail: value }));
    } catch (_) { }
  };

  const record = (stage, detail = '', options = {}) => {
    const definition = STAGES[stage] || STAGES['document-loading'];
    state.stage = String(stage || 'document-loading');
    state.detail = String(detail || '');
    const requested = Number(options.progress);
    const nextProgress = Number.isFinite(requested) ? requested : definition.progress;
    state.progress = options.allowRegression
      ? Math.max(0, Math.min(100, nextProgress))
      : Math.max(state.progress || 0, Math.max(0, Math.min(100, nextProgress)));
    state.history.push({
      stage: state.stage,
      detail: state.detail,
      progress: state.progress,
      elapsedMs: state.detectedElapsedMs()
    });
    if (state.history.length > 40) state.history.splice(0, state.history.length - 40);
    emit();
    return snapshot();
  };

  state.detectedElapsedMs = () => Math.max(0, Math.round(now() - startedAt));
  state.getSnapshot = snapshot;
  state.subscribe = listener => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    try { listener(snapshot()); } catch (_) { }
    return () => listeners.delete(listener);
  };
  state.report = record;
  state.setProgress = (progress, detail = state.detail) => record(state.stage, detail, { progress });
  state.markReady = detail => {
    state.ready = true;
    state.failed = false;
    state.initialized = true;
    return record('ready', detail || 'The menu and local game systems finished initializing.', { progress: 100 });
  };
  state.markFailed = error => {
    state.failed = true;
    state.ready = false;
    state.lastError = error || null;
    if (error) {
      state.errors.push(error);
      if (state.errors.length > 12) state.errors.splice(0, state.errors.length - 12);
    }
    return record('failed', error?.message || String(error || 'Startup failed'));
  };

  window.__CRITTER_BOOT__ = state;
  window.CritterBootV2 = Object.freeze({
    stages: STAGES,
    get state() { return state; },
    report: record,
    subscribe: state.subscribe,
    snapshot
  });

  document.documentElement.classList.toggle('critter-safe-start', state.safeMode);
  record('document-loading', state.safeMode
    ? 'Safe Start enabled. Loading only essential game systems…'
    : 'Checking browser and startup files…', { progress: 6, allowRegression: true });
})();
