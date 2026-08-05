/* Harley's Studios — issue #62 live model runtime bridge.
   Connects all 39 modeled critters to saves, multiplayer, UI, and graphics. */
(() => {
  'use strict';
  if (window.CritterModelRuntime) return;

  const STORAGE_KEY = 'critterExtractionInventory';
  const CORE_RUNTIME_IDS = Object.freeze(['puppy','bunny','kitty','fox','panda','bear','raccoon','redpanda']);
  const CODE_REWARD_IDS = Object.freeze(['raccoon','redpanda','penguin','crow','frog','arcticfox','capybara','axolotl','otter']);
  const catalog = window.HARLEYS_GAME_ASSETS;
  const LIVE_RUNTIME_IDS = Object.freeze([...(catalog?.speciesOrder || CORE_RUNTIME_IDS)]);
  const ADDITIONAL_RUNTIME_IDS = Object.freeze(LIVE_RUNTIME_IDS.filter(id => !CORE_RUNTIME_IDS.includes(id)));

  const clone = value => JSON.parse(JSON.stringify(value));
  const normalizeId = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  function assertCatalog() {
    if (!catalog || typeof catalog.getSpecies !== 'function') throw new Error('Issue #62 model catalog did not initialize.');
    const validation = catalog.validateCatalog?.();
    if (validation && validation.ok === false) throw new Error(`Issue #62 model catalog is invalid: ${validation.errors.join('; ')}`);
    return catalog;
  }

  function getSpecies(id) {
    return assertCatalog().getSpecies(id);
  }

  function isLiveSpecies(id) {
    return LIVE_RUNTIME_IDS.includes(normalizeId(id));
  }

  function sanitizeLiveSpecies(id) {
    const normalized = normalizeId(id);
    return isLiveSpecies(normalized) ? normalized : catalog.fallbackSpeciesId;
  }

  function runtimeDefinition(id) {
    const entry = getSpecies(id);
    return Object.freeze({
      id: entry.id,
      name: entry.name,
      role: entry.role,
      body: entry.colors.body,
      accent: entry.colors.accent,
      paw: entry.colors.paw,
      vest: entry.colors.vest,
      assetId: entry.id,
      selectionAsset: entry.selectionAsset,
      generatedPreview: entry.generatedPreview === true,
      firstPersonLimb: entry.model.firstPersonLimb,
      defaultAccessory: entry.defaultAccessory,
      model: entry.model,
      anchors: entry.anchors,
      categories: entry.categories
    });
  }

  function runtimeDefinitions() {
    return Object.freeze(Object.fromEntries(LIVE_RUNTIME_IDS.map(id => [id, runtimeDefinition(id)])));
  }

  const sourceLiteral = value => JSON.stringify(String(value));
  function speciesSource(id) {
    const entry = runtimeDefinition(id);
    return `${id}:{name:${sourceLiteral(entry.name)},role:${sourceLiteral(entry.role)},body:${sourceLiteral(entry.body)},accent:${sourceLiteral(entry.accent)},paw:${sourceLiteral(entry.paw)},vest:${sourceLiteral(entry.vest)},asset:characterAsset(${sourceLiteral(id)})}`;
  }

  function runtimeSpeciesAppendSource() {
    return ADDITIONAL_RUNTIME_IDS.map(speciesSource).join(',\n    ');
  }

  function previewAsset(id) {
    const entry = runtimeDefinition(id);
    if (entry.selectionAsset) return window.CritterPaths?.resolve?.(entry.selectionAsset) || `./${entry.selectionAsset}`;
    return window.CritterSpeciesModels?.previewDataUri?.(entry.id) || catalog.resolveCharacterAsset(entry.id);
  }

  function sanitizeAppearance(appearance = {}) {
    const speciesId = sanitizeLiveSpecies(appearance.species);
    const entry = runtimeDefinition(speciesId);
    const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
    const requestedAccessory = String(appearance.accessory || '');
    const accessory = catalog.accessoryTypes.includes(requestedAccessory) ? requestedAccessory : entry.defaultAccessory;
    return Object.freeze({
      species: speciesId,
      bodyColor: color(appearance.bodyColor, entry.body),
      accentColor: color(appearance.accentColor, entry.accent),
      accessory,
      eyeStyle: String(appearance.eyeStyle || 'dot').slice(0, 20),
      rewardCritterId: CODE_REWARD_IDS.includes(speciesId) ? `critter_${speciesId}` : ''
    });
  }

  function sanitizeNetworkAppearance(appearance = {}) {
    return Object.freeze({ ...sanitizeAppearance(appearance) });
  }

  function readDatabase() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function activeAccount(database = readDatabase()) {
    if (!database || !Array.isArray(database.accounts)) return null;
    return database.accounts.find(account => account?.id === database.activeId) || database.accounts[0] || null;
  }

  function migrateSavedAppearances() {
    const database = readDatabase();
    if (!database || !Array.isArray(database.accounts)) return Object.freeze({ changed:0, accounts:0 });
    let changed = 0;
    database.accounts.forEach(account => {
      if (!account || typeof account !== 'object') return;
      const previous = JSON.stringify(account.appearance || {});
      account.appearance = { ...sanitizeAppearance(account.appearance || {}) };
      if (JSON.stringify(account.appearance) !== previous) changed += 1;
    });
    if (changed) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(database)); }
      catch (error) { console.warn('[Issue #62] Could not persist appearance migration.', error); }
    }
    return Object.freeze({ changed, accounts:database.accounts.length });
  }

  function anchor(speciesId, anchorId) {
    const entry = getSpecies(sanitizeLiveSpecies(speciesId));
    return clone(entry.anchors?.[anchorId] || getSpecies(catalog.fallbackSpeciesId).anchors?.[anchorId] || null);
  }

  function qualityBudget(quality = 'medium') {
    const key = ['low','medium','high'].includes(String(quality)) ? String(quality) : 'medium';
    const memory = Number(navigator.deviceMemory || 0);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const reducedMotion = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const automaticLow = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
    const effective = automaticLow && key === 'high' ? 'medium' : key;
    return Object.freeze({
      requested:key,
      effective,
      targetFps:catalog.performanceBudget.targetFps[effective],
      materialCap:catalog.performanceBudget.maxVisibleUniqueMaterials[effective],
      maxExtraSpeciesDraws:catalog.performanceBudget.maxExtraSpeciesDraws[effective],
      useSharedGeometry:true,
      useSharedMaterials:true,
      allowInstancing:true,
      allowDistanceCulling:true,
      shadows:effective !== 'low',
      foliageDensity:effective === 'low' ? .5 : effective === 'medium' ? .78 : 1,
      modelDetail:effective === 'low' ? .62 : effective === 'medium' ? .82 : 1,
      reducedMotion
    });
  }

  function report() {
    const validation = catalog.validateCatalog();
    const modelValidation = window.CritterSpeciesModels?.validateModels?.() || { ok:true, errors:[], count:LIVE_RUNTIME_IDS.length };
    return Object.freeze({
      version:catalog.version,
      valid:validation.ok && modelValidation.ok,
      errors:[...validation.errors, ...(modelValidation.errors || [])],
      warnings:[...validation.warnings],
      total:catalog.speciesOrder.length,
      live:LIVE_RUNTIME_IDS.length,
      modeled:modelValidation.count,
      planned:0,
      liveIds:[...LIVE_RUNTIME_IDS]
    });
  }

  const api = Object.freeze({
    version:'2.0.0-issue-62-all-39',
    catalog,
    coreRuntimeIds:CORE_RUNTIME_IDS,
    rewardRuntimeIds:CODE_REWARD_IDS,
    additionalRuntimeIds:ADDITIONAL_RUNTIME_IDS,
    liveRuntimeIds:LIVE_RUNTIME_IDS,
    getSpecies,
    isLiveSpecies,
    sanitizeLiveSpecies,
    runtimeDefinition,
    runtimeDefinitions,
    runtimeSpeciesAppendSource,
    previewAsset,
    sanitizeAppearance,
    sanitizeNetworkAppearance,
    activeAccount,
    migrateSavedAppearances,
    anchor,
    qualityBudget,
    report
  });

  window.CritterModelRuntime = api;
  const migration = migrateSavedAppearances();
  window.__CRITTER_MODEL_RUNTIME_REPORT__ = Object.freeze({ ...report(), migration });
  window.dispatchEvent(new CustomEvent('critter:model-runtime-ready', { detail:window.__CRITTER_MODEL_RUNTIME_REPORT__ }));
})();
