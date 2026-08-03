(() => {
  'use strict';

  const utils = window.__CRITTER_PATCH_UTILS__;
  if (!utils || !Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Legacy profile export fix loaded before the Critter patch runtime');
  }

  function replacementSource(indent) {
    const i = indent || '  ';
    const b = i + '  ';
    const c = b + '  ';
    return `${i}function sanitizeLegacyExportTransactions(transactions) {
${b}const now = Date.now(), seen = new Set();
${b}const source = Array.isArray(transactions) ? transactions.slice(-40) : [];
${b}const cleaned = [];
${b}for (let index = 0; index < source.length; index++) {
${c}const transaction = source[index];
${c}if (!transaction || typeof transaction !== 'object') continue;
${c}const entry = deepCopy(transaction);
${c}let id = safeText(entry.id, 80).replace(/[^A-Za-z0-9_-]/g, '');
${c}if (!id || seen.has(id)) id = 'legacy_' + now.toString(36) + '_' + index + '_' + uid().slice(-6);
${c}seen.add(id); entry.id = id;
${c}entry.at = Math.min(now, Math.max(1, Math.floor(Number(entry.at) || now)));
${c}for (const key of ['amount','qty']) {
${c}  if (entry[key] == null) continue;
${c}  entry[key] = Math.max(-PETAL_CAP, Math.min(PETAL_CAP, Math.trunc(Number(entry[key]) || 0)));
${c}}
${c}if (entry.itemId && !ITEMS[entry.itemId]) delete entry.itemId;
${c}cleaned.push(entry);
${b}}
${b}cleaned.sort((a, b) => a.at - b.at);
${b}return cleaned;
${i}}
${i}function prepareLegacyAccountForSecureExport(account) {
${b}if (!account || typeof account !== 'object' || Array.isArray(account)) throw new Error('Legacy account data is missing');
${b}const strictSecure = account.securityTrust === 'encrypted-v6' &&
${c}(Number(account.securityLastVerifiedAt) > 0 || Number(account.securityExportConfirmedAt) > 0);
${b}if (strictSecure) return false;
${b}try {
${c}validateSecureProfileAccount(account);
${c}if (account.securityTrust === 'encrypted-v6') return false;
${b}} catch (_) { }
${b}const migratedAt = Date.now();
${b}account.id = safeText(account.id, 96).replace(/[^A-Za-z0-9_-]/g, '') || uid();
${b}account.username = safeText(account.username, 18).replace(/[^A-Za-z0-9_-]/g, '') || ('legacy_' + migratedAt.toString(36)).slice(0, 18);
${b}account.displayName = safeText(account.displayName, 24) || 'Legacy Critter';
${b}account.bio = safeText(account.bio, 120);
${b}account.xp = Math.max(0, Math.min(1_000_000_000_000, Math.floor(Number(account.xp) || 0)));
${b}account.petals = safePetals(account.petals);
${b}account.stats = { extracts:0, berries:0, kills:0, matches:0, ...(account.stats || {}) };
${b}for (const key of ['extracts','berries','kills','matches']) {
${c}account.stats[key] = Math.max(0, Math.min(10_000_000, Math.floor(Number(account.stats[key]) || 0)));
${b}}
${b}account.stats.extracts = Math.min(account.stats.extracts, account.stats.matches);
${b}account.stats.kills = Math.min(account.stats.kills, Math.max(500, account.stats.matches * 500));
${b}account.stats.berries = Math.min(account.stats.berries, Math.max(1000, account.stats.matches * 1000));
${b}account.stash = sanitizeLegacySlots(account.stash, STASH_COUNT);
${b}account.prepared = sanitizeLegacySlots(account.prepared, SLOT_COUNT);
${b}account.economyTransactions = sanitizeLegacyExportTransactions(account.economyTransactions);
${b}account.loadoutId = LOADOUTS[account.loadoutId] ? account.loadoutId : defaultLoadoutId;
${b}account.equippedWeaponId = WEAPONS[account.equippedWeaponId] ? account.equippedWeaponId : null;
${b}account.equippedArmorId = ARMORS[account.equippedArmorId] ? account.equippedArmorId : null;
${b}syncAccountLoadout(account);
${b}account.securityLegacyMigratedAt = migratedAt;
${b}account.securityLegacyMigrationVersion = 2;
${b}account.securityLegacyMigrationSource = 'pre-v6-local-account';
${b}return true;
${i}}
${i}async function accountToXml(account, suppliedPassword = '') {
${b}requireProfileCrypto();
${b}const legacyMigrated = prepareLegacyAccountForSecureExport(account);
${b}profileSecurityId(account);
${b}account.securityTrust = 'encrypted-v6';
${b}account.securityRevision = Math.max(0, Math.floor(Number(account.securityRevision) || 0)) + 1;
${b}account.securityLastExportAt = Date.now();
${b}validateSecureProfileAccount(account);
${b}account.securityExportConfirmedAt = Date.now();
${b}const password = suppliedPassword || promptProfilePassword('export');
${b}if (legacyMigrated) {
${c}window.CritterSecurityRuntime?.log?.('legacy-local-profile-upgraded',{securityId:account.securityId,migrationVersion:2});
${c}toast('Older account upgraded to current secure profile limits', 3200);
${b}}`;
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const pattern = /([ \t]*)async function accountToXml\(account, suppliedPassword = ''\) \{\s*requireProfileCrypto\(\);[\s\S]*?const password = suppliedPassword \|\| promptProfilePassword\('export'\);/;
    return utils.one(
      source,
      'legacy local account migration before secure export',
      pattern,
      (_match, indent) => replacementSource(indent),
      false
    );
  });
})();
