(() => {
  'use strict';

  if (window.__CRITTER_DIRECT_LOADER_ACTIVE__) return;
  window.__CRITTER_DIRECT_LOADER_ACTIVE__ = true;

  const VERSION = '2026-08-03-direct-runtime-3';
  const BUILD_ID = String(window.CritterBuildInfo?.buildId || VERSION).replace(/[^A-Za-z0-9._-]/g, '');
  const SECURITY_VERSION = '1.0.6';
  const SECURITY_FILES = [
    'security-core.js',
    'security-core-hotfix.js',
    'security-network-v2.js',
    'security-ui.js'
  ];
  const RUNTIME = `./core/game/game-runtime.js?v=${BUILD_ID}`;

  function report(stage, detail, progress) {
    try {
      if (Number.isFinite(progress)) window.__CRITTER_BOOT__?.setProgress?.(progress, detail);
      window.__critterBootReport?.(stage, detail);
    } catch (_) { }
  }

  function failureEntry(error, stage = 'direct-runtime') {
    return {
      code: error?.code || 'CE-BOOT-JS-001',
      severity: 'fatal',
      system: 'boot',
      stage,
      message: error?.message || String(error || 'Critter Extraction could not start.'),
      nativeMessage: error?.message || '',
      sourceRaw: error?.sourceRaw || '',
      line: Number(error?.line || 0),
      column: Number(error?.column || 0),
      stack: error?.stack || ''
    };
  }

  function fail(error, stage) {
    const entry = failureEntry(error, stage);
    console.error('Critter Extraction direct startup failed', error);

    try { window.__CRITTER_BOOT__?.markFailed?.(entry); } catch (_) { }

    if (window.CritterErrorUI?.show) {
      try {
        const reportEntry = window.CritterErrors?.capture
          ? window.CritterErrors.capture(entry)
          : entry;
        window.CritterErrorUI.show(reportEntry);
        return;
      } catch (uiError) {
        console.error('Critter error screen failed', uiError);
      }
    }

    window.__CRITTER_EMERGENCY__?.(entry.message);
  }

  function securityUrl(file) {
    const relative = `core/security/${file}?v=${SECURITY_VERSION}`;
    return window.CritterPaths?.resolve
      ? window.CritterPaths.resolve(relative)
      : `./${relative}`;
  }

  function fileReady(file) {
    if (file === 'security-core.js') return !!window.CritterSecurityRuntime;
    if (file === 'security-core-hotfix.js') return !!window.CritterSecurityRuntime?.__inputKeyBanHotfix;
    if (file === 'security-network-v2.js') return typeof window.CritterSecurityRuntime?.connections === 'function';
    if (file === 'security-ui.js') return typeof window.CritterSecurityRuntime?.openCenter === 'function';
    return false;
  }

  function loadScript(url, label, attributes = {}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      Object.assign(script.dataset, attributes);
      script.onload = () => resolve(script);
      script.onerror = () => {
        const error = new Error(`Could not load required ${label}.`);
        error.code = 'CE-BOOT-FILE-001';
        error.sourceRaw = url;
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  async function loadSecurity() {
    report('core-loading', 'Loading Fair Play and profile security…', 32);
    for (let index = 0; index < SECURITY_FILES.length; index += 1) {
      const file = SECURITY_FILES[index];
      if (!fileReady(file)) {
        await loadScript(securityUrl(file), `security file ${file}`, {
          requiredBootFile: `core/security/${file}`,
          critterSecurityFile: file
        });
      }
      if (!fileReady(file)) {
        const error = new Error(`Security file loaded but did not initialize: ${file}`);
        error.code = 'CE-BOOT-INIT-001';
        error.sourceRaw = securityUrl(file);
        throw error;
      }
      report('core-loading', `Security ready: ${file}`, 34 + ((index + 1) / SECURITY_FILES.length) * 16);
    }
  }

  function runtimeReady() {
    return !!window.__CRITTER_BOOT__?.ready ||
      !!window.__CRITTER_DIAGNOSTICS__ ||
      !!window.__CRITTER_DEBUG__;
  }

  function waitForRuntime(timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const check = () => {
        if (window.__CRITTER_BOOT__?.ready) return resolve('boot-ready');
        if (window.__CRITTER_BOOT__?.failed) {
          return reject(new Error(window.__CRITTER_BOOT__.detail || 'Game initialization failed.'));
        }
        const elapsed = performance.now() - started;
        if (runtimeReady() && elapsed >= 4200) return resolve('runtime-ready');
        if (elapsed >= timeoutMs) {
          const error = new Error('The prebuilt game runtime loaded but did not finish initialization within 12 seconds.');
          error.code = 'CE-BOOT-TIMEOUT-001';
          error.sourceRaw = RUNTIME;
          return reject(error);
        }
        setTimeout(check, 50);
      };
      check();
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
      report('core-loading', 'Starting required game systems…', 26);
      await loadSecurity();

      report('game-script-started', 'Loading the required prebuilt game runtime…', 58);
      await loadScript(RUNTIME, 'prebuilt game runtime', { critterRuntime: 'direct' });
      report('game-initialized', 'Runtime loaded. Finishing menu and profile setup…', 82);
      await waitForRuntime();

      window.__CRITTER_PREBUILT_RUNTIME__ = true;
      mark('critter-direct-runtime-end');
      window.__CRITTER_FASTBOOT_METRICS__ = Object.freeze({
        mode: 'direct-prebuilt-runtime',
        buildId: BUILD_ID,
        totalMs: measure('Critter Direct Runtime', 'critter-direct-runtime-start', 'critter-direct-runtime-end')
      });
      report('ready', 'The direct prebuilt runtime and required security systems are ready.', 100);
      window.CritterErrorUI?.clear?.();
    } catch (error) {
      fail(error, 'direct-runtime');
    }
  })();
})();
