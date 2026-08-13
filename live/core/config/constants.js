(() => {
  'use strict';

  window.CritterConstants = Object.freeze({
    PETAL_CAP: 1000000,
    PROJECT_NAME: 'Critter Extraction'
  });

  const uiAssetVersion = '0.22.0-mobile-ui-1';

  const loadStyle = (id, href) => {
    if (document.getElementById(id)) return;
    const style = document.createElement('link');
    style.id = id;
    style.rel = 'stylesheet';
    style.href = `${href}?v=${uiAssetVersion}`;
    document.head.appendChild(style);
  };

  const loadScript = (id, src) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = `${src}?v=${uiAssetVersion}`;
    script.async = false;
    document.head.appendChild(script);
  };

  loadStyle('critterResponsiveStyles', './core/styles/responsive.css');
  loadScript('critterMobileViewportScript', './core/ui/mobile-viewport.js');

  loadStyle('settingsAccountsRevampStyles', './core/ui/settings-accounts-revamp.css');
  loadScript('settingsAccountsRevampScript', './core/ui/settings-accounts-revamp.js');
  loadStyle('critterUiMotionStyles', './core/ui/ui-motion.css');
  loadScript('critterUiMotionScript', './core/ui/ui-motion.js');
  loadStyle('critterBanScreenStyles', './core/ui/ban-screen.css');
  loadStyle('critterBanScreenResponsiveStyles', './core/ui/ban-screen-responsive.css');
  loadScript('critterBanScreenScript', './core/ui/ban-screen.js');
  loadScript('critterBanScreenViewportScript', './core/ui/ban-screen-viewport.js');

  // Keep the safe screen-space graphics polish, but do not patch the game
  // core at runtime. The previous graphics observer could repeatedly mutate
  // its own settings label and starve the boot process on real browsers.
  loadStyle('critterGraphicsEnhancementsStyles', './core/rendering/graphics-enhancements.css');
  window.__CRITTER_GRAPHICS_READY__ = Promise.resolve(null);
})();