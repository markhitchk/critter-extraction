(() => {
  'use strict';

  const utils = window.__CRITTER_PATCH_UTILS__;
  if (!utils || !Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Legacy profile export fix loaded before the Critter patch runtime');
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const { one } = utils;

    return one(
      source,
      'legacy local account migration before secure export',
      /    async function accountToXml\(account, suppliedPassword = ''\) \{\n      requireProfileCrypto\(\);\n      profileSecurityId\(account\);\n      account\.securityTrust = 'encrypted-v6';\n      account\.securityRevision = Math\.max\(0, Math\.floor\(Number\(account\.securityRevision\) \|\| 0\)\) \+ 1;\n      account\.securityLastExportAt = Date\.now\(\);\n      validateSecureProfileAccount\(account\);\n      const password = suppliedPassword \|\| promptProfilePassword\('export'\);/,
      `    function sanitizeLegacyExportTransactions(transactions) {
      const now = Date.now(), seen = new Set();
      const source = Array.isArray(transactions) ? transactions.slice(-40) : [];
      const cleaned = [];
      for (let index = 0; index < source.length; index++) {
        const transaction = source[index];
        if (!transaction || typeof transaction !== 'object') continue;
        const entry = deepCopy(transaction);
        let id = safeText(entry.id, 80).replace(/[^A-Za-z0-9_-]/g, '');
        if (!id || seen.has(id)) id = 'legacy_' + now.toString(36) + '_' + index + '_' + uid().slice(-6);
        seen.add(id); entry.id = id;
        entry.at = Math.min(now, Math.max(1, Math.floor(Number(entry.at) || now)));
        for (const key of ['amount','qty']) {
          if (entry[key] == null) continue;
          entry[key] = Math.max(-PETAL_CAP, Math.min(PETAL_CAP, Math.trunc(Number(entry[key]) || 0)));
        }
        if (entry.itemId && !ITEMS[entry.itemId]) delete entry.itemId;
        cleaned.push(entry);
      }
      cleaned.sort((a, b) => a.at - b.at);
      return cleaned;
    }
    function prepareLegacyAccountForSecureExport(account) {
      const alreadySecure = account?.securityTrust === 'encrypted-v6' && Number(account.securityVersion) >= PROFILE_SECURITY_VERSION;
      if (alreadySecure) return false;
      if (!account || typeof account !== 'object' || Array.isArray(account)) throw new Error('Legacy account data is missing');
      const migratedAt = Date.now();
      account.id = safeText(account.id, 96).replace(/[^A-Za-z0-9_-]/g, '') || uid();
      account.username = safeText(account.username, 18).replace(/[^A-Za-z0-9_-]/g, '') || ('legacy_' + migratedAt.toString(36)).slice(0, 18);
      account.displayName = safeText(account.displayName, 24) || 'Legacy Critter';
      account.bio = safeText(account.bio, 120);
      account.xp = Math.max(0, Math.min(1_000_000_000_000, Math.floor(Number(account.xp) || 0)));
      account.petals = safePetals(account.petals);
      account.stats = { extracts:0, berries:0, kills:0, matches:0, ...(account.stats || {}) };
      for (const key of ['extracts','berries','kills','matches']) {
        account.stats[key] = Math.max(0, Math.min(10_000_000, Math.floor(Number(account.stats[key]) || 0)));
      }
      account.stats.extracts = Math.min(account.stats.extracts, account.stats.matches);
      account.stats.kills = Math.min(account.stats.kills, Math.max(500, account.stats.matches * 500));
      account.stats.berries = Math.min(account.stats.berries, Math.max(1000, account.stats.matches * 1000));
      account.stash = sanitizeLegacySlots(account.stash, STASH_COUNT);
      account.prepared = sanitizeLegacySlots(account.prepared, SLOT_COUNT);
      account.economyTransactions = sanitizeLegacyExportTransactions(account.economyTransactions);
      account.loadoutId = LOADOUTS[account.loadoutId] ? account.loadoutId : defaultLoadoutId;
      account.equippedWeaponId = WEAPONS[account.equippedWeaponId] ? account.equippedWeaponId : null;
      account.equippedArmorId = ARMORS[account.equippedArmorId] ? account.equippedArmorId : null;
      syncAccountLoadout(account);
      account.securityLegacyMigratedAt = migratedAt;
      account.securityLegacyMigrationVersion = 1;
      account.securityLegacyMigrationSource = 'pre-v6-local-account';
      return true;
    }
    async function accountToXml(account, suppliedPassword = '') {
      requireProfileCrypto();
      const password = suppliedPassword || promptProfilePassword('export');
      const legacyMigrated = prepareLegacyAccountForSecureExport(account);
      profileSecurityId(account);
      account.securityTrust = 'encrypted-v6';
      account.securityRevision = Math.max(0, Math.floor(Number(account.securityRevision) || 0)) + 1;
      account.securityLastExportAt = Date.now();
      validateSecureProfileAccount(account);
      if (legacyMigrated) {
        window.CritterSecurityRuntime?.log?.('legacy-local-profile-upgraded',{securityId:account.securityId,migrationVersion:1});
        toast('Older account upgraded to current secure profile limits', 3200);
      }`
    );
  });
})();
