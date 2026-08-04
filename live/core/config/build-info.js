(() => {
  'use strict';
  window.CritterBuildInfo = Object.freeze({
    buildId: '9f9a146f3ce1d276',
    channel: 'github-pages',
    generatedAt: '2026-08-03T19:08:00-07:00'
  });

  // Security loads once, in a fixed order, before the direct game runtime.
  const files = [
    'security-core.js',
    'security-core-hotfix.js',
    'security-network-v2.js',
    'security-ui.js',
    'profile-panel-integrity.js'
  ];
  const src = file => window.CritterPaths?.resolve
    ? window.CritterPaths.resolve(`core/security/${file}?v=1.0.4`)
    : `./core/security/${file}?v=1.0.4`;

  if (document.readyState === 'loading') {
    for (const file of files) {
      const url = String(src(file)).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      document.write(`<script src="${url}" data-required-boot-file="core/security/${file}"><\/script>`);
    }
  } else {
    let chain = Promise.resolve();
    for (const file of files) chain = chain.then(() => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src(file);
      script.async = false;
      script.dataset.requiredBootFile = `core/security/${file}`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${file}`));
      document.head.appendChild(script);
    }));
    chain.catch(error => {
      console.error('Critter security startup failed', error);
      window.__critterBootReport?.('failure', error?.message || String(error));
    });
  }
})();
