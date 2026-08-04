(() => {
  'use strict';

  if (window.__CRITTER_DIRECT_LOADER_ACTIVE__) return;
  window.__CRITTER_DIRECT_LOADER_ACTIVE__ = true;

  const VERSION = '2026-08-03-startup-fix-2';
  const BUILD_ID = String(window.CritterBuildInfo?.buildId || VERSION).replace(/[^A-Za-z0-9._-]/g, '');
  const SECURITY_VERSION = '1.0.9';
  const SECURITY_FILES = [
    'security-core.js',
    'security-core-hotfix.js',
    'security-network-v2.js',
    'security-ui.js'
  ];
  const RUNTIME = `./core/game/game-runtime.js?v=${BUILD_ID}`;
  const PROFILE_PANEL = `./core/security/profile-panel-integrity.js?v=${SECURITY_VERSION}`;

  function report(stage, detail, progress) {
    try {
      if (Number.isFinite(progress)) window.__CRITTER_BOOT__?.setProgress?.(progress, detail);
      window.__critterBootReport?.(stage, detail);
    } catch (_) { }
  }

  function failureEntry(error, stage = 'updated-ui-runtime') {
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
    console.error('Critter Extraction startup failed', error);

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

  function warnOptionalProfile(error) {
    const entry = {
      ...failureEntry(error, 'profile-interface'),
      severity: 'warning',
      code: error?.code || 'CE-PROFILE-UI-001'
    };
    console.warn('Critter Extraction profile enhancement did not load; the game remains playable.', error);
    try { window.CritterErrors?.capture?.(entry); } catch (_) { }
    try {
      window.dispatchEvent(new CustomEvent('critter:profile-interface-warning', { detail: entry }));
    } catch (_) { }
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

  function loadScript(url, label, attributes = {}, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      let timer = 0;

      const cleanup = () => {
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
      };

      const finish = callback => value => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };

      const resolveOnce = finish(resolve);
      const rejectOnce = finish(reject);

      script.src = url;
      script.async = false;
      Object.assign(script.dataset, attributes);
      script.onload = () => resolveOnce(script);
      script.onerror = () => {
        const error = new Error(`Could not load required ${label}.`);
        error.code = 'CE-BOOT-FILE-001';
        error.sourceRaw = url;
        rejectOnce(error);
      };

      timer = setTimeout(() => {
        const error = new Error(`${label} did not finish loading within ${timeoutMs}ms.`);
        error.code = 'CE-BOOT-TIMEOUT-002';
        error.sourceRaw = url;
        script.dataset.loadTimedOut = 'true';
        script.remove();
        rejectOnce(error);
      }, timeoutMs);

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
        }, 20000);
      }
      if (!fileReady(file)) {
        const error = new Error(`Security file loaded but did not initialize: ${file}`);
        error.code = 'CE-BOOT-INIT-001';
        error.sourceRaw = securityUrl(file);
        throw error;
      }
      report('core-loading', `Security ready: ${file}`, 32 + ((index + 1) / SECURITY_FILES.length) * 14);
    }
  }

  function normalizeStaticMarkup() {
    for (const id of ['hostLobbyCount', 'joinLobbyCount']) {
      const node = document.getElementById(id);
      if (node && /^\s*1\s*\/\s*4\s*$/.test(node.textContent || '')) node.textContent = '1 / 8';
    }

    const pin = document.getElementById('joinRoomPin');
    if (pin) {
      pin.maxLength = 6;
      pin.pattern = '[0-9]{6}';
      pin.inputMode = 'numeric';
      const cleaned = String(pin.value || '').replace(/\D/g, '').slice(0, 6);
      if (pin.value !== cleaned) pin.value = cleaned;
    }

    document.querySelectorAll('#helpModal p').forEach(paragraph => {
      const copy = paragraph.textContent || '';
      if (!copy.includes('One host and up to three guests')) return;
      paragraph.textContent = copy.replace('One host and up to three guests', 'One host and up to seven guests');
    });
  }

  function menuReady() {
    const splash = document.getElementById('studioBoot');
    const runtimeInitialized = !!window.__CRITTER_DIAGNOSTICS__ || !!window.__CRITTER_DEBUG__;
    const splashFinished = !splash || splash.hidden || splash.classList.contains('is-hiding');
    return !!window.__CRITTER_BOOT__?.ready || (runtimeInitialized && splashFinished);
  }

  function waitForGame(timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const check = () => {
        if (menuReady()) return resolve();
        if (window.__CRITTER_BOOT__?.failed) {
          const last = window.__CRITTER_BOOT__?.lastError;
          const error = new Error(last?.message || window.__CRITTER_BOOT__?.detail || 'Game initialization failed.');
          error.code = last?.code || 'CE-BOOT-INIT-001';
          error.sourceRaw = last?.sourceRaw || RUNTIME;
          return reject(error);
        }
        if (performance.now() - started >= timeoutMs) {
          const error = new Error('The updated game runtime loaded but the main menu did not become ready within 30 seconds.');
          error.code = 'CE-BOOT-TIMEOUT-001';
          error.sourceRaw = RUNTIME;
          return reject(error);
        }
        setTimeout(check, 60);
      };
      check();
    });
  }

  async function loadProfileEnhancement() {
    if (window.__CRITTER_PROFILE_MANAGER_V2__) return;
    await loadScript(PROFILE_PANEL, 'updated profile interface', {
      critterOptionalBootFile: 'core/security/profile-panel-integrity.js',
      critterSecurityFile: 'profile-panel-integrity.js'
    }, 20000);
    if (!window.__CRITTER_PROFILE_MANAGER_V2__) {
      const error = new Error('The updated profile interface loaded but did not initialize.');
      error.code = 'CE-BOOT-INIT-001';
      error.sourceRaw = PROFILE_PANEL;
      throw error;
    }
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
    mark('critter-updated-ui-runtime-start');
    try {
      window.__CRITTER_PREBUILT_RUNTIME__ = false;
      report('core-loading', 'Starting updated game and security systems…', 26);
      await loadSecurity();

      report('game-script-started', 'Loading the game runtime and main-menu UI…', 56);
      await loadScript(RUNTIME, 'updated game runtime', {
        requiredBootFile: 'core/game/game-runtime.js',
        critterRuntime: 'updated-ui-runtime'
      }, 45000);

      if (!window.__CRITTER_DIAGNOSTICS__ && !window.__CRITTER_DEBUG__) {
        const error = new Error('The updated game runtime file loaded but did not initialize the game systems.');
        error.code = 'CE-BOOT-INIT-001';
        error.sourceRaw = RUNTIME;
        throw error;
      }

      normalizeStaticMarkup();
      report('game-initialized', 'Finishing the main menu and local profile startup…', 88);
      await waitForGame();

      window.__CRITTER_PREBUILT_RUNTIME__ = true;
      mark('critter-updated-ui-runtime-end');
      window.__CRITTER_FASTBOOT_METRICS__ = Object.freeze({
        mode: 'updated-ui-runtime',
        buildId: BUILD_ID,
        totalMs: measure('Critter Updated UI Runtime', 'critter-updated-ui-runtime-start', 'critter-updated-ui-runtime-end')
      });

      report('ready', 'The main menu, game runtime, and required security systems are ready.', 100);
      window.CritterErrorUI?.clear?.();

      window.__CRITTER_PROFILE_PANEL_PROMISE__ = loadProfileEnhancement()
        .then(() => {
          normalizeStaticMarkup();
          window.dispatchEvent(new Event('critter:profile-interface-ready'));
        })
        .catch(warnOptionalProfile);
    } catch (error) {
      fail(error, 'updated-ui-runtime');
    }
  })();
})();
