/* Critter Codes insured stash protection v1.0.0. */
(() => {
  'use strict';

  if (window.CritterCodesInsurance?.version === '1.0.0') return;

  const VERSION = '1.0.0';
  const DB_KEYS = new Set(['critterExtractionInventory', 'critterExtraction3DInventory']);
  const STASH_LIMIT = 40;
  const ELIGIBLE_TYPES = new Set([
    'item', 'weapon', 'armor', 'backpack', 'hat', 'outfit', 'crate',
    'supply_crate', 'weapon_wrap', 'equipment', 'gear'
  ]);

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function cleanId(value) {
    return String(value || '').trim().slice(0, 96);
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
    return account;
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
      type: 'insured-reward',
      source: 'critter-code',
      insured: true,
      permanent: true,
      createdAt: new Date().toISOString(),
      item: clone(item)
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
    if (!api || api.__insuredRewardWrapper) return api;
    const original = typeof api.redeemCode === 'function' ? api.redeemCode.bind(api) : typeof api.redeem === 'function' ? api.redeem.bind(api) : null;
    if (!original) return api;
    const wrapped = async code => {
      const result = await original(code);
      if (result?.success !== false) result.insurance = insureRewards(result);
      return result;
    };
    try {
      api.redeem = wrapped;
      api.redeemCode = wrapped;
      Object.defineProperty(api, '__insuredRewardWrapper', { value: true });
      return api;
    } catch (_) {
      return Object.freeze({ ...api, redeem: wrapped, redeemCode: wrapped, __insuredRewardWrapper: true });
    }
  }

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function critterCodesInsuredSetItem(key, value) {
    if (this !== localStorage || !DB_KEYS.has(String(key))) return nativeSetItem.call(this, key, value);
    try {
      const database = JSON.parse(String(value));
      if (database && Array.isArray(database.accounts)) {
        for (const account of database.accounts) if (account) reconcileAccount(account);
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
      }
      if (changed) saveDatabase(loaded.key, loaded.database);
    }
    return window.CritterCodes;
  }

  window.CritterCodesInsurance = Object.freeze({
    version: VERSION,
    eligibleReward,
    insureRewards,
    reconcileAccount,
    wrapApi,
    refresh
  });

  window.addEventListener('critter-codes-api-ready', refresh);
  window.addEventListener('critter-codes-runtime-exported', refresh);
  window.addEventListener('storage', refresh);
  refresh();
})();
