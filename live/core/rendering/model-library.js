/* Harley's Studios — shared procedural model catalog for Critter Extraction.
   Issue #62: all 39 critters are live, modeled, browser-safe, and data driven. */
(() => {
  'use strict';

  const FALLBACK_SPECIES_ID = 'puppy';
  const REQUIRED_ANCHORS = Object.freeze(['accessory', 'weaponRight', 'weaponLeft', 'backpack', 'vest']);
  const EXISTING_ASSET_IDS = new Set([
    'puppy', 'bunny', 'kitty', 'fox', 'panda', 'bear', 'raccoon', 'redpanda',
    'penguin', 'crow', 'frog', 'arcticfox', 'capybara', 'axolotl', 'otter'
  ]);
  const NEW_SPECIES_IDS = Object.freeze([
    'wolf', 'deer', 'koala', 'hedgehog', 'squirrel', 'bat', 'owl', 'mouse',
    'hamster', 'ferret', 'duck', 'seal', 'polarbear', 'sloth', 'chameleon',
    'beaver', 'goat', 'possum', 'lemur', 'alpaca', 'meerkat', 'platypus',
    'tiger', 'snowleopard'
  ]);

  const deepFreeze = value => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  };

  const normalizeId = value => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  const sharedCombatRig = deepFreeze({
    zones: [
      { id: 'head', y: 2.23, radius: 0.62, damageMultiplier: 1.65 },
      { id: 'chest', y: 1.39, radius: 0.72, damageMultiplier: 1.0 },
      { id: 'belly', y: 0.88, radius: 0.58, damageMultiplier: 0.9 },
      { id: 'legs', y: 0.34, radius: 0.54, damageMultiplier: 0.72 }
    ],
    aimSource: 'camera-center-ray',
    tracerSource: 'weapon-muzzle',
    fairness: 'shared-across-all-species'
  });

  const sharedAnchors = deepFreeze({
    weaponRight: { position: [0.39, 1.43, -0.42], rotation: [0, 0, 0], scale: 1 },
    weaponLeft: { position: [-0.31, 1.39, -0.35], rotation: [0, 0, 0], scale: 1 },
    backpack: { position: [0, 1.42, 0.36], rotation: [0, 0, 0], scale: 1 },
    vest: { position: [0, 1.32, 0], rotation: [0, 0, 0], scale: 1 }
  });

  const accessoryAnchorByEar = deepFreeze({
    floppy:   { position: [0, 2.84, 0.02], rotation: [0, 0, 0], scale: 1.00, earClearance: 0.08 },
    upright:  { position: [0, 2.98, 0.02], rotation: [0, 0, 0], scale: 0.96, earClearance: 0.16 },
    triangle: { position: [0, 2.91, 0.02], rotation: [0, 0, 0], scale: 0.98, earClearance: 0.16 },
    round:    { position: [0, 2.82, 0.02], rotation: [0, 0, 0], scale: 1.00, earClearance: 0.08 },
    penguin:  { position: [0, 2.72, 0.02], rotation: [0, 0, 0], scale: 0.91, earClearance: 0.05 },
    crow:     { position: [0, 2.73, 0.02], rotation: [0, 0, 0], scale: 0.90, earClearance: 0.05 },
    gills:    { position: [0, 2.78, 0.02], rotation: [0, 0, 0], scale: 0.90, earClearance: 0.12 },
    antler:   { position: [0, 3.10, 0.02], rotation: [0, 0, 0], scale: 0.86, earClearance: 0.24 },
    small:    { position: [0, 2.76, 0.02], rotation: [0, 0, 0], scale: 0.93, earClearance: 0.06 },
    bat:      { position: [0, 2.95, 0.02], rotation: [0, 0, 0], scale: 0.84, earClearance: 0.22 },
    owl:      { position: [0, 2.82, 0.02], rotation: [0, 0, 0], scale: 0.89, earClearance: 0.12 },
    duck:     { position: [0, 2.70, 0.02], rotation: [0, 0, 0], scale: 0.90, earClearance: 0.05 },
    none:     { position: [0, 2.70, 0.02], rotation: [0, 0, 0], scale: 0.94, earClearance: 0.04 },
    crest:    { position: [0, 2.90, 0.02], rotation: [0, 0, 0], scale: 0.88, earClearance: 0.15 },
    horn:     { position: [0, 3.00, 0.02], rotation: [0, 0, 0], scale: 0.88, earClearance: 0.20 }
  });

  // id, name, role, body, accent, paw, vest, head, ears, tail, first-person limb, accessory
  const speciesRows = [
    ['puppy','Puppy','Trail Scout','#d9a06f','#7b4d35','#f3d7bd','#277d78','canine','floppy','canine','paw','cap'],
    ['bunny','Bunny','Field Medic','#f0ede8','#d6a6bd','#fff6f3','#a65f82','rabbit','upright','puff','paw','headband'],
    ['kitty','Kitty','Night Ranger','#9ca7b5','#465266','#e4c9b8','#435f86','feline','triangle','feline','paw','headphones'],
    ['fox','Fox','Pathfinder','#e98b4c','#fff0d9','#fff0d9','#9a573c','fox','triangle','brush','paw','bandana'],
    ['panda','Panda','Shield Guard','#f2f2ee','#292b38','#f2f2ee','#3e6f68','bear','round','bear','paw','helmet'],
    ['bear','Bear','Heavy Support','#a36f4c','#6b4432','#e8c7a8','#76563d','bear','round','bear','paw','helmet'],
    ['raccoon','Raccoon','Loot Runner','#8f98a3','#353846','#c8cbd0','#545778','raccoon','round','ringed','paw','cap'],
    ['redpanda','Red Panda','Moon Tracker','#bd5b3e','#f6e0c5','#f6e0c5','#77466b','redpanda','round','ringed','paw','bandana'],
    ['penguin','Penguin','Frozen Explorer','#26364b','#f4f7fb','#f4f7fb','#466b88','bird','penguin','feather','flipper','headphones'],
    ['crow','Crow','Shiny Collector','#202430','#515a70','#303746','#4e5573','bird','crow','feather','wing','cap'],
    ['frog','Frog','Marsh Jumper','#71b85a','#d6ee8e','#c7e991','#4f7961','frog','none','none','webbed-paw','headband'],
    ['arcticfox','Arctic Fox','Winter Pathfinder','#eef5fb','#b9d4e8','#f9fcff','#67859a','fox','triangle','brush','paw','headphones'],
    ['capybara','Capybara','Relaxed Support','#ad7651','#6d4734','#d7ab84','#6a6353','rodent','round','stub','paw','cap'],
    ['axolotl','Axolotl','Aquatic Scout','#f1a9bd','#cf638f','#f5c7d4','#667ea4','axolotl','gills','fin','webbed-paw','antennas'],
    ['otter','Otter','Cuddle Diver','#765039','#d7aa7c','#d7aa7c','#386c78','mustelid','round','otter','webbed-paw','headphones'],
    ['wolf','Wolf','Pack Leader','#7d8794','#d8dde4','#c6ccd3','#465870','canine','upright','wolf','paw','cap'],
    ['deer','Deer','Forest Runner','#bd875d','#f4dfc5','#e8c19a','#5d7a58','deer','antler','deer','hoof','headband'],
    ['koala','Koala','Eucalyptus Medic','#9ca3aa','#d6d9dc','#c3c8cd','#5d7c73','koala','round','stub','paw','headband'],
    ['hedgehog','Hedgehog','Spiked Defender','#9b7657','#4c3b33','#d5b89c','#6d5d49','hedgehog','small','stub','paw','helmet'],
    ['squirrel','Squirrel','Supply Hoarder','#b87946','#f1c79f','#e7b889','#6e5b3f','rodent','round','curl','paw','cap'],
    ['bat','Bat','Cave Scout','#403f58','#a69ac8','#7b739b','#31334f','bat','bat','none','wing','headphones'],
    ['owl','Owl','Night Watcher','#8b7359','#e7d4ab','#c6b38e','#4f5871','bird','owl','feather','wing','headphones'],
    ['mouse','Mouse','Tiny Infiltrator','#b8a9a5','#e9c4c8','#e5d5d2','#596678','rodent','round','thin','paw','cap'],
    ['hamster','Hamster','Gear Carrier','#d7a86f','#fff0d4','#f0c894','#7a644d','rodent','round','stub','paw','cap'],
    ['ferret','Ferret','Tunnel Sneak','#b99b7f','#4d4038','#decab7','#4d5965','mustelid','round','ferret','paw','bandana'],
    ['duck','Duck','Pond Patrol','#f1d45c','#e88942','#f7df76','#4c7a86','bird','duck','feather','wing','cap'],
    ['seal','Seal','Ice Swimmer','#aebbc7','#e8eef2','#dbe4ea','#526d82','seal','none','none','flipper','headphones'],
    ['polarbear','Polar Bear','Frozen Tank','#f2f4f3','#b9cad5','#ffffff','#55758a','bear','round','bear','paw','helmet'],
    ['sloth','Sloth','Patient Sniper','#97856f','#594f48','#c4ae91','#566169','sloth','round','stub','paw','cap'],
    ['chameleon','Chameleon','Hidden Tracker','#73ad69','#d4c34e','#9fc98c','#4f6c55','reptile','crest','curl','claw','antennas'],
    ['beaver','Beaver','Fort Builder','#8f6548','#d9ad7f','#bd8e65','#6b5b45','rodent','round','beaver','paw','helmet'],
    ['goat','Goat','Mountain Climber','#d8d0c2','#8d7d6f','#efe8dc','#63706b','goat','horn','goat','hoof','headband'],
    ['possum','Possum','Survival Expert','#a8a3a6','#ece4df','#d7c9c8','#5f5960','possum','round','thin','paw','bandana'],
    ['lemur','Lemur','Tree Jumper','#9c9ba0','#393b45','#d8d5d0','#55516c','primate','round','ringed','paw','headband'],
    ['alpaca','Alpaca','Soft Support','#e8d9c2','#a9856b','#f5ead9','#766758','alpaca','upright','alpaca','hoof','headband'],
    ['meerkat','Meerkat','Lookout Scout','#c79b6f','#514239','#e2bd94','#5f6754','meerkat','round','thin','paw','cap'],
    ['platypus','Platypus','Swamp Specialist','#8b6a54','#d28b57','#b79070','#4e706c','platypus','none','beaver','webbed-paw','cap'],
    ['tiger','Tiger','Strike Hunter','#e58a3e','#342b2c','#f4c28f','#74483d','feline','round','feline','paw','bandana'],
    ['snowleopard','Snow Leopard','Silent Stalker','#d9dde0','#777d86','#f2f4f5','#596678','feline','round','snowleopard','paw','headphones']
  ];

  const markingSpecies = new Set([
    'panda','raccoon','redpanda','penguin','crow','arcticfox','wolf','deer','hedgehog',
    'squirrel','bat','owl','ferret','duck','polarbear','sloth','chameleon','possum',
    'lemur','alpaca','platypus','tiger','snowleopard'
  ]);

  const categoryMembers = deepFreeze({
    starter: ['puppy','bunny','kitty','fox','panda','bear'],
    forest: ['wolf','deer','koala','hedgehog','squirrel','owl','beaver','fox','bear'],
    tiny: ['mouse','hamster','ferret','meerkat','bat','possum'],
    water: ['duck','seal','platypus','axolotl','otter','frog','capybara','penguin'],
    winter: ['goat','polarbear','snowleopard','arcticfox','penguin','seal'],
    night: ['bat','chameleon','sloth','possum','owl','crow','kitty','raccoon'],
    predator: ['wolf','tiger','snowleopard','fox','arcticfox','bear','polarbear'],
    new: NEW_SPECIES_IDS
  });

  const categoriesFor = id => {
    const categories = Object.entries(categoryMembers)
      .filter(([, ids]) => ids.includes(id))
      .map(([category]) => category);
    categories.push('owned', 'gameplay');
    return categories;
  };

  const species = deepFreeze(Object.fromEntries(speciesRows.map(row => {
    const [id,name,role,body,accent,paw,vest,head,ears,tail,firstPersonLimb,defaultAccessory] = row;
    return [id, {
      id,
      name,
      role,
      stage: 'gameplay',
      selectionAsset: EXISTING_ASSET_IDS.has(id) ? `assets/characters/${id}.svg` : null,
      generatedPreview: !EXISTING_ASSET_IDS.has(id),
      fallbackAsset: 'assets/characters/puppy.svg',
      colors: { body, accent, paw, vest },
      model: { head, ears, tail, firstPersonLimb, markings: markingSpecies.has(id) ? id : 'none' },
      anchors: {
        accessory: accessoryAnchorByEar[ears] || accessoryAnchorByEar.round,
        weaponRight: sharedAnchors.weaponRight,
        weaponLeft: sharedAnchors.weaponLeft,
        backpack: sharedAnchors.backpack,
        vest: sharedAnchors.vest
      },
      defaultAccessory,
      categories: categoriesFor(id)
    }];
  })));

  const speciesOrder = Object.freeze(speciesRows.map(row => row[0]));
  const gameplaySpecies = speciesOrder;
  const appearanceSpecies = Object.freeze([]);
  const plannedSpecies = Object.freeze([]);
  const availableSpecies = speciesOrder;

  function getSpecies(id) {
    return species[normalizeId(id)] || species[FALLBACK_SPECIES_ID];
  }

  function sanitizeSpeciesId(id) {
    return getSpecies(id).id;
  }

  function resolveCharacterAsset(id) {
    const entry = getSpecies(id);
    if (entry.selectionAsset) return entry.selectionAsset;
    return window.CritterSpeciesModels?.previewDataUri?.(entry.id) || entry.fallbackAsset;
  }

  function validateCatalog() {
    const errors = [];
    const warnings = [];
    if (speciesOrder.length !== 39) errors.push(`Expected 39 critters, found ${speciesOrder.length}.`);
    if (new Set(speciesOrder).size !== speciesOrder.length) errors.push('Duplicate species ids found.');
    if (availableSpecies.length !== 39) errors.push(`Expected 39 playable critters, found ${availableSpecies.length}.`);
    if (plannedSpecies.length) errors.push('No issue #62 critter may remain planned.');

    speciesOrder.forEach(id => {
      const entry = species[id];
      if (entry.id !== id) errors.push(`${id}: registry key mismatch.`);
      if (!entry.name || !entry.role) errors.push(`${id}: missing name or role.`);
      if (!entry.selectionAsset && !entry.generatedPreview) errors.push(`${id}: missing selection preview.`);
      if (!entry.colors?.body || !entry.colors?.accent || !entry.colors?.paw || !entry.colors?.vest) errors.push(`${id}: incomplete colors.`);
      if (!entry.model?.head || !entry.model?.ears || !entry.model?.tail || !entry.model?.firstPersonLimb) errors.push(`${id}: incomplete model recipe.`);
      REQUIRED_ANCHORS.forEach(anchor => {
        if (!entry.anchors?.[anchor]) errors.push(`${id}: missing ${anchor} anchor.`);
      });
    });
    return deepFreeze({ ok: errors.length === 0, errors, warnings });
  }

  const weaponRotation = ['pea_popper','acorn_sprayer','honey_carbine','carrot_scatter','moonbeam'];
  const enemyRoster = Object.freeze(speciesOrder.map((id, index) => {
    const entry = species[id];
    return {
      id: `${id}_raider`,
      species: id,
      body: entry.colors.body,
      accent: entry.colors.accent,
      weaponId: weaponRotation[index % weaponRotation.length]
    };
  }));

  const catalog = {
    studio: "Harley's Studios",
    version: '4.0-issue-62-all-39-modeled',
    fallbackSpeciesId: FALLBACK_SPECIES_ID,
    species,
    speciesOrder,
    gameplaySpecies,
    appearanceSpecies,
    plannedSpecies,
    availableSpecies,
    newSpeciesIds: NEW_SPECIES_IDS,
    getSpecies,
    sanitizeSpeciesId,
    resolveCharacterAsset,
    validateCatalog,
    enemyRoster,
    mapAssetPacks: Object.freeze([
      { region:'pine-valley',pack:'ranger-grove',feature:'pine-camp',decor:'pine-marker' },
      { region:'amber-junction',pack:'harvest-yard',feature:'amber-silo',decor:'hay-bale' },
      { region:'moonberry-marsh',pack:'glowwater-dock',feature:'marsh-dock',decor:'marsh-reeds' },
      { region:'clover-highlands',pack:'clover-windmill',feature:'clover-windmill',decor:'wildflowers' },
      { region:'frostflower-ridge',pack:'crystal-outpost',feature:'frost-crystal',decor:'ice-shard' },
      { region:'redwood-run',pack:'redwood-gate',feature:'redwood-gate',decor:'redwood-stump' }
    ]),
    sharedLandmarks: Object.freeze([
      'red-barn','wood-watchtower','supply-crates','forest','rock-cliffs',
      'extraction-smoke','passenger-train','freight-car','shipping-containers','rail-yard'
    ]),
    characterParts: Object.freeze([
      'head','muzzle','ears','eyes','species-markings','torso','vest','backpack',
      'arms','paws','legs','feet','tail','weapon','accessory'
    ]),
    accessoryTypes: Object.freeze(['none','cap','headband','bandana','helmet','headphones','antennas','antenna','crown']),
    weaponModels: Object.freeze(['pea_popper','acorn_sprayer','honey_carbine','carrot_scatter','moonbeam']),
    combatRig: sharedCombatRig,
    performanceBudget: deepFreeze({
      targetBrowsers: ['Chrome','Edge','Firefox','Safari'],
      targetFps: { low:30, medium:45, high:60 },
      maxVisibleUniqueMaterials: { low:24, medium:40, high:64 },
      maxExtraSpeciesDraws: { low:12, medium:22, high:34 },
      useSharedGeometry: true,
      useSharedMaterials: true,
      allowDistanceCulling: true,
      allowInstancing: true
    })
  };

  window.HARLEYS_GAME_ASSETS = deepFreeze(catalog);
  const validation = window.HARLEYS_GAME_ASSETS.validateCatalog();
  if (!validation.ok) console.error('[Critter Extraction] Model catalog validation failed.', validation.errors);
})();
