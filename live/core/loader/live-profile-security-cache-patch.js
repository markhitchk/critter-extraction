(() => {
  'use strict';
  const utils = window.__CRITTER_PATCH_UTILS__;
  if (!utils || !Array.isArray(window.__CRITTER_ARENA_PATCHES__)) throw new Error('Profile cache security patch loaded before the Critter patch runtime');

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const { one } = utils;
    source = one(
      source,
      'synchronous secure profile cache parser',
      /  async function accountToXml\(account, suppliedPassword = ''\) \{/,
      `  function accountFromCacheXml(text) {
    const doc = new DOMParser().parseFromString(String(text), 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid cached profile XML');
    const root = doc.documentElement, payload = root?.querySelector('ProfileData');
    if (!root || root.nodeName !== 'CritterExtractionProfile' || !payload) throw new Error('Cached profile data is missing');
    const pack = JSON.parse(decodeUtf8Base64Url(payload.textContent));
    if (!pack || !['critter-account-xml-v4','critter-account-xml-v5'].includes(pack.type) || !pack.account) throw new Error('Unsupported cached profile XML');
    return pack.account;
  }
  async function accountToXml(account, suppliedPassword = '') {`
    );
    source = one(
      source,
      'synchronous secure profile cache recovery',
      /          const restored = normalizeDatabase\(\{schemaVersion:15,accounts:\[accountFromXml\(xmlBackup\)\],activeId:'',updatedAt:Date\.now\(\)\}\);/,
      "          const restored = normalizeDatabase({schemaVersion:15,accounts:[accountFromCacheXml(xmlBackup)],activeId:'',updatedAt:Date.now()});"
    );
    return source;
  });
})();
