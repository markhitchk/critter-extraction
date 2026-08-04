(() => {
  'use strict';

  if (window.__CRITTER_DIRECT_LOADER_ACTIVE__) return;
  window.__CRITTER_DIRECT_LOADER_ACTIVE__ = true;

  const VERSION = '2026-08-03-canonical-core-1';
  const BUILD_ID = String(window.CritterBuildInfo?.buildId || VERSION).replace(/[^A-Za-z0-9._-]/g, '');
  const SECURITY_VERSION = '1.0.7';
  const SECURITY_FILES = [
    'security-core.js',
    'security-core-hotfix.js',
    'security-network-v2.js',
    'security-ui.js'
  ];
  const CORE_LOADER = `./core/loader/game-loader-base.js?v=${BUILD_ID}-${VERSION}`;
  const PROFILE_PANEL = `./core/security/profile-panel-integrity.js?v=${SECURITY_VERSION}`;

  function report(stage, detail, progress) {
    try {
      if (Number.isFinite(progress)) window.__CRITTER_BOOT__?.setProgress?.(progress, detail);
      window.__critterBootReport?.(stage, detail);
    } catch (_) { }
  }

  function failureEntry(error, stage = 'canonical-core-loader') {
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
    console.error('Critter Extraction canonical startup failed', error);

    try { window.__CRITTER_BOOT__?.markFailed?.(entry); } catch (_) { }

    if (window.CritterErrorUI?.show) {
      try {
        const captured = window.CritterErrors?.capture
          ? window.CritterErrors.capture(entry)
          : entry;
        window.CritterErrorUI.show(captured);
        return;
      } catch (uiError) {
        console.error('Critter custom error screen failed', uiError);
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
    report('core-loading', 'Loading Fair Play and profile security…', 30);
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
      report('core-loading', `Security ready: ${file}`, 32 + ((index + 1) / SECURITY_FILES.length) * 16);
    }
  }

  function runtimeReady() {
    return !!window.__CRITTER_BOOT__?.ready ||
      !!window.__CRITTER_DIAGNOSTICS__ ||
      !!window.__CRITTER_DEBUG__;
  }

  function waitForGame(timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const check = () => {
        if (window.__CRITTER_BOOT__?.ready) return resolve('boot-ready');
        if (window.__CRITTER_BOOT__?.failed) {
          const last = window.__CRITTER_BOOT__?.lastError;
          const error = new Error(last?.message || window.__CRITTER_BOOT__?.detail || 'Game initialization failed.');
          error.code = last?.code || 'CE-BOOT-INIT-001';
          error.sourceRaw = last?.sourceRaw || CORE_LOADER;
          return reject(error);
        }
        if (runtimeReady() && performance.now() - started >= 4300) return resolve('runtime-ready');
        if (performance.now() - started >= timeoutMs) {
          const error = new Error('The canonical game core did not finish initialization within 25 seconds.');
          error.code = 'CE-BOOT-TIMEOUT-001';
          error.sourceRaw = CORE_LOADER;
          return reject(error);
        }
        setTimeout(check, 60);
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
    mark('critter-canonical-core-start');
    try {
      window.__CRITTER_PREBUILT_RUNTIME__ = false;
      report('core-loading', 'Starting required game systems…', 26);
      await loadSecurity();

      report('game-script-started', 'Loading the canonical game core…', 58);
      await loadScript(CORE_LOADER, 'canonical game core loader', {
        requiredBootFile: 'core/loader/game-loader-base.js',
        critterRuntime: 'canonical-core'
      });

      report('game-initialized', 'Game core loaded. Finishing menu and profile setup…', 82);
      await waitForGame();

      window.__CRITTER_PREBUILT_RUNTIME__ = false;
      mark('critter-canonical-core-end');
      window.__CRITTER_FASTBOOT_METRICS__ = Object.freeze({
        mode: 'canonical-core-loader',
        buildId: BUILD_ID,
        totalMs: measure('Critter Canonical Core', 'critter-canonical-core-start', 'critter-canonical-core-end')
      });

      report('ready', 'The canonical game core and required security systems are ready.', 100);
      window.CritterErrorUI?.clear?.();

      loadScript(PROFILE_PANEL, 'profile security interface', {
        critterSecurityFile: 'profile-panel-integrity.js'
      }).catch(error => console.warn('Profile security interface did not load', error));
    } catch (error) {
      fail(error, 'canonical-core-loader');
    }
  })();
})();
