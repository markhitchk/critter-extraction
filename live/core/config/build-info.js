(() => {
  'use strict';
  window.CritterBuildInfo = Object.freeze({ buildId: '3391f2959d123859', channel: 'github-pages', generatedAt: '2026-08-04T01:17:41.349Z' });

  // Security must load before game-loader.js so it can add stable XML profile
  // identifiers, repair old false bans, wrap PeerJS before multiplayer, and
  // keep the profile notice and backup-security controls available.
  const files = [
    'security-core.js',
    'security-core-hotfix.js',
    'security-network-v2.js',
    'security-ui.js',
    'profile-panel-integrity.js'
  ];
  const src = file => window.CritterPaths?.resolve
    ? window.CritterPaths.resolve(`core/security/${file}?v=1.0.2`)
    : `./core/security/${file}?v=1.0.2`;

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
    chain.catch(error => console.error('Critter security startup failed', error));
  }
})();
