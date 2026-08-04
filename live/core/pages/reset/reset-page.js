/* Critter Extraction reset protection v2.0.0. */
(() => {
  'use strict';

  const VERSION = '2.0.0';
  const CURRENT_DB_KEY = 'critterExtractionInventory';
  const LEGACY_DB_KEY = 'critterExtraction3DInventory';
  const PROFILE_CACHE_KEY = 'critterExtractionProfileXml';
  const LEGACY_PROFILE_CACHE_KEY = 'critterExtraction3DProfileXml';
  const DEFAULT_STASH_SLOTS = 40;
  const DEFAULT_PREPARED_SLOTS = 20;

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function loadDatabase() {
    for (const key of [CURRENT_DB_KEY, LEGACY_DB_KEY]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const database = JSON.parse(raw);
        if (database && Array.isArray(database.accounts) && database.accounts.length) return { key, database };
      } catch (_) { }
    }
    return null;
  }

  function activeAccount(database) {
    return database?.accounts?.find(value => value?.id === database.activeId) || database?.accounts?.find(Boolean) || null;
  }

  function insuredKey(item) {
    return String(item?.insuredRewardId || item?.rewardId || item?.itemId || item?.id || '').trim();
  }

  function collectInsured(account) {
    const records = new Map();
    if (account?.insuredRewards && typeof account.insuredRewards === 'object') {
      for (const [id, item] of Object.entries(account.insuredRewards)) if (id && item) records.set(id, clone(item));
    }
    for (const item of account?.stash || []) {
      if (!item?.insured && item?.source !== 'critter-code') continue;
      const id = insuredKey(item);
      if (id) records.set(id, clone(item));
    }
    for (const delivery of account?.deliveries || []) {
      const item = delivery?.item || delivery;
      if (!item?.insured && item?.source !== 'critter-code' && delivery?.source !== 'critter-code') continue;
      const id = insuredKey(item);
      if (id) records.set(id, clone(item));
    }
    return records;
  }

  function restoreInsured(account, records) {
    const slots = Math.max(DEFAULT_STASH_SLOTS, Array.isArray(account.stash) ? account.stash.length : 0);
    account.stash = Array(slots).fill(null);
    account.deliveries = Array.isArray(account.deliveries)
      ? account.deliveries.filter(delivery => {
          const item = delivery?.item || delivery;
          return item?.source !== 'critter-code' && delivery?.source !== 'critter-code' && !item?.insured;
        })
      : [];
    account.insuredRewards = {};

    for (const [id, original] of records) {
      const item = clone(original);
      item.insuredRewardId = id;
      item.rewardId = item.rewardId || id;
      item.insured = true;
      item.permanent = true;
      item.source = 'critter-code';
      account.insuredRewards[id] = clone(item);
      const empty = account.stash.findIndex(slot => !slot);
      if (empty >= 0) account.stash[empty] = item;
      else account.deliveries.push({
        id: `reset-insured-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'insured-reward',
        source: 'critter-code',
        insured: true,
        permanent: true,
        createdAt: new Date().toISOString(),
        item
      });
    }
  }

  function base64UrlUtf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
  }

  function xmlEscape(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  }

  function accountToXml(account) {
    const payload = base64UrlUtf8(JSON.stringify({ type: 'critter-account-xml-v5', account }));
    return `<?xml version="1.0" encoding="UTF-8"?>\n<CritterExtractionProfile version="5" studio="Harley's Studios" gameVersion="v0.22.0" exportedAt="${new Date().toISOString()}"><DisplayName>${xmlEscape(account.displayName)}</DisplayName><Username>${xmlEscape(account.username)}</Username><Bio>${xmlEscape(account.bio)}</Bio><AvatarURL>${xmlEscape(account.avatar)}</AvatarURL><ProfileData encoding="base64url-json">${payload}</ProfileData></CritterExtractionProfile>`;
  }

  function protectedReset(mode) {
    const loaded = loadDatabase();
    const account = activeAccount(loaded?.database);
    if (!loaded || !account) throw new Error('No active local account was found.');

    const insured = collectInsured(account);
    const preparedSlots = Math.max(DEFAULT_PREPARED_SLOTS, Array.isArray(account.prepared) ? account.prepared.length : 0);

    account.prepared = Array(preparedSlots).fill(null);
    account.pendingDrop = null;
    account.loadoutId = 'meadow_scout';
    account.equippedWeaponId = 'pea_popper';
    account.equippedArmorId = 'leaf_vest';
    account.loadout = { weapon: 'Pea Popper', armor: 'Leaf Vest', backpack: 'Critter Pack' };
    restoreInsured(account, insured);

    if (mode === 'items-and-petals') {
      account.petals = 0;
      account.economyTransactions = [];
    }

    loaded.database.schemaVersion = Math.max(18, Number(loaded.database.schemaVersion) || 0);
    loaded.database.updatedAt = Date.now();
    localStorage.setItem(CURRENT_DB_KEY, JSON.stringify(loaded.database));
    if (loaded.key === LEGACY_DB_KEY) localStorage.removeItem(LEGACY_DB_KEY);
    localStorage.setItem(PROFILE_CACHE_KEY, accountToXml(account));
    localStorage.removeItem(LEGACY_PROFILE_CACHE_KEY);
    return { insured: insured.size };
  }

  function setStatus(message, error = false) {
    const node = document.getElementById('status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', error);
  }

  function refreshSummary() {
    location.reload();
  }

  function intercept(event) {
    const button = event.target?.closest?.('#inventoryReset,#fullReset');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const loaded = loadDatabase();
    const account = activeAccount(loaded?.database);
    if (!account) {
      setStatus('No active local account was found.', true);
      return;
    }

    const name = String(account.displayName || account.username || 'this account');
    const full = button.id === 'fullReset';
    if (full) {
      const typed = prompt('This resets normal inventory, equipped items, Petals, and economy history. Insured Critter Code rewards, Fair Play data, level, and CAREER stay.\n\nType RESET to continue:');
      if (typed !== 'RESET') {
        if (typed !== null) setStatus('Reset cancelled. Type RESET exactly to confirm.', true);
        return;
      }
    } else if (!confirm(`Reset normal stash items, prepared inventory, unfinished drop, and equipped loadout for ${name}?\n\nInsured Critter Code rewards, Fair Play data, XP, level, Petals, and CAREER will stay.`)) return;

    try {
      const result = protectedReset(full ? 'items-and-petals' : 'inventory');
      setStatus(`Reset complete. ${result.insured} insured Critter Code reward${result.insured === 1 ? '' : 's'} and Fair Play data were preserved.`);
      setTimeout(refreshSummary, 500);
    } catch (error) {
      console.error('[Reset Protection]', error);
      setStatus(`Reset failed: ${error?.message || error}`, true);
    }
  }

  document.addEventListener('click', intercept, true);
  window.CritterResetPage = Object.freeze({
    version: VERSION,
    requiresExactConfirmation: true,
    confirmationText: 'RESET',
    protectedReset,
    collectInsured
  });
})();
