(() => {
  'use strict';

  window.CritterConstants = Object.freeze({
    PETAL_CAP: 1000000,
    PROJECT_NAME: 'Critter Extraction'
  });

  const revampVersion = '0.22.0-1';
  if (!document.getElementById('settingsAccountsRevampStyles')) {
    const style = document.createElement('link');
    style.id = 'settingsAccountsRevampStyles';
    style.rel = 'stylesheet';
    style.href = `./core/ui/settings-accounts-revamp.css?v=${revampVersion}`;
    document.head.appendChild(style);
  }

  if (!document.getElementById('settingsAccountsRevampScript')) {
    const script = document.createElement('script');
    script.id = 'settingsAccountsRevampScript';
    script.src = `./core/ui/settings-accounts-revamp.js?v=${revampVersion}`;
    script.async = false;
    document.head.appendChild(script);
  }
})();
