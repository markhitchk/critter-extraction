(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Recovery page-exit fallback loaded before the Critter patch runtime');
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    if (source.includes('__CRITTER_RECOVERY_PAGE_EXIT_FALLBACK__')) return source;
    if (!source.includes('function markRecoveryInterrupted(')) {
      console.warn('Optional LIVE patch missing: recovery page-exit runtime');
      return source;
    }

    const listener = `\n  window.__CRITTER_RECOVERY_PAGE_EXIT_FALLBACK__=true;\n  window.addEventListener('pagehide',()=>{\n    try{markRecoveryInterrupted('The browser or network session ended before the run could finish.');}\n    catch(error){console.warn('Recovery page-exit checkpoint failed',error);}\n  },{capture:true});\n`;

    const initAnchor = '  renderCharacterRoster(); refreshAccountUI(); renderAccounts(); loadSettingsForm(); renderQuickbar();';
    if (source.includes(initAnchor)) return source.replace(initAnchor, listener + initAnchor);

    const reportAnchor = "  window.__critterBootReport?.('game-initialized', 'Account, inventory, settings, and menu systems are ready.');";
    if (source.includes(reportAnchor)) return source.replace(reportAnchor, listener + reportAnchor);

    console.warn('Optional LIVE patch missing: recovery page-exit initialization anchor');
    return source;
  });
})();
