(() => {
  'use strict';

  const VERSION = '2026-08-03-direct-runtime-2';
  const BUILD_ID = String(window.CritterBuildInfo?.buildId || VERSION).replace(/[^A-Za-z0-9._-]/g, '');
  const SECURITY_VERSION = '1.0.5';
  const SECURITY_FILES = [
    'security-core.js',
    'security-core-hotfix.js',
    'security-network-v2.js',
    'security-ui.js'
  ];
  const RUNTIME = `./core/game/game-runtime.js?v=${BUILD_ID}`;

  function report(stage, detail) {
    try { window.__critterBootReport?.(stage, detail); } catch (_) { }
  }

  function failureEntry(error, stage = 'direct-runtime') {
    return {
      code: 'CE-BOOT-JS-001',
      system: 'boot',
      stage,
      message: error?.message || String(error || 'Critter Extraction could not start.'),
      stack: error?.stack || ''
    };
  }

  function fail(error, stage) {
    const entry = failureEntry(error, stage);
    console.error('Critter Extraction direct startup failed', error);

    try { window.__CRITTER_BOOT__?.markFailed?.(entry); } catch (_) { }

    if (window.CritterErrorUI?.show) {
      try {
        window.CritterErrorUI.show(window.CritterErrors?.capture
          ? window.CritterErrors.capture(entry)
          : entry);
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

  function existingScript(file) {
    return [...document.scripts].find(script => {
      try { return new URL(script.src, location.href).pathname.endsWith(`/core/security/${file}`); }
      catch (_) { return false; }
    });
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
      script.onerror = () => reject(new Error(`Could not load required ${label}: ${url}`));
      document.head.appendChild(script);
    });
  }

  async function loadSecurity() {
    report('core-loading', 'Loading Fair Play and profile security…');
    for (const file of SECURITY_FILES) {
      if (fileReady(file)) continue;
      const current = existingScript(file);
      if (current) {
        await new Promise((resolve, reject) => {
          if (fileReady(file)) return resolve();
          current.addEventListener('load', resolve, { once: true });
          current.addEventListener('error', () => reject(new Error(`Could not load required security file: ${file}`)), { once: true });
          setTimeout(() => fileReady(file) ? resolve() : reject(new Error(`Security file did not initialize: ${file}`)), 10000);
        });
        continue;
      }
      await loadScript(securityUrl(file), `security file ${file}`, {
        requiredBootFile: `core/security/${file}`,
        critterSecurityFile: file
      });
      if (!fileReady(file)) throw new Error(`Security file loaded but did not initialize: ${file}`);
    }
  }

  function waitForRuntime(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const check = () => {
        if (window.__CRITTER_DEBUG__ && typeof window.__CRITTER_DEBUG__ === 'object') return resolve();
        if (window.__CRITTER_BOOT__?.failed) return reject(new Error(window.__CRITTER_BOOT__.detail || 'Game initialization failed.'));
        if (performance.now() - started >= timeoutMs) return reject(new Error('The required game runtime loaded but did not initialize within 15 seconds.'));
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
      await loadSecurity();

      report('game-script-started', 'Loading the required prebuilt game runtime…');
      await loadScript(RUNTIME, 'prebuilt game runtime', { critterRuntime: 'direct' });
      await waitForRuntime();

      window.__CRITTER_PREBUILT_RUNTIME__ = true;
      mark('critter-direct-runtime-end');
      window.__CRITTER_FASTBOOT_METRICS__ = Object.freeze({
        mode: 'direct-prebuilt-runtime',
        buildId: BUILD_ID,
        totalMs: measure('Critter Direct Runtime', 'critter-direct-runtime-start', 'critter-direct-runtime-end')
      });
      report('ready', 'The direct prebuilt runtime and required security systems are ready.');
    } catch (error) {
      fail(error, 'direct-runtime');
    }
  })();
})();
