(() => {
  'use strict';
  const S = window.CritterSecurityRuntime;
  if (!S || S.__inputKeyBanHotfix) return;
  S.__inputKeyBanHotfix = true;

  const falseInputBans = S.allLocalBans().filter(ban =>
    ban?.source === 'fair-play' && /FP-INPUT-KEYS/i.test(String(ban.reason || ''))
  );
  for (const ban of falseInputBans) S.removeBan(ban.id);
  if (falseInputBans.length) S.log('false-input-key-bans-cleared', { count: falseInputBans.length });

  const originalAutoBan = S.autoBan.bind(S);
  S.autoBan = (identity, code) => {
    const cleanCode = S.text(code || 'FP-REMOVED', 48).toUpperCase();
    if (cleanCode === 'FP-INPUT-KEYS') {
      S.log('fair-play-auto-ban-skipped', {
        code: cleanCode,
        reason: 'Duplicate, equivalent, delayed, or repeated browser key packets are normalized.'
      });
      return null;
    }
    return originalAutoBan(identity, cleanCode);
  };
})();
