/* Harley's Studios — issue #62 live model runtime bridge.
   Connects the shared 39-critter catalog to saves, multiplayer payloads,
   appearance UI, quality presets, and the generated live game runtime. */
(() => {
  'use strict';
  if (window.CritterModelRuntime) return;

  const STORAGE_KEY = 'critterExtractionInventory';
  const CORE_RUNTIME_IDS = Object.freeze([
    'puppy', 'bunny', 'kitty', 'fox', 'panda', 'bear', 'raccoon', 'redpanda'
  ]);
  const REWARD_RUNTIME_IDS = Object.freeze([
    'penguin', 'crow', 'frog', 'arcticfox', 'capybara', 'axolotl', 'otter'
  ]);
  const LIVE_RUNTIME_IDS = Object.freeze([...CORE_RUNTIME_IDS, ...REWARD_RUNTIME_IDS]);
  const catalog = window.HARLEYS_GAME_ASSETS;

  const clone = value => JSON.parse(JSON.stringify(value));
  const normalizeId = value => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  function assertCatalog() {
    if (!catalog || typeof catalog.getSpecies !== 'function') {
      throw new Error('Issue #62 model catalog did not initialize before the live runtime bridge.');
    }
    const validation = catalog.validateCatalog?.();
    if (validation && validation.ok === false) {
      throw new Error(`Issue #62 model catalog is invalid: ${validation.errors.join('; ')}`);
    }
    return catalog;
  }

  function getSpecies(id, options = {}) {
    const source = assertCatalog();
    return source.getSpecies(id, options);
  }

  function isLiveSpecies(id) {
    return LIVE_RUNTIME_IDS.includes(normalizeId(id));
  }

  function sanitizeLiveSpecies(id) {
    const normalized = normalizeId(id);
    return isLiveSpecies(normalized) ? normalized : catalog.fallbackSpeciesId;
  }

  function runtimeDefinition(id) {
    const species = getSpecies(id, { allowPlanned: false });
    return Object.freeze({
      id: species.id,
      name: species.name,
      role: species.role,
      body: species.colors.body,
      accent: species.colors.accent,
      paw: species.colors.paw,
      vest: species.colors.vest,
      assetId: species.id,
      selectionAsset: species.selectionAsset,
      firstPersonLimb: species.model.firstPersonLimb,
      defaultAccessory: species.defaultAccessory,
      anchors: species.anchors,
      categories: species.categories
    });
  }

  function runtimeDefinitions() {
    return Object.freeze(Object.fromEntries(
      LIVE_RUNTIME_IDS.map(id => [id, runtimeDefinition(id)])
    ));
  }

  function sourceLiteral(value) {
    return JSON.stringify(String(value));
  }

  function speciesSource(id) {
    const entry = runtimeDefinition(id);
    return `${id}:{name:${sourceLiteral(entry.name)},role:${sourceLiteral(entry.role)},body:${sourceLiteral(entry.body)},accent:${sourceLiteral(entry.accent)},paw:${sourceLiteral(entry.paw)},vest:${sourceLiteral(entry.vest)},asset:characterAsset(${sourceLiteral(id)})}`;
  }

  function runtimeSpeciesAppendSource() {
    return REWARD_RUNTIME_IDS.map(speciesSource).join(',\n    ');
  }

  function sanitizeAppearance(appearance = {}) {
    const speciesId = sanitizeLiveSpecies(appearance.species);
    const species = runtimeDefinition(speciesId);
    const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || ''))
      ? String(value)
      : fallback;
    const accessory = catalog.accessoryTypes.includes(String(appearance.accessory || ''))
      ? String(appearance.accessory)
      : species.defaultAccessory;

    return Object.freeze({
      species: speciesId,
      bodyColor: color(appearance.bodyColor, species.body),
      accentColor: color(appearance.accentColor, species.accent),
      accessory,
      eyeStyle: String(appearance.eyeStyle || 'dot').slice(0, 20),
      rewardCritterId: REWARD_RUNTIME_IDS.includes(speciesId) ? `critter_${speciesId}` : ''
    });
  }

  function sanitizeNetworkAppearance(appearance = {}) {
    const clean = sanitizeAppearance(appearance);
    return Object.freeze({
      species: clean.species,
      bodyColor: clean.bodyColor,
      accentColor: clean.accentColor,
      accessory: clean.accessory,
      eyeStyle: clean.eyeStyle,
      rewardCritterId: clean.rewardCritterId
    });
  }

  function readDatabase() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function activeAccount(database = readDatabase()) {
    if (!database || !Array.isArray(database.accounts)) return null;
    return database.accounts.find(account => account?.id === database.activeId) || database.accounts[0] || null;
  }

  function migrateSavedAppearances() {
    const database = readDatabase();
    if (!database || !Array.isArray(database.accounts)) return Object.freeze({ changed: 0, accounts: 0 });

    let changed = 0;
    database.accounts.forEach(account => {
      if (!account || typeof account !== 'object') return;
      const previous = JSON.stringify(account.appearance || {});
      account.appearance = { ...sanitizeAppearance(account.appearance || {}) };
      if (JSON.stringify(account.appearance) !== previous) changed += 1;
    });

    if (changed) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
      } catch (error) {
        console.warn('[Issue #62] Could not persist appearance migration.', error);
      }
    }
    return Object.freeze({ changed, accounts: database.accounts.length });
  }

  function anchor(speciesId, anchorId) {
    const species = getSpecies(sanitizeLiveSpecies(speciesId), { allowPlanned: false });
    return clone(species.anchors?.[anchorId] || catalog.getSpecies(catalog.fallbackSpeciesId).anchors?.[anchorId] || null);
  }

  function qualityBudget(quality = 'medium') {
    const key = ['low', 'medium', 'high'].includes(String(quality)) ? String(quality) : 'medium';
    const memory = Number(navigator.deviceMemory || 0);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const reducedMotion = !!matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const automaticLow = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
    const effective = automaticLow && key === 'high' ? 'medium' : key;
    const materialCap = catalog.performanceBudget.maxVisibleUniqueMaterials[effective];

    return Object.freeze({
      requested: key,
      effective,
      targetFps: catalog.performanceBudget.targetFps[effective],
      materialCap,
      useSharedGeometry: true,
      useSharedMaterials: true,
      allowInstancing: true,
      allowDistanceCulling: true,
      shadows: effective !== 'low',
      foliageDensity: effective === 'low' ? 0.5 : effective === 'medium' ? 0.78 : 1,
      modelDetail: effective === 'low' ? 0.62 : effective === 'medium' ? 0.82 : 1,
      reducedMotion
    });
  }

  function report() {
    const validation = catalog.validateCatalog();
    return Object.freeze({
      version: catalog.version,
      valid: validation.ok,
      errors: [...validation.errors],
      warnings: [...validation.warnings],
      total: catalog.speciesOrder.length,
      live: LIVE_RUNTIME_IDS.length,
      planned: catalog.plannedSpecies.length,
      liveIds: [...LIVE_RUNTIME_IDS],
      plannedIds: [...catalog.plannedSpecies]
    });
  }

  const api = Object.freeze({
    version: '1.0.0-issue-62-live',
    catalog,
    coreRuntimeIds: CORE_RUNTIME_IDS,
    rewardRuntimeIds: REWARD_RUNTIME_IDS,
    liveRuntimeIds: LIVE_RUNTIME_IDS,
    getSpecies,
    isLiveSpecies,
    sanitizeLiveSpecies,
    runtimeDefinition,
    runtimeDefinitions,
    runtimeSpeciesAppendSource,
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
  window.dispatchEvent(new CustomEvent('critter:model-runtime-ready', {
    detail: window.__CRITTER_MODEL_RUNTIME_REPORT__
  }));
})();
