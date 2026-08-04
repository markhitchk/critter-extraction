(() => {
  'use strict';

  const VERSION = window.__CRITTER_FASTBOOT_VERSION__ || '2026-08-03-fastboot-1';
  const BUILD_ID = String(window.CritterBuildInfo?.buildId || VERSION).replace(/[^A-Za-z0-9._-]/g, '');
  const RUNTIME = `./core/game/game-runtime.js?v=${BUILD_ID}`;
  const BUNDLE = `./core/loader/live-patches.bundle.js?v=${BUILD_ID}`;
  const BASE = `./core/loader/game-loader-base.js?v=${BUILD_ID}`;
  const MODULES = [
    './core/loader/live-arena-patch-1.js',
    './core/loader/live-arena-patch-2.js',
    './core/loader/live-arena-patch-3.js',
    './core/loader/live-multiplayer-ui-patch.js',
    './core/loader/live-host-disconnect-patch.js',
    './core/loader/live-webrtc-stability-patch.js',
    './core/loader/live-arena-respawn-patch.js',
    './core/loader/live-minimap-revamp-patch.js',
    './core/loader/live-inventory-grid-patch.js',
    './core/loader/live-profile-security-patch.js',
    './core/loader/live-profile-security-cache-patch.js',
    './core/loader/live-profile-legacy-export-fix-patch.js',
    './core/loader/live-ui-security-polish-patch.js',
    './core/loader/live-viewport-chat-fix-patch.js',
    './core/loader/live-inventory-modal-final-fix.js',
    './core/loader/live-network-status-panel-fix.js',
    './core/loader/live-host-peer-pings-fix.js',
    './core/loader/live-all-player-pings-fix.js',
    './core/loader/live-recovery-fairplay-compat-patch.js',
    './core/loader/live-recovery-notifications-patch.js',
    './core/loader/live-private-chat-censor-notice-fix.js',
    './core/loader/live-coop-pause-redesign-fix.js',
    './core/loader/live-empty-recovery-notice-fix.js',
    './core/loader/live-loadout-modal-viewport-fix.js'
  ].map(url => `${url}?v=${BUILD_ID}`);

  const nativeFetch = window.fetch.bind(window);
  window.__CRITTER_ARENA_PATCHES__ = [];

  function one(source, name, pattern, replacement, required = true) {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const matches = [...source.matchAll(new RegExp(pattern.source, flags))];
    if (name === 'hide arena beacon' && !matches.length) {
      console.warn('Optional LIVE patch missing: hide arena beacon; VS beacon is already moved off-map');
      return source;
    }
    if (name === 'v7 export trust label' && !matches.length) {
      const fallback = /account\.securityTrust\s*=\s*'encrypted-v6';(?=\s*account\.securityRevision)/;
      if (fallback.test(source)) return source.replace(fallback, "account.securityTrust = 'encrypted-v7';");
      console.warn('Optional LIVE patch missing: v7 export trust label; secure export remains compatible');
      return source;
    }
    if ((name === 'protect remaining players after fair play removal' || name === 'handle recovery protection and disqualify removed cheater') && !matches.length) {
      console.warn(`Optional LIVE patch missing: ${name}; Fair Play compatibility was already normalized`);
      return source;
    }
    if (name === 'dynamic match badge' && matches.length) {
      return source.replace(new RegExp(pattern.source, flags), (...args) => typeof replacement === 'function' ? replacement(...args) : replacement);
    }
    if (matches.length !== 1) {
      if (required) throw new Error(`LIVE patch ${matches.length ? 'ambiguous' : 'missing'}: ${name}`);
      console.warn(`Optional LIVE patch ${matches.length ? 'ambiguous' : 'missing'}: ${name}`);
      return source;
    }
    return source.replace(pattern, (...args) => typeof replacement === 'function' ? replacement(...args) : replacement);
  }

  function all(source, name, pattern, replacement, required = true) {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const regex = new RegExp(pattern.source, flags);
    const matches = [...source.matchAll(regex)];
    if (!matches.length) {
      if (required) throw new Error(`LIVE patch missing: ${name}`);
      console.warn(`Optional LIVE patch missing: ${name}`);
      return source;
    }
    return source.replace(regex, () => replacement);
  }

  window.__CRITTER_PATCH_UTILS__ = { one, all };

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Could not load ${url}`));
      document.head.appendChild(script);
    });
  }

  function executeSource(source, url) {
    const script = document.createElement('script');
    script.textContent = `${source}\n//# sourceURL=${new URL(url, location.href).href}`;
    document.head.appendChild(script);
    script.remove();
  }

  async function loadModulesInParallel() {
    const responses = await Promise.all(MODULES.map(url => nativeFetch(url, { cache: 'force-cache', credentials: 'same-origin' })));
    responses.forEach((response, index) => {
      if (!response.ok) throw new Error(`Could not load ${MODULES[index]} (HTTP ${response.status})`);
    });
    const sources = await Promise.all(responses.map(response => response.text()));
    sources.forEach((source, index) => executeSource(source, MODULES[index]));
  }

  async function loadPatchLayer() {
    try {
      await loadScript(BUNDLE);
      if (window.__CRITTER_PATCH_BUNDLE_READY__) await window.__CRITTER_PATCH_BUNDLE_READY__;
    } catch (bundleError) {
      console.warn('Fast patch bundle unavailable; using parallel patch fallback.', bundleError);
      await loadModulesInParallel();
    }
  }

  function mark(name) {
    try { performance.mark(name); } catch (_) {}
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
    mark('critter-fastboot-start');
    try {
      window.__CRITTER_PREBUILT_RUNTIME__ = false;
      await loadScript(RUNTIME);
      if (window.__CRITTER_PREBUILT_RUNTIME__ === true) {
        mark('critter-fastboot-end');
        window.__CRITTER_FASTBOOT_METRICS__ = Object.freeze({
          mode: 'prebuilt-runtime',
          totalMs: measure('Critter Fast Boot', 'critter-fastboot-start', 'critter-fastboot-end')
        });
        return;
      }

      mark('critter-patches-start');
      await loadPatchLayer();
      mark('critter-patches-end');
      window.__CRITTER_ARENA_UI__?.();

      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : String(input?.url || '');
        const isCore = /core\/game\/game-core\.js(?:[?#]|$)/.test(url);
        const requestInit = isCore ? { ...(init || {}), cache: 'force-cache' } : init;
        const request = nativeFetch(input, requestInit);
        if (!isCore) return request;
        return request.then(async response => {
          if (!response.ok) return response;
          let source = await response.text();
          for (const patch of window.__CRITTER_ARENA_PATCHES__) source = patch(source);
          return new Response(source, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      };

      mark('critter-core-start');
      await loadScript(BASE);
      mark('critter-core-end');
      mark('critter-fastboot-end');

      window.__CRITTER_FASTBOOT_METRICS__ = Object.freeze({
        mode: 'cached-fallback',
        patchMs: measure('Critter Patch Layer', 'critter-patches-start', 'critter-patches-end'),
        coreMs: measure('Critter Core Layer', 'critter-core-start', 'critter-core-end'),
        totalMs: measure('Critter Fast Boot', 'critter-fastboot-start', 'critter-fastboot-end')
      });
    } catch (error) {
      console.error('Critter Extraction Fast Boot failed', error);
      window.__critterBootReport?.('failure', error?.message || String(error));
    } finally {
      window.fetch = nativeFetch;
    }
  })();
})();
