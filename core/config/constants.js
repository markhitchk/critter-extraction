(() => {
  'use strict';

  window.CritterConstants = Object.freeze({
    PETAL_CAP: 1000000,
    PROJECT_NAME: 'Critter Extraction'
  });

  const uiAssetVersion = '0.22.0-2';

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

  loadStyle('settingsAccountsRevampStyles', './core/ui/settings-accounts-revamp.css');
  loadScript('settingsAccountsRevampScript', './core/ui/settings-accounts-revamp.js');
  loadStyle('critterUiMotionStyles', './core/ui/ui-motion.css');
  loadScript('critterUiMotionScript', './core/ui/ui-motion.js');
})();
