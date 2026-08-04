/* Critter Codes insured rewards and persistent Critter unlocks v1.1.0. */
(() => {
  'use strict';

  if (window.CritterCodesInsurance?.version === '1.1.0') return;

  const VERSION = '1.1.0';
  const DB_KEYS = new Set(['critterExtractionInventory', 'critterExtraction3DInventory']);
  const STASH_LIMIT = 40;
  const ELIGIBLE_TYPES = new Set([
    'item', 'weapon', 'armor', 'backpack', 'hat', 'outfit', 'crate',
    'supply_crate', 'weapon_wrap', 'equipment', 'gear'
  ]);

  /* Codes remain one-way hashed in source. Each hash maps to the stable Critter ID
     used by profile persistence and the character selector. */
  const CODE_CRITTERS = Object.freeze({
    '2a83548f7fefaf4ae1f2372d846e96826ba281595eff8bc83d7af90adf24ce97': 'welcome_critter',
    '637330b847c1bdd07302922781dfb9724ee80998fff2d8dbef4f849cba6118f6': 'penguin',
    '3a1fd15518b7e0e8131e2e8c89946474e0e754af992dde9e36f83b3439e8a4bc': 'crow',
    'e9bf0628e04c24ab8b96c31cf4243a30af5a71ea1fb9d8aec03e49293c9bf385': 'raccoon',
    '2f7c128814d53abe15caf7ac6e8c0cdbf9539c879909c73c587c9d95a7bdc7dd': 'frog',
    'f4573654f2335014dceba5bc924788fe3d3d7f6e68cd08a1e23a34fff5081b54': 'red_panda',
    'd19588c567a8486a219780f27aa0ba10110e2c6b9c8441e7eaf5da70449258f9': 'arctic_fox',
    '462caaeec670cb11134c59b23b68d72ce46a540b5308b9477040c838bb0b7a36': 'capybara',
    '6517b73d56267f043d19daf7df05757f2c101f9ee1e61774f0ea601e56538c4a': 'axolotl',
    'dded0b9258885fee5143f55b9dc32edaa5c4eeeab637077767631e25f5cd16e1': 'clan_critter'
  });

  const BUNDLE_CRITTERS = Object.freeze({
    b01: 'welcome_critter', b02: 'penguin', b03: 'crow', b04: 'raccoon', b05: 'frog',
    b06: 'red_panda', b07: 'arctic_fox', b08: 'capybara', b09: 'axolotl', b10: 'clan_critter'
  });

  const CRITTER_ALIASES = Object.freeze({
    welcome: 'welcome_critter', welcomecritter: 'welcome_critter', welcome_critter: 'welcome_critter',
    penguin: 'penguin', crow: 'crow', raccoon: 'raccoon', frog: 'frog',
    redpanda: 'red_panda', red_panda: 'red_panda', 'red-panda': 'red_panda',
    arcticfox: 'arctic_fox', arctic_fox: 'arctic_fox', 'arctic-fox': 'arctic_fox',
    capybara: 'capybara', axolotl: 'axolotl',
    clancritter: 'clan_critter', clan_critter: 'clan_critter', 'clan-critter': 'clan_critter'
  });

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function cleanId(value) {
    return String(value || '').trim().slice(0, 96);
  }

  function normalizeCritterId(value) {
    const raw = cleanId(value).toLowerCase();
    const compact = raw.replace(/[\s_-]+/g, '');
    return CRITTER_ALIASES[raw] || CRITTER_ALIASES[compact] || '';
  }

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  async function sha256(value) {
    if (!window.crypto?.subtle || typeof TextEncoder !== 'function') return '';
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function rewardType(reward) {
    return String(reward?.type || reward?.kind || reward?.category || '').trim().toLowerCase();
  }

  function rewardId(reward) {
    return cleanId(reward?.id || reward?.rewardId || reward?.itemId || reward?.definitionId);
  }

  function eligibleReward(reward) {
    if (!reward || typeof reward !== 'object') return false;
    const type = rewardType(reward);
    if (ELIGIBLE_TYPES.has(type)) return true;
    return Boolean(reward.itemId || reward.inventoryItem || reward.stashItem);
  }

  function insuredKey(item) {
    return cleanId(item?.insuredRewardId || item?.rewardId || item?.itemId || item?.id);
  }

  function makeInsuredItem(reward, bundleId = '') {
    const id = rewardId(reward);
    if (!id) return null;
    const source = reward.stashItem || reward.inventoryItem || reward.item || reward;
    const item = clone(source);
    item.id = cleanId(item.id || item.itemId || id);
    item.itemId = cleanId(item.itemId || item.id || id);
    item.rewardId = id;
    item.insuredRewardId = id;
    item.insured = true;
    item.permanent = true;
    item.source = 'critter-code';
    item.bundleId = cleanId(bundleId || reward.bundleId);
    item.acquiredAt = item.acquiredAt || new Date().toISOString();
    item.quantity = Math.max(1, Number(item.quantity || reward.quantity || 1) || 1);
    return item;
  }

  function ensureAccountShape(account) {
    if (!account || typeof account !== 'object') return account;
    if (!Array.isArray(account.stash)) account.stash = Array(STASH_LIMIT).fill(null);
    if (account.stash.length < STASH_LIMIT) account.stash.push(...Array(STASH_LIMIT - account.stash.length).fill(null));
    if (!Array.isArray(account.deliveries)) account.deliveries = [];
    if (!account.insuredRewards || typeof account.insuredRewards !== 'object' || Array.isArray(account.insuredRewards)) account.insuredRewards = {};
    if (!Array.isArray(account.unlockedCritters)) account.unlockedCritters = [];
    if (!Array.isArray(account.unlockedCosmetics)) account.unlockedCosmetics = [];
    if (!account.currencies || typeof account.currencies !== 'object' || Array.isArray(account.currencies)) account.currencies = {};
    if (!account.critterCodeUnlocks || typeof account.critterCodeUnlocks !== 'object' || Array.isArray(account.critterCodeUnlocks)) account.critterCodeUnlocks = {};
    if (!account.equippedRewards || typeof account.equippedRewards !== 'object' || Array.isArray(account.equippedRewards)) account.equippedRewards = {};
    if (!account.appearance || typeof account.appearance !== 'object' || Array.isArray(account.appearance)) account.appearance = {};
    return account;
  }

  function addUnique(list, value) {
    if (!value || list.includes(value)) return false;
    list.push(value);
    return true;
  }

  function unlockCritter(account, critterId, source = '') {
    ensureAccountShape(account);
    const canonical = normalizeCritterId(critterId);
    if (!canonical) return false;
    let changed = addUnique(account.unlockedCritters, canonical);
    if (!account.critterCodeUnlocks[canonical]) {
      account.critterCodeUnlocks[canonical] = { source: cleanId(source || 'critter-code'), unlockedAt: new Date().toISOString() };
      changed = true;
    }
    return changed;
  }

  function allPresentIds(account) {
    const ids = new Set();
    for (const item of account.stash || []) {
      const id = insuredKey(item);
      if (id) ids.add(id);
    }
    for (const delivery of account.deliveries || []) {
      const id = insuredKey(delivery?.item || delivery);
      if (id) ids.add(id);
    }
    return ids;
  }

  function addToStashOrDelivery(account, item) {
    const empty = account.stash.findIndex(slot => !slot);
    if (empty >= 0) {
      account.stash[empty] = clone(item);
      return 'stash';
    }
    account.deliveries.push({
      id: `cc-delivery-${item.insuredRewardId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'insured-reward', source: 'critter-code', insured: true, permanent: true,
      createdAt: new Date().toISOString(), item: clone(item)
    });
    return 'delivery';
  }

  function reconcileAccount(account) {
    ensureAccountShape(account);
    const present = allPresentIds(account);
    let restored = 0;
    let delivered = 0;
    for (const [id, stored] of Object.entries(account.insuredRewards)) {
      if (!id || !stored || present.has(id)) continue;
      const destination = addToStashOrDelivery(account, stored);
      present.add(id);
      restored += destination === 'stash' ? 1 : 0;
      delivered += destination === 'delivery' ? 1 : 0;
    }
    return { restored, delivered };
  }

  function activeAccount(database) {
    if (!database || !Array.isArray(database.accounts)) return null;
    return database.accounts.find(value => value?.id === database.activeId) || database.accounts.find(Boolean) || null;
  }

  function loadDatabase() {
    for (const key of DB_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const database = JSON.parse(raw);
        if (database && Array.isArray(database.accounts)) return { key, database };
      } catch (_) { }
    }
    return null;
  }

  function saveDatabase(key, database) {
    nativeSetItem.call(localStorage, key, JSON.stringify(database));
  }

  function collectClaimTokens(value, tokens = new Set(), depth = 0, seen = new WeakSet()) {
    if (depth > 6 || value == null) return tokens;
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) tokens.add(text);
      return tokens;
    }
    if (typeof value !== 'object' || seen.has(value)) return tokens;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) collectClaimTokens(item, tokens, depth + 1, seen);
      return tokens;
    }
    for (const [key, child] of Object.entries(value)) {
      if (/redeem|claim|code|reward|bundle|unlock/i.test(key)) collectClaimTokens(child, tokens, depth + 1, seen);
    }
    return tokens;
  }

  function repairClaimedCritters(account) {
    ensureAccountShape(account);
    const tokens = collectClaimTokens(account);
    let changed = false;
    for (const token of tokens) {
      const lower = String(token).toLowerCase();
      const critter = CODE_CRITTERS[lower] || BUNDLE_CRITTERS[lower] || normalizeCritterId(lower);
      if (critter) changed = unlockCritter(account, critter, lower) || changed;
    }
    return changed;
  }

  function crittersFromResult(result) {
    const found = new Set();
    const bundleId = cleanId(result?.bundleId || result?.bundle?.id || result?.entry?.id).toLowerCase();
    if (BUNDLE_CRITTERS[bundleId]) found.add(BUNDLE_CRITTERS[bundleId]);
    const rewards = Array.isArray(result?.rewards) ? result.rewards : [];
    for (const reward of rewards) {
      const type = rewardType(reward);
      const candidate = normalizeCritterId(rewardId(reward) || reward?.critterId || reward?.species || reward?.name);
      if (candidate && (type === 'critter' || /critter|animal|species|character/.test(type) || reward?.critterId || reward?.species)) found.add(candidate);
    }
    return [...found];
  }

  function syncUnlockUi() {
    const loaded = loadDatabase();
    const account = activeAccount(loaded?.database);
    if (!account) return;
    ensureAccountShape(account);
    const unlocked = new Set(account.unlockedCritters.map(normalizeCritterId).filter(Boolean));

    document.querySelectorAll('[data-critter-id],[data-species],[data-reward-critter-id]').forEach(card => {
      const id = normalizeCritterId(card.dataset.critterId || card.dataset.species || card.dataset.rewardCritterId);
      if (!id || !unlocked.has(id)) return;
      card.classList.remove('locked', 'is-locked', 'reward-locked', 'code-locked');
      card.classList.add('unlocked', 'is-unlocked');
      card.removeAttribute('aria-disabled');
      card.querySelectorAll('[disabled]').forEach(node => { node.disabled = false; });
      card.querySelectorAll('.lock,.lock-icon,.locked-overlay,.critter-lock,[data-lock]').forEach(node => { node.hidden = true; node.setAttribute('aria-hidden', 'true'); });
      card.querySelectorAll('[data-unlock-code],.unlock-code,.locked-copy').forEach(node => { node.hidden = true; });
    });

    window.dispatchEvent(new CustomEvent('critter-code-unlocks-changed', {
      detail: { unlockedCritters: [...unlocked], accountId: account.id || '' }
    }));
  }

  function persistSuccessfulUnlock(result, codeHash = '') {
    const loaded = loadDatabase();
    const account = activeAccount(loaded?.database);
    if (!loaded || !account) return { unlocked: [] };
    ensureAccountShape(account);
    const critters = new Set(crittersFromResult(result));
    if (CODE_CRITTERS[codeHash]) critters.add(CODE_CRITTERS[codeHash]);
    let changed = false;
    for (const critter of critters) changed = unlockCritter(account, critter, codeHash || result?.bundleId || 'redeemed') || changed;
    changed = repairClaimedCritters(account) || changed;
    if (changed) {
      loaded.database.updatedAt = Date.now();
      saveDatabase(loaded.key, loaded.database);
    }
    queueMicrotask(syncUnlockUi);
    setTimeout(syncUnlockUi, 50);
    return { unlocked: [...critters] };
  }

  function insureRewards(result) {
    const loaded = loadDatabase();
    const account = activeAccount(loaded?.database);
    if (!loaded || !account) return { insured: 0, stash: 0, delivery: 0 };
    ensureAccountShape(account);

    const bundleId = cleanId(result?.bundleId || result?.bundle?.id || result?.entry?.id);
    const rewards = Array.isArray(result?.rewards) ? result.rewards : [];
    const present = allPresentIds(account);
    let insured = 0;
    let stash = 0;
    let delivery = 0;

    for (const reward of rewards) {
      if (!eligibleReward(reward)) continue;
      const item = makeInsuredItem(reward, bundleId);
      if (!item) continue;
      const id = item.insuredRewardId;
      account.insuredRewards[id] = clone(item);
      insured += 1;
      if (present.has(id)) continue;
      const destination = addToStashOrDelivery(account, item);
      present.add(id);
      if (destination === 'stash') stash += 1;
      else delivery += 1;
    }

    reconcileAccount(account);
    loaded.database.updatedAt = Date.now();
    saveDatabase(loaded.key, loaded.database);
    window.dispatchEvent(new CustomEvent('critter-codes-insurance-change', { detail: { insured, stash, delivery } }));
    return { insured, stash, delivery };
  }

  function wrapApi(api) {
    if (!api || api.__insuredRewardWrapperV110) return api;
    const original = typeof api.redeemCode === 'function' ? api.redeemCode.bind(api) : typeof api.redeem === 'function' ? api.redeem.bind(api) : null;
    if (!original) return api;
    const wrapped = async code => {
      const normalized = normalizeCode(code);
      const codeHash = await sha256(normalized);
      const result = await original(code);
      if (result?.success !== false) {
        result.insurance = insureRewards(result);
        result.critterUnlocks = persistSuccessfulUnlock(result, codeHash);
      }
      return result;
    };
    try {
      api.redeem = wrapped;
      api.redeemCode = wrapped;
      Object.defineProperty(api, '__insuredRewardWrapperV110', { value: true });
      return api;
    } catch (_) {
      return Object.freeze({ ...api, redeem: wrapped, redeemCode: wrapped, __insuredRewardWrapperV110: true });
    }
  }

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function critterCodesInsuredSetItem(key, value) {
    if (this !== localStorage || !DB_KEYS.has(String(key))) return nativeSetItem.call(this, key, value);
    try {
      const database = JSON.parse(String(value));
      if (database && Array.isArray(database.accounts)) {
        for (const account of database.accounts) {
          if (!account) continue;
          reconcileAccount(account);
          repairClaimedCritters(account);
        }
        value = JSON.stringify(database);
      }
    } catch (_) { }
    return nativeSetItem.call(this, key, value);
  };

  function refresh() {
    if (window.CritterCodes) window.CritterCodes = wrapApi(window.CritterCodes);
    const loaded = loadDatabase();
    if (loaded) {
      let changed = false;
      for (const account of loaded.database.accounts) {
        if (!account) continue;
        const result = reconcileAccount(account);
        if (result.restored || result.delivered) changed = true;
        changed = repairClaimedCritters(account) || changed;
      }
      if (changed) {
        loaded.database.updatedAt = Date.now();
        saveDatabase(loaded.key, loaded.database);
      }
    }
    syncUnlockUi();
    return window.CritterCodes;
  }

  window.CritterCodesInsurance = Object.freeze({
    version: VERSION, eligibleReward, insureRewards, reconcileAccount,
    unlockCritter, repairClaimedCritters, persistSuccessfulUnlock,
    syncUnlockUi, wrapApi, refresh
  });

  window.addEventListener('critter-codes-api-ready', refresh);
  window.addEventListener('critter-codes-runtime-exported', refresh);
  window.addEventListener('critter-codes-redeemed', refresh);
  window.addEventListener('storage', refresh);
  document.addEventListener('DOMContentLoaded', refresh, { once: true });
  new MutationObserver(() => syncUnlockUi()).observe(document.documentElement, { childList: true, subtree: true });
  refresh();
})();
