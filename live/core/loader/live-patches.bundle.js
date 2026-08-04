(() => {
  'use strict';

  if (window.__CRITTER_PATCH_BUNDLE_READY__) return;

  const VERSION = String(window.CritterBuildInfo?.buildId || window.__CRITTER_FASTBOOT_VERSION__ || '2026-08-03-fastboot-1').replace(/[^A-Za-z0-9._-]/g, '');
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
  ].map(url => `${url}?v=${VERSION}`);

  const nativeFetch = window.fetch.bind(window);

  function execute(source, url) {
    const script = document.createElement('script');
    script.textContent = `${source}\n//# sourceURL=${new URL(url, location.href).href}`;
    document.head.appendChild(script);
    script.remove();
  }

  window.__CRITTER_PATCH_BUNDLE_READY__ = (async () => {
    const responses = await Promise.all(MODULES.map(url => nativeFetch(url, {
      cache: 'force-cache',
      credentials: 'same-origin'
    })));

    responses.forEach((response, index) => {
      if (!response.ok) throw new Error(`Could not load ${MODULES[index]} (HTTP ${response.status})`);
    });

    const sources = await Promise.all(responses.map(response => response.text()));
    sources.forEach((source, index) => execute(source, MODULES[index]));
    window.__CRITTER_PATCH_BUNDLE_MODE__ = 'parallel-source-fallback';
    return true;
  })();
})();
