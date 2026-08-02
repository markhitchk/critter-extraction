(() => {
  'use strict';

  if (typeof window.__critterBootReport === 'function') {
    window.__critterBootReport('game-script-started', 'js/game.js began executing.');
  }

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const wrapAngle = value => Math.atan2(Math.sin(Number(value) || 0), Math.cos(Number(value) || 0));
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const deepCopy = v => JSON.parse(JSON.stringify(v));
  const fmtTime = sec => `${String(Math.max(0, Math.floor(sec / 60))).padStart(2, '0')}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;
  const safeText = (v, max = 24) => String(v || '').replace(/[<>]/g, '').trim().slice(0, max);
  const IS_CHROMEOS = /CrOS/i.test(navigator.userAgent || '');
  const isTypingTarget = target => !!target && (target.matches?.('input, textarea, select') || target.isContentEditable);
  const localAsset = path => window.__CRITTER_EMBEDDED_ASSETS__?.[`assets/${path}`] || `./assets/${path}`;
  const GAME_VERSION = 'v0.27.1';
  const SAVE_SCHEMA_VERSION = 17;

  // Current Chrome, Edge, Firefox, and Safari all have native <dialog>.
  // This tiny fallback also keeps menus usable in embedded or compatibility
  // browser modes where showModal() is disabled.
  for (const dialog of $$('dialog')) {
    if (typeof dialog.showModal === 'function') continue;
    try {
      Object.defineProperty(dialog, 'open', { configurable:true, get(){ return this.hasAttribute('open'); } });
    } catch (_) { }
    dialog.showModal = function () { this.setAttribute('open', ''); this.setAttribute('aria-modal', 'true'); };
    dialog.close = function () { if (!this.hasAttribute('open')) return; this.removeAttribute('open'); this.removeAttribute('aria-modal'); this.dispatchEvent(new Event('close')); };
  }

  // -------------------- Harley's Studios item, weapon, loadout, and character databases --------------------
  const itemAsset = id => localAsset(`items/${id}.svg`);
  const weaponAsset = id => localAsset(`weapons/${id}.svg`);
  const characterAsset = id => localAsset(`characters/${id}.svg`);
  const ITEMS = {
    pea_ammo: { name: 'Pea Ammo', asset: itemAsset('pea_ammo'), weight: .02, stack: 96, value: 1, rarity: 'common', ammo: true, description: 'Compressed garden peas used by the Pea Popper.' },
    acorn_ammo: { name: 'Acorn Rounds', asset: itemAsset('acorn_ammo'), weight: .025, stack: 120, value: 2, rarity: 'common', ammo: true, description: 'Tiny high-speed acorn rounds for the Acorn Sprayer.' },
    nectar_cells: { name: 'Nectar Cells', asset: itemAsset('nectar_cells'), weight: .035, stack: 96, value: 3, rarity: 'uncommon', ammo: true, description: 'Sticky energy cells for the Honeycomb Carbine.' },
    carrot_shells: { name: 'Carrot Shells', asset: itemAsset('carrot_shells'), weight: .07, stack: 48, value: 4, rarity: 'uncommon', ammo: true, description: 'Crunchy scatter shells loaded into the Carrot Scatter.' },
    moon_slugs: { name: 'Moon Slugs', asset: itemAsset('moon_slugs'), weight: .09, stack: 30, value: 8, rarity: 'rare', ammo: true, description: 'Precision crystal slugs for the Moonbeam Longshot.' },
    bandage: { name: 'Berry Patch', asset: itemAsset('bandage'), weight: .45, stack: 5, value: 35, rarity: 'common', consumable: true, description: 'Restores 35 health. Double-click or press Q to use.' },
    medkit: { name: 'Picnic Medkit', asset: itemAsset('medkit'), weight: 1.1, stack: 2, value: 95, rarity: 'uncommon', consumable: true, description: 'Restores 75 health with a packed lunch and first-aid supplies.' },
    shield_pod: { name: 'Dew Shield Pod', asset: itemAsset('shield_pod'), weight: .7, stack: 3, value: 60, rarity: 'uncommon', consumable: true, description: 'Restores 35 shield points.' },
    armor_plate: { name: 'Bark Armor Plate', asset: itemAsset('armor_plate'), weight: 1.0, stack: 3, value: 85, rarity: 'uncommon', consumable: true, description: 'Adds 30 temporary shield, up to the current armor maximum.' },
    zoomberry: { name: 'Zoomberry Fizz', asset: itemAsset('zoomberry'), weight: .5, stack: 3, value: 75, rarity: 'rare', consumable: true, description: 'Boosts movement speed for 12 seconds.' },
    moonberry: { name: 'Moonberry', asset: itemAsset('moonberry'), weight: .18, stack: 20, value: 90, rarity: 'rare', objective: true, description: 'Glowing extraction loot. Carry at least five to activate the beacon.' },
    scrap: { name: 'Toy Scrap', asset: itemAsset('scrap'), weight: .28, stack: 20, value: 18, rarity: 'common', description: 'Useful salvage recovered from meadow pests.' },
    crystal: { name: 'Prism Crystal', asset: itemAsset('crystal'), weight: .55, stack: 10, value: 135, rarity: 'epic', description: 'A rare crystal worth a large amount of stash value.' },
    seed_cache: { name: 'Ancient Seed Cache', asset: itemAsset('seed_cache'), weight: 1.2, stack: 3, value: 220, rarity: 'epic', description: 'A sealed cache from the old Moonmeadow gardeners.' },
    weapon_pea_popper: { name: 'Pea Popper', asset: weaponAsset('pea_popper'), weight: 3.2, stack: 1, value: 320, rarity: 'common', equipment: 'weapon', weaponId: 'pea_popper', description: 'A dependable semi-auto berry blaster. Equip it during a drop or keep it for a future deployment.' },
    weapon_acorn_sprayer: { name: 'Acorn Sprayer', asset: weaponAsset('acorn_sprayer'), weight: 3.8, stack: 1, value: 520, rarity: 'uncommon', equipment: 'weapon', weaponId: 'acorn_sprayer', description: 'A fast automatic critter SMG recovered from raiders and supply caches.' },
    weapon_honey_carbine: { name: 'Honeycomb Carbine', asset: weaponAsset('honey_carbine'), weight: 4.4, stack: 1, value: 690, rarity: 'rare', equipment: 'weapon', weaponId: 'honey_carbine', description: 'An accurate automatic nectar rifle built for controlled mid-range fights.' },
    weapon_carrot_scatter: { name: 'Carrot Scatter', asset: weaponAsset('carrot_scatter'), weight: 4.8, stack: 1, value: 620, rarity: 'uncommon', equipment: 'weapon', weaponId: 'carrot_scatter', description: 'A close-range scatter blaster that fires crunchy carrot shells.' },
    weapon_moonbeam: { name: 'Moonbeam Longshot', asset: weaponAsset('moonbeam'), weight: 5.1, stack: 1, value: 980, rarity: 'epic', equipment: 'weapon', weaponId: 'moonbeam', description: 'A rare precision rifle that fires high-value Moon Slugs.' },
    armor_leaf_vest: { name: 'Leaf Vest', asset: itemAsset('armor_leaf_vest'), weight: 2.3, stack: 1, value: 260, rarity: 'common', equipment: 'armor', armorId: 'leaf_vest', description: 'Balanced meadow armor with 50 maximum shield.' },
    armor_feather_vest: { name: 'Feather Vest', asset: itemAsset('armor_feather_vest'), weight: 1.8, stack: 1, value: 380, rarity: 'uncommon', equipment: 'armor', armorId: 'feather_vest', description: 'Light armor with 40 maximum shield and a small movement bonus.' },
    armor_bark_guard: { name: 'Bark Guard', asset: itemAsset('armor_bark_guard'), weight: 3.8, stack: 1, value: 610, rarity: 'rare', equipment: 'armor', armorId: 'bark_guard', description: 'Heavy bark plating with 75 maximum shield.' },
    armor_root_padding: { name: 'Root Padding', asset: itemAsset('armor_root_padding'), weight: 3.1, stack: 1, value: 500, rarity: 'uncommon', equipment: 'armor', armorId: 'root_padding', description: 'Thick padded armor with 60 maximum shield.' },
    armor_star_cloak: { name: 'Star Cloak', asset: itemAsset('armor_star_cloak'), weight: 2.1, stack: 1, value: 820, rarity: 'epic', equipment: 'armor', armorId: 'star_cloak', description: 'Rare lightweight armor with 55 maximum shield and improved movement.' }
  };


  const MERCHANT_BUY_IDS = ['pea_ammo','acorn_ammo','nectar_cells','carrot_shells','moon_slugs','bandage','medkit','shield_pod','armor_plate'];
  const SAFE_JUNK_IDS = new Set(['scrap','crystal','seed_cache']);
  Object.entries(ITEMS).forEach(([id, def]) => {
    def.sellPrice = Math.max(0, Math.floor(Number(def.sellPrice ?? def.value) || 0));
    def.buyPrice = Math.max(def.sellPrice + 1, Math.floor(Number(def.buyPrice) || Math.ceil(def.sellPrice * (def.equipment ? 1.55 : 1.8))));
    def.canSell = def.canSell !== false && !def.objective;
    def.merchantCategory = def.merchantCategory || (def.equipment || (def.ammo ? 'ammo' : def.consumable ? 'supplies' : SAFE_JUNK_IDS.has(id) ? 'valuables' : 'loot'));
  });
  ITEMS.moonberry.canSell = false;

  const WEAPONS = {
    pea_popper: { name:'Pea Popper', subtitle:'Balanced semi-auto berry blaster', asset:weaponAsset('pea_popper'), ammoItem:'pea_ammo', mag:16, damage:25, fireRate:6.25, reload:1.35, spread:.006, pellets:1, range:60, auto:false, color:'#ffd36f', dark:'#4c486b' },
    acorn_sprayer: { name:'Acorn Sprayer', subtitle:'Fast automatic critter SMG', asset:weaponAsset('acorn_sprayer'), ammoItem:'acorn_ammo', mag:28, damage:12, fireRate:11, reload:1.55, spread:.027, pellets:1, range:42, auto:true, color:'#f0a25e', dark:'#374654' },
    honey_carbine: { name:'Honeycomb Carbine', subtitle:'Accurate automatic nectar rifle', asset:weaponAsset('honey_carbine'), ammoItem:'nectar_cells', mag:24, damage:20, fireRate:7.5, reload:1.45, spread:.012, pellets:1, range:58, auto:true, color:'#ffb74f', dark:'#4a3d2a' },
    carrot_scatter: { name:'Carrot Scatter', subtitle:'Close-range crunchy scatter blaster', asset:weaponAsset('carrot_scatter'), ammoItem:'carrot_shells', mag:6, damage:14, fireRate:1.45, reload:1.85, spread:.105, pellets:6, range:25, auto:false, color:'#ff8b52', dark:'#315b4c' },
    moonbeam: { name:'Moonbeam Longshot', subtitle:'Slow precision crystal rifle', asset:weaponAsset('moonbeam'), ammoItem:'moon_slugs', mag:5, damage:72, fireRate:.9, reload:2.25, spread:.0025, pellets:1, range:85, auto:false, color:'#a491ff', dark:'#303755' }
  };


  const ARMORS = {
    leaf_vest: { name:'Leaf Vest', asset:itemAsset('armor_leaf_vest'), shield:50, speedMod:0 },
    feather_vest: { name:'Feather Vest', asset:itemAsset('armor_feather_vest'), shield:40, speedMod:.22 },
    bark_guard: { name:'Bark Guard', asset:itemAsset('armor_bark_guard'), shield:75, speedMod:-.12 },
    root_padding: { name:'Root Padding', asset:itemAsset('armor_root_padding'), shield:60, speedMod:-.04 },
    star_cloak: { name:'Star Cloak', asset:itemAsset('armor_star_cloak'), shield:55, speedMod:.16 }
  };
  const WEAPON_ITEM_IDS = Object.keys(WEAPONS).map(id => `weapon_${id}`);
  const ARMOR_ITEM_IDS = Object.keys(ARMORS).map(id => `armor_${id}`);
  const weaponItemId = id => ITEMS[`weapon_${id}`] ? `weapon_${id}` : 'weapon_pea_popper';
  const armorItemId = id => ITEMS[`armor_${id}`] ? `armor_${id}` : 'armor_leaf_vest';

  const LOADOUTS = {
    meadow_scout: { name:'Meadow Scout', tag:'BALANCED', weapon:'pea_popper', armor:'Leaf Vest', armorId:'leaf_vest', backpack:'Critter Pack', maxWeight:25, shield:50, speed:5.4, description:'A forgiving all-round kit for learning the meadow.', items:[['pea_ammo',80],['bandage',2]], utility:'Berry Patches' },
    acorn_rush: { name:'Acorn Rush', tag:'FAST', weapon:'acorn_sprayer', armor:'Feather Vest', armorId:'feather_vest', backpack:'Swift Satchel', maxWeight:22, shield:35, speed:6.15, description:'High fire rate and movement speed for aggressive looting.', items:[['acorn_ammo',112],['bandage',1],['zoomberry',1]], utility:'Zoomberry Fizz' },
    honey_guard: { name:'Honey Guard', tag:'CONTROL', weapon:'honey_carbine', armor:'Bark Guard', armorId:'bark_guard', backpack:'Honey Pack', maxWeight:28, shield:65, speed:5.05, description:'Accurate sustained fire with stronger starting armor.', items:[['nectar_cells',96],['bandage',1],['armor_plate',1]], utility:'Bark Armor Plate' },
    carrot_breacher: { name:'Carrot Breacher', tag:'CLOSE RANGE', weapon:'carrot_scatter', armor:'Root Padding', armorId:'root_padding', backpack:'Burrow Bag', maxWeight:30, shield:55, speed:5.15, description:'A hard-hitting scatter blaster and a full picnic medkit.', items:[['carrot_shells',36],['medkit',1]], utility:'Picnic Medkit' },
    moon_ranger: { name:'Moon Ranger', tag:'PRECISION', weapon:'moonbeam', armor:'Star Cloak', armorId:'star_cloak', backpack:'Moon Pack', maxWeight:24, shield:45, speed:5.35, description:'Long-range crystal shots reward careful aim and timing.', items:[['moon_slugs',24],['shield_pod',1],['bandage',1]], utility:'Dew Shield Pod' },
    custom: { name:'Custom Loadout', tag:'YOUR ITEMS', weapon:null, armor:'No armor packed', armorId:null, backpack:'Custom Critter Pack', maxWeight:30, shield:0, speed:5.4, description:'Pack weapons, armor, ammo, healing, and loot directly from your Account Stash.', items:[], utility:'Packed from Account Stash', custom:true }
  };

  const SPECIES = {
    puppy:{name:'Puppy',role:'Trail Scout',body:'#d9a06f',accent:'#7b4d35',paw:'#f3d7bd',vest:'#277d78',asset:characterAsset('puppy')},
    bunny:{name:'Bunny',role:'Field Medic',body:'#f0ede8',accent:'#d6a6bd',paw:'#fff6f3',vest:'#a65f82',asset:characterAsset('bunny')},
    kitty:{name:'Kitty',role:'Night Ranger',body:'#9ca7b5',accent:'#465266',paw:'#e4c9b8',vest:'#435f86',asset:characterAsset('kitty')},
    fox:{name:'Fox',role:'Pathfinder',body:'#e98b4c',accent:'#fff0d9',paw:'#fff0d9',vest:'#9a573c',asset:characterAsset('fox')},
    panda:{name:'Panda',role:'Shield Guard',body:'#f2f2ee',accent:'#292b38',paw:'#f2f2ee',vest:'#3e6f68',asset:characterAsset('panda')},
    bear:{name:'Bear',role:'Heavy Support',body:'#a36f4c',accent:'#6b4432',paw:'#e8c7a8',vest:'#76563d',asset:characterAsset('bear')},
    raccoon:{name:'Raccoon',role:'Loot Runner',body:'#8f98a3',accent:'#353846',paw:'#c8cbd0',vest:'#545778',asset:characterAsset('raccoon')},
    redpanda:{name:'Red Panda',role:'Moon Tracker',body:'#bd5b3e',accent:'#f6e0c5',paw:'#f6e0c5',vest:'#77466b',asset:characterAsset('redpanda')}
  };

  const defaultLoadoutId = 'meadow_scout';
  const selectedLoadout = (account=activeAccount()) => LOADOUTS[account?.loadoutId] || LOADOUTS[defaultLoadoutId];
  const weaponFor = player => WEAPONS[player?.weaponId] || WEAPONS[selectedLoadout().weapon] || WEAPONS.pea_popper;
  const SLOT_COUNT = 20;
  const STASH_COUNT = 40;
  let MAX_WEIGHT = 25;
  const emptySlots = n => Array.from({ length: n }, () => null);
  const normalizeSlots = (slots, n) => {
    const out = emptySlots(n);
    if (Array.isArray(slots)) slots.slice(0, n).forEach((it, i) => {
      if (it && ITEMS[it.id] && Number(it.qty) > 0) out[i] = { id: it.id, qty: Math.max(1, Math.floor(it.qty)), locked: !!it.locked, favorite: !!it.favorite };
    });
    return out;
  };
  const itemWeight = item => item ? ITEMS[item.id].weight * item.qty : 0;
  const inventoryWeight = slots => slots.reduce((n, it) => n + itemWeight(it), 0);
  const inventoryValue = slots => slots.reduce((n, it) => n + (it ? ITEMS[it.id].sellPrice * it.qty : 0), 0);
  const countItem = (slots, id) => slots.reduce((n, it) => n + (it && it.id === id ? it.qty : 0), 0);
  function removeItem(slots, id, qty = 1) {
    let left = qty;
    for (let i = slots.length - 1; i >= 0 && left > 0; i--) {
      const it = slots[i];
      if (!it || it.id !== id) continue;
      const take = Math.min(left, it.qty);
      it.qty -= take; left -= take;
      if (it.qty <= 0) slots[i] = null;
    }
    return qty - left;
  }
  function canAdd(slots, id, qty, maxWeight = Infinity) {
    const def = ITEMS[id];
    if (!def) return false;
    if (inventoryWeight(slots) + def.weight * qty > maxWeight + .0001) return false;
    let room = 0;
    for (const it of slots) room += !it ? def.stack : it.id === id ? Math.max(0, def.stack - it.qty) : 0;
    return room >= qty;
  }
  function addItem(slots, id, qty = 1, maxWeight = Infinity) {
    const def = ITEMS[id];
    if (!def || qty <= 0) return 0;
    let allowedByWeight = Math.floor((maxWeight - inventoryWeight(slots) + 1e-6) / def.weight);
    if (!Number.isFinite(allowedByWeight)) allowedByWeight = qty;
    let left = Math.min(qty, Math.max(0, allowedByWeight));
    const start = left;
    for (const it of slots) {
      if (left <= 0) break;
      if (it && it.id === id && it.qty < def.stack) {
        const put = Math.min(left, def.stack - it.qty); it.qty += put; left -= put;
      }
    }
    for (let i = 0; i < slots.length && left > 0; i++) {
      if (slots[i]) continue;
      const put = Math.min(left, def.stack); slots[i] = { id, qty: put, locked: false, favorite: false }; left -= put;
    }
    return start - left;
  }
  function sortSlots(slots) {
    const order = { epic: 0, rare: 1, uncommon: 2, common: 3 };
    const merged = {};
    slots.forEach(it => { if (it) merged[it.id] = (merged[it.id] || 0) + it.qty; });
    const ids = Object.keys(merged).sort((a, b) => order[ITEMS[a].rarity] - order[ITEMS[b].rarity] || ITEMS[a].name.localeCompare(ITEMS[b].name));
    slots.fill(null);
    ids.forEach(id => addItem(slots, id, merged[id]));
  }

  // -------------------- Local device accounts --------------------
  const STORAGE_KEY = 'critterExtractionInventory';
  const PROFILE_XML_CACHE_KEY = 'critterExtractionProfileXml';
  const LEGACY_STORAGE_PREFIX = ['critterExtraction','3','DInventory'].join('');
  const LEGACY_PROFILE_XML_KEY = ['critterExtraction','3','DProfileXml'].join('');
  const BUILD_VERSION = `harleys-studios-${GAME_VERSION}-pvp-friendly-fire-ai-hit-confirm`;
  const DEFAULT_SETTINGS = {
    cameraMode: 'third', shoulderSide: 'right', fov: 75, sensitivity: 1, invertY: false,
    difficulty: 'cozy', aimAssist: true, autoReload: true, showHints: true, showHitboxes: false,
    quality: 'medium', renderScale: IS_CHROMEOS ? .85 : 1, fogEnabled: true, compatibilityMode: false, reducedMotion: false,
    hudScale: 100, volume: 70, touchAlways: false
  };

  function detectPhoneOrTablet() {
    const nav = globalThis.navigator || {}, touchPoints = Number(nav.maxTouchPoints || 0);
    if (!touchPoints) return false;
    const ua = String(nav.userAgent || ''), platform = String(nav.platform || '');
    const mobileUserAgent = !!nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
    const primaryCoarse = !!globalThis.matchMedia?.('(pointer: coarse)')?.matches;
    const noHover = !!globalThis.matchMedia?.('(hover: none)')?.matches;
    const screenWidth = Number(globalThis.screen?.width || globalThis.innerWidth || 0), screenHeight = Number(globalThis.screen?.height || globalThis.innerHeight || 0);
    const shortSide = Math.min(screenWidth || Infinity, screenHeight || Infinity);
    return mobileUserAgent || (primaryCoarse && noHover && shortSide <= 1366);
  }
  const inputDeviceProfile = { phoneOrTablet: detectPhoneOrTablet(), mode: detectPhoneOrTablet() ? 'touch' : 'mouse-keyboard' };

  const GRAPHICS_PROFILES = {
    low: {
      key: 'low', sphereLat: 6, sphereLon: 8, cylinderSides: 8, coneSides: 6, capsuleRings: 2, capsuleSides: 6, crystalSides: 5,
      patchStep: 12, secondaryCanopy: false, extraCharacterParts: false,
      label: 'LOW POLY', note: 'Low uses lightweight faceted critters, six-sided tapered props, fewer meadow tiles, and simplified character details.'
    },
    medium: {
      key: 'medium', sphereLat: 12, sphereLon: 16, cylinderSides: 14, coneSides: 10, capsuleRings: 3, capsuleSides: 10, crystalSides: 6,
      patchStep: 8, secondaryCanopy: true, extraCharacterParts: false,
      label: 'MEDIUM POLY', note: 'Medium uses balanced curved and tapered silhouettes, complete critter models, and full prop detail.'
    },
    high: {
      key: 'high', sphereLat: 18, sphereLon: 24, cylinderSides: 20, coneSides: 16, capsuleRings: 5, capsuleSides: 16, crystalSides: 8,
      patchStep: 6, secondaryCanopy: true, extraCharacterParts: true,
      label: 'HIGH POLY', note: 'High uses smooth cartoon silhouettes, faceted crystal detail, denser scenery, and extra paws, face, vest, and foliage pieces.'
    }
  };
  const graphicsProfile = () => GRAPHICS_PROFILES[activeAccount()?.settings?.quality] || GRAPHICS_PROFILES.medium;

  function packedEquipment(account, kind) {
    const packed = normalizeSlots(account?.prepared, SLOT_COUNT).filter(Boolean);
    return packed.filter(item => ITEMS[item.id]?.equipment === kind);
  }
  function packedWeaponId(account) {
    const packed = packedEquipment(account, 'weapon');
    const preferred = packed.find(item => ITEMS[item.id]?.weaponId === account?.equippedWeaponId);
    return ITEMS[(preferred || packed[0])?.id]?.weaponId || null;
  }
  function packedArmorId(account) {
    const packed = packedEquipment(account, 'armor');
    const preferred = packed.find(item => ITEMS[item.id]?.armorId === account?.equippedArmorId);
    return ITEMS[(preferred || packed[0])?.id]?.armorId || null;
  }
  function syncAccountLoadout(account) {
    account.loadoutId = LOADOUTS[account.loadoutId] ? account.loadoutId : defaultLoadoutId;
    const kit = LOADOUTS[account.loadoutId];
    if (kit.custom) {
      account.equippedWeaponId = packedWeaponId(account);
      account.equippedArmorId = packedArmorId(account);
      const weapon = account.equippedWeaponId ? WEAPONS[account.equippedWeaponId] : null;
      const armor = account.equippedArmorId ? ARMORS[account.equippedArmorId] : null;
      account.loadout = { weapon: weapon?.name || 'No weapon packed', armor: armor?.name || 'No armor packed', backpack: kit.backpack };
    } else {
      account.equippedWeaponId = WEAPONS[account.equippedWeaponId] ? account.equippedWeaponId : kit.weapon;
      account.equippedArmorId = ARMORS[account.equippedArmorId] ? account.equippedArmorId : kit.armorId;
      const weapon = WEAPONS[account.equippedWeaponId], armor = ARMORS[account.equippedArmorId];
      account.loadout = { weapon: weapon.name, armor: armor.name, backpack: kit.backpack };
    }
    return account;
  }

  function makeAccount(name = 'Rookie', username = 'rookie') {
    return {
      id: uid(), username, displayName: name, bio: 'Ready for the meadow.', avatar: '',
      appearance: { species: 'puppy', bodyColor: '#d9a06f', accentColor: '#7b4d35', accessory: 'cap', eyeStyle: 'dot' },
      settings: deepCopy(DEFAULT_SETTINGS), xp: 0, petals: 0, economyTransactions: [], pendingDrop: null,
      stats: { extracts: 0, berries: 0, kills: 0, matches: 0 },
      stash: emptySlots(STASH_COUNT), prepared: emptySlots(SLOT_COUNT),
      loadoutId: defaultLoadoutId, equippedWeaponId: 'pea_popper', equippedArmorId: 'leaf_vest',
      loadout: { weapon: 'Pea Popper', armor: 'Leaf Vest', backpack: 'Critter Pack' }
    };
  }
  function normalizeDatabase(parsed) {
    if (!parsed || !Array.isArray(parsed.accounts) || !parsed.accounts.length) return null;
    const oldSchema = Number(parsed.schemaVersion || 0), seen = new Set();
    parsed.accounts = parsed.accounts.filter(a => {
      if (!a || typeof a !== 'object') return false;
      const key = String(a.id || `${a.username || ''}:${a.displayName || ''}`).toLowerCase();
      if (seen.has(key)) return false; seen.add(key); return true;
    });
    parsed.accounts.forEach(a => {
      a.id = a.id || uid();
      const oldSettings = a.settings || {};
      a.settings = { ...DEFAULT_SETTINGS, ...oldSettings };
      if (oldSchema < 14 && (!oldSettings.difficulty || oldSettings.difficulty === 'normal')) a.settings.difficulty = 'cozy';
      a.stats = { extracts: 0, berries: 0, kills: 0, matches: 0, ...(a.stats || {}) };
      a.appearance = { species: 'puppy', bodyColor: '#d9a06f', accentColor: '#7b4d35', accessory: 'cap', eyeStyle: 'dot', ...(a.appearance || {}) };
      a.stash = normalizeSlots(a.stash, STASH_COUNT); a.prepared = normalizeSlots(a.prepared, SLOT_COUNT);
      a.petals = Math.max(0, Math.floor(Number(a.petals) || 0));
      a.economyTransactions = Array.isArray(a.economyTransactions) ? a.economyTransactions.slice(-40) : [];
      if (a.pendingDrop && a.pendingDrop.state === 'reserved' && Array.isArray(a.pendingDrop.items)) {
        const hasPrepared = a.prepared.some(Boolean);
        if (!hasPrepared) a.prepared = normalizeSlots(a.pendingDrop.items, SLOT_COUNT);
        a.pendingDrop = null;
      }
      syncAccountLoadout(a);
    });
    if (!parsed.accounts.length) return null;
    if (!parsed.accounts.some(a => a.id === parsed.activeId)) parsed.activeId = parsed.accounts[0].id;
    parsed.schemaVersion = SAVE_SCHEMA_VERSION;
    return parsed;
  }
  function loadDB() {
    const candidates = [];
    try {
      const stable = localStorage.getItem(STORAGE_KEY);
      if (stable) candidates.push({ key: STORAGE_KEY, raw: stable, priority: 1e15 });
      const legacyStable = localStorage.getItem(LEGACY_STORAGE_PREFIX);
      if (legacyStable) candidates.push({ key: LEGACY_STORAGE_PREFIX, raw: legacyStable, priority: 1e14 });
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key === STORAGE_KEY || key === LEGACY_STORAGE_PREFIX || !key.startsWith(`${LEGACY_STORAGE_PREFIX}_`)) continue;
        const raw = localStorage.getItem(key); if (raw) candidates.push({ key, raw, priority: 0 });
      }
      let best = null, bestScore = -Infinity;
      for (const candidate of candidates) {
        try {
          const parsed = normalizeDatabase(JSON.parse(candidate.raw)); if (!parsed) continue;
          const progress = parsed.accounts.reduce((sum, a) => sum + (Number(a.xp)||0) + (Number(a.stats?.extracts)||0)*500 + (Number(a.stats?.matches)||0)*25, 0);
          const score = candidate.priority + (Number(parsed.updatedAt)||0) + progress;
          if (score > bestScore) { best = parsed; bestScore = score; }
        } catch (_) { }
      }
      if (best) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(best)); } catch (_) { } return best; }
      const xmlBackup = localStorage.getItem(PROFILE_XML_CACHE_KEY) || localStorage.getItem(LEGACY_PROFILE_XML_KEY);
      if (xmlBackup) {
        try {
          const restored = normalizeDatabase({schemaVersion:15,accounts:[accountFromXml(xmlBackup)],activeId:'',updatedAt:Date.now()});
          if (restored) { restored.activeId=restored.accounts[0].id; localStorage.setItem(STORAGE_KEY,JSON.stringify(restored)); return restored; }
        } catch (_) { }
      }
    } catch (_) { }
    const first = makeAccount();
    return { schemaVersion: SAVE_SCHEMA_VERSION, accounts: [first], activeId: first.id, updatedAt: Date.now() };
  }
  let db = loadDB();
  const activeAccount = () => db.accounts.find(a => a.id === db.activeId) || db.accounts[0];
  function saveDB() {
    try {
      db.schemaVersion = SAVE_SCHEMA_VERSION; db.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) { console.warn('Local save unavailable', e); return false; }
    try {
      const account = activeAccount();
      if (account && typeof accountToXml === 'function') localStorage.setItem(PROFILE_XML_CACHE_KEY, accountToXml(account));
    } catch (e) { console.warn('Account recovery cache unavailable', e); }
    return true;
  }

  const dom = Object.fromEntries([
    'menuScreen','gameScreen','gameCanvas','webglError','topAvatar','topName','topPetals','topPetalsBtn','profilePetals','profileMerchantBtn','merchantBtn','menuAvatar','profileName','profileHandle','profileBio',
    'levelText','xpText','xpBar','extractsStat','berriesStat','killsStat','matchesStat','accountList','accountsModal','profileModal',
    'profileForm','profileModalTitle','profileModalEyebrow','editAvatarPreview','avatarInput','avatarUrlInput','usernameInput','displayNameInput','bioInput',
    'customizeModal','customizeForm','helpModal','critterPreview','critterPreviewAsset','characterRoster','species','bodyColor','accentColor','accessory','eyeStyle','settingsModal','settingsForm',
    'loadoutModal','loadoutGrid','customLoadoutBtn','customLoadoutNotice','studioBoot','bootBar','bootStatus','dropLoading','dropLoadingBar','dropLoadingStatus','dropLoadingTitle',
    'hostModal','joinModal','hostModeCoop','hostModePvp','hostFriendlyFire','hostFriendlyFireRow','hostRulesHelp','joinRulesSummary','hostNetworkDot','hostNetworkStatus','hostNetworkHelp','joinNetworkDot','joinNetworkStatus','joinNetworkHelp','hostUseStun','joinUseStun','hostCode','answerCode','hostRoomPin','joinRoomPin',
    'offerCode','joinCode','joinRoomBtn','joinActionHelp','startCoopBtn','pauseModal','pauseStatus','pauseMapName','pauseMapSeed','resultModal','resultEyebrow','resultTitle','resultText','resultLoot','resultKills','resultPetals','resultXP',
    'backupModal','backupTitle','backupHelp','backupCode','applyImportBtn','hudAvatar','hudName','networkBadge','hpBar','shieldBar','hpText',
    'shieldText','lootText','timerText','cameraTag','ammoWeaponName','crosshair','hitmarker','controlHint','ammoText','reloadText','interaction','interactionText',
    'interactionBar','toast','damageFlash','touchControls','moveStick','lookArea','quickbar','inventoryModal','inventoryEyebrow','inventoryTitle',
    'weightText','weightBar','riskValue','inventoryBerryCount','inventoryPetals','backpackTitle','backpackGrid','sideEyebrow','sideTitle','sideGrid','itemDetails',
    'takeAllBtn','quickTransferBtn','dropSelectedBtn','returnPreparedBtn','openMerchantFromInventoryBtn','sortBackpackBtn','equipWeapon','equipWeaponAsset','equipArmor','equipBackpack','playOverlay','captureBtn','rendererBadge','graphicsDetailText',
    'menuLoadoutName','menuWeaponAsset','menuWeaponName','menuWeaponDesc','menuUtilityAsset','menuUtilityName','menuUtilityDesc','menuPackName','menuPackDesc','worldLabels','squadMembers','hostLobbyRoster','joinLobbyRoster','hostLobbyCount','joinLobbyCount',
    'aliveCount','lootLabel','missionListTitle','findObjectiveTitle','lootObjectiveTitle','extractObjectiveTitle','minimapTitle','minimapMap','minimapRoadA','minimapRoadB','minimapRail','minimapExtract',
    'findObjectiveCheck','findObjectiveRow','findObjectiveStatus',
    'contractObjectiveCheck','contractObjectiveRow','contractObjectiveTitle','contractObjectiveStatus',
    'bonusObjectiveCheck','bonusObjectiveRow','bonusObjectiveTitle','bonusObjectiveStatus',
    'lootObjectiveCheck','lootObjectiveRow','lootObjectiveStatus','extractObjectiveCheck','extractObjectiveRow','extractObjectiveStatus','objectiveStep','objectiveDetail','merchantModal','merchantPetals','merchantSellTab','merchantBuyTab','merchantSellPanel','merchantBuyPanel','merchantSellGrid','merchantDetails','merchantBuyGrid','sellJunkBtn','sellConfirmModal','sellConfirmTitle','sellConfirmBody','confirmSellBtn'
  ].map(id => [id, document.getElementById(id)]));

  let toastTimer = 0;
  function toast(message, ms = 1900) {
    clearTimeout(toastTimer); dom.toast.textContent = message; dom.toast.classList.add('show');
    toastTimer = setTimeout(() => dom.toast.classList.remove('show'), ms);
  }
  const safePetals = value => Math.max(0, Math.floor(Number(value) || 0));
  const formatPetals = value => `${safePetals(value).toLocaleString()} ${safePetals(value) === 1 ? 'Petal' : 'Petals'}`;
  const petalLabel = value => `🌸 ${formatPetals(value)}`;
  function avatarInitials(a) { return (a.displayName || a.username || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
  function setAvatar(el, a) {
    if (!el) return;
    const avatar=String(a.avatar||'').replace(/[\"'\n\r]/g,'');
    el.textContent = avatar ? '' : avatarInitials(a);
    el.style.backgroundImage = avatar ? `url("${avatar}")` : '';
  }
  const levelForXP = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const levelStartXP = level => (level - 1) * (level - 1) * 100;
  const levelEndXP = level => level * level * 100;
  function refreshLoadoutUI() {
    const a = activeAccount(); syncAccountLoadout(a);
    const kit = selectedLoadout(a), currentPlayer = typeof match !== 'undefined' && match ? getLocalPlayer() : null;
    const weaponId = currentPlayer?.weaponId || a.equippedWeaponId || (!kit.custom ? kit.weapon : null);
    const armorId = currentPlayer?.armorId || a.equippedArmorId || (!kit.custom ? kit.armorId : null);
    const weapon = weaponId ? WEAPONS[weaponId] : null, armor = armorId ? ARMORS[armorId] : null;
    MAX_WEIGHT = kit.maxWeight;
    if (dom.menuLoadoutName) dom.menuLoadoutName.textContent = kit.name;
    if (dom.menuWeaponAsset) { dom.menuWeaponAsset.src = weapon?.asset || localAsset('icon.svg'); dom.menuWeaponAsset.alt = weapon?.name || 'No custom weapon packed'; }
    if (dom.menuWeaponName) dom.menuWeaponName.textContent = weapon?.name || 'No weapon packed';
    if (dom.menuWeaponDesc) dom.menuWeaponDesc.textContent = weapon?.subtitle || 'Open Custom Loadout and pack a weapon from Account Stash.';
    const packedItems = normalizeSlots(a.prepared, SLOT_COUNT).filter(Boolean);
    const packedUtilityId = kit.custom ? packedItems.map(item => item.id).find(id => !ITEMS[id].ammo && !ITEMS[id].equipment) : null;
    const utility = packedUtilityId || (!kit.custom ? kit.items.map(([id]) => id).find(id => !ITEMS[id].ammo) : null);
    if (dom.menuUtilityAsset) { dom.menuUtilityAsset.src = utility ? ITEMS[utility].asset : localAsset('icon.svg'); dom.menuUtilityAsset.alt = utility ? ITEMS[utility].name : 'Empty custom backpack'; }
    if (dom.menuUtilityName) dom.menuUtilityName.textContent = kit.custom ? (packedUtilityId ? ITEMS[packedUtilityId].name : packedItems.length ? 'Gear-only custom pack' : 'No items packed yet') : kit.utility;
    if (dom.menuUtilityDesc) {
      const packedTotal = packedItems.reduce((sum,item)=>sum+item.qty,0);
      dom.menuUtilityDesc.textContent = kit.custom ? `${packedTotal} item${packedTotal===1?'':'s'} packed • ${weapon ? 'weapon ready' : 'weapon required'}` : kit.description;
    }
    if (dom.menuPackName) dom.menuPackName.textContent = kit.backpack;
    if (dom.menuPackDesc) dom.menuPackDesc.textContent = `${SLOT_COUNT} slots • ${kit.maxWeight} kg carry limit`;
    dom.equipWeapon.textContent = weapon?.name || 'No weapon packed'; dom.equipArmor.textContent = armor?.name || 'No armor packed'; dom.equipBackpack.textContent = kit.backpack;
    if (dom.equipWeaponAsset) { dom.equipWeaponAsset.src = weapon?.asset || localAsset('icon.svg'); dom.equipWeaponAsset.alt = weapon?.name || 'No weapon packed'; }
  }

  function refreshAccountUI() {
    const a = activeAccount();
    a.petals = safePetals(a.petals);
    if (dom.topPetals) dom.topPetals.textContent = formatPetals(a.petals);
    if (dom.profilePetals) dom.profilePetals.textContent = petalLabel(a.petals);
    if (dom.inventoryPetals) dom.inventoryPetals.textContent = petalLabel(a.petals);
    if (dom.merchantPetals) dom.merchantPetals.textContent = petalLabel(a.petals);
    setAvatar(dom.topAvatar, a); setAvatar(dom.menuAvatar, a); setAvatar(dom.hudAvatar, a);
    dom.topName.textContent = a.displayName; dom.profileName.textContent = a.displayName; dom.hudName.textContent = a.displayName;
    dom.profileHandle.textContent = `@${a.username}`; dom.profileBio.textContent = a.bio || 'Ready for the meadow.';
    const level = levelForXP(a.xp), start = levelStartXP(level), end = levelEndXP(level);
    dom.levelText.textContent = level; dom.xpText.textContent = `${a.xp - start} / ${end - start} XP`;
    dom.xpBar.style.width = `${clamp((a.xp - start) / Math.max(1, end - start) * 100, 0, 100)}%`;
    dom.extractsStat.textContent = a.stats.extracts; dom.berriesStat.textContent = a.stats.berries;
    dom.killsStat.textContent = a.stats.kills; dom.matchesStat.textContent = a.stats.matches;
    refreshLoadoutUI();
    applySettings(); refreshCustomizer(); renderLoadoutGrid();
  }

  function renderAccounts() {
    dom.accountList.innerHTML = '';
    db.accounts.forEach(a => {
      const row = document.createElement('div'); row.className = `account-row${a.id === db.activeId ? ' active' : ''}`;
      const av = document.createElement('span'); av.className = 'avatar avatar-large'; setAvatar(av, a);
      const info = document.createElement('div');
      info.innerHTML = `<strong>${safeText(a.displayName)}</strong><small>@${safeText(a.username)} • Level ${levelForXP(a.xp)} • ${a.stats.extracts} extracts • ${formatPetals(a.petals)}</small>`;
      const actions = document.createElement('span'); actions.className = 'account-actions';
      const select = document.createElement('button'); select.className = 'secondary'; select.textContent = a.id === db.activeId ? 'Active' : 'Use';
      select.disabled = a.id === db.activeId; select.onclick = () => {
        const previousActiveId = db.activeId; db.activeId = a.id;
        if (!saveDB()) { db.activeId = previousActiveId; return toast('Account switch could not be saved'); }
        renderAccounts(); refreshAccountUI();
      };
      const edit = document.createElement('button'); edit.className = 'ghost'; edit.textContent = 'Edit'; edit.onclick = () => openProfileEditor(a.id);
      const exp = document.createElement('button'); exp.className = 'ghost'; exp.textContent = 'Download Account'; exp.title = 'Download this complete account as a restorable file'; exp.onclick = () => downloadProfileXml(a);
      const urlBtn = document.createElement('button'); urlBtn.className = 'ghost'; urlBtn.textContent = 'Copy Profile URL'; urlBtn.onclick = () => copyProfileUrl(a);
      actions.append(select, edit, exp, urlBtn);
      if (db.accounts.length > 1) {
        const del = document.createElement('button'); del.className = 'danger-button'; del.textContent = 'Delete';
        del.onclick = () => {
          if (!confirm(`Delete ${a.displayName}'s device account? Download it first if you may want it back.`)) return;
          const previousAccounts = db.accounts, previousActiveId = db.activeId;
          db.accounts = db.accounts.filter(x => x.id !== a.id); if (db.activeId === a.id) db.activeId = db.accounts[0].id;
          if (!saveDB()) { db.accounts = previousAccounts; db.activeId = previousActiveId; return toast('Account deletion could not be saved'); }
          renderAccounts(); refreshAccountUI();
        };
        actions.append(del);
      }
      row.append(av, info, actions); dom.accountList.append(row);
    });
  }

  let editingAccountId = null, pendingAvatar = '';
  function openProfileEditor(id = null) {
    const source = id ? db.accounts.find(a => a.id === id) : makeAccount('New Critter', `critter_${Math.floor(Math.random() * 9000 + 1000)}`);
    editingAccountId = id; pendingAvatar = source.avatar || '';
    dom.profileModalTitle.textContent = id ? 'Edit Account' : 'Create Account';
    dom.profileModalEyebrow.textContent = id ? 'DEVICE PROFILE' : 'NEW DEVICE PROFILE';
    dom.usernameInput.value = source.username; dom.displayNameInput.value = source.displayName; dom.bioInput.value = source.bio || ''; if(dom.avatarUrlInput) dom.avatarUrlInput.value = source.avatar && /^https?:/i.test(source.avatar) ? source.avatar : '';
    setAvatar(dom.editAvatarPreview, source); dom.accountsModal.close(); dom.profileModal.showModal();
    setTimeout(() => { dom.displayNameInput.focus(); dom.displayNameInput.select(); }, 0);
  }
  dom.profileForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = safeText(dom.usernameInput.value, 18).replace(/[^A-Za-z0-9_-]/g, '');
    const displayName = safeText(dom.displayNameInput.value, 24);
    if (!username || !displayName) return toast('Enter a valid username and display name');
    if (db.accounts.some(a => a.username.toLowerCase() === username.toLowerCase() && a.id !== editingAccountId)) return toast('That username already exists on this device');
    const previousDb = deepCopy(db);
    if (editingAccountId) {
      const a = db.accounts.find(x => x.id === editingAccountId); Object.assign(a, { username, displayName, bio: safeText(dom.bioInput.value, 120), avatar: pendingAvatar });
    } else {
      const a = makeAccount(displayName, username); a.bio = safeText(dom.bioInput.value, 120); a.avatar = pendingAvatar; db.accounts.push(a); db.activeId = a.id;
    }
    if (!saveDB()) { db = previousDb; refreshAccountUI(); renderAccounts(); return toast('Account could not be saved: browser storage may be full'); }
    dom.profileModal.close(); refreshAccountUI(); renderAccounts(); toast('Account saved');
  });
  [dom.displayNameInput, dom.usernameInput].forEach(field => field.addEventListener('input', () => setAvatar(dom.editAvatarPreview, { displayName: dom.displayNameInput.value, username: dom.usernameInput.value, avatar: pendingAvatar })));
  dom.avatarInput.addEventListener('change', async () => {
    const file = dom.avatarInput.files && dom.avatarInput.files[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast('Picture must be under 8 MB');
    const url = await resizeImage(file, 256); pendingAvatar = url;
    setAvatar(dom.editAvatarPreview, { displayName: dom.displayNameInput.value, username: dom.usernameInput.value, avatar: url });
  });
  $('#applyAvatarUrlBtn').onclick = () => {
    const url = String(dom.avatarUrlInput?.value || '').trim();
    if (!/^https?:\/\//i.test(url)) return toast('Enter a complete http or https image URL');
    pendingAvatar = url;
    setAvatar(dom.editAvatarPreview, { displayName: dom.displayNameInput.value, username: dom.usernameInput.value, avatar: url });
    toast('Profile image URL applied');
  };
  $('#removeAvatarBtn').onclick = () => { pendingAvatar = ''; setAvatar(dom.editAvatarPreview, { displayName: dom.displayNameInput.value, username: dom.usernameInput.value, avatar: '' }); };
  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = reject; reader.onload = () => {
        const img = new Image(); img.onerror = reject; img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL('image/jpeg', .82));
        }; img.src = reader.result;
      }; reader.readAsDataURL(file);
    });
  }

  // -------------------- XML profile save / upload / URL import --------------------
  function encodeUtf8Base64Url(text) {
    const bytes = new TextEncoder().encode(text); let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function decodeUtf8Base64Url(text) {
    const n = String(text || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    const p = n + '='.repeat((4 - n.length % 4) % 4);
    const bytes = Uint8Array.from(atob(p), c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function accountToXml(account) {
    const doc = document.implementation.createDocument('', 'CritterExtractionProfile', null);
    const root = doc.documentElement; root.setAttribute('version', '5'); root.setAttribute('studio', "Harley's Studios"); root.setAttribute('gameVersion', GAME_VERSION); root.setAttribute('exportedAt', new Date().toISOString());
    const add = (name, value) => { const node = doc.createElement(name); node.textContent = String(value ?? ''); root.appendChild(node); return node; };
    add('DisplayName', account.displayName); add('Username', account.username); add('Bio', account.bio || '');
    if (/^https?:/i.test(account.avatar || '')) add('AvatarURL', account.avatar);
    const payload = add('ProfileData', encodeUtf8Base64Url(JSON.stringify({ type: 'critter-account-xml-v5', account })));
    payload.setAttribute('encoding', 'base64url-json');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
  }
  function accountFromXml(text) {
    const doc = new DOMParser().parseFromString(String(text), 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
    const root = doc.documentElement;
    if (!root || root.nodeName !== 'CritterExtractionProfile') throw new Error('Not a Critter Extraction profile');
    const payload = root.querySelector('ProfileData');
    if (!payload) throw new Error('ProfileData is missing');
    const pack = JSON.parse(decodeUtf8Base64Url(payload.textContent));
    if (!pack || !['critter-account-xml-v4','critter-account-xml-v5'].includes(pack.type) || !pack.account) throw new Error('Unsupported profile XML');
    return pack.account;
  }
  function normalizeImportedAccount(source) {
    const a = deepCopy(source || {}); a.id = uid();
    a.username = safeText(a.username, 18).replace(/[^A-Za-z0-9_-]/g, '') || `imported_${Date.now().toString().slice(-4)}`;
    const importedBase = a.username.slice(0, 13); let importedSuffix = 2; while (db.accounts.some(x => x.username.toLowerCase() === a.username.toLowerCase())) a.username = `${importedBase}_${importedSuffix++}`.slice(0,18);
    a.displayName = safeText(a.displayName, 24) || 'Imported Critter'; a.bio = safeText(a.bio, 120);
    a.avatar = typeof a.avatar === 'string' ? a.avatar.slice(0, 1500000) : '';
    a.settings = { ...DEFAULT_SETTINGS, ...(a.settings || {}) };
    a.appearance = { species:'puppy',bodyColor:'#d9a06f',accentColor:'#7b4d35',accessory:'cap',eyeStyle:'dot', ...(a.appearance || {}) };
    a.stats = { extracts:0,berries:0,kills:0,matches:0, ...(a.stats || {}) };
    a.xp = Math.max(0, Number(a.xp) || 0); a.petals = safePetals(a.petals); a.economyTransactions = Array.isArray(a.economyTransactions) ? a.economyTransactions.slice(-40) : []; a.stash = normalizeSlots(a.stash, STASH_COUNT); a.prepared = normalizeSlots(a.prepared, SLOT_COUNT); syncAccountLoadout(a);
    return a;
  }
  function installImportedAccount(account) {
    const a = normalizeImportedAccount(account), previousActiveId = db.activeId;
    db.accounts.push(a); db.activeId = a.id;
    if (!saveDB()) {
      db.accounts = db.accounts.filter(x => x.id !== a.id); db.activeId = previousActiveId;
      toast('Account restore failed: browser storage may be full'); return false;
    }
    refreshAccountUI(); renderAccounts(); toast('Separate account restored'); return true;
  }
  function downloadProfileXml(account) {
    try {
      const xml = accountToXml(account), blob = new Blob([xml], { type:'application/xml;charset=utf-8' }), url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `${safeText(account.username,18) || 'critter'}-critter-extraction-account.xml`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('Full account downloaded');
    } catch (error) { console.error(error); toast('Account download failed: try Copy Profile URL'); }
  }
  function profileUrlFor(account) {
    const base = location.href.split('#')[0];
    return `${base}#profile=${encodeUtf8Base64Url(accountToXml(account))}`;
  }
  async function copyProfileUrl(account) {
    const url = profileUrlFor(account);
    try { await navigator.clipboard.writeText(url); toast('Profile URL copied'); }
    catch (_) { dom.backupTitle.textContent='Profile URL';dom.backupHelp.textContent='Copy this URL into another version, then paste it into Import XML URL.';dom.backupCode.value=url;dom.applyImportBtn.hidden=true;dom.backupModal.showModal(); }
  }
  async function importProfileUrlValue(value) {
    const raw=String(value||'').trim(), hash=raw.match(/[#&]profile=([^&]+)/i);
    if(hash){const xml=decodeUtf8Base64Url(decodeURIComponent(hash[1]));await importProfileXmlText(xml);return;}
    if(!/^https?:\/\//i.test(raw))throw new Error('Not an account URL');
    const response=await fetch(raw,{mode:'cors',cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);await importProfileXmlText(await response.text());
  }
  async function importProfileXmlText(text) { if (installImportedAccount(accountFromXml(text)) && dom.accountsModal.open) dom.accountsModal.close(); }

  // -------------------- Profile backup, customization, settings --------------------
  function encodeBackup(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data)); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function decodeBackup(code) {
    const n = String(code).trim().replace(/-/g, '+').replace(/_/g, '/'); const p = n + '='.repeat((4 - n.length % 4) % 4);
    const bytes = Uint8Array.from(atob(p), c => c.charCodeAt(0)); return JSON.parse(new TextDecoder().decode(bytes));
  }
  function openBackupExport(id) {
    const a = db.accounts.find(x => x.id === id); if (!a) return;
    dom.backupTitle.textContent = 'Export Account'; dom.backupHelp.textContent = 'Copy this backup code to move the local profile, stash, settings, and statistics to another browser.';
    dom.backupCode.readOnly = true; dom.backupCode.value = encodeBackup({ type: 'critter-account-v3', account: a }); dom.applyImportBtn.hidden = true;
    dom.accountsModal.close(); dom.backupModal.showModal();
  }
  function openBackupImport() {
    dom.backupTitle.textContent = 'Import Account'; dom.backupHelp.textContent = 'Paste a Critter Extraction account backup code. It restores a separate local account with its profile, progress, stash, loadout, currency, settings, and statistics.';
    dom.backupCode.readOnly = false; dom.backupCode.value = ''; dom.applyImportBtn.hidden = false; dom.accountsModal.close(); dom.backupModal.showModal();
  }
  dom.applyImportBtn.onclick = () => {
    try {
      const pack = decodeBackup(dom.backupCode.value); if (!pack || pack.type !== 'critter-account-v3' || !pack.account) throw new Error('Invalid backup');
      if (installImportedAccount(pack.account)) dom.backupModal.close();
    } catch (_) { toast('That backup code is not valid'); }
  };

  function selectSpecies(speciesId, useDefaults = false) {
    const def = SPECIES[speciesId] || SPECIES.puppy;
    dom.species.value = speciesId;
    if (useDefaults) { dom.bodyColor.value = def.body; dom.accentColor.value = def.accent; }
    if (dom.critterPreviewAsset) { dom.critterPreviewAsset.src = def.asset; dom.critterPreviewAsset.alt = `${def.name} character preview`; }
    dom.critterPreview.dataset.species = speciesId;
    $$('.character-choice', dom.characterRoster).forEach(btn => btn.classList.toggle('active', btn.dataset.species === speciesId));
  }
  function renderCharacterRoster() {
    if (!dom.characterRoster) return;
    dom.characterRoster.innerHTML = '';
    Object.entries(SPECIES).forEach(([id, def]) => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'character-choice'; btn.dataset.species = id;
      btn.innerHTML = `<img src="${def.asset}" alt=""><span>${def.name}</span><small>${def.role}</small>`;
      btn.onclick = () => selectSpecies(id, true);
      dom.characterRoster.append(btn);
    });
  }
  function refreshCustomizer() {
    const a = activeAccount(), ap = a.appearance, species = SPECIES[ap.species] ? ap.species : 'puppy';
    dom.bodyColor.value = ap.bodyColor || SPECIES[species].body; dom.accentColor.value = ap.accentColor || SPECIES[species].accent;
    dom.accessory.value = ap.accessory; dom.eyeStyle.value = ap.eyeStyle;
    selectSpecies(species, false);
  }
  ['bodyColor','accentColor'].forEach(id => dom[id].addEventListener('input', () => {
    dom.critterPreview.style.setProperty(`--${id === 'bodyColor' ? 'body' : 'accent'}`, dom[id].value);
  }));
  dom.species.addEventListener('change', () => selectSpecies(dom.species.value, false));
  dom.customizeForm.addEventListener('submit', e => {
    e.preventDefault(); Object.assign(activeAccount().appearance, { species: dom.species.value, bodyColor: dom.bodyColor.value, accentColor: dom.accentColor.value, accessory: dom.accessory.value, eyeStyle: dom.eyeStyle.value });
    saveDB(); dom.customizeModal.close(); refreshAccountUI(); toast('Harley’s Studios character saved');
  });

  function returnPreparedToStash(account) {
    const remaining = emptySlots(SLOT_COUNT);
    let returned = 0;
    for (const item of normalizeSlots(account.prepared, SLOT_COUNT)) {
      if (!item) continue;
      const moved = addItem(account.stash, item.id, item.qty);
      returned += moved;
      if (moved < item.qty) addItem(remaining, item.id, item.qty - moved);
    }
    account.prepared = remaining;
    return { returned, remaining: remaining.reduce((sum, item) => sum + (item?.qty || 0), 0) };
  }
  function activateCustomLoadout(openBuilder = true) {
    const a = activeAccount();
    a.loadoutId = 'custom';
    syncAccountLoadout(a);
    MAX_WEIGHT = LOADOUTS.custom.maxWeight;
    saveDB();
    refreshLoadoutUI();
    renderLoadoutGrid();
    toast('Custom Loadout selected');
    if (openBuilder) {
      if (dom.loadoutModal.open) dom.loadoutModal.close();
      setTimeout(() => openInventory('stash'), 0);
    }
  }
  function renderLoadoutGrid() {
    if (!dom.loadoutGrid) return;
    const account = activeAccount(), current = account.loadoutId;
    dom.loadoutGrid.innerHTML = '';
    Object.entries(LOADOUTS).forEach(([id, kit]) => {
      const activeWeapon = kit.custom ? (account.equippedWeaponId ? WEAPONS[account.equippedWeaponId] : null) : WEAPONS[kit.weapon];
      const utilityIds = kit.custom
        ? normalizeSlots(account.prepared, SLOT_COUNT).filter(Boolean).slice(0, 5).map(item => item.id)
        : kit.items.map(([itemId]) => itemId).filter(itemId => !ITEMS[itemId].ammo);
      const packedCount = normalizeSlots(account.prepared, SLOT_COUNT).reduce((sum, item) => sum + (item?.qty || 0), 0);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `loadout-choice${id === current ? ' active' : ''}${kit.custom ? ' custom-choice' : ''}`;
      card.dataset.loadout = id;
      card.innerHTML = `<img src="${activeWeapon?.asset || localAsset('icon.svg')}" alt="${activeWeapon?.name || 'No weapon packed'}"><span class="loadout-tag">${kit.tag}</span><h3>${kit.name}</h3><p>${kit.custom ? 'Choose exactly what to risk. Pack items from Safe Storage into a saved 20-slot custom backpack.' : kit.description}</p><div class="loadout-stats"><span>Weapon <b>${activeWeapon?.name || 'Required'}</b></span>${kit.custom ? `<span>Packed <b>${packedCount} items</b></span>` : `<span>Magazine <b>${activeWeapon?.mag || 0}</b></span><span>Damage <b>${activeWeapon?.damage || 0}${activeWeapon?.pellets > 1 ? ` × ${activeWeapon.pellets}` : ''}</b></span>`}<span>Shield <b>${kit.custom ? (account.equippedArmorId ? ARMORS[account.equippedArmorId]?.shield || 0 : 0) : kit.shield}</b></span><span>Carry <b>${kit.maxWeight} kg</b></span></div><div class="loadout-items">${utilityIds.length ? utilityIds.map(itemId => `<img src="${ITEMS[itemId].asset}" title="${ITEMS[itemId].name}" alt="">`).join('') : '<span class="empty-custom-pack">PACK ITEMS</span>'}</div>`;
      card.onclick = () => {
        if (kit.custom) return activateCustomLoadout(true);
        const a = activeAccount(), moved = returnPreparedToStash(a);
        a.loadoutId = id; a.equippedWeaponId = kit.weapon; a.equippedArmorId = kit.armorId; syncAccountLoadout(a); MAX_WEIGHT = kit.maxWeight;
        saveDB(); refreshLoadoutUI(); renderLoadoutGrid(); renderInventory();
        toast(moved.remaining ? `${kit.name} equipped • some packed items stayed in the backpack because the stash is full` : `${kit.name} equipped`);
      };
      dom.loadoutGrid.append(card);
    });
  }
  $('#loadoutBtn').onclick = () => { renderLoadoutGrid(); dom.loadoutModal.showModal(); };
  if (dom.customLoadoutBtn) dom.customLoadoutBtn.onclick = () => activateCustomLoadout(true);
  if (dom.returnPreparedBtn) dom.returnPreparedBtn.onclick = () => { const a=activeAccount(), result=returnPreparedToStash(a); backpack=normalizeSlots(a.prepared,SLOT_COUNT); syncAccountLoadout(a); saveDB(); renderInventory(); refreshLoadoutUI(); toast(result.remaining ? 'Stash is full; remaining items stayed in Custom Loadout' : 'Custom Loadout returned to Account Stash'); };

  function loadSettingsForm() {
    const s = activeAccount().settings;
    Object.keys(DEFAULT_SETTINGS).forEach(k => { const el = document.getElementById(k); if (!el) return; el.type === 'checkbox' ? el.checked = !!s[k] : el.value = s[k]; });
    $('#fovOut').textContent = `${s.fov}°`; $('#sensitivityOut').textContent = `${Number(s.sensitivity).toFixed(1)}×`; $('#hudScaleOut').textContent = `${s.hudScale}%`; $('#volumeOut').textContent = `${s.volume}%`;
  }
  function refreshGraphicsDescription(value = activeAccount().settings.quality) {
    const profile = GRAPHICS_PROFILES[value] || GRAPHICS_PROFILES.medium;
    if (dom.graphicsDetailText) dom.graphicsDetailText.textContent = profile.note;
    if (renderer && dom.rendererBadge) {
      const engine = rendererMode === 'canvas' ? 'CANVAS FALLBACK' : 'WEBGL';
      dom.rendererBadge.textContent = `${engine} • ${profile.label}`;
    }
  }
  function applySettings() {
    const s = activeAccount().settings; document.documentElement.style.setProperty('--hud-scale', s.hudScale / 100); document.documentElement.classList.toggle('compat-mode', !!s.compatibilityMode);
    dom.controlHint.style.display = s.showHints ? '' : 'none'; applyInputVisibility();
    refreshGraphicsDescription(s.quality);
    if (renderer) renderer.resize();
  }
  function touchControlsEnabled() {
    const settings = activeAccount()?.settings || DEFAULT_SETTINGS;
    return !!(settings.touchAlways || (inputDeviceProfile.phoneOrTablet && inputDeviceProfile.mode === 'touch'));
  }
  function usingTouchInput() {
    return inputDeviceProfile.mode === 'touch' && touchControlsEnabled();
  }
  function applyInputVisibility() {
    const showTouch = touchControlsEnabled();
    dom.touchControls.hidden = !showTouch; document.body.classList.toggle('touch-ui', showTouch); document.body.dataset.inputMode = inputDeviceProfile.mode;
  }
  function setInputMode(mode) {
    if (!['touch','mouse-keyboard'].includes(mode) || inputDeviceProfile.mode === mode) return;
    inputDeviceProfile.mode = mode;
    if (mode === 'mouse-keyboard') resetTouchControls();
    applyInputVisibility();
  }
  function persistSettingsForm(showMessage = false) {
    const s = activeAccount().settings;
    Object.keys(DEFAULT_SETTINGS).forEach(k => {
      const el = document.getElementById(k); if (!el) return;
      if (el.type === 'checkbox') s[k] = el.checked;
      else if (el.type === 'range' || k === 'renderScale') s[k] = Number(el.value);
      else s[k] = el.value;
    });
    saveDB();if(match){cameraMode=s.cameraMode;shoulderSide=s.shoulderSide==='left'?-1:1;const p=getLocalPlayer();if(p){p.cameraMode=cameraMode;p.shoulderSide=shoulderSide;}cameraRigEye=null;cameraRigTime=performance.now();if(dom.cameraTag)dom.cameraTag.textContent=`${cameraMode.toUpperCase()} PERSON`;}applySettings(); if (showMessage) toast('Settings saved');
  }
  dom.settingsForm.addEventListener('submit', e => { e.preventDefault(); persistSettingsForm(true); dom.settingsModal.close(); });
  dom.settingsForm.addEventListener('change', () => persistSettingsForm(false));
  $('#fov').oninput = e => $('#fovOut').textContent = `${e.target.value}°`;
  $('#sensitivity').oninput = e => $('#sensitivityOut').textContent = `${Number(e.target.value).toFixed(1)}×`;
  $('#hudScale').oninput = e => $('#hudScaleOut').textContent = `${e.target.value}%`;
  $('#volume').oninput = e => $('#volumeOut').textContent = `${e.target.value}%`;
  $('#quality').onchange = e => refreshGraphicsDescription(e.target.value);

  $$('[data-open]').forEach(btn => btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.open); if (!target) return;
    if (btn.dataset.open === 'settingsModal') loadSettingsForm();
    if (dom.pauseModal.open) dom.pauseModal.close(); target.showModal();
  }));
  $$('[data-close]').forEach(btn => btn.addEventListener('click', () => {
    const d = document.getElementById(btn.dataset.close); if (d && d.open) d.close();
    if (match && btn.dataset.close === 'inventoryModal') resumePointer();
  }));
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const el = document.getElementById(btn.dataset.copy); if (!el || !el.value) return toast('Nothing to copy');
    try { await navigator.clipboard.writeText(el.value); toast('Code copied'); } catch (_) { el.select(); document.execCommand('copy'); toast('Code copied'); }
  }));
  $$('[data-paste]').forEach(btn => btn.addEventListener('click', async () => {
    const el = document.getElementById(btn.dataset.paste); if (!el) return;
    try { el.value = await navigator.clipboard.readText(); el.focus(); toast('Code pasted'); } catch (_) { el.focus(); toast('Press Ctrl+V to paste'); }
  }));
  $('#accountBtn').onclick = $('#accountsBtn').onclick = () => { renderAccounts(); dom.accountsModal.showModal(); };
  $('#editProfileBtn').onclick = () => openProfileEditor(activeAccount().id);
  $('#newAccountBtn').onclick = () => openProfileEditor(null);
  $('#importAccountBtn').onclick = () => $('#profileXmlFileInput').click();
  $('#legacyImportBtn').onclick = openBackupImport;
  $('#profileXmlFileInput').addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Account file must be under 2 MB');
    try { await importProfileXmlText(await file.text()); } catch (err) { console.error(err); toast('That account file is not valid'); }
    e.target.value = '';
  });
  $('#importProfileUrlBtn').onclick = async () => {
    const url = String($('#profileXmlUrlInput').value || '').trim(); if (!url) return toast('Paste an account or Profile URL');
    try { await importProfileUrlValue(url); }
    catch (err) { console.error(err); toast('Could not import that account URL'); }
  };

  // -------------------- Inventory interface --------------------
  let backpack = emptySlots(SLOT_COUNT);
  let nearbyLoot = null;
  let selectedItem = null; // { source:'backpack'|'side', index }
  let inventoryMode = 'stash';
  let draggedItem = null;
  const starterBackpack = (account = activeAccount()) => {
    const slots = emptySlots(SLOT_COUNT), kit = selectedLoadout(account);
    MAX_WEIGHT = kit.maxWeight;
    if (!kit.custom) kit.items.forEach(([id, qty]) => addItem(slots, id, qty, MAX_WEIGHT));
    return slots;
  };
  function openInventory(mode = match ? 'match' : 'stash', loot = null) {
    inventoryMode = mode; nearbyLoot = loot;
    const customBuilder = mode === 'stash' && !match && selectedLoadout().custom;
    dom.inventoryModal.classList.toggle('inventory-ingame', mode === 'match');
    dom.inventoryModal.classList.toggle('inventory-loot-open', mode === 'match' && !!loot);
    dom.inventoryModal.classList.toggle('custom-loadout-mode', customBuilder);
    if (dom.customLoadoutNotice) dom.customLoadoutNotice.hidden = !customBuilder;
    if (dom.returnPreparedBtn) dom.returnPreparedBtn.hidden = !customBuilder;
    if (dom.openMerchantFromInventoryBtn) dom.openMerchantFromInventoryBtn.hidden = mode !== 'stash';
    if (mode === 'stash' && !match) backpack = normalizeSlots(activeAccount().prepared, SLOT_COUNT);
    dom.inventoryEyebrow.textContent = customBuilder ? 'CUSTOM LOADOUT' : mode === 'stash' ? 'ACCOUNT STORAGE' : loot ? 'CONTAINER OPEN' : 'IN-GAME';
    dom.inventoryTitle.textContent = customBuilder ? 'Custom Loadout Builder' : mode === 'stash' ? 'Stash & Loadout' : loot ? 'Loot' : 'Inventory';
    dom.sideEyebrow.textContent = mode === 'stash' ? 'SAFE STORAGE' : loot ? 'NEARBY' : 'SAFE STORAGE LOCKED';
    dom.sideTitle.textContent = mode === 'stash' ? 'Account Stash' : loot ? 'Nearby Loot' : 'Extract to Access Stash';
    dom.takeAllBtn.hidden = !(mode === 'match' && loot);
    selectedItem = null; renderInventory();
    if (!dom.inventoryModal.open) dom.inventoryModal.showModal();
    if(document.pointerLockElement===dom.gameCanvas)suppressNextUnlockPause=true;document.exitPointerLock?.();
  }
  function sideSlots() { return inventoryMode === 'stash' ? activeAccount().stash : nearbyLoot || emptySlots(15); }
  function renderInventory() {
    const weight = inventoryWeight(backpack), value = inventoryValue(backpack), berries = countItem(backpack, 'moonberry');
    dom.weightText.textContent = `${weight.toFixed(1)} / ${MAX_WEIGHT.toFixed(1)} kg`; dom.weightBar.style.width = `${clamp(weight / MAX_WEIGHT * 100, 0, 100)}%`;
    dom.riskValue.textContent = `${value.toLocaleString()} petals`; dom.riskValue.classList.toggle('risk-high', value > 1000);
    const side = sideSlots(), backpackUsed = backpack.filter(Boolean).length, sideUsed = side.filter(Boolean).length;
    dom.inventoryBerryCount.textContent = berries; if (dom.inventoryPetals) dom.inventoryPetals.textContent = petalLabel(activeAccount().petals);
    dom.backpackTitle.textContent = inventoryMode === 'stash' ? `Loadout Backpack ${backpackUsed}/${SLOT_COUNT}` : `Backpack ${backpackUsed}/${SLOT_COUNT}`;
    dom.sideTitle.textContent = inventoryMode === 'stash' ? `Stash ${sideUsed}/${STASH_COUNT}` : nearbyLoot ? `Nearby Loot ${sideUsed}/${side.length}` : 'Stash Locked';
    renderGrid(dom.backpackGrid, backpack, 'backpack'); renderGrid(dom.sideGrid, side, 'side'); renderItemDetails(); syncInventoryActions(); renderQuickbar();
  }
  function syncInventoryActions() {
    const data = selectedData();
    if (inventoryMode !== 'match') {
      dom.dropSelectedBtn.hidden = true;
      dom.quickTransferBtn.hidden = false;
      dom.quickTransferBtn.textContent = 'Quick Transfer';
      return;
    }
    dom.dropSelectedBtn.hidden = !(data && data.source === 'backpack');
    dom.quickTransferBtn.hidden = !(data && (nearbyLoot || data.source === 'side'));
    dom.quickTransferBtn.textContent = !data ? 'Transfer' : data.source === 'side' ? 'Take Item' : nearbyLoot ? 'Store Item' : 'Transfer';
  }
  const INVENTORY_CATEGORY_ORDER=['weapon','armor','ammo','healing','quest','supplies'];
  const INVENTORY_CATEGORY_LABELS={weapon:'Weapons',armor:'Armor',ammo:'Ammunition',healing:'Healing & Utility',quest:'Quest Items',supplies:'Supplies & Valuables'};
  const INVENTORY_CATEGORY_SHORT={weapon:'WPN',armor:'ARM',ammo:'AMMO',healing:'AID',quest:'QUEST',supplies:'LOOT'};
  function inventoryCategory(itemId){const d=ITEMS[itemId];if(d?.equipment==='weapon')return'weapon';if(d?.equipment==='armor'||itemId==='armor_plate'||itemId==='shield_pod')return'armor';if(d?.ammo)return'ammo';if(d?.objective)return'quest';if(d?.consumable)return'healing';return'supplies';}
  function inventoryStat(item){const d=ITEMS[item.id];if(d.equipment==='weapon'){const w=WEAPONS[d.weaponId];return `${w.damage}${w.pellets>1?`×${w.pellets}`:''} dmg • ${w.mag} mag`;}if(d.equipment==='armor')return `${ARMORS[d.armorId]?.shield||0} shield`;if(d.ammo)return `${item.qty} rounds`;if(d.objective)return `${d.sellPrice} petals • contract loot`;if(d.consumable)return d.name.includes('Patch')||d.name.includes('Medkit')?'Healing item':'Quick-use item';return `${(d.weight*item.qty).toFixed(1)} kg • ${d.sellPrice*item.qty} petals`;}
  function bindInventoryItemButton(btn, item, index, source, def) {
    btn.addEventListener('dblclick', () => {
      selectedItem = { source, index };
      if (source === 'side') quickTransferSelected();
      else if (def.equipment) equipSelectedItem();
      else if (def.consumable) useSelectedItem();
      else if (nearbyLoot) quickTransferSelected();
    });
    btn.addEventListener('contextmenu', e => {
      e.preventDefault(); selectedItem = { source, index };
      if (source === 'backpack' && def.consumable) useSelectedItem();
      else if (source === 'backpack' && def.equipment) equipSelectedItem();
      else quickTransferSelected();
    });
    btn.addEventListener('dragstart', e => {
      draggedItem = { source, index }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `${source}:${index}`);
    });
    btn.addEventListener('click', () => { selectedItem = { source, index }; renderInventory(); });
    btn.addEventListener('dragover', e => { e.preventDefault(); btn.classList.add('drag-over'); });
    btn.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
    btn.addEventListener('drop', e => {
      e.preventDefault(); btn.classList.remove('drag-over');
      if (draggedItem) moveInventoryItem(draggedItem.source, draggedItem.index, source, index);
      draggedItem = null;
    });
  }
  function appendInventoryDropTarget(root, slots, source, simple = false) {
    const emptyIndex = slots.findIndex(item => !item), emptyCount = slots.filter(item => !item).length;
    const drop = document.createElement('button'); drop.type = 'button'; drop.className = 'inventory-empty-drop'; drop.disabled = emptyIndex < 0;
    if (simple) {
      const label = emptyIndex < 0 ? 'Full' : source === 'backpack' ? `${emptyCount} slots free` : `${emptyCount} spaces open`;
      drop.innerHTML = `<strong>${label}</strong>`;
    } else {
      drop.innerHTML = emptyIndex < 0 ? '<strong>Inventory full</strong><small>Transfer or drop an item to make room.</small>' : `<strong>${emptyCount} empty slot${emptyCount === 1 ? '' : 's'}</strong><small>Drop an item here to store it in the first open slot.</small>`;
    }
    drop.addEventListener('dragover', e => { if (emptyIndex < 0) return; e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      if (draggedItem && emptyIndex >= 0) moveInventoryItem(draggedItem.source, draggedItem.index, source, emptyIndex);
      draggedItem = null;
    });
    root.append(drop);
  }
  function bindInventoryEmptySlot(btn, index, source) {
    btn.addEventListener('dragover', e => { if (!draggedItem) return; e.preventDefault(); btn.classList.add('drag-over'); });
    btn.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
    btn.addEventListener('drop', e => {
      e.preventDefault(); btn.classList.remove('drag-over');
      if (draggedItem) moveInventoryItem(draggedItem.source, draggedItem.index, source, index);
      draggedItem = null;
    });
  }
  function renderGrid(root, slots, source) {
    root.innerHTML = '';
    root.classList.remove('grouped-item-grid', 'simple-item-grid');
    root.classList.add('square-item-grid');
    slots.forEach((item, index) => {
      if (!item) {
        const empty = document.createElement('button');
        empty.type = 'button'; empty.className = 'item-slot item-tile empty-tile';
        empty.dataset.source = source; empty.dataset.index = index;
        empty.setAttribute('aria-label', `Empty ${source === 'side' ? 'storage' : 'backpack'} slot ${index + 1}`);
        empty.innerHTML = '<span class="empty-slot-mark" aria-hidden="true"></span>';
        bindInventoryEmptySlot(empty, index, source); root.append(empty); return;
      }
      const def = ITEMS[item.id], category = inventoryCategory(item.id), btn = document.createElement('button');
      btn.className = `item-slot item-tile category-${category} rarity-${def.rarity}${selectedItem && selectedItem.source === source && selectedItem.index === index ? ' selected' : ''}`;
      btn.type = 'button'; btn.dataset.source = source; btn.dataset.index = index; btn.draggable = true;
      btn.title = `${def.name} ×${item.qty} — ${inventoryStat(item)}`;
      btn.innerHTML = `<span class="item-tile-type">${INVENTORY_CATEGORY_SHORT[category]}</span><span class="item-tile-qty">${item.qty > 1 ? `×${item.qty}` : ''}</span><span class="item-icon"><img src="${def.asset}" alt=""></span><span class="item-tile-name">${def.name}</span>`;
      bindInventoryItemButton(btn, item, index, source, def); root.append(btn);
    });
  }
  function sourceArray(source) { return source === 'backpack' ? backpack : sideSlots(); }
  function moveInventoryItem(fromSource, fromIndex, toSource, toIndex) {
    if (fromSource === toSource && fromIndex === toIndex) return;
    if (inventoryMode === 'match' && !nearbyLoot && (fromSource === 'side' || toSource === 'side')) return toast('Your stash is unavailable during a drop');
    const from = sourceArray(fromSource), to = sourceArray(toSource), moving = from[fromIndex]; if (!moving) return;
    if (toSource === 'backpack' && fromSource !== 'backpack' && inventoryWeight(backpack) + itemWeight(moving) > MAX_WEIGHT + .001) return toast('Backpack is too heavy');
    const target = to[toIndex];
    if (!target) { to[toIndex] = moving; from[fromIndex] = null; }
    else if (target.id === moving.id) {
      const cap = ITEMS[target.id].stack - target.qty; const moved = Math.min(cap, moving.qty); target.qty += moved; moving.qty -= moved; if (moving.qty <= 0) from[fromIndex] = null;
    } else { to[toIndex] = moving; from[fromIndex] = target; }
    if (inventoryMode === 'stash') { const a=activeAccount(); a.prepared = normalizeSlots(backpack, SLOT_COUNT); syncAccountLoadout(a); saveDB(); refreshLoadoutUI(); } selectedItem = { source: toSource, index: toIndex }; renderInventory(); updateHUD();
  }
  function selectedData() {
    if (!selectedItem) return null; const slots = sourceArray(selectedItem.source); const item = slots[selectedItem.index]; return item ? { slots, item, def: ITEMS[item.id], source: selectedItem.source, index: selectedItem.index } : null;
  }
  function renderItemDetails() {
    const data = selectedData();
    dom.inventoryModal.classList.toggle('inventory-has-selection', !!data);
    if (!data) { dom.itemDetails.innerHTML = '<div class="item-details-icon">?</div><div><span class="eyebrow">HARLEY’S STUDIOS ITEM</span><h3>Select an item</h3><p>Item information and actions appear here.</p></div>'; return; }
    const { item, def, source } = data;
    const equipAction = def.equipment ? `<button class="primary" data-item-action="equip">${match ? 'Equip Now' : 'Equip for Drop'}</button>` : '';
    dom.itemDetails.innerHTML = `<div class="item-details-icon"><img src="${def.asset}" alt=""></div><div><span class="eyebrow">HARLEY’S STUDIOS • ${def.rarity.toUpperCase()} • ${(def.weight * item.qty).toFixed(2)} KG</span><h3>${def.name} ×${item.qty}</h3><p>${def.description}</p><div class="item-detail-actions">${equipAction}${source === 'backpack' && def.consumable ? '<button class="primary" data-item-action="use">Use</button>' : ''}<button class="secondary" data-item-action="transfer">Transfer</button>${inventoryMode === 'match' && source === 'backpack' ? '<button class="danger-button" data-item-action="drop">Drop</button>' : ''}</div></div>`;
    $$('[data-item-action]', dom.itemDetails).forEach(b => b.onclick = () => ({ equip: equipSelectedItem, use: useSelectedItem, transfer: quickTransferSelected, drop: dropSelectedItem })[b.dataset.itemAction]());
  }
  function equipSelectedItem() {
    const data = selectedData(); if (!data || !data.def.equipment) return;
    if (match && data.source !== 'backpack') return toast('Transfer this gear to your backpack before equipping it');
    if (!match && selectedLoadout().custom && data.source !== 'backpack') return toast('Pack this item into Custom Loadout before equipping it');
    const a = activeAccount(), p = match ? getLocalPlayer() : null;
    if (data.def.equipment === 'weapon') {
      const id = data.def.weaponId; if (!WEAPONS[id]) return;
      if (p) { p.weaponId = id; p.mag = Math.min(p.mag || 0, WEAPONS[id].mag); if (p.mag <= 0) p.mag = WEAPONS[id].mag; p.reload = 0; match.pendingEquippedWeaponId = id; if(match.role==='guest')sendNet({type:'equipGear',equipment:'weapon',id}); }
      else { a.equippedWeaponId = id; syncAccountLoadout(a); saveDB(); }
      toast(`${WEAPONS[id].name} equipped`);
    } else if (data.def.equipment === 'armor') {
      const id = data.def.armorId, armor = ARMORS[id]; if (!armor) return;
      if (p) { const ratio = p.maxShield > 0 ? p.shield / p.maxShield : 0; p.armorId = id; p.maxShield = armor.shield; p.shield = clamp(Math.round(Math.max(p.shield, armor.shield * ratio)), 0, armor.shield); p.speed = (LOADOUTS[p.profile?.loadoutId]?.speed || selectedLoadout().speed || 5.4) + armor.speedMod; match.pendingEquippedArmorId = id; if(match.role==='guest')sendNet({type:'equipGear',equipment:'armor',id}); }
      else { a.equippedArmorId = id; syncAccountLoadout(a); saveDB(); }
      toast(`${armor.name} equipped`);
    }
    refreshLoadoutUI(); renderInventory(); updateHUD();
  }
  function applyConsumable(p, id, quiet = false) {
    if (!p) return false;
    if (id === 'bandage') { if (p.hp >= 100) { if(!quiet)toast('Health is already full'); return false; } p.hp = Math.min(100, p.hp + 35); }
    else if (id === 'medkit') { if (p.hp >= 100) { if(!quiet)toast('Health is already full'); return false; } p.hp = Math.min(100, p.hp + 75); }
    else if (id === 'shield_pod') { if (p.shield >= p.maxShield) { if(!quiet)toast('Shield is already full'); return false; } p.shield = Math.min(p.maxShield, p.shield + 35); }
    else if (id === 'armor_plate') { if (p.shield >= p.maxShield) { if(!quiet)toast('Armor is already full'); return false; } p.shield = Math.min(p.maxShield, p.shield + 30); }
    else if (id === 'zoomberry') { p.speedBoost = Math.max(p.speedBoost || 0, 12); }
    else return false;
    if (!quiet) toast(`${ITEMS[id].name} used`);
    audio.heal(); return true;
  }
  function useSelectedItem() {
    const data = selectedData(); if (!data || data.source !== 'backpack' || !data.def.consumable) return;
    if (!match) return toast('Consumables can only be used during a drop');
    const p = getLocalPlayer(); if (!p || !p.alive || !applyConsumable(p, data.item.id)) return;
    if (match.role === 'guest') sendNet({type:'consume', id:data.item.id});
    data.item.qty--; if (data.item.qty <= 0) data.slots[data.index] = null; renderInventory(); updateHUD();
  }
  function quickTransferSelected() {
    const data = selectedData(); if (!data) return;
    const destSource = data.source === 'backpack' ? 'side' : 'backpack';
    if (inventoryMode === 'match' && !nearbyLoot && destSource === 'side') return toast('Extract to secure items');
    const dest = sourceArray(destSource);
    if (destSource === 'backpack' && inventoryWeight(backpack) + itemWeight(data.item) > MAX_WEIGHT + .001) return toast('Backpack is too heavy');
    const qty = data.item.qty, moved = addItem(dest, data.item.id, qty, destSource === 'backpack' ? MAX_WEIGHT : Infinity); data.item.qty -= moved; if (data.item.qty <= 0) data.slots[data.index] = null;
    if (!moved) return toast('No room available'); if (inventoryMode === 'stash') { const a=activeAccount(); a.prepared = normalizeSlots(backpack, SLOT_COUNT); syncAccountLoadout(a); saveDB(); refreshLoadoutUI(); } selectedItem = null; renderInventory(); updateHUD();
  }
  function dropSelectedItem() {
    const data = selectedData(); if (!data || data.source !== 'backpack' || !match) return;
    const p = getLocalPlayer(); world.pickups.push({ id: uid(), x: p.x + Math.sin(p.yaw) * 1.2, y: .45, z: p.z + Math.cos(p.yaw) * 1.2, item: { id: data.item.id, qty: data.item.qty }, spin: 0 });
    data.slots[data.index] = null; selectedItem = null; renderInventory(); toast('Item dropped');
  }
  dom.sortBackpackBtn.onclick = () => { sortSlots(backpack); if(inventoryMode==='stash'){const a=activeAccount();a.prepared=normalizeSlots(backpack,SLOT_COUNT);syncAccountLoadout(a);saveDB();refreshLoadoutUI();} renderInventory(); };
  dom.quickTransferBtn.onclick = quickTransferSelected;
  dom.dropSelectedBtn.onclick = dropSelectedItem;
  dom.takeAllBtn.onclick = () => {
    if (!nearbyLoot) return; let moved = 0;
    for (let i = 0; i < nearbyLoot.length; i++) { const it = nearbyLoot[i]; if (!it) continue; const n = addItem(backpack, it.id, it.qty, MAX_WEIGHT); it.qty -= n; moved += n; if (it.qty <= 0) nearbyLoot[i] = null; }
    renderInventory(); updateHUD(); toast(moved ? `Took ${moved} item${moved === 1 ? '' : 's'}` : 'No room in backpack');
  };
  $('#inventoryBtn').onclick = () => openInventory('stash');
  $('#gameInventoryBtn').onclick = () => openInventory('match');

  // -------------------- Lightweight audio --------------------
  class AudioKit {
    constructor() { this.ctx = null; }
    unlock() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); }
    tone(freq, duration = .08, type = 'sine', volume = .035, slide = 0) {
      if (!activeAccount().settings.volume) return; this.unlock();
      const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t); if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + duration);
      const v = volume * activeAccount().settings.volume / 100; gain.gain.setValueAtTime(v, t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      osc.connect(gain).connect(this.ctx.destination); osc.start(t); osc.stop(t + duration);
    }
    shoot() { this.tone(280, .07, 'square', .03, -170); }
    pickup() { this.tone(680, .12, 'sine', .035, 360); }
    hit() { this.tone(120, .09, 'sawtooth', .025, -40); }
    enemyHit() { this.tone(430, .05, 'square', .02, 100); }
    heal() { this.tone(430, .22, 'sine', .035, 380); }
    extract() { this.tone(520, .6, 'triangle', .05, 800); }
    empty() { this.tone(160, .04, 'square', .018); }
  }
  const audio = new AudioKit();
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  // -------------------- Small WebGL 1 scene renderer --------------------
  const M4 = {
    identity: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    multiply(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
      return o;
    },
    perspective(fov, aspect, near, far) {
      const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far); const o = new Float32Array(16);
      o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf; return o;
    },
    lookAt(eye, target, up = [0,1,0]) {
      let zx = eye[0]-target[0], zy=eye[1]-target[1], zz=eye[2]-target[2]; let l=Math.hypot(zx,zy,zz)||1; zx/=l;zy/=l;zz/=l;
      let xx=up[1]*zz-up[2]*zy, xy=up[2]*zx-up[0]*zz, xz=up[0]*zy-up[1]*zx; l=Math.hypot(xx,xy,xz)||1; xx/=l;xy/=l;xz/=l;
      const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
      return new Float32Array([xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0, -(xx*eye[0]+xy*eye[1]+xz*eye[2]), -(yx*eye[0]+yy*eye[1]+yz*eye[2]), -(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);
    },
    compose(x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0) {
      const cy=Math.cos(ry),syy=Math.sin(ry), cx=Math.cos(rx),sxx=Math.sin(rx), cz=Math.cos(rz),szz=Math.sin(rz);
      // Rz * Rx * Ry, column major with scale.
      const m00=cz*cy+szz*sxx*syy, m01=szz*cx, m02=cz*-syy+szz*sxx*cy;
      const m10=-szz*cy+cz*sxx*syy, m11=cz*cx, m12=szz*syy+cz*sxx*cy;
      const m20=cx*syy, m21=-sxx, m22=cx*cy;
      return new Float32Array([m00*sx,m01*sx,m02*sx,0, m10*sy,m11*sy,m12*sy,0, m20*sz,m21*sz,m22*sz,0, x,y,z,1]);
    }
  };
  function hexColor(hex) {
    const h = String(hex).replace('#',''); const n = parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);
    return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,1];
  }
  function makeCubeData() {
    const p=[],n=[],idx=[]; const faces=[
      [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[0,0,1]], [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],[0,0,-1]],
      [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1],[0,1,0]], [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[0,-1,0]],
      [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1],[1,0,0]], [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,0,0]]
    ];
    faces.forEach((f,fi)=>{ const base=p.length/3; for(let i=0;i<4;i++){p.push(...f[i].map(v=>v*.5));n.push(...f[4]);} idx.push(base,base+1,base+2,base,base+2,base+3); });
    return { p,n,idx };
  }
  function makeSphereData(lat=8, lon=10) {
    const p=[],n=[],idx=[];
    for(let y=0;y<=lat;y++){const v=y/lat,phi=v*Math.PI;for(let x=0;x<=lon;x++){const u=x/lon,th=u*Math.PI*2;const nx=Math.sin(phi)*Math.sin(th),ny=Math.cos(phi),nz=Math.sin(phi)*Math.cos(th);p.push(nx*.5,ny*.5,nz*.5);n.push(nx,ny,nz);}}
    for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;idx.push(a,b,a+1,b,b+1,a+1);} return {p,n,idx};
  }
  function makeCylinderData(sides=10) {
    const p=[],n=[],idx=[];
    for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,x=Math.sin(a)*.5,z=Math.cos(a)*.5;p.push(x,-.5,z,x,.5,z);n.push(Math.sin(a),0,Math.cos(a),Math.sin(a),0,Math.cos(a));}
    for(let i=0;i<sides;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    const base=p.length/3; p.push(0,.5,0,0,-.5,0);n.push(0,1,0,0,-1,0);
    for(let top=0;top<2;top++){const c=base+top;for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;const y=top?-.5:.5,ny=top?-1:1;const ia=p.length/3;p.push(Math.sin(a)*.5,y,Math.cos(a)*.5,Math.sin(b)*.5,y,Math.cos(b)*.5);n.push(0,ny,0,0,ny,0);idx.push(c,ia+(top?1:0),ia+(top?0:1));}}
    return {p,n,idx};
  }
  function makeConeData(sides=8) {
    const p=[],n=[],idx=[],top=.07;
    for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,base=p.length/3,m=(a+b)*.5,nx=Math.sin(m),nz=Math.cos(m);p.push(Math.sin(a)*.5,-.5,Math.cos(a)*.5,Math.sin(b)*.5,-.5,Math.cos(b)*.5,Math.sin(b)*top,.5,Math.cos(b)*top,Math.sin(a)*top,.5,Math.cos(a)*top);for(let j=0;j<4;j++)n.push(nx,.43,nz);idx.push(base,base+1,base+2,base,base+2,base+3);}
    const bc=p.length/3;p.push(0,-.5,0);n.push(0,-1,0);for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,k=p.length/3;p.push(Math.sin(a)*.5,-.5,Math.cos(a)*.5,Math.sin(b)*.5,-.5,Math.cos(b)*.5);n.push(0,-1,0,0,-1,0);idx.push(bc,k+1,k);}
    return {p,n,idx};
  }
  function makeCapsuleData(rings=3,sides=10) {
    const p=[],n=[],idx=[],rows=[],rad=.35,half=.15;
    for(let i=0;i<=rings;i++){const a=i/rings*Math.PI*.5,y=half+Math.cos(a)*rad,r=Math.sin(a)*rad;rows.push([y,r,Math.cos(a)]);}
    for(let i=0;i<=rings;i++){const a=i/rings*Math.PI*.5,y=-half-Math.sin(a)*rad,r=Math.cos(a)*rad;rows.push([y,r,-Math.sin(a)]);}
    for(let y=0;y<rows.length;y++){const q=rows[y];for(let x=0;x<=sides;x++){const a=x/sides*Math.PI*2,s=Math.sin(a),c=Math.cos(a);p.push(s*q[1],q[0],c*q[1]);n.push(s*Math.sqrt(Math.max(0,1-q[2]*q[2])),q[2],c*Math.sqrt(Math.max(0,1-q[2]*q[2])));}}
    for(let y=0;y<rows.length-1;y++)for(let x=0;x<sides;x++){const a=y*(sides+1)+x,b=a+sides+1;idx.push(a,b,a+1,b,b+1,a+1);}return {p,n,idx};
  }
  function makeWedgeData() {
    const p=[],n=[],idx=[],v=[[-.5,-.5,-.5],[.5,-.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[-.5,.5,-.5],[.5,.5,-.5]],f=[[0,2,3],[0,3,1],[0,1,5],[0,5,4],[0,4,2],[1,3,5],[2,4,5],[2,5,3]];
    for(const t of f){const a=v[t[0]],b=v[t[1]],c=v[t[2]],ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1,k=p.length/3;p.push(...a,...b,...c);for(let i=0;i<3;i++)n.push(nx/l,ny/l,nz/l);idx.push(k,k+1,k+2);}return {p,n,idx};
  }
  function makeCrystalData(sides=6) {
    const p=[],n=[],idx=[],add=(a,b,c)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1,k=p.length/3;p.push(...a,...b,...c);for(let i=0;i<3;i++)n.push(nx/l,ny/l,nz/l);idx.push(k,k+1,k+2);};
    for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,u=[Math.sin(a)*.42,0,Math.cos(a)*.42],v=[Math.sin(b)*.42,0,Math.cos(b)*.42];add([0,.5,0],u,v);add([0,-.5,0],v,u);}return {p,n,idx};
  }
  class Renderer {
    constructor(canvas) {
      this.canvas=canvas; const compat=!!activeAccount().settings.compatibilityMode; this.gl=canvas.getContext('webgl',{antialias:activeAccount().settings.quality!=='low',alpha:false,powerPreference:'high-performance',failIfMajorPerformanceCaveat:false}) || canvas.getContext('experimental-webgl');
      if(!this.gl) throw new Error('WebGL unavailable'); const gl=this.gl;
      const vs=`attribute vec3 aPos;attribute vec3 aNormal;uniform mat4 uMVP;uniform mat4 uModel;varying vec3 vN;varying vec3 vW;void main(){vec4 w=uModel*vec4(aPos,1.0);vW=w.xyz;vN=mat3(uModel)*aNormal;gl_Position=uMVP*vec4(aPos,1.0);}`;
      const fs=`precision mediump float;varying vec3 vN;varying vec3 vW;uniform vec4 uColor;uniform vec3 uLight;uniform vec3 uCamera;uniform vec3 uFogColor;uniform float uFog;uniform float uEmissive;void main(){vec3 n=normalize(vN);vec3 l=normalize(-uLight);vec3 v=normalize(uCamera-vW);float diff=max(dot(n,l),0.0);float band=floor(diff*3.0+.5)/3.0;float hemi=.5+.5*n.y;float rim=pow(1.0-max(dot(n,v),0.0),1.7);float shade=.38+band*.43+hemi*.12+rim*.18+uEmissive;vec3 col=uColor.rgb*shade+vec3(.04,.065,.09)*rim;float fd=clamp(length(vW-uCamera)*uFog,0.0,.88);col=mix(col,uFogColor,fd);gl_FragColor=vec4(col,uColor.a);}`;
      this.program=this.createProgram(vs,fs); gl.useProgram(this.program);
      this.loc={pos:gl.getAttribLocation(this.program,'aPos'),normal:gl.getAttribLocation(this.program,'aNormal'),mvp:gl.getUniformLocation(this.program,'uMVP'),model:gl.getUniformLocation(this.program,'uModel'),color:gl.getUniformLocation(this.program,'uColor'),light:gl.getUniformLocation(this.program,'uLight'),camera:gl.getUniformLocation(this.program,'uCamera'),fogColor:gl.getUniformLocation(this.program,'uFogColor'),fog:gl.getUniformLocation(this.program,'uFog'),emissive:gl.getUniformLocation(this.program,'uEmissive')};
      this.meshes={cube:this.makeMesh(makeCubeData()),wedge:this.makeMesh(makeWedgeData())};
      for (const profile of Object.values(GRAPHICS_PROFILES)) {
        this.meshes[`sphere_${profile.key}`]=this.makeMesh(makeSphereData(profile.sphereLat,profile.sphereLon));
        this.meshes[`cylinder_${profile.key}`]=this.makeMesh(makeCylinderData(profile.cylinderSides));
        this.meshes[`cone_${profile.key}`]=this.makeMesh(makeConeData(profile.coneSides));
        this.meshes[`capsule_${profile.key}`]=this.makeMesh(makeCapsuleData(profile.capsuleRings,profile.capsuleSides));
        this.meshes[`crystal_${profile.key}`]=this.makeMesh(makeCrystalData(profile.crystalSides));
      }
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
      // The scene uses +Z as forward. Flip the projection's horizontal axis
      // and winding together so screen-left/screen-right match the Canvas
      // renderer and the A/D camera-relative movement basis.
      gl.frontFace(gl.CW);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      this.resize();
    }
    shader(type,src){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
    createProgram(vs,fs){const gl=this.gl,p=gl.createProgram();gl.attachShader(p,this.shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,this.shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
    makeMesh(d){const gl=this.gl;const mesh={count:d.idx.length};mesh.pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.p),gl.STATIC_DRAW);mesh.nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.n),gl.STATIC_DRAW);mesh.ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(d.idx),gl.STATIC_DRAW);return mesh;}
    resize(){const compat=!!activeAccount().settings.compatibilityMode,scale=compat?Math.min(.9,activeAccount().settings.renderScale||.85):(activeAccount().settings.renderScale||1),dpr=Math.min(devicePixelRatio||1,compat?1.1:(activeAccount().settings.quality==='high'?1.75:1.35));const w=Math.max(2,Math.floor(this.canvas.clientWidth*dpr*scale)),h=Math.max(2,Math.floor(this.canvas.clientHeight*dpr*scale));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}
    begin(camera){this.resize();const gl=this.gl,sky=hexColor(world?.map?.skyTop||'#59a8d1');gl.clearColor(sky[0],sky[1],sky[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.camera=camera;this.view=M4.lookAt(camera.eye,camera.target);this.proj=M4.perspective(camera.fov*Math.PI/180,this.canvas.width/this.canvas.height,.05,150);this.proj[0]*=-1;gl.useProgram(this.program);gl.uniform3f(this.loc.light,-.4,-1,-.25);gl.uniform3fv(this.loc.camera,camera.eye);gl.uniform3f(this.loc.fogColor,.52,.75,.78);gl.uniform1f(this.loc.fog,activeAccount().settings.fogEnabled?.012:0);}
    draw(meshName,x,y,z,sx,sy,sz,color,ry=0,rx=0,rz=0,emissive=0){const gl=this.gl,profile=graphicsProfile(),fixed=meshName==='cube'||meshName==='wedge',mesh=this.meshes[fixed?meshName:`${meshName}_${profile.key}`];const model=M4.compose(x,y,z,sx,sy,sz,ry,rx,rz),mvp=M4.multiply(this.proj,M4.multiply(this.view,model));gl.uniformMatrix4fv(this.loc.model,false,model);gl.uniformMatrix4fv(this.loc.mvp,false,mvp);const c=Array.isArray(color)?color:hexColor(color);gl.uniform4fv(this.loc.color,c);gl.uniform1f(this.loc.emissive,emissive);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.enableVertexAttribArray(this.loc.pos);gl.vertexAttribPointer(this.loc.pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.enableVertexAttribArray(this.loc.normal);gl.vertexAttribPointer(this.loc.normal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);}
    end(){}
  }

  class SoftwareRenderer {
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('Canvas 2D unavailable');this.commands=[];this.mode='canvas';this.resize();}
    resize(){const scale=Math.min(.8,activeAccount().settings.renderScale||.7),dpr=Math.min(devicePixelRatio||1,1);const w=Math.max(320,Math.floor(this.canvas.clientWidth*dpr*scale)),h=Math.max(200,Math.floor(this.canvas.clientHeight*dpr*scale));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}}
    begin(camera){this.resize();this.camera=camera;this.commands=[];const c=this.ctx,w=this.canvas.width,h=this.canvas.height,map=world?.map||{},sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,map.skyTop||'#68b7df');sky.addColorStop(.58,map.skyHorizon||'#9bd7d4');sky.addColorStop(.581,map.ground||'#68bd82');sky.addColorStop(1,map.groundShadow||'#397758');c.fillStyle=sky;c.fillRect(0,0,w,h);const f=this.norm([camera.target[0]-camera.eye[0],camera.target[1]-camera.eye[1],camera.target[2]-camera.eye[2]]);let r=this.norm([f[2],0,-f[0]]);if(Math.hypot(...r)<.1)r=[1,0,0];const u=this.norm([f[1]*r[2]-f[2]*r[1],f[2]*r[0]-f[0]*r[2],f[0]*r[1]-f[1]*r[0]]);this.basis={f,r,u};this.focal=(h*.5)/Math.tan(camera.fov*Math.PI/360);}
    norm(v){const l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l];}
    project(x,y,z){const d=[x-this.camera.eye[0],y-this.camera.eye[1],z-this.camera.eye[2]],b=this.basis,depth=d[0]*b.f[0]+d[1]*b.f[1]+d[2]*b.f[2];if(depth<.08)return null;const px=d[0]*b.r[0]+d[1]*b.r[1]+d[2]*b.r[2],py=d[0]*b.u[0]+d[1]*b.u[1]+d[2]*b.u[2];return{x:this.canvas.width/2+px*this.focal/depth,y:this.canvas.height/2-py*this.focal/depth,depth,scale:this.focal/depth};}
    draw(mesh,x,y,z,sx,sy,sz,color,ry=0,rx=0,rz=0,emissive=0){if(sx>60&&sz>60)return;const p=this.project(x,y,z);if(!p)return;const c=Array.isArray(color)?color:hexColor(color);this.commands.push({mesh,p,sx,sy,sz,c,emissive,ry,rx,rz});}
    rgba(c,m=1){return `rgba(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)},${Math.max(0,Math.min(1,(c[3]??1)*m))})`;}
    roundedRect(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);}
    end(){const c=this.ctx;c.save();c.lineWidth=1;this.commands.sort((a,b)=>b.p.depth-a.p.depth);for(const o of this.commands){const s=o.p.scale,w=Math.max(1,o.sx*s),h=Math.max(1,o.sy*s),alpha=o.c[3]??1;if(w>this.canvas.width*3||h>this.canvas.height*3)continue;c.globalAlpha=Math.max(.08,alpha);c.fillStyle=this.rgba(o.c);c.strokeStyle='rgba(20,25,40,.28)';if(o.mesh==='sphere'){const q=graphicsProfile().key;c.beginPath();if(q==='low'){const sides=6;for(let i=0;i<sides;i++){const a=-Math.PI/2+i*Math.PI*2/sides,px=o.p.x+Math.cos(a)*w/2,py=o.p.y+Math.sin(a)*h/2;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();}else c.ellipse(o.p.x,o.p.y,w/2,h/2,0,0,Math.PI*2);c.fill();c.stroke();if(q==='high'){c.globalAlpha*=.18;c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.ellipse(o.p.x-w*.14,o.p.y-h*.15,w*.16,h*.11,-.35,0,Math.PI*2);c.fill();c.globalAlpha=Math.max(.08,alpha);c.fillStyle=this.rgba(o.c);}if(o.emissive){c.globalAlpha=.18;c.beginPath();c.ellipse(o.p.x,o.p.y,w*.75,h*.75,0,0,Math.PI*2);c.fill();}}else if(o.mesh==='cylinder'||o.mesh==='capsule'){c.beginPath();const radius=o.mesh==='capsule'?Math.min(w,h)*.48:graphicsProfile().key==='low'?Math.min(w,h)*.08:Math.min(w,h)*.35;this.roundedRect(c,o.p.x-w/2,o.p.y-h/2,w,h,radius);c.closePath();c.fill();c.stroke();}else if(o.mesh==='cone'){c.save();c.translate(o.p.x,o.p.y);c.rotate(-o.ry*.18);c.beginPath();c.moveTo(-w*.5,h*.5);c.lineTo(-w*.07,-h*.5);c.lineTo(w*.07,-h*.5);c.lineTo(w*.5,h*.5);c.closePath();c.fill();c.stroke();c.restore();}else if(o.mesh==='wedge'){c.save();c.translate(o.p.x,o.p.y);c.rotate(-o.ry*.18);c.beginPath();c.moveTo(-w*.5,h*.5);c.lineTo(-w*.5,-h*.5);c.lineTo(w*.5,h*.5);c.closePath();c.fill();c.stroke();c.restore();}else if(o.mesh==='crystal'){c.save();c.translate(o.p.x,o.p.y);c.rotate(-o.ry*.18);c.beginPath();c.moveTo(0,-h*.5);c.lineTo(w*.42,-h*.12);c.lineTo(w*.35,h*.22);c.lineTo(0,h*.5);c.lineTo(-w*.35,h*.22);c.lineTo(-w*.42,-h*.12);c.closePath();c.fill();c.stroke();c.restore();}else{c.save();c.translate(o.p.x,o.p.y);c.rotate(-o.ry*.18);c.beginPath();this.roundedRect(c,-w/2,-h/2,w,h,Math.min(w,h)*.12);c.closePath();c.fill();c.stroke();c.restore();}}c.restore();c.globalAlpha=1;}
  }
  let renderer = null, rendererMode = 'webgl';
  try { renderer = new Renderer(dom.gameCanvas); dom.rendererBadge.textContent = `WEBGL • ${graphicsProfile().label}`; } catch (e) {
    console.warn('WebGL unavailable; using Canvas fallback', e); rendererMode='canvas';
    try { const replacement=dom.gameCanvas.cloneNode(false); dom.gameCanvas.replaceWith(replacement); dom.gameCanvas=replacement; renderer=new SoftwareRenderer(dom.gameCanvas); dom.rendererBadge.textContent=`CANVAS FALLBACK • ${graphicsProfile().label}`; }
    catch (fallbackError) { console.error(fallbackError); dom.webglError.hidden=false; dom.rendererBadge.textContent='RENDERER FAILED'; }
  }

  document.documentElement.dataset.renderer = rendererMode;
  document.documentElement.dataset.chromebook = IS_CHROMEOS ? 'yes' : 'no';
  refreshGraphicsDescription(activeAccount().settings.quality);

  // -------------------- Match state and world generation --------------------
  let match = null;
  const MAP_VARIANTS = [
    {id:'pine-valley',name:'PINE VALLEY',assetPack:'ranger-grove',featureType:'pine-camp',featureName:'Ranger Grove',decorType:'pine-marker',skyTop:'#5ba9d2',skyHorizon:'#a5d9d1',ground:'#68bd82',groundShadow:'#397758',patchA:'#72c98d',patchB:'#63bb7e',treeA:'#4cae78',treeB:'#58bd7d',treeC:'#66ca89',rockA:'#8b91a1',rockB:'#a5a28f',grassA:'#4f8e4e',grassB:'#6a9c4f',pathA:'#a97a50',pathB:'#b5885b',treeChance:.72,scenery:44,minimap:['#4f7f4d','#7ca55e','#557c47','#63994f']},
    {id:'amber-junction',name:'AMBER JUNCTION',assetPack:'harvest-yard',featureType:'amber-silo',featureName:'Harvest Silo',decorType:'hay-bale',skyTop:'#d49a62',skyHorizon:'#efd59b',ground:'#9aa35d',groundShadow:'#646d3f',patchA:'#b3b66a',patchB:'#8e9a55',treeA:'#768f4a',treeB:'#8fa356',treeC:'#a7b969',rockA:'#9a8065',rockB:'#b19b78',grassA:'#87954c',grassB:'#b09a4d',pathA:'#a56f43',pathB:'#bd8450',treeChance:.48,scenery:48,minimap:['#7c7845','#aaa35b','#686d42','#a88b4f']},
    {id:'moonberry-marsh',name:'MOONBERRY MARSH',assetPack:'glowwater-dock',featureType:'marsh-dock',featureName:'Glowwater Dock',decorType:'marsh-reeds',skyTop:'#596b9f',skyHorizon:'#78c2bd',ground:'#4f8f82',groundShadow:'#2f625a',patchA:'#5aa596',patchB:'#477e76',treeA:'#397e70',treeB:'#4a9784',treeC:'#62af9b',rockA:'#617487',rockB:'#7e8c99',grassA:'#3f796d',grassB:'#658d73',pathA:'#6c6755',pathB:'#80745d',treeChance:.62,scenery:52,minimap:['#356c67','#629587','#3f756d','#628d84']},
    {id:'clover-highlands',name:'CLOVER HIGHLANDS',assetPack:'clover-windmill',featureType:'clover-windmill',featureName:'Clover Windmill',decorType:'wildflowers',skyTop:'#66b6db',skyHorizon:'#b8e2c8',ground:'#70b45e',groundShadow:'#3d7943',patchA:'#88ca70',patchB:'#5fa550',treeA:'#4a9b58',treeB:'#61b768',treeC:'#7acb7d',rockA:'#878c83',rockB:'#aaa993',grassA:'#4f944d',grassB:'#75a957',pathA:'#a98055',pathB:'#c09a68',treeChance:.58,scenery:40,minimap:['#4d8544','#83ae67','#5c8e4d','#78a760']},
    {id:'frostflower-ridge',name:'FROSTFLOWER RIDGE',assetPack:'crystal-outpost',featureType:'frost-crystal',featureName:'Crystal Outpost',decorType:'ice-shard',skyTop:'#738bb6',skyHorizon:'#c2e3e6',ground:'#729ba0',groundShadow:'#465f67',patchA:'#82afb0',patchB:'#648c93',treeA:'#4f7f7c',treeB:'#619591',treeC:'#78aaa5',rockA:'#8793a3',rockB:'#aab2b9',grassA:'#587f78',grassB:'#77948a',pathA:'#819098',pathB:'#9aa9ad',treeChance:.42,scenery:46,minimap:['#56777c','#86a3a3','#647f82','#92a9aa']},
    {id:'redwood-run',name:'REDWOOD RUN',assetPack:'redwood-gate',featureType:'redwood-gate',featureName:'Old Redwood Gate',decorType:'redwood-stump',skyTop:'#567e86',skyHorizon:'#a7c6a2',ground:'#718d62',groundShadow:'#3c5741',patchA:'#829e6d',patchB:'#637b57',treeA:'#467453',treeB:'#568b5d',treeC:'#6b9b6c',rockA:'#876f68',rockB:'#a28779',grassA:'#56754c',grassB:'#7d8151',pathA:'#795846',pathB:'#916b50',treeChance:.79,scenery:56,minimap:['#526848','#7d8d5e','#596b4d','#775f4d']}
  ];
  const COVER_LAYOUTS = [
    {
      rail:{x:-13,z:0,rot:0},
      cover:[
        {type:'train',x:-13,z:7,w:4.4,d:11.5,h:3.25,rot:0,color:'#a8443f'},
        {type:'train',x:-13,z:-7,w:4.4,d:11.5,h:3.25,rot:0,color:'#3f687d'},
        {type:'freight',x:14,z:13,w:4.2,d:8.8,h:2.7,rot:Math.PI/2,color:'#6f8050'},
        {type:'container',x:13,z:-13,w:5.6,d:2.7,h:2.5,rot:.08,color:'#b86b3e'},
        {type:'container',x:19,z:-13,w:5.6,d:2.7,h:2.5,rot:-.05,color:'#55738b'},
        {type:'cratewall',x:1,z:13,w:5.4,d:1.8,h:2.0,rot:.05,color:'#9b6c3f'},
        {type:'boulder',x:5,z:-5,w:3.0,d:2.6,h:2.1,rot:.35,color:'#596473'},
        {type:'boulder',x:-3,z:20,w:3.4,d:2.8,h:2.4,rot:-.2,color:'#626c78'}
      ]
    },
    {
      rail:{x:-15,z:2,rot:0},
      cover:[
        {type:'train',x:-15,z:9,w:4.4,d:10.5,h:3.25,rot:0,color:'#8f4c52'},
        {type:'train',x:-15,z:-5,w:4.4,d:10.5,h:3.25,rot:0,color:'#476d78'},
        {type:'freight',x:15,z:17,w:4.2,d:9.5,h:2.7,rot:Math.PI/2,color:'#7a7547'},
        {type:'container',x:16,z:-17,w:6.4,d:2.7,h:2.5,rot:0,color:'#a65e43'},
        {type:'container',x:9,z:-12,w:5.6,d:2.7,h:2.5,rot:Math.PI/2,color:'#426f81'},
        {type:'cratewall',x:3,z:15,w:5.4,d:1.8,h:2.0,rot:Math.PI/2,color:'#9b6c3f'},
        {type:'boulder',x:-4,z:-16,w:3.7,d:3.1,h:2.5,rot:.5,color:'#5f6672'},
        {type:'boulder',x:20,z:3,w:3.2,d:2.8,h:2.2,rot:-.4,color:'#6b7078'}
      ]
    },
    {
      rail:{x:-17,z:0,rot:Math.PI/2},
      cover:[
        {type:'train',x:-24,z:0,w:4.4,d:11.5,h:3.25,rot:Math.PI/2,color:'#a8443f'},
        {type:'train',x:-10,z:0,w:4.4,d:11.5,h:3.25,rot:Math.PI/2,color:'#3f687d'},
        {type:'freight',x:14,z:15,w:4.2,d:8.8,h:2.7,rot:0,color:'#6f8050'},
        {type:'container',x:17,z:-14,w:5.6,d:2.7,h:2.5,rot:Math.PI/2,color:'#b86b3e'},
        {type:'container',x:17,z:-8,w:5.6,d:2.7,h:2.5,rot:Math.PI/2,color:'#55738b'},
        {type:'cratewall',x:3,z:17,w:5.4,d:1.8,h:2.0,rot:0,color:'#9b6c3f'},
        {type:'boulder',x:-2,z:-9,w:3.2,d:2.7,h:2.2,rot:.15,color:'#596473'},
        {type:'boulder',x:21,z:6,w:3.5,d:3.0,h:2.5,rot:-.25,color:'#626c78'}
      ]
    },
    {
      rail:{x:-18,z:2,rot:0},
      cover:[
        {type:'train',x:-18,z:2,w:4.4,d:13.0,h:3.25,rot:0,color:'#91433f'},
        {type:'freight',x:11,z:19,w:4.2,d:9.2,h:2.7,rot:Math.PI/2,color:'#647b53'},
        {type:'freight',x:18,z:8,w:4.2,d:8.6,h:2.7,rot:0,color:'#6f6750'},
        {type:'container',x:12,z:-16,w:6.2,d:2.7,h:2.5,rot:.1,color:'#b86b3e'},
        {type:'container',x:19,z:-11,w:6.2,d:2.7,h:2.5,rot:Math.PI/2,color:'#55738b'},
        {type:'cratewall',x:-1,z:15,w:5.4,d:1.8,h:2.0,rot:-.08,color:'#9b6c3f'},
        {type:'cratewall',x:5,z:-9,w:5.4,d:1.8,h:2.0,rot:Math.PI/2,color:'#85603d'},
        {type:'boulder',x:-8,z:-17,w:4.0,d:3.2,h:2.6,rot:.4,color:'#626c78'}
      ]
    }
  ];
  const EXTRACT_POINTS = [[24,24],[26,-23],[-25,24],[-26,-22],[31,7],[-30,-8],[8,31],[-8,-31]];
  const PROCEDURAL_LAYOUT_NAMES = ['CROSSROADS','CRESCENT','SWITCHBACK','OUTPOST','TWIN TRAILS','BROKEN YARD','RIDGELINE','WILDS'];
  const SPAWN_CANDIDATES = [[-27,-25],[27,-25],[-27,25],[27,25],[0,-29],[-29,0],[29,0],[0,29]];
  const COVER_ARCHETYPES = [
    {type:'container',w:5.8,d:2.7,h:2.5,color:'#b86b3e'},
    {type:'container',w:5.4,d:2.7,h:2.5,color:'#55738b'},
    {type:'freight',w:4.2,d:8.4,h:2.7,color:'#6f8050'},
    {type:'cratewall',w:5.4,d:1.8,h:2.0,color:'#9b6c3f'},
    {type:'boulder',w:3.2,d:2.8,h:2.3,color:'#626c78'}
  ];
  const seededId = (kind,index,seed) => `${kind}-${(seed>>>0).toString(16).padStart(8,'0')}-${index}`;
  function segmentDistance2D(x,z,a,b){
    const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz||1,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/den,0,1);
    return Math.hypot(x-(a.x+dx*t),z-(a.z+dz*t));
  }
  function routeDistance(x,z,route=world.route||[]){
    let best=Infinity;
    for(let i=1;i<route.length;i++)best=Math.min(best,segmentDistance2D(x,z,route[i-1],route[i]));
    return best;
  }
  function pointBlockedByWorld(x,z,radius=.55,includeChests=false){
    for(const c of world.cover||[]){const q=coverLocalPoint(x,z,c);if(Math.abs(q.x)<c.w*.5+radius&&Math.abs(q.z)<c.d*.5+radius)return true;}
    for(const b of world.blockers||[]){
      if(b.type==='circle'){if(Math.hypot(x-b.x,z-b.z)<(b.r||.7)+radius)return true;}
      else {const q=coverLocalPoint(x,z,b);if(Math.abs(q.x)<b.w*.5+radius&&Math.abs(q.z)<b.d*.5+radius)return true;}
    }
    for(const o of world.statics||[]){const rr=(o.type==='tree'?.7:.82)*(o.s||1)+radius;if(Math.hypot(x-o.x,z-o.z)<rr)return true;}
    if(includeChests)for(const ch of world.chests||[]){if(!ch.opened&&Math.hypot(x-ch.x,z-ch.z)<.58+radius)return true;}
    return false;
  }
  function pointClearForProp(x,z,padding=1.4,allowRoute=false){
    const spawn=world.spawn||{x:0,z:0},extract=world.extract||{x:24,z:24};
    if(Math.abs(x)>37||Math.abs(z)>37)return false;
    if(Math.hypot(x-spawn.x,z-spawn.z)<8.5+padding*.2||Math.hypot(x-extract.x,z-extract.z)<5.6+padding*.2)return false;
    if(!allowRoute&&routeDistance(x,z)<3.0+padding)return false;
    return !pointBlockedByWorld(x,z,padding);
  }
  function findWorldPath(start,end,radius=.62){
    const min=-38,step=2,count=39,toCell=v=>clamp(Math.round((v-min)/step),0,count-1),sx=toCell(start.x),sz=toCell(start.z),ex=toCell(end.x),ez=toCell(end.z);
    const key=(x,z)=>z*count+x,queue=[[sx,sz]],seen=new Set([key(sx,sz)]),parents=new Map(),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    const blocked=(gx,gz)=>{
      if(gx<0||gz<0||gx>=count||gz>=count)return true;
      if((gx===sx&&gz===sz)||(gx===ex&&gz===ez))return false;
      return pointBlockedByWorld(min+gx*step,min+gz*step,radius);
    };
    while(queue.length){
      const [x,z]=queue.shift();
      if(x===ex&&z===ez){
        const path=[];let k=key(x,z),cell=[x,z];
        while(cell){path.push({x:min+cell[0]*step,z:min+cell[1]*step});const prev=parents.get(k);if(!prev)break;cell=prev;k=key(cell[0],cell[1]);}
        return path.reverse();
      }
      for(const [dx,dz] of dirs){
        const nx=x+dx,nz=z+dz,nk=key(nx,nz);
        if(seen.has(nk)||blocked(nx,nz))continue;
        if(dx&&dz&&(blocked(x+dx,z)||blocked(x,z+dz)))continue;
        seen.add(nk);parents.set(nk,[x,z]);queue.push([nx,nz]);
      }
    }
    return null;
  }
  function reachableFromSpawn(point){return !!findWorldPath(world.spawn||{x:0,z:0},point);}
  function reachableNear(point,radius=0){
    if(reachableFromSpawn(point))return true;
    const ring=Math.max(1.15,Number(radius||0)*.72);
    for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:point.x+Math.sin(a)*ring,z:point.z+Math.cos(a)*ring};if(!pointBlockedByWorld(q.x,q.z,.62)&&reachableFromSpawn(q))return true;}
    return false;
  }
  function routePointAt(t){
    const route=world.route||[];if(route.length<2)return {...(world.spawn||{x:0,z:0})};
    const lengths=[],total=route.slice(1).reduce((sum,p,i)=>{const n=Math.hypot(p.x-route[i].x,p.z-route[i].z);lengths.push(n);return sum+n;},0)||1;
    let target=clamp(t,0,1)*total;
    for(let i=0;i<lengths.length;i++){if(target<=lengths[i]){const q=target/(lengths[i]||1);return{x:lerp(route[i].x,route[i+1].x,q),z:lerp(route[i].z,route[i+1].z,q)};}target-=lengths[i];}
    return {...route[route.length-1]};
  }
  function validateWorldPlayability(){
    const landmarks=world.landmarks||[],chests=world.chests||[],pickups=world.pickups||[],enemies=world.enemies||[],spawnPoints=world.spawnPoints||[];
    const report={seed:world.seed,spawnPointsTotal:spawnPoints.length,spawnPointsClear:0,spawnClear:true,extractReachable:false,landmarksTotal:landmarks.length,landmarksReachable:0,chestsTotal:chests.length,chestsReachable:0,pickupsTotal:pickups.length,pickupsReachable:0,enemiesTotal:enemies.length,enemiesReachable:0,entitiesInBounds:true,relocated:0,valid:false};
    const setPosition=(obj,x,z)=>{obj.x=clamp(x,-36.5,36.5);obj.z=clamp(z,-36.5,36.5);if('homeX'in obj){obj.homeX=obj.x;obj.homeZ=obj.z;}report.relocated++;};
    const relocate=(obj,index,minT=.12,maxT=.86,radius=.68)=>{
      if(!obj||reachableNear(obj,obj.r||0))return true;
      for(let tries=0;tries<24;tries++){
        const q=routePointAt(lerp(minT,maxT,((index+tries*5)%29)/28)),a=(index*2.399+tries)*1.7,spread=1.2+(tries%5)*.72,x=q.x+Math.sin(a)*spread,z=q.z+Math.cos(a)*spread;
        if(pointBlockedByWorld(x,z,radius)||!reachableFromSpawn({x,z}))continue;
        setPosition(obj,x,z);return true;
      }
      for(let tries=0;tries<20;tries++){
        const q=routePointAt(lerp(minT,maxT,((index+tries*7)%23)/22)),a=(index+tries)*1.91,x=q.x+Math.sin(a)*.85,z=q.z+Math.cos(a)*.85;
        if(pointBlockedByWorld(x,z,radius))continue;
        setPosition(obj,x,z);return reachableNear(obj,obj.r||0);
      }
      const q=routePointAt(lerp(minT,maxT,((index%17)+.5)/17));setPosition(obj,q.x,q.z);return reachableNear(obj,obj.r||0);
    };
    for(const [i,p] of spawnPoints.entries()){
      if(pointBlockedByWorld(p.x,p.z,.48)){
        let fixed=false;
        for(let ring=0;ring<4&&!fixed;ring++)for(let step=0;step<16&&!fixed;step++){
          const a=step*Math.PI/8,d=.8+ring*.7,x=world.spawn.x+Math.sin(a)*d,z=world.spawn.z+Math.cos(a)*d;
          if(!pointBlockedByWorld(x,z,.48)){setPosition(p,x,z);fixed=true;}
        }
        if(!fixed){const q=routePointAt(.02+i*.008);setPosition(p,q.x,q.z);}
      }
      if(!pointBlockedByWorld(p.x,p.z,.48))report.spawnPointsClear++;
    }
    report.spawnClear=report.spawnPointsClear===report.spawnPointsTotal;
    for(const [i,lm] of landmarks.entries()){relocate(lm,i,.16,.82,.72);if(reachableNear(lm,lm.r||0))report.landmarksReachable++;}
    for(const [i,ch] of chests.entries()){relocate(ch,i,.10,.90,.68);if(reachableNear(ch,.72))report.chestsReachable++;}
    for(const [i,pu] of pickups.entries()){relocate(pu,i,.08,.92,.38);if(reachableNear(pu,.35))report.pickupsReachable++;}
    for(const [i,e] of enemies.entries()){relocate(e,i,e.training?.12:.18,e.training?.24:.88,.72);if(reachableNear(e,.7))report.enemiesReachable++;}
    const allEntities=[...spawnPoints,world.extract,...landmarks,...chests,...pickups,...enemies].filter(Boolean);
    report.entitiesInBounds=allEntities.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.z)&&Math.abs(o.x)<=39&&Math.abs(o.z)<=39);
    report.extractReachable=reachableNear(world.extract,2.4);
    report.valid=report.spawnClear&&report.extractReachable&&report.landmarksReachable===report.landmarksTotal&&report.chestsReachable===report.chestsTotal&&report.pickupsReachable===report.pickupsTotal&&report.enemiesReachable===report.enemiesTotal&&report.entitiesInBounds;
    world.validation=report;
    return report;
  }
  const CONTRACT_TEMPLATES = [
    {id:'raider-hunt',title:'Raider Hunt',type:'kills',target:3,description:'Defeat 3 raiders'},
    {id:'clean-sweep',title:'Clean Sweep',type:'kills',target:5,description:'Defeat 5 raiders'},
    {id:'supply-scout',title:'Supply Scout',type:'chests',target:3,description:'Open 3 supply crates'},
    {id:'deep-search',title:'Deep Search',type:'chests',target:5,description:'Open 5 supply crates'},
    {id:'trail-patrol',title:'Trail Patrol',type:'landmarks',target:2,description:'Visit 2 landmarks'},
    {id:'grand-tour',title:'Grand Tour',type:'landmarks',target:4,description:'Visit 4 landmarks'},
    {id:'hold-the-line',title:'Hold the Line',type:'survive',target:90,description:'Survive for 90 seconds'},
    {id:'long-haul',title:'Long Haul',type:'survive',target:150,description:'Survive for 150 seconds'},
    {id:'sharp-paws',title:'Sharp Paws',type:'headshots',target:2,description:'Get 2 headshot eliminations'},
    {id:'valuable-cargo',title:'Valuable Cargo',type:'value',target:650,description:'Carry 650 petals of loot'},
    {id:'moonberry-haul',title:'Moonberry Haul',type:'berries',target:8,description:'Carry 8 Moonberries'},
    {id:'armory-recovery',title:'Armory Recovery',type:'gear',target:1,description:'Recover a weapon or armor piece'}
  ];
  let world = { statics: [], cover: [], blockers: [], enemies: [], pickups: [], chests: [], effects: [], safeZones: [{x:0,z:0,r:8.5,label:'Rookie Camp',kind:'spawn'}], landmarks:[], spawn:{x:0,z:0}, spawnPoints:[], route:[], extract: { x: 24, z: 24 }, map:MAP_VARIANTS[0], seed: 1, validation:null };
  let players = {};
  const input = { keys: new Set(), fire: false, fireQueued: 0, aim: false, interact: false, shotSeq: 0, jumpSeq: 0, useSeq: 0, reloadSeq: 0, healSeq: 0 };
  let lastFrame = performance.now(), cameraMode = 'third', shoulderSide = 1, cameraRigEye = null, cameraRigTime = performance.now(), paused = false, pauseMenuOpen = false, pauseSubmenuOpen = false, extracting = 0, currentInteract = null, lastShotDebug = null;
  let guestInputs = Object.create(null), lastGuestShots = Object.create(null), localPlayerId = 'host';
  function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  function randRange(r, a, b) { return a + (b - a) * r(); }
  function mapPoint(x,z,map){
    const mx=x*(map.mirror||1),co=Math.cos(map.rotation||0),si=Math.sin(map.rotation||0);
    return {x:mx*co+z*si,z:-mx*si+z*co};
  }
  function mapAngle(angle,map){return (map.rotation||0)+((map.mirror||1)<0?-angle:angle);}
  function mapObject(obj,map){const p=mapPoint(obj.x,obj.z,map);return {...obj,...p,rot:mapAngle(obj.rot||0,map)};}
  function makeContract(template){return {...template,done:false,announced:false};}
  function chooseContracts(seed,coop=false){
    const pool=coop?CONTRACT_TEMPLATES.filter(q=>['kills','chests','landmarks','survive','headshots'].includes(q.type)):CONTRACT_TEMPLATES;
    const primaryIndex=(seed>>>3)%pool.length;
    let bonusIndex=(seed>>>17)%pool.length;
    if(bonusIndex===primaryIndex||pool[bonusIndex].type===pool[primaryIndex].type)bonusIndex=(primaryIndex+3+(seed%3))%pool.length;
    return {primary:makeContract(pool[primaryIndex]),bonus:makeContract(pool[bonusIndex])};
  }
  function updateMapHUD(){
    if(!world.map)return;
    if(dom.minimapTitle)dom.minimapTitle.textContent=world.map.name;
    if(dom.minimapMap){
      const colors=world.map.minimap||MAP_VARIANTS[0].minimap;
      ['--map-a','--map-b','--map-c','--map-landmark'].forEach((key,i)=>dom.minimapMap.style.setProperty(key,colors[i]));
    }
    if(dom.minimapExtract){dom.minimapExtract.style.left=`${clamp(50+world.extract.x/80*100,5,95)}%`;dom.minimapExtract.style.top=`${clamp(50+world.extract.z/80*100,5,95)}%`;}
    const rail=world.map.rail;
    const mapDegrees=(world.map.rotation||0)*180/Math.PI,mirror=(world.map.mirror||1)<0?-1:1;
    if(dom.minimapRoadA)dom.minimapRoadA.style.transform=`rotate(${mapDegrees+mirror*-22}deg)`;
    if(dom.minimapRoadB)dom.minimapRoadB.style.transform=`rotate(${mapDegrees+mirror*68}deg)`;
    if(dom.minimapRail&&rail){
      const degrees=rail.rot*180/Math.PI;
      dom.minimapRail.style.left=`${clamp(50+rail.x/80*100,8,92)}%`;
      dom.minimapRail.style.top=`${clamp(50+rail.z/80*100,8,92)}%`;
      dom.minimapRail.style.width='82%';
      dom.minimapRail.style.transform=`translate(-50%,-50%) rotate(${90-degrees}deg)`;
      dom.minimapRail.style.transformOrigin='center';
    }
  }
  function createPlayer(id, x, z, profile, remote = false) {
    const loadoutId = LOADOUTS[profile?.loadoutId] ? profile.loadoutId : defaultLoadoutId;
    const kit = LOADOUTS[loadoutId], weaponId = WEAPONS[profile?.equippedWeaponId] ? profile.equippedWeaponId : kit.weapon, armorId = ARMORS[profile?.equippedArmorId] ? profile.equippedArmorId : kit.armorId;
    const weapon = WEAPONS[weaponId], armor = ARMORS[armorId];
    return { id, x, y: .9, z, yaw: 0, pitch: -.08, velocityY: 0, grounded: true, lastJumpSeq: 0, cameraMode:profile?.settings?.cameraMode||'third', shoulderSide:profile?.settings?.shoulderSide==='left'?-1:1, hp: 100, maxShield: armor.shield, shield: armor.shield, armorId, alive: true, speed: kit.speed + armor.speedMod, speedBoost: 0, weaponId, mag: weapon.mag, reload: 0, cooldown: 0, kills: 0, remote, profile: { displayName: profile.displayName, username: profile.username || '', avatar: safeAvatar(profile.avatar), appearance: profile.appearance || activeAccount().appearance, loadoutId, equippedWeaponId: weaponId, equippedArmorId: armorId }, invuln: 0, spawnProtection: 3, walkTime: 0, moveBlend: 0, weaponKick: 0, muzzleFlash: 0, crouch: 0 };
  }
  function generateWorld(seed) {
    const normalizedSeed=seed>>>0,r=seeded(normalizedSeed),variantIndex=((normalizedSeed^(normalizedSeed>>>16))>>>0)%MAP_VARIANTS.length,variant=MAP_VARIANTS[variantIndex];
    const layoutName=PROCEDURAL_LAYOUT_NAMES[(normalizedSeed>>>6)%PROCEDURAL_LAYOUT_NAMES.length];
    const map={...variant,baseName:variant.name,name:`${variant.name} • ${layoutName}`,layoutName,seedCode:normalizedSeed.toString(16).padStart(8,'0').toUpperCase(),rotation:((normalizedSeed>>>9)%4)*Math.PI/2,mirror:((normalizedSeed>>>11)&1)?-1:1,layoutIndex:(normalizedSeed>>>5)%10000};
    const spawnBase=mapPoint(...SPAWN_CANDIDATES[(normalizedSeed>>>2)%SPAWN_CANDIDATES.length],map);
    const extractChoices=EXTRACT_POINTS.map(([x,z])=>mapPoint(x,z,map)).filter(p=>Math.hypot(p.x-spawnBase.x,p.z-spawnBase.z)>48);
    const extract=extractChoices[Math.floor(r()*extractChoices.length)]||mapPoint(...EXTRACT_POINTS[(normalizedSeed>>>13)%EXTRACT_POINTS.length],map);
    const dx=extract.x-spawnBase.x,dz=extract.z-spawnBase.z,len=Math.hypot(dx,dz)||1,perp={x:-dz/len,z:dx/len};
    const bend1=randRange(r,-11.5,11.5),bend2=randRange(r,-11.5,11.5);
    const route=[
      {x:spawnBase.x,z:spawnBase.z},
      {x:clamp(spawnBase.x+dx*.34+perp.x*bend1,-31,31),z:clamp(spawnBase.z+dz*.34+perp.z*bend1,-31,31)},
      {x:clamp(spawnBase.x+dx*.68+perp.x*bend2,-31,31),z:clamp(spawnBase.z+dz*.68+perp.z*bend2,-31,31)},
      {x:extract.x,z:extract.z}
    ];
    world={statics:[],cover:[],blockers:[],enemies:[],pickups:[],chests:[],effects:[],safeZones:[{x:spawnBase.x,z:spawnBase.z,r:8.5,label:'Rookie Camp',kind:'spawn'},{x:extract.x,z:extract.z,r:4.8,label:'Extraction Platform',kind:'extract'}],landmarks:[],spawn:{x:spawnBase.x,z:spawnBase.z},spawnPoints:[],route,extract,map,seed:normalizedSeed,validation:null};
    map.paths=[route];
    map.tileOffsetX=randRange(r,-4,4);map.tileOffsetZ=randRange(r,-4,4);
    map.terrainPatches=Array.from({length:22},(_,i)=>({x:randRange(r,-35,35),z:randRange(r,-35,35),w:randRange(r,5,13),d:randRange(r,4,11),rot:randRange(r,0,Math.PI),color:i%3===0?map.groundShadow:i%2?map.patchA:map.patchB,alpha:i%3===0?.42:.62}));

    const activeWeaponForLoot = WEAPONS[activeAccount().equippedWeaponId] || WEAPONS[selectedLoadout().weapon] || WEAPONS.pea_popper;
    const activeAmmo = activeWeaponForLoot.ammoItem;
    const boxFits=(obj,padding=.8)=>pointClearForProp(obj.x,obj.z,Math.max(obj.w,obj.d)*.52+padding,false);
    const fallbackPosition=(proto,offset=0)=>{
      const cells=[];for(let x=-31;x<=31;x+=5)for(let z=-31;z<=31;z+=5)cells.push({x,z});
      for(let i=0;i<cells.length;i++){const q=cells[(i+offset)%cells.length],obj={...proto,x:q.x,z:q.z,rot:((i+offset)%4)*Math.PI/2};if(boxFits(obj,.6))return obj;}
      return null;
    };
    const placeBox=(proto,target='cover',attempts=120,offset=0)=>{
      let obj=null;
      for(let i=0;i<attempts&&!obj;i++){
        const candidate={...proto,x:randRange(r,-32,32),z:randRange(r,-32,32),rot:Math.floor(r()*8)*Math.PI/4};
        if(boxFits(candidate,.7))obj=candidate;
      }
      obj=obj||fallbackPosition(proto,offset);
      if(obj)(target==='cover'?world.cover:world.blockers).push(obj);
      return obj;
    };

    let rail=null;
    for(let attempts=0;attempts<80&&!rail;attempts++){
      const rot=Math.floor(r()*4)*Math.PI/2,q={x:randRange(r,-25,25),z:randRange(r,-25,25),rot},front=[Math.sin(rot),Math.cos(rot)];
      const a={type:'train',x:q.x+front[0]*7,z:q.z+front[1]*7,w:4.4,d:10.5,h:3.25,rot,color:'#a8443f'};
      const b={type:'train',x:q.x-front[0]*7,z:q.z-front[1]*7,w:4.4,d:10.5,h:3.25,rot,color:'#3f687d'};
      if(boxFits(a,1.0)&&boxFits(b,1.0)){rail=q;world.cover.push(a,b);}
    }
    if(!rail){rail={x:0,z:0,rot:Math.PI/2};placeBox({type:'train',w:4.4,d:10.5,h:3.25,color:'#a8443f'},'cover',120,3);}
    map.rail=rail;

    const extraCover=10+Math.floor(r()*6);
    for(let i=0;i<extraCover;i++){const base=COVER_ARCHETYPES[Math.floor(r()*COVER_ARCHETYPES.length)];placeBox({...base,color:i%4===0?map.pathA:base.color},'cover',100,i*7);}
    const barn=placeBox({type:'box',label:'Field Barn',w:5.75,d:4.75,h:3.5,color:'#8e4d3f'},'blocker',160,17);
    const tower=placeBox({type:'box',label:'Watchtower',w:2.25,d:2.25,h:4.8,color:'#59657b'},'blocker',160,31);
    if(!barn||!tower)throw new Error('Procedural structure placement failed');

    const campCrates=[];
    for(let i=0;i<4+Math.floor(r()*4);i++){const crate=placeBox({type:'box',label:'Camp Cache',w:1.65,d:1.65,h:1.1,color:'#a66f42'},'blocker',90,41+i*5);if(crate)campCrates.push(crate);}
    const pines=[];
    for(let i=0;i<6+Math.floor(r()*5);i++){
      for(let tries=0;tries<50;tries++){const x=randRange(r,-34,34),z=randRange(r,-34,34),s=randRange(r,.85,1.3);if(!pointClearForProp(x,z,.9*s,false))continue;const p={x,z,s};pines.push(p);world.blockers.push({type:'circle',label:'Pine',x,z,r:.62*s});break;}
    }
    const cliffs=[];
    for(let i=0;i<7;i++){const side=i%4,a=randRange(r,-32,32),edge=36+randRange(r,-1.5,1.5),x=side===0?-edge:side===1?edge:a,z=side===2?-edge:side===3?edge:a;cliffs.push({x,z,s:randRange(r,2.3,3.5)});}
    map.barn=barn;map.tower=tower;map.campCrates=campCrates;map.decorativePines=pines;map.cliffs=cliffs;

    let feature=null;
    for(let attempts=0;attempts<100&&!feature;attempts++){const x=randRange(r,-32,32),z=randRange(r,-32,32);if(pointClearForProp(x,z,3.2,false))feature={x,z,type:map.featureType,label:map.featureName,rot:Math.floor(r()*8)*Math.PI/4,s:randRange(r,.88,1.12)};}
    feature=feature||{...routePointAt(.76),type:map.featureType,label:map.featureName,rot:0,s:1};
    map.feature=feature;
    const featureRadius=feature.type==='redwood-gate'?2.8:feature.type==='marsh-dock'?2.4:2.1;
    world.blockers.push({type:'circle',label:feature.label,x:feature.x,z:feature.z,r:featureRadius});

    map.themeDecor=[];
    for(let i=0;i<12;i++){for(let tries=0;tries<40;tries++){const x=randRange(r,-35,35),z=randRange(r,-35,35);if(!pointClearForProp(x,z,.8,false))continue;map.themeDecor.push({x,z,type:map.decorType,rot:randRange(r,0,Math.PI*2),s:randRange(r,.72,1.22)});break;}}

    const firstTrain=world.cover.find(c=>c.type==='train')||rail;
    world.landmarks=[
      {id:'barn',label:'Field Barn',x:barn.x,z:barn.z,r:5.4},
      {id:'tower',label:'Watchtower',x:tower.x,z:tower.z,r:4.5},
      {id:'rail-yard',label:'Rail Yard',x:firstTrain.x,z:firstTrain.z,r:6},
      {id:'region-feature',label:feature.label,x:feature.x,z:feature.z,r:5.2},
      {id:'beacon',label:'Extraction Beacon',x:extract.x,z:extract.z,r:7}
    ];

    for(let attempts=0;world.statics.length<map.scenery&&attempts<map.scenery*35;attempts++){
      const x=randRange(r,-37,37),z=randRange(r,-37,37);if(!pointClearForProp(x,z,1.0,false))continue;
      if(world.statics.some(o=>Math.hypot(x-o.x,z-o.z)<1.9))continue;
      world.statics.push({type:r()<map.treeChance?'tree':'rock',x,z,s:randRange(r,.68,1.48),rot:randRange(r,0,Math.PI*2),hue:r()});
    }

    const heading=Math.atan2(route[1].x-spawnBase.x,route[1].z-spawnBase.z),right={x:Math.cos(heading),z:-Math.sin(heading)},forward={x:Math.sin(heading),z:Math.cos(heading)};
    const spawnOffsets=[[-2.2,.1],[-.72,-1.55],[.72,-1.55],[2.2,.1]];
    world.spawnPoints=spawnOffsets.map(([side,back])=>({x:spawnBase.x+right.x*side+forward.x*back,z:spawnBase.z+right.z*side+forward.z*back}));

    const randomEntityPoint=(minSpawn=10,padding=.7,minGap=0,list=[])=>{
      for(let attempts=0;attempts<180;attempts++){const x=randRange(r,-34,34),z=randRange(r,-34,34);if(Math.hypot(x-spawnBase.x,z-spawnBase.z)<minSpawn||!pointClearForProp(x,z,padding,true))continue;if(list.some(o=>Math.hypot(x-o.x,z-o.z)<minGap))continue;return{x,z};}
      const q=routePointAt(randRange(r,.18,.84));return{x:q.x+randRange(r,-2.4,2.4),z:q.z+randRange(r,-2.4,2.4)};
    };

    const diff=activeAccount().settings.difficulty,enemyCount=diff==='cozy'?6:diff==='spicy'?11:8;
    const roster=(window.HARLEYS_GAME_ASSETS?.enemyRoster||[
      {species:'fox',body:'#e98b4c',accent:'#fff0d9',weaponId:'acorn_sprayer'},
      {species:'raccoon',body:'#8f98a3',accent:'#353846',weaponId:'pea_popper'},
      {species:'kitty',body:'#9ca7b5',accent:'#465266',weaponId:'honey_carbine'},
      {species:'bear',body:'#a36f4c',accent:'#6b4432',weaponId:'carrot_scatter'}
    ]);
    for(let i=0;i<enemyCount;i++){
      const q=randomEntityPoint(11,.72,4.2,world.enemies),look=roster[Math.floor(r()*roster.length)],tough=r()>.72;
      world.enemies.push({id:seededId('enemy',i,normalizedSeed),type:'raider',species:look.species,body:look.body,accent:look.accent,weaponId:look.weaponId,x:q.x,y:.9,z:q.z,homeX:q.x,homeZ:q.z,patrolTarget:null,patrolWait:randRange(r,.2,1.6),patrolSeed:r()*20,yaw:r()*Math.PI*2,hp:tough?82:58,maxHp:tough?82:58,speed:tough?1.38:1.58,attack:0,bob:r()*6,walkTime:r()*6,alive:true});
    }
    const training=routePointAt(.16);
    world.enemies.unshift({id:seededId('training',0,normalizedSeed),type:'raider',species:'raccoon',body:'#8f98a3',accent:'#353846',weaponId:'pea_popper',x:training.x,y:.9,z:training.z,yaw:heading+Math.PI,hp:70,maxHp:70,speed:0,attack:999,bob:0,walkTime:0,alive:true,training:true});
    for(const enemy of world.enemies)enemy.hp=enemy.maxHp;

    const chestTarget=16+(normalizedSeed%4);
    for(let placed=0;placed<chestTarget;placed++){
      const q=randomEntityPoint(8.8,.6,3.1,world.chests),loot=emptySlots(15),rolls=3+Math.floor(r()*4);
      for(let j=0;j<rolls;j++){const n=r(),id=n<.25?'moonberry':n<.45?activeAmmo:n<.61?'scrap':n<.74?'bandage':n<.84?'shield_pod':n<.91?'armor_plate':n<.97?'zoomberry':'crystal';addItem(loot,id,ITEMS[id].ammo?12+Math.floor(r()*22):1+Math.floor(r()*2));}
      if(placed===0||r()<.30)addItem(loot,WEAPON_ITEM_IDS[Math.floor(r()*WEAPON_ITEM_IDS.length)],1);
      if(placed===1||r()<.40)addItem(loot,ARMOR_ITEM_IDS[Math.floor(r()*ARMOR_ITEM_IDS.length)],1);
      world.chests.push({id:seededId('chest',placed,normalizedSeed),kind:'supply',ownerName:'Meadow Supply Crate',x:q.x,z:q.z,opened:false,loot});
    }
    for(let i=0;i<9;i++){const q=randomEntityPoint(7.5,.32,2.4,world.pickups);world.pickups.push({id:seededId('pickup',i,normalizedSeed),x:q.x,y:.45,z:q.z,item:{id:i===8?'crystal':'moonberry',qty:1},spin:r()*6});}

    const validation=validateWorldPlayability();
    if(!validation.valid){
      world.statics=world.statics.filter(o=>routeDistance(o.x,o.z)>4.4);
      world.cover=world.cover.filter(c=>routeDistance(c.x,c.z)>Math.max(c.w,c.d)*.42+3.1);
      validateWorldPlayability();
    }
    updateMapHUD();
  }
  function questProgress(quest){
    if(!quest||!match)return 0;
    const metrics=match.metrics||{},teamKills=Object.values(players).reduce((sum,p)=>sum+(Number(p.kills)||0),0);
    if(quest.type==='kills')return teamKills;
    if(quest.type==='chests')return Number(metrics.chestsOpened)||0;
    if(quest.type==='landmarks')return Array.isArray(metrics.landmarksVisited)?metrics.landmarksVisited.length:0;
    if(quest.type==='survive')return Math.floor(Number(match.elapsed)||0);
    if(quest.type==='headshots')return Number(metrics.headshotKills)||0;
    if(quest.type==='value')return Math.floor(inventoryValue(backpack));
    if(quest.type==='berries')return countItem(backpack,'moonberry');
    if(quest.type==='gear')return backpack.some(it=>it&&ITEMS[it.id]?.equipment)?1:0;
    return 0;
  }
  function questProgressText(quest,current=questProgress(quest)){
    const shown=Math.min(quest.target,Math.max(0,Math.floor(current)));
    if(quest.type==='survive')return `${shown}s / ${quest.target}s survived`;
    if(quest.type==='value')return `${shown} / ${quest.target} petals carried`;
    if(quest.type==='berries')return `${shown} / ${quest.target} Moonberries`;
    if(quest.type==='gear')return quest.done?'Gear recovered':'Find weapon or armor';
    if(quest.type==='landmarks')return `${shown} / ${quest.target} landmarks visited`;
    if(quest.type==='chests')return `${shown} / ${quest.target} crates opened`;
    if(quest.type==='headshots')return `${shown} / ${quest.target} headshot eliminations`;
    return `${shown} / ${quest.target} raiders defeated`;
  }
  function scanLandmarks(){
    if(!match?.metrics||!world.landmarks?.length)return;
    const visited=new Set(match.metrics.landmarksVisited||[]);
    for(const landmark of world.landmarks){
      if(visited.has(landmark.id))continue;
      if(Object.values(players).some(p=>p.alive&&Math.hypot(p.x-landmark.x,p.z-landmark.z)<=landmark.r)){
        visited.add(landmark.id);
        if(pauseMenuOpen===false)toast(`${landmark.label} discovered`);
      }
    }
    match.metrics.landmarksVisited=[...visited];
  }
  function updateContractCompletion(){
    if(!match?.objectives||isPvpMatch())return;
    scanLandmarks();
    for(const [key,row] of [['primary',dom.contractObjectiveRow],['bonus',dom.bonusObjectiveRow]]){
      const quest=match.objectives[key];if(!quest||quest.done)continue;
      if(questProgress(quest)<quest.target)continue;
      quest.done=true;
      if(row){row.classList.remove('just-completed');void row.offsetWidth;row.classList.add('just-completed');}
      toast(`${key==='bonus'?'Bonus':'Drop'} contract complete: ${quest.title}`,2400);
    }
  }
  function canExtractNow(){
    if(isPvpMatch())return false;
    return !!(match?.objectives?.primary?.done&&countItem(backpack,'moonberry')>=5);
  }
  function showDropLoading() {
    if (!dom.dropLoading) return;
    const kit = selectedLoadout(), weapon = WEAPONS[activeAccount().equippedWeaponId] || WEAPONS[kit.weapon] || WEAPONS.pea_popper;
    dom.dropLoading.hidden = false; dom.dropLoading.classList.remove('is-hiding');
    dom.dropLoadingTitle.textContent = `${world.map?.name||'MOONMEADOW'} • ${kit.name}`;
    const steps = ['Checking critter gear…',`Rolling ${world.map?.name||'random map'}…`,'Choosing drop and bonus contracts…',`Deploying ${weapon.name}…`];
    let i = 0; dom.dropLoadingBar.style.width = '8%'; dom.dropLoadingStatus.textContent = steps[0];
    const timer = setInterval(() => { i++; dom.dropLoadingBar.style.width = `${Math.min(94, 18 + i * 24)}%`; dom.dropLoadingStatus.textContent = steps[Math.min(i,steps.length-1)]; }, 210);
    setTimeout(() => { clearInterval(timer); dom.dropLoadingBar.style.width = '100%'; setTimeout(() => { dom.dropLoading.classList.add('is-hiding'); setTimeout(() => { dom.dropLoading.hidden = true; dom.dropLoading.classList.remove('is-hiding'); }, 420); }, 160); }, 930);
  }

  function validateCustomLoadout(account = activeAccount()) {
    if (account.loadoutId !== 'custom') return { ok:true, items:[] };
    const items = normalizeSlots(account.prepared, SLOT_COUNT);
    const used = items.filter(Boolean).length;
    const weight = inventoryWeight(items);
    if (!used) return { ok:false, code:'CE-LOADOUT-INVALID', message:'Add and equip a weapon before starting this drop.' };
    if (used > SLOT_COUNT) return { ok:false, code:'CE-LOADOUT-INVALID', message:`Custom Loadout exceeds ${SLOT_COUNT} slots.` };
    if (weight > LOADOUTS.custom.maxWeight + .001) return { ok:false, code:'CE-LOADOUT-INVALID', message:`Custom Loadout is overweight (${weight.toFixed(1)} / ${LOADOUTS.custom.maxWeight} kg).` };
    const weaponId = packedWeaponId(account);
    if (!weaponId || !WEAPONS[weaponId]) return { ok:false, code:'CE-LOADOUT-INVALID', message:'Add and equip a weapon before starting this drop.' };
    if (account.equippedWeaponId !== weaponId) account.equippedWeaponId = weaponId;
    const armorId = packedArmorId(account);
    account.equippedArmorId = armorId;
    syncAccountLoadout(account);
    return { ok:true, items, weaponId, armorId, weight, used };
  }
  function reserveCustomDrop(account, validation) {
    if (account.loadoutId !== 'custom') return true;
    account.pendingDrop = { state:'reserved', version:GAME_VERSION, createdAt:Date.now(), items:normalizeSlots(validation.items,SLOT_COUNT), equippedWeaponId:validation.weaponId, equippedArmorId:validation.armorId };
    return saveDB();
  }
  function commitCustomDrop(account) {
    if (account.loadoutId !== 'custom') return true;
    account.prepared = emptySlots(SLOT_COUNT);
    if (account.pendingDrop) account.pendingDrop.state = 'active';
    return saveDB();
  }
  function finishCustomDrop(account) { if (account?.pendingDrop) { account.pendingDrop = null; saveDB(); } }

  const PLAYER_SPAWNS = {host:[-3,0],guest1:[-1,2],guest2:[1,2],guest3:[3,0]};
  const DEFAULT_ROOM_RULES = Object.freeze({mode:'coop',friendlyFire:false});
  let roomRules = {...DEFAULT_ROOM_RULES};
  function normalizeRoomRules(value={}){
    const mode=value?.mode==='pvp'?'pvp':'coop';
    return {mode,friendlyFire:mode==='pvp'||!!value?.friendlyFire};
  }
  function isPvpMatch(){return match?.mode==='pvp';}
  function startMatch(role = 'solo', seed = Math.floor(Math.random()*0xffffffff), session = null) {
    if (!renderer) return toast('WebGL could not start');
    const account = activeAccount(), customValidation = validateCustomLoadout(account);
    if (!customValidation.ok) return toast(customValidation.message, 3200);
    if (!reserveCustomDrop(account, customValidation)) return toast('CE-SAVE-WRITE: Could not reserve the Custom Loadout. Nothing was removed.', 3500);
    networkRole = role;
    roomRules = role === 'solo' ? {...DEFAULT_ROOM_RULES} : normalizeRoomRules(session?.rules || roomRules);
    localPlayerId = role === 'guest' ? (session?.playerId || assignedGuestId || 'guest1') : 'host';
    backpack = starterBackpack(account);
    if (account.loadoutId === 'custom') for(const it of customValidation.items){if(it)addItem(backpack,it.id,it.qty,MAX_WEIGHT);}
    nearbyLoot = null; selectedItem = null; cameraMode = account.settings.cameraMode; shoulderSide=account.settings.shoulderSide==='left'?-1:1;cameraRigEye=null;cameraRigTime=performance.now(); paused = false; pauseMenuOpen = false; pauseSubmenuOpen = false; extracting = 0; input.fire=false; input.fireQueued=0; input.aim=false;
    try { generateWorld(seed); } catch (error) { account.pendingDrop = null; saveDB(); console.error('CE-LOADOUT-RESTORE', error); return toast('CE-LOADOUT-RESTORE: The drop could not start. Your Custom Loadout was restored.', 4000); }
    const pvp = role !== 'solo' && roomRules.mode === 'pvp';
    if(pvp){world.enemies=[];world.safeZones=[];}
    showDropLoading();
    const roster = role === 'solo' ? {host:profilePacket()} : normalizeRoster(session?.roster || lobbyProfiles);
    if(!roster.host) roster.host = role === 'guest' ? normalizeNetworkProfile(session?.hostProfile || {displayName:'Host Critter',appearance:{species:'puppy'},loadoutId:defaultLoadoutId},'Host Critter') : profilePacket();
    if(role === 'host') roster.host = profilePacket();
    if(role === 'guest') roster[localPlayerId] = profilePacket();
    players = {};
    const spawnIds=['host','guest1','guest2','guest3'],routeHeading=Math.atan2((world.route?.[1]?.x??world.extract.x)-world.spawn.x,(world.route?.[1]?.z??world.extract.z)-world.spawn.z);
    const spawnFor=id=>world.spawnPoints?.[Math.max(0,spawnIds.indexOf(id))]||world.spawn||{x:0,z:0};
    for(const [id,profile] of Object.entries(roster).slice(0,MAX_PLAYERS)){
      const spawn=spawnFor(id),player=createPlayer(id,spawn.x,spawn.z,profile,id!==localPlayerId);player.yaw=routeHeading;players[id]=player;
    }
    if(!players[localPlayerId]){const spawn=spawnFor(localPlayerId),player=createPlayer(localPlayerId,spawn.x,spawn.z,profilePacket(),false);player.yaw=routeHeading;players[localPlayerId]=player;}
    for(const player of Object.values(players))resolveWorldCollision(player,.48);
    const contracts=pvp?{
      primary:{id:'pvp-last-standing',title:'Last Critter Standing',type:'pvp',target:1,description:'Eliminate rival players and survive.',done:false},
      bonus:{id:'pvp-eliminations',title:'Rival Eliminations',type:'kills',target:2,description:'Eliminate two rival critters.',done:false}
    }:chooseContracts(seed>>>0,role!=='solo');
    match = { role, mode:pvp?'pvp':'coop', friendlyFire:pvp||roomRules.friendlyFire, timer:300, elapsed:0, ended:false, start:performance.now(), seed:seed>>>0, extracted:false, shots:0, hintUntil:performance.now()+9000, metrics:{chestsOpened:0,headshotKills:0,landmarksVisited:[]}, objectives:{foundExtract:pvp,berriesReady:false,extracted:false,primary:contracts.primary,bonus:contracts.bonus} };
    if (!commitCustomDrop(account)) { account.prepared = normalizeSlots(customValidation.items,SLOT_COUNT); account.pendingDrop = null; saveDB(); match=null; return toast('CE-LOADOUT-RESTORE: Could not commit the drop. Your items were restored.',4000); }
    account.stats.matches++; saveDB();
    window.scrollTo(0,0); document.documentElement.scrollTop=0; document.body.scrollTop=0;
    document.body.classList.add('in-match'); dom.menuScreen.classList.remove('active'); dom.gameScreen.classList.add('active'); dom.networkBadge.textContent = role === 'solo' ? 'SOLO' : `${pvp?'PVP':(role === 'host' ? 'HOST' : 'CO-OP')} • ${Object.keys(players).length}/4`;
    dom.cameraTag.textContent = `${cameraMode.toUpperCase()} PERSON`; dom.resultModal.close(); if(dom.hostModal.open)dom.hostModal.close(); if(dom.joinModal.open)dom.joinModal.close(); updateHUD(); renderQuickbar(); renderSquadHUD();
    dom.gameCanvas.focus(); dom.playOverlay.hidden=true;
    if (role === 'host' && networkConnected()) sendNet({type:'start',seed,roster:normalizeRoster(lobbyProfiles),rules:normalizeRoomRules(roomRules)});
  }
  function getLocalPlayer() { return players[localPlayerId]; }
  function getPlayerByRole(role) { return players[role]; }
  function profilePacket() { const a=activeAccount(); return normalizeNetworkProfile({displayName:a.displayName,username:a.username,avatar:a.avatar||'',appearance:a.appearance,loadoutId:a.loadoutId,equippedWeaponId:a.equippedWeaponId,equippedArmorId:a.equippedArmorId},a.displayName); }

  // -------------------- Input and pointer lock --------------------
  const rememberKey = (e, down) => {
    const values = [e.code, String(e.key || '').toLowerCase()].filter(Boolean);
    values.forEach(value => down ? input.keys.add(value) : input.keys.delete(value));
  };
  window.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') setInputMode('touch');
    else if (e.pointerType === 'mouse' || e.pointerType === 'pen') setInputMode('mouse-keyboard');
  }, true);
  window.addEventListener('mousemove', e => {
    if (e.sourceCapabilities?.firesTouchEvents) return;
    if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 0) setInputMode('mouse-keyboard');
  }, { passive:true });
  window.addEventListener('orientationchange', () => {
    inputDeviceProfile.phoneOrTablet = detectPhoneOrTablet(); applyInputVisibility();
  }, { passive:true });
  window.addEventListener('keydown', e => {
    if (isTypingTarget(e.target)) return;
    setInputMode('mouse-keyboard');
    if (match && ['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    if (!match) return;
    if (e.code === 'Escape' && !e.repeat) {
      if (dom.inventoryModal.open || dom.settingsModal.open || dom.helpModal.open || dom.customizeModal.open) return;
      e.preventDefault();
      if(pauseMenuOpen && performance.now()-lastPointerPauseAt<450)return;
      togglePauseMenu(); return;
    }
    if (pauseMenuOpen) return;
    rememberKey(e, true);
    if ((e.code === 'KeyI' || e.code === 'Tab') && !e.repeat) { if (dom.inventoryModal.open) { dom.inventoryModal.close(); resumePointer(); } else openInventory('match'); }
    if (e.code === 'KeyV' && !e.repeat) toggleCamera();
    if (e.code === 'KeyB' && !e.repeat) toggleShoulder();
    if (e.code === 'KeyF' && !e.repeat) queueShot();
    if (e.code === 'Space' && !e.repeat) input.jumpSeq++;
    if (e.code === 'KeyR' && !e.repeat) { input.reloadSeq++; reloadPlayer(getLocalPlayer()); }
    if (e.code === 'KeyQ' && !e.repeat) useQuickItem(countItem(backpack,'medkit')?'medkit':'bandage');
    if (/^Digit[1-4]$/.test(e.code) && !e.repeat) quickUseNumber(Number(e.code.slice(-1))-1);
    if (e.code === 'KeyE') input.interact = true;
  });
  window.addEventListener('keyup', e => { if (isTypingTarget(e.target)) return; rememberKey(e, false); if(e.code==='KeyE'||String(e.key).toLowerCase()==='e')input.interact=false; if(e.code==='KeyF'||String(e.key).toLowerCase()==='f')input.fire=false; });
  window.addEventListener('blur', () => { input.keys.clear(); input.fire=false; input.fireQueued=0; input.aim=false; input.interact=false; resetTouchControls(); });
  let dragLooking=false,lastDragX=0,lastDragY=0,suppressNextUnlockPause=false,lastPointerPauseAt=0;
  function armMouseCapture(){if(dom.playOverlay)dom.playOverlay.hidden=true;}
  function queueShot(){
    if(!match||paused||dom.inventoryModal.open||match.ended)return;
    input.fire=true; input.fireQueued=Math.min(4,(input.fireQueued||0)+1); input.shotSeq++;
  }
  async function requestGamePointer(){if(!match||paused)return;if(usingTouchInput()){dom.playOverlay.hidden=true;dom.gameCanvas.focus();return;}dom.gameCanvas.focus();if(dom.gameCanvas.requestPointerLock){try{const result=dom.gameCanvas.requestPointerLock({unadjustedMovement:false});if(result?.catch)await result;}catch(_){try{await dom.gameCanvas.requestPointerLock();}catch(__){dragLooking=true;dom.playOverlay.hidden=true;toast('Mouse capture blocked — drag to aim; click or press F to fire, Space to jump');}}}else{dragLooking=true;dom.playOverlay.hidden=true;toast('Drag to aim; click or press F to fire, Space to jump');}}
  dom.captureBtn.addEventListener('click',requestGamePointer);
  document.addEventListener('pointerlockchange',()=>{
    if(!match)return;const locked=document.pointerLockElement===dom.gameCanvas;
    dom.playOverlay.hidden=true;
    if(locked){suppressNextUnlockPause=false;return;}
    if(suppressNextUnlockPause){suppressNextUnlockPause=false;return;}
    if(usingTouchInput())return;
    // Chrome reserves Esc to release pointer lock. Treat that release as opening the pause menu.
    if(!paused&&!pauseMenuOpen&&!dom.inventoryModal.open&&!dom.settingsModal.open&&!dom.helpModal.open){lastPointerPauseAt=performance.now();openPauseMenu();}
  });
  dom.gameCanvas.addEventListener('pointerdown', e => {
    if (!match || paused || dom.inventoryModal.open) return;
    if(e.pointerType==='touch')return;
    lastDragX=e.clientX;lastDragY=e.clientY;
    if(e.button===0) queueShot();
    if(e.button===2) input.aim=true;
    if(document.pointerLockElement!==dom.gameCanvas){dragLooking=true;requestGamePointer();}
    try{dom.gameCanvas.setPointerCapture?.(e.pointerId);}catch(_){ }
    e.preventDefault();
  });
  window.addEventListener('pointerup', e => { dragLooking=false;if(e.button===0)input.fire=false;if(e.button===2)input.aim=false; });
  dom.gameCanvas.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('mousemove', e => {
    if (!match || paused || dom.inventoryModal.open) return;
    const locked=document.pointerLockElement===dom.gameCanvas;if(!locked&&!dragLooking)return;
    const p=getLocalPlayer(); if(!p)return; const s=activeAccount().settings.sensitivity*.0022;
    const mx=locked?e.movementX:e.clientX-lastDragX,my=locked?e.movementY:e.clientY-lastDragY;lastDragX=e.clientX;lastDragY=e.clientY;
    p.yaw = wrapAngle(p.yaw + mx*s); p.pitch += my*s*(activeAccount().settings.invertY?1:-1); p.pitch=clamp(p.pitch,-1.25,1.15);
  });
  function resumePointer(){if(!match||pauseMenuOpen||paused)return;if(dom.playOverlay)dom.playOverlay.hidden=true;if(!usingTouchInput())requestGamePointer();}
  function toggleCamera(){
    cameraMode=cameraMode==='first'?'third':'first';cameraRigEye=null;cameraRigTime=performance.now();
    const p=getLocalPlayer();if(p)p.cameraMode=cameraMode;
    dom.cameraTag.textContent=`${cameraMode.toUpperCase()} PERSON`;activeAccount().settings.cameraMode=cameraMode;saveDB();toast(`${cameraMode==='first'?'First':'Third'}-person view`);
  }
  function toggleShoulder(){
    shoulderSide*=-1;cameraRigEye=null;cameraRigTime=performance.now();
    const side=shoulderSide>0?'right':'left',p=getLocalPlayer();if(p)p.shoulderSide=shoulderSide;
    activeAccount().settings.shoulderSide=side;saveDB();toast(`${side[0].toUpperCase()+side.slice(1)} shoulder`);
  }
  function openPauseMenu(){
    if(!match||match.ended||pauseMenuOpen)return;
    pauseMenuOpen=true;paused=match.role==='solo';input.keys.clear();input.fire=false;input.fireQueued=0;input.aim=false;input.interact=false;resetTouchControls();if(document.pointerLockElement===dom.gameCanvas)suppressNextUnlockPause=true;document.exitPointerLock?.();dom.playOverlay.hidden=true;
    const solo=match.role==='solo';$('#pauseEyebrow').textContent=solo?'MATCH PAUSED':'CO-OP MENU';
    if(dom.pauseStatus)dom.pauseStatus.textContent=solo?'The solo match is paused. Your run is safe until you resume.':'The co-op world is still running. Your critter stops moving while this menu is open.';if(dom.pauseMapName)dom.pauseMapName.textContent=world.map?.name||'Unknown Map';if(dom.pauseMapSeed)dom.pauseMapSeed.textContent=`SEED ${match.seed>>>0} • 0x${(match.seed>>>0).toString(16).padStart(8,'0').toUpperCase()}`;
    if(!dom.pauseModal.open)dom.pauseModal.showModal();
  }
  function closePauseMenu(){
    if(!match)return;pauseMenuOpen=false;pauseSubmenuOpen=false;paused=false;if(dom.pauseModal.open)dom.pauseModal.close();resumePointer();
  }
  function togglePauseMenu(){if(pauseMenuOpen)closePauseMenu();else openPauseMenu();}
  $('#pauseBtn').onclick=openPauseMenu;$('#resumeBtn').onclick=closePauseMenu;$('#leaveBtn').onclick=openPauseMenu;
  $('#pauseSettingsBtn').onclick=()=>{pauseSubmenuOpen=true;if(dom.pauseModal.open)dom.pauseModal.close();loadSettingsForm();dom.settingsModal.showModal();};
  $('#pauseControlsBtn').onclick=()=>{pauseSubmenuOpen=true;if(dom.pauseModal.open)dom.pauseModal.close();dom.helpModal.showModal();};
  $('#quitBtn').onclick=()=>{if(!confirm('Exit this run and return to the main menu? Unextracted loot will be lost.'))return;pauseMenuOpen=false;paused=false;endMatch(false,'You left the meadow before extracting.',true);};
  $('#exitBrowserBtn').onclick=()=>{if(!confirm('Exit the browser game? Unextracted loot will be lost.'))return;pauseMenuOpen=false;paused=false;if(match)endMatch(false,'You exited the browser game.',true);setTimeout(()=>{try{window.close();}catch(_){}setTimeout(()=>location.replace('about:blank'),80);},60);};
  $('#brandBtn').onclick=()=>{if(match&&confirm('Leave the current run and return to the main menu?'))endMatch(false,'You left the meadow before extracting.',true);};
  dom.pauseModal.addEventListener('cancel',e=>{e.preventDefault();closePauseMenu();});
  let touchMovePointer=null,touchLookPointer=null,touchCrouched=false;
  function touchHaptic(ms=8){try{globalThis.navigator?.vibrate?.(ms);}catch(_){ }}
  function resetTouchControls(){
    touchMovePointer=touchLookPointer=null;touchCrouched=false;input.touchX=input.touchY=0;input.fire=false;input.aim=false;input.interact=false;input.keys.delete('KeyC');
    if(dom.moveStick?.firstElementChild)dom.moveStick.firstElementChild.style.transform='';
    ['touchFire','touchAim','touchUse','touchCrouch'].forEach(id=>{const button=$(`#${id}`);if(button){button.classList.remove('pressed');button.setAttribute('aria-pressed','false');}});
  }
  function bindTouchTap(id,handler){
    const button=$(`#${id}`);if(!button)return;
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!match||paused)return;touchHaptic();handler(e);});
  }
  function bindTouchHold(id,onStart,onEnd){
    const button=$(`#${id}`);if(!button)return;let pointer=null;
    const finish=e=>{if(pointer===null||(e&&e.pointerId!==pointer))return;pointer=null;button.classList.remove('pressed');button.setAttribute('aria-pressed','false');onEnd();e?.preventDefault();e?.stopPropagation();};
    button.addEventListener('pointerdown',e=>{if(!match||paused||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;try{button.setPointerCapture(pointer);}catch(_){ }button.classList.add('pressed');button.setAttribute('aria-pressed','true');touchHaptic();onStart();});
    button.addEventListener('pointerup',finish);button.addEventListener('pointercancel',finish);button.addEventListener('lostpointercapture',finish);
  }
  bindTouchTap('touchPause',openPauseMenu);
  bindTouchTap('touchInventory',()=>{resetTouchControls();openInventory('match');});
  bindTouchTap('touchCamera',toggleCamera);
  bindTouchTap('touchShoulder',toggleShoulder);
  bindTouchTap('touchJump',()=>input.jumpSeq++);
  bindTouchTap('touchReload',()=>{input.reloadSeq++;reloadPlayer(getLocalPlayer());});
  bindTouchTap('touchHeal',()=>useQuickItem(countItem(backpack,'medkit')?'medkit':'bandage'));
  bindTouchTap('touchCrouch',()=>{touchCrouched=!touchCrouched;if(touchCrouched)input.keys.add('KeyC');else input.keys.delete('KeyC');const button=$('#touchCrouch');button?.classList.toggle('pressed',touchCrouched);button?.setAttribute('aria-pressed',String(touchCrouched));});
  bindTouchHold('touchUse',()=>input.interact=true,()=>input.interact=false);
  bindTouchHold('touchAim',()=>input.aim=true,()=>input.aim=false);
  bindTouchHold('touchFire',queueShot,()=>input.fire=false);
  function setupTouchStick(){
    let cx=0,cy=0;
    const stopMove=e=>{if(touchMovePointer===null||(e&&e.pointerId!==touchMovePointer))return;touchMovePointer=null;input.touchX=input.touchY=0;dom.moveStick.firstElementChild.style.transform='';e?.preventDefault();};
    dom.moveStick.addEventListener('pointerdown',e=>{if(!match||paused||touchMovePointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();touchMovePointer=e.pointerId;try{dom.moveStick.setPointerCapture(touchMovePointer);}catch(_){ }const r=dom.moveStick.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;touchHaptic(5);});
    dom.moveStick.addEventListener('pointermove',e=>{if(e.pointerId!==touchMovePointer)return;e.preventDefault();const radius=Math.max(32,dom.moveStick.clientWidth*.38),dx=clamp((e.clientX-cx)/radius,-1,1),dy=clamp((e.clientY-cy)/radius,-1,1);input.touchX=dx;input.touchY=dy;const knobTravel=dom.moveStick.clientWidth*.23;dom.moveStick.firstElementChild.style.transform=`translate(${dx*knobTravel}px,${dy*knobTravel}px)`;});
    dom.moveStick.addEventListener('pointerup',stopMove);dom.moveStick.addEventListener('pointercancel',stopMove);dom.moveStick.addEventListener('lostpointercapture',stopMove);
    const stopLook=e=>{if(touchLookPointer===null||(e&&e.pointerId!==touchLookPointer))return;touchLookPointer=null;e?.preventDefault();};let lx=0,ly=0;
    dom.lookArea.addEventListener('pointerdown',e=>{if(!match||paused||touchLookPointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();touchLookPointer=e.pointerId;lx=e.clientX;ly=e.clientY;try{dom.lookArea.setPointerCapture(touchLookPointer);}catch(_){ }});
    dom.lookArea.addEventListener('pointermove',e=>{if(e.pointerId!==touchLookPointer||!match||paused)return;e.preventDefault();const p=getLocalPlayer();if(!p)return;const s=activeAccount().settings.sensitivity*.006;p.yaw=wrapAngle(p.yaw+(e.clientX-lx)*s);p.pitch+=(e.clientY-ly)*s*(activeAccount().settings.invertY?1:-1);p.pitch=clamp(p.pitch,-1.25,1.15);lx=e.clientX;ly=e.clientY;});
    dom.lookArea.addEventListener('pointerup',stopLook);dom.lookArea.addEventListener('pointercancel',stopLook);dom.lookArea.addEventListener('lostpointercapture',stopLook);
  }
  setupTouchStick();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetTouchControls();});

  function quickbarIds() {
    const weapon = weaponFor(getLocalPlayer());
    const heal = countItem(backpack,'medkit') ? 'medkit' : 'bandage';
    const defense = countItem(backpack,'armor_plate') ? 'armor_plate' : 'shield_pod';
    return [heal, defense, weapon.ammoItem, 'moonberry'];
  }
  function renderQuickbar(){
    dom.quickbar.innerHTML=''; const ids=quickbarIds(); ids.forEach((id,i)=>{const qty=countItem(backpack,id),d=ITEMS[id],b=document.createElement('button');b.className=`quick-slot${qty?'':' empty'}`;b.innerHTML=`<small>${i+1}</small><span class="item-icon"><img src="${d.asset}" alt=""></span><strong>${qty||''}</strong>`;b.title=`${i+1}: ${d.name}`;b.onclick=()=>quickUseNumber(i);dom.quickbar.append(b);});
  }
  function quickUseNumber(i){const id=quickbarIds()[i];if(ITEMS[id]?.consumable)useQuickItem(id);else if(ITEMS[id]?.ammo)reloadPlayer(getLocalPlayer());else toast(`${countItem(backpack,'moonberry')} Moonberries carried`);}
  function useQuickItem(id){const p=getLocalPlayer();if(!p||!match)return;if(!countItem(backpack,id))return toast(`No ${ITEMS[id].name}`);if(!applyConsumable(p,id))return;if(match.role==='guest')sendNet({type:'consume',id});removeItem(backpack,id,1);renderQuickbar();updateHUD();}

  // -------------------- Simulation, combat, interaction --------------------
  function cameraFor(p,options={}) {
    const isLocal=p.id===localPlayerId,mode=options.mode||(isLocal?cameraMode:(p.cameraMode||'third')),side=options.shoulderSide??(isLocal?shoulderSide:(p.shoulderSide||1));
    const aiming=options.aiming??(isLocal?!!input.aim:!!p.aim),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch),sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);
    const forward=[sy*cp,sp,cy*cp],horizontalForward=[sy,0,cy],right=[cy,0,-sy],worldUp=[0,1,0];
    const crouchDrop=(p.crouch||0)*.52;let eye;
    if(mode==='first'){
      const bob=Math.sin(p.walkTime||0)*.012*(p.moveBlend||0);
      eye=[p.x+forward[0]*.38+right[0]*.055,p.y+1.52-crouchDrop+bob+forward[1]*.10,p.z+forward[2]*.38+right[2]*.055];
      cameraRigEye=null;
    }else{
      const distance=aiming?3.05:4.18,height=aiming?2.18:2.55,shoulder=aiming?.76:1.08;
      const focus=[p.x,p.y+1.40-crouchDrop,p.z];
      const desired=[p.x-horizontalForward[0]*distance+right[0]*shoulder*side,p.y+height-crouchDrop,p.z-horizontalForward[2]*distance+right[2]*shoulder*side];
      const collisionEye=cameraCollisionEye(focus,desired);
      if(isLocal&&!options.instant){
        const now=performance.now(),dt=clamp((now-cameraRigTime)/1000,0,.10),blend=1-Math.exp(-18*Math.max(dt,.001));cameraRigTime=now;
        cameraRigEye=cameraRigEye?cameraRigEye.map((v,i)=>lerp(v,collisionEye[i],blend)):[...collisionEye];
        cameraRigEye=cameraCollisionEye(focus,cameraRigEye);eye=[...cameraRigEye];
      }else eye=collisionEye;
    }
    const target=[eye[0]+forward[0]*160,eye[1]+forward[1]*160,eye[2]+forward[2]*160];
    const viewForward=[target[0]-eye[0],target[1]-eye[1],target[2]-eye[2]],viewLength=Math.hypot(...viewForward)||1;for(let i=0;i<3;i++)viewForward[i]/=viewLength;
    let viewRight=[worldUp[1]*viewForward[2]-worldUp[2]*viewForward[1],worldUp[2]*viewForward[0]-worldUp[0]*viewForward[2],worldUp[0]*viewForward[1]-worldUp[1]*viewForward[0]],rightLength=Math.hypot(...viewRight)||1;viewRight=viewRight.map(v=>v/rightLength);
    const viewUp=[viewForward[1]*viewRight[2]-viewForward[2]*viewRight[1],viewForward[2]*viewRight[0]-viewForward[0]*viewRight[2],viewForward[0]*viewRight[1]-viewForward[1]*viewRight[0]];
    return {eye,target,forward:viewForward,right:viewRight,up:viewUp,mode,side,aiming,fov:aiming?Math.max(46,activeAccount().settings.fov-20):activeAccount().settings.fov};
  }
  function movementFromInput(src, p) {
    const held = (...values) => src.keys?.has ? values.some(v => src.keys.has(v)) : values.some(v => src.keys?.includes?.(v));
    let f=(held('KeyW','w','ArrowUp','arrowup')?1:0)-(held('KeyS','s','ArrowDown','arrowdown')?1:0);
    // Standard camera-relative strafing: A is left and D is right.
    let r=(held('KeyD','d','ArrowRight','arrowright')?1:0)-(held('KeyA','a','ArrowLeft','arrowleft')?1:0);
    if(src===input){f+=-(input.touchY||0);r+=input.touchX||0;}
    const l=Math.hypot(f,r)||1;f/=l;r/=l;const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);return{x:sy*f+cy*r,z:cy*f-sy*r,sprint:held('ShiftLeft','ShiftRight','shift'),crouch:held('KeyC','c','ControlLeft','ControlRight','control')};
  }
  function coverLocalPoint(x,z,c){const co=Math.cos(-(c.rot||0)),si=Math.sin(-(c.rot||0)),dx=x-c.x,dz=z-c.z;return{x:dx*co-dz*si,z:dx*si+dz*co};}
  function resolveBoxCollision(entity,c,radius=.48){
    const q=coverLocalPoint(entity.x,entity.z,c),hx=c.w*.5+radius,hz=c.d*.5+radius;
    if(Math.abs(q.x)>=hx||Math.abs(q.z)>=hz)return false;
    const px=hx-Math.abs(q.x),pz=hz-Math.abs(q.z);let lx=q.x,lz=q.z;
    if(px<pz)lx=Math.sign(q.x||1)*hx;else lz=Math.sign(q.z||1)*hz;
    const co=Math.cos(c.rot||0),si=Math.sin(c.rot||0);entity.x=c.x+lx*co-lz*si;entity.z=c.z+lx*si+lz*co;return true;
  }
  function resolveCircleCollision(entity,c,radius=.48){
    const rr=(c.r||.6)+radius,dx=entity.x-c.x,dz=entity.z-c.z,d=Math.hypot(dx,dz);
    if(d>=rr)return false;const nx=d>.0001?dx/d:1,nz=d>.0001?dz/d:0;entity.x=c.x+nx*rr;entity.z=c.z+nz*rr;return true;
  }
  function resolveCoverCollision(entity,radius=.48){for(const c of world.cover||[])resolveBoxCollision(entity,c,radius);}
  function resolveWorldCollision(entity,radius=.48){
    for(const o of world.statics||[]){resolveCircleCollision(entity,{x:o.x,z:o.z,r:(o.type==='tree'?.7:.8)*o.s},radius);}
    for(const c of world.cover||[])resolveBoxCollision(entity,c,radius);
    for(const b of world.blockers||[]){if(b.type==='circle')resolveCircleCollision(entity,b,radius);else resolveBoxCollision(entity,b,radius);}
    for(const ch of world.chests||[]){if(!ch.opened)resolveCircleCollision(entity,{x:ch.x,z:ch.z,r:.56},radius);}
    entity.x=clamp(entity.x,-39,39);entity.z=clamp(entity.z,-39,39);
  }
  function moveEntityWithCollisions(entity,dx,dz,radius=.48){
    const distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance/.16)),sx=dx/steps,sz=dz/steps;
    for(let i=0;i<steps;i++){entity.x+=sx;entity.z+=sz;resolveWorldCollision(entity,radius);}
  }
  function rayCover(origin,dir,c,maxRange=Infinity){
    const co=Math.cos(-(c.rot||0)),si=Math.sin(-(c.rot||0)),ox=origin[0]-c.x,oz=origin[2]-c.z;
    const ro=[ox*co-oz*si,origin[1],ox*si+oz*co],rd=[dir[0]*co-dir[2]*si,dir[1],dir[0]*si+dir[2]*co];
    const min=[-c.w*.5,0,-c.d*.5],max=[c.w*.5,c.h||4,c.d*.5];let tmin=0,tmax=maxRange;
    for(let i=0;i<3;i++){if(Math.abs(rd[i])<1e-6){if(ro[i]<min[i]||ro[i]>max[i])return Infinity;continue;}let t1=(min[i]-ro[i])/rd[i],t2=(max[i]-ro[i])/rd[i];if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return Infinity;}
    return tmin>0?tmin:(tmax>0?tmax:Infinity);
  }
  function nearestCoverHit(origin,dir,maxRange=Infinity){
    let best=null,tmin=maxRange;for(const c of world.cover||[]){const t=rayCover(origin,dir,c,tmin);if(t<tmin){tmin=t;best={cover:c,t};}}
    for(const b of world.blockers||[]){if(b.type!=='box')continue;const t=rayCover(origin,dir,b,tmin);if(t<tmin){tmin=t;best={cover:b,t};}}
    return best;
  }
  function nearestWorldGeometryHit(origin,dir,maxRange=Infinity,inflate=0,includeChests=true){
    let best=null,tmin=maxRange;
    const testBox=(object,kind)=>{const expanded=inflate?{...object,w:(object.w||1)+inflate*2,d:(object.d||1)+inflate*2,h:(object.h||3)+inflate*2}:object;const shifted=inflate?[[origin[0],origin[1]+inflate,origin[2]],dir]:[origin,dir];const t=rayCover(shifted[0],shifted[1],expanded,tmin);if(t<tmin){tmin=t;best={kind,object,t};}};
    for(const c of world.cover||[])testBox(c,'cover');
    for(const b of world.blockers||[]){
      if(b.type==='box')testBox(b,'blocker');
      else {const radius=(b.r||.7)+inflate,center=[b.x,Math.max(radius,1.15),b.z],t=raySphere(origin,dir,center,radius);if(t<tmin){tmin=t;best={kind:'blocker',object:b,t};}}
    }
    for(const o of world.statics||[]){
      const s=o.s||1,center=o.type==='tree'?[o.x,1.45*s,o.z]:[o.x,.55*s,o.z],radius=(o.type==='tree'?1.0:1.05)*s+inflate,t=raySphere(origin,dir,center,radius);
      if(t<tmin){tmin=t;best={kind:o.type,object:o,t};}
    }
    if(includeChests)for(const ch of world.chests||[]){if(ch.opened)continue;const t=raySphere(origin,dir,[ch.x,.58,ch.z],.72+inflate);if(t<tmin){tmin=t;best={kind:'chest',object:ch,t};}}
    if(best)best.point=[origin[0]+dir[0]*best.t,origin[1]+dir[1]*best.t,origin[2]+dir[2]*best.t];
    return best;
  }
  function cameraCollisionEye(focus,desired){
    const delta=[desired[0]-focus[0],desired[1]-focus[1],desired[2]-focus[2]],length=Math.hypot(...delta)||1,dir=delta.map(v=>v/length);
    const hit=nearestWorldGeometryHit(focus,dir,length,.28,true);
    const distance=hit?Math.max(.55,hit.t-.24):length;
    const eye=[focus[0]+dir[0]*distance,focus[1]+dir[1]*distance,focus[2]+dir[2]*distance];
    eye[1]=Math.max(.38,eye[1]);
    return eye;
  }

  function updatePlayer(p, src, dt, authoritative=true) {
    if(!p||!p.alive)return; const weapon=weaponFor(p);
    p.cooldown=Math.max(0,p.cooldown-dt);p.invuln=Math.max(0,p.invuln-dt);p.spawnProtection=Math.max(0,(p.spawnProtection||0)-dt);p.speedBoost=Math.max(0,(p.speedBoost||0)-dt);p.weaponKick=Math.max(0,(p.weaponKick||0)-dt*7.5);p.muzzleFlash=Math.max(0,(p.muzzleFlash||0)-dt);
    if(p.reload>0){p.reload-=dt;if(p.reload<=0)finishReload(p);}
    if(src.yaw!=null){p.yaw=wrapAngle(src.yaw);p.pitch=clamp(Number(src.pitch)||0,-1.25,1.15);}if(src.aim!=null)p.aim=!!src.aim;if(src.cameraMode==='first'||src.cameraMode==='third')p.cameraMode=src.cameraMode;if(src.shoulderSide===-1||src.shoulderSide===1)p.shoulderSide=src.shoulderSide;
    const mv=movementFromInput(src,p),boost=p.speedBoost>0?1.22:1;
    const jumpSeq=Math.max(0,Math.floor(Number(src.jumpSeq)||0));
    if(jumpSeq!==p.lastJumpSeq){p.lastJumpSeq=jumpSeq;if(p.grounded&&!mv.crouch){p.velocityY=5.7;p.grounded=false;}}
    p.velocityY=(Number(p.velocityY)||0)-15.5*dt;p.y+=(Number(p.velocityY)||0)*dt;
    if(p.y<=.9){p.y=.9;p.velocityY=0;p.grounded=true;}else p.grounded=false;
    p.crouch=lerp(p.crouch||0,mv.crouch?1:0,Math.min(1,dt*12));
    const speed=p.speed*boost*(mv.sprint&&!mv.crouch?1.45:mv.crouch?.58:1)*(p.grounded?1:.78),moving=Math.hypot(mv.x,mv.z)>0.05;
    moveEntityWithCollisions(p,mv.x*speed*dt,mv.z*speed*dt,.48);
    p.moveBlend=lerp(p.moveBlend||0,moving?1:0,Math.min(1,dt*9));if(moving)p.walkTime=(p.walkTime||0)+dt*(mv.sprint?12:mv.crouch?5:8);
    const wantsFire=(src.fireQueued||0)>0||(weapon.auto&&!!src.fire);
    if(authoritative&&wantsFire&&p.cooldown<=0&&p.reload<=0){fireWeapon(p);if((src.fireQueued||0)>0)src.fireQueued--;}
  }
  function reserveAmmoFor(p){const weapon=weaponFor(p);return p.id===localPlayerId?countItem(backpack,weapon.ammoItem):(p.reserve??(weapon.mag*5));}
  function reloadPlayer(p){if(!p||!match||p.reload>0)return;const weapon=weaponFor(p);if(p.mag>=weapon.mag)return;if(reserveAmmoFor(p)<=0)return toast(`No ${ITEMS[weapon.ammoItem].name}`);p.reload=weapon.reload;dom.reloadText.textContent='RELOADING';}
  function finishReload(p){const weapon=weaponFor(p),need=weapon.mag-p.mag;if(need<=0)return;let take;if(p.id===localPlayerId)take=removeItem(backpack,weapon.ammoItem,need);else{take=Math.min(need,p.reserve??weapon.mag*5);p.reserve=(p.reserve??weapon.mag*5)-take;}p.mag+=take;if(p.id===localPlayerId){dom.reloadText.textContent='';renderQuickbar();updateHUD();}}
  function raySphere(origin,dir,c,r){const ox=origin[0]-c[0],oy=origin[1]-c[1],oz=origin[2]-c[2],b=ox*dir[0]+oy*dir[1]+oz*dir[2],cc=ox*ox+oy*oy+oz*oz-r*r,h=b*b-cc;if(h<0)return Infinity;const s=Math.sqrt(h),t0=-b-s,t1=-b+s;return t0>0?t0:(t1>0?t1:Infinity);}
  function hitTestCritter(origin, dir, critter, maxRange=Infinity) {
    const drop=(critter.crouch||0)*.52;
    const zones = [
      { part:'head', center:[critter.x,2.20-drop,critter.z], radius:.67, multiplier:1.65 },
      { part:'chest', center:[critter.x,1.48-drop*.72,critter.z], radius:.73, multiplier:1.00 },
      { part:'belly', center:[critter.x,.94-drop*.58,critter.z], radius:.62, multiplier:.90 },
      { part:'legs', center:[critter.x,.38-drop*.28,critter.z], radius:.52, multiplier:.72 },
      { part:'body', center:[critter.x,1.30-drop*.65,critter.z], radius:.88, multiplier:.92 }
    ];
    let best=null;
    for(const zone of zones){const t=raySphere(origin,dir,zone.center,zone.radius);if(t<maxRange&&(!best||t<best.t))best={...zone,t};}
    return best;
  }
  function muzzleOriginFor(p) {
    const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch);
    return [p.x+sy*1.02+cy*.37,p.y+1.27+sp*.12,p.z+cy*1.02-sy*.37];
  }
  function showDamageNumber(target, amount, part, targetKind='enemy') {
    const local=getLocalPlayer();if(!local)return;
    const layer = $('#damageNumbers') || (()=>{const n=document.createElement('div');n.id='damageNumbers';n.className='damage-numbers';dom.gameCanvas.parentElement.append(n);return n;})();
    const tag=document.createElement('span');tag.className=`damage-number ${part==='head'?'critical':''} ${targetKind==='player'?'player-hit':''}`;tag.textContent=`${Math.round(amount)}${part==='head'?' HEAD':''}`;tag.style.left=`${50+clamp((target.x-local.x)*1.2,-28,28)}%`;tag.style.top=`${part==='head'?38:46}%`;layer.append(tag);setTimeout(()=>tag.remove(),700);
  }
  function canDamagePlayer(shooter,target){
    if(!match||!shooter||!target||shooter.id===target.id||!target.alive)return false;
    if(match.mode==='pvp')return true;
    return match.role!=='solo'&&!!match.friendlyFire;
  }
  function findShotTarget(origin,dir,maxRange,shooter){
    let best=null,tmin=maxRange;
    if(match?.mode!=='pvp')for(const e of world.enemies){if(!e.alive)continue;const result=hitTestCritter(origin,dir,e,tmin);if(result&&result.t<tmin){tmin=result.t;best={kind:'enemy',enemy:e,...result};}}
    for(const target of Object.values(players)){if(!canDamagePlayer(shooter,target))continue;const result=hitTestCritter(origin,dir,target,tmin);if(result&&result.t<tmin){tmin=result.t;best={kind:'player',player:target,...result};}}
    return best;
  }
  function fireWeapon(p){
    const weapon=weaponFor(p);
    if(p.mag<=0){audio.empty();if(activeAccount().settings.autoReload)reloadPlayer(p);return;}
    p.mag--;p.cooldown=1/weapon.fireRate;p.weaponKick=1;p.muzzleFlash=.075;match.shots++;audio.shoot();
    const cam=cameraFor(p),cameraOrigin=[...cam.eye],cameraDir=[...cam.forward],maxAimRange=Math.max(160,weapon.range*2);
    let cameraTarget=findShotTarget(cameraOrigin,cameraDir,maxAimRange,p),cameraDistance=cameraTarget?.t??maxAimRange;
    const cameraGeometry=nearestWorldGeometryHit(cameraOrigin,cameraDir,cameraDistance,0,true);
    if(cameraGeometry){cameraDistance=cameraGeometry.t;cameraTarget=cameraGeometry;}
    const aimPoint=[cameraOrigin[0]+cameraDir[0]*cameraDistance,cameraOrigin[1]+cameraDir[1]*cameraDistance,cameraOrigin[2]+cameraDir[2]*cameraDistance];
    const muzzle=muzzleOriginFor(p),toAim=[aimPoint[0]-muzzle[0],aimPoint[1]-muzzle[1],aimPoint[2]-muzzle[2]],toAimLen=Math.hypot(...toAim)||1,trueBaseDir=toAim.map(v=>v/toAimLen),spread=(cam.aiming?.30:1)*weapon.spread;
    let hitAny=false,headshot=false,killHit=false,hitKind='enemy',debugImpact=null;
    for(let pellet=0;pellet<weapon.pellets;pellet++){
      let dir=[...trueBaseDir];
      if(pellet>0){dir=[trueBaseDir[0]+(Math.random()-.5)*spread,trueBaseDir[1]+(Math.random()-.5)*spread,trueBaseDir[2]+(Math.random()-.5)*spread];const len=Math.hypot(...dir)||1;dir=dir.map(v=>v/len);}
      let target=findShotTarget(muzzle,dir,weapon.range,p),tmin=target?.t??weapon.range;
      const geometryHit=nearestWorldGeometryHit(muzzle,dir,tmin,0,true);if(geometryHit){tmin=geometryHit.t;target=null;}
      const impact=[muzzle[0]+dir[0]*tmin,muzzle[1]+dir[1]*tmin,muzzle[2]+dir[2]*tmin];if(pellet===0)debugImpact={point:impact,distance:tmin,kind:geometryHit?.kind||(target?.kind||'range')};
      if(pellet<3)world.effects.push({type:'tracer',life:.10,x:muzzle[0],y:muzzle[1],z:muzzle[2],dx:dir[0],dy:dir[1],dz:dir[2],len:Math.min(tmin,26),color:weapon.color});
      if(geometryHit)world.effects.push({type:'impact',life:.16,x:impact[0],y:impact[1],z:impact[2],color:'#ffe2a5'});
      if(target?.kind==='enemy'&&target.enemy.alive){
        const damage=weapon.damage*target.multiplier;target.enemy.hp-=damage;hitAny=true;hitKind='enemy';headshot=headshot||target.part==='head';
        if(p.id===localPlayerId)showDamageNumber(target.enemy,damage,target.part,'enemy');
        world.effects.push({type:'impact',life:.20,x:impact[0],y:impact[1],z:impact[2],color:target.part==='head'?'#fff1a8':'#ffb08a'});
        if(target.enemy.hp<=0){killHit=true;target.enemy.hp=0;target.enemy.alive=false;p.kills++;if(target.part==='head'&&match?.metrics)match.metrics.headshotKills=(match.metrics.headshotKills||0)+1;spawnEnemyDeathBox(target.enemy,p);toast(`${SPECIES[target.enemy.species]?.name||'Raider'} raider defeated with ${weapon.name}!`);}
      }else if(target?.kind==='player'&&target.player.alive){
        const scale=match.mode==='pvp'?.82:.55,damage=weapon.damage*target.multiplier*scale;
        const result=damagePlayer(target.player,damage,{attacker:p,part:target.part,cause:match.mode==='pvp'?'pvp':'friendly-fire'});
        if(result.applied){hitAny=true;hitKind='player';headshot=headshot||target.part==='head';killHit=killHit||result.killed;if(p.id===localPlayerId)showDamageNumber(target.player,result.damage,target.part,'player');world.effects.push({type:'impact',life:.22,x:impact[0],y:impact[1],z:impact[2],color:target.part==='head'?'#ffe37a':'#65e8ff'});if(result.killed){p.kills++;toast(`${target.player.profile?.displayName||'Rival'} was eliminated by ${p.profile?.displayName||'a critter'}!`);}}
      }
    }
    lastShotDebug={playerId:p.id,cameraMode:cam.mode,shoulder:cam.side>0?'right':'left',cameraOrigin,cameraDir,aimPoint,cameraTarget:cameraTarget?.kind||'distance',muzzle,baseDirection:trueBaseDir,impact:debugImpact,range:weapon.range};
    if(hitAny){
      if(p.id===localPlayerId){audio.enemyHit();showHitmarker(headshot,killHit,hitKind);}
      else if(match?.role==='host'&&/^guest[1-3]$/.test(p.id))sendNet({type:'hitConfirm',critical:headshot,kill:killHit,target:hitKind},p.id);
    }else if(p.id===localPlayerId){dom.crosshair.classList.remove('miss');void dom.crosshair.offsetWidth;dom.crosshair.classList.add('miss');}
    if(p.id===localPlayerId)updateHUD();
  }
  function showHitmarker(critical=false,kill=false,targetKind='enemy'){
    if(!dom.hitmarker)return;
    const color=kill?'#ff6f91':critical?'#ffe37a':targetKind==='player'?'#65e8ff':'#ffffff';
    dom.hitmarker.style.setProperty('--hit-color',color);dom.hitmarker.dataset.target=targetKind;
    dom.hitmarker.classList.toggle('critical',!!critical&&!kill);dom.hitmarker.classList.toggle('kill',!!kill);dom.hitmarker.classList.remove('show');
    if(dom.crosshair){dom.crosshair.style.setProperty('--confirm-color',color);dom.crosshair.classList.remove('confirmed-hit');void dom.crosshair.offsetWidth;dom.crosshair.classList.add('confirmed-hit');setTimeout(()=>dom.crosshair?.classList.remove('confirmed-hit'),170);}
    if(typeof dom.hitmarker.animate==='function'){
      for(const animation of dom.hitmarker.getAnimations())animation.cancel();
      const duration=kill?420:310;
      const animation=dom.hitmarker.animate([
        {opacity:.42,transform:'translate(-50%,-50%) scale(.55)'},
        {opacity:1,transform:`translate(-50%,-50%) scale(${kill?1.24:1.10})`,offset:.16},
        {opacity:1,transform:'translate(-50%,-50%) scale(.98)',offset:.68},
        {opacity:0,transform:`translate(-50%,-50%) scale(${kill?1.42:1.22})`}
      ],{duration,easing:'cubic-bezier(.16,.84,.3,1)',fill:'none'});
      animation.onfinish=()=>{dom.hitmarker.style.opacity='0';};
    }else{void dom.hitmarker.offsetWidth;dom.hitmarker.classList.add('show');}
  }
  function spawnEnemyDeathBox(e,p){
    const loot=emptySlots(15),enemyAmmo=WEAPONS[e.weaponId]?.ammoItem||weaponFor(p).ammoItem;
    addItem(loot,'scrap',2+Math.floor(Math.random()*4));
    addItem(loot,enemyAmmo,10+Math.floor(Math.random()*19));
    addItem(loot,weaponItemId(e.weaponId),1);
    if(Math.random()<.72)addItem(loot,ARMOR_ITEM_IDS[Math.floor(Math.random()*ARMOR_ITEM_IDS.length)],1);
    if(Math.random()<.72)addItem(loot,'moonberry',1);
    if(Math.random()<.58)addItem(loot,Math.random()<.58?'bandage':'shield_pod',1);
    if(Math.random()<.34)addItem(loot,Math.random()<.7?'armor_plate':'zoomberry',1);
    if(Math.random()<.15)addItem(loot,'crystal',1);
    const ownerName=`${SPECIES[e.species]?.name||'Meadow'} Raider`;
    world.chests.push({id:uid(),kind:'deathbox',ownerName,x:e.x,z:e.z,opened:false,loot});
    world.effects.push({type:'impact',life:.42,x:e.x,y:.5,z:e.z,color:'#ffb04e'});
  }
  function activeSafeZoneAt(x, z) {
    if(isPvpMatch())return null;
    for (const zone of world.safeZones || []) {
      if (zone.kind === 'extract' && !canExtractNow()) continue;
      if (Math.hypot(x-zone.x,z-zone.z) <= zone.r) return zone;
    }
    return null;
  }
  function pvpResult(won){
    const p=getLocalPlayer(),kills=p?.kills||0,xp=(won?80:25)+kills*15,a=activeAccount();
    a.stats.kills+=kills;a.xp+=xp;finishCustomDrop(a);saveDB();
    return {berries:0,xp,petalsEarned:0,overflow:0};
  }
  function finishPvpClient(winnerId,reason){
    if(!match||match.ended)return;
    const won=winnerId===localPlayerId;
    endMatch(won,reason,false,pvpResult(won),true);
  }
  function concludePvp(reason='PvP skirmish complete.'){
    if(!isPvpMatch()||match.ended)return;
    const entries=Object.values(players),alive=entries.filter(p=>p.alive);
    const ranked=[...entries].sort((a,b)=>(Number(b.alive)-Number(a.alive))||((b.kills||0)-(a.kills||0))||((b.hp+b.shield)-(a.hp+a.shield)));
    const winner=alive.length===1?alive[0]:ranked[0],winnerId=winner?.id||'host',winnerName=winner?.profile?.displayName||'A critter';
    const finalReason=`${winnerName} wins the Player vs Player skirmish. ${reason}`;
    if(match.role==='host'&&networkConnected())for(const id of GUEST_IDS)if(hostChannels.get(id)?.readyState==='open')sendNet({type:'pvpEnd',winnerId,reason:finalReason},id);
    finishPvpClient(winnerId,finalReason);
  }
  function checkPvpVictory(){
    if(!isPvpMatch()||match.ended||(match.elapsed||0)<3||Object.keys(players).length<2)return;
    if(Object.values(players).filter(p=>p.alive).length<=1)concludePvp('Last critter standing.');
  }
  function damagePlayer(p,amount,context={}){
    if(!p?.alive)return {applied:false,killed:false,damage:0};
    if((p.spawnProtection||0)>0&&context.cause!=='enemy')return {applied:false,killed:false,damage:0,protected:true};
    const safe=activeSafeZoneAt(p.x,p.z);if(safe){if(p.id===localPlayerId)toast(`${safe.label} protects you`);return {applied:false,killed:false,damage:0,protected:true};}
    if(p.invuln>0)return {applied:false,killed:false,damage:0};
    const before=p.hp+p.shield;let left=Math.max(0,Number(amount)||0);if(p.shield>0){const n=Math.min(p.shield,left);p.shield-=n;left-=n;}p.hp-=left;p.invuln=.18;
    const applied=Math.max(0,before-(p.hp+p.shield));
    if(p.id===localPlayerId){dom.damageFlash.classList.add('show');setTimeout(()=>dom.damageFlash.classList.remove('show'),150);audio.hit();updateHUD();}
    else if(match?.role==='host'&&/^guest[1-3]$/.test(p.id))sendNet({type:'damageTaken',amount:applied,source:context.attacker?.profile?.displayName||'',cause:context.cause||'enemy'},p.id);
    let killed=false;
    if(p.hp<=0){p.hp=0;p.alive=false;killed=true;if(isPvpMatch())setTimeout(checkPvpVictory,0);else if(Object.values(players).every(x=>!x.alive))endMatch(false,'The meadow pests knocked out every critter.');}
    return {applied:applied>0,killed,damage:applied};
  }
  function staticBlocksLine(x1,z1,x2,z2){
    const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz)||1;
    for(const o of world.statics){const r=(o.type==='tree'?.58:.72)*o.s;const t=clamp(((o.x-x1)*dx+(o.z-z1)*dz)/(len*len),0,1),px=x1+dx*t,pz=z1+dz*t;if(Math.hypot(o.x-px,o.z-pz)<r)return true;}
    for(const b of world.blockers||[]){if(b.type==='circle'){const t=clamp(((b.x-x1)*dx+(b.z-z1)*dz)/(len*len),0,1),px=x1+dx*t,pz=z1+dz*t;if(Math.hypot(b.x-px,b.z-pz)<(b.r||.6))return true;}}
    const dir=[dx/len,0,dz/len];if(nearestCoverHit([x1,1.25,z1],dir,len))return true;
    return false;
  }
  function enemyShoot(e,target,distance,damageScale=.34){
    const weapon=WEAPONS[e.weaponId]||WEAPONS.acorn_sprayer,origin=[e.x+Math.sin(e.yaw)*.85,1.38,e.z+Math.cos(e.yaw)*.85],aim=[target.x-origin[0],1.35-origin[1],target.z-origin[2]],l=Math.hypot(...aim)||1;
    let dir=aim.map(v=>v/l),difficulty=activeAccount().settings.difficulty,accuracy=(difficulty==='spicy'?.035:difficulty==='cozy'?.09:.06)+distance*.0018;
    dir=[dir[0]+(Math.random()-.5)*accuracy,dir[1]+(Math.random()-.5)*accuracy,dir[2]+(Math.random()-.5)*accuracy];const dl=Math.hypot(...dir)||1;dir=dir.map(v=>v/dl);
    e.weaponKick=1;e.muzzleFlash=.08;world.effects.push({type:'tracer',life:.10,x:origin[0],y:origin[1],z:origin[2],dx:dir[0],dy:dir[1],dz:dir[2],len:Math.min(distance+2,24),color:weapon.color});
    const coverHit=nearestCoverHit(origin,dir,distance+1.3);const hit=hitTestCritter(origin,dir,target,weapon.range);if(hit&&hit.t<distance+1.3&&(!coverHit||hit.t<coverHit.t))damagePlayer(target,Math.max(3,weapon.damage*damageScale*hit.multiplier));else if(coverHit)world.effects.push({type:'impact',life:.14,x:origin[0]+dir[0]*coverHit.t,y:origin[1]+dir[1]*coverHit.t,z:origin[2]+dir[2]*coverHit.t,color:'#ffdca0'});
  }
  function choosePatrolTarget(e){
    const baseX=Number.isFinite(e.homeX)?e.homeX:e.x,baseZ=Number.isFinite(e.homeZ)?e.homeZ:e.z;
    for(let attempt=0;attempt<10;attempt++){
      e.patrolSeed=(e.patrolSeed||0)+1.731;const angle=e.patrolSeed+Math.random()*Math.PI*2,radius=3.8+Math.random()*7.2;
      const x=clamp(baseX+Math.cos(angle)*radius,-35,35),z=clamp(baseZ+Math.sin(angle)*radius,-35,35);
      if(activeSafeZoneAt(x,z))continue;
      e.patrolTarget={x,z};e.patrolWait=0;return;
    }
    e.patrolTarget={x:baseX,z:baseZ};
  }
  function updateEnemies(dt){
    const difficulty=activeAccount().settings.difficulty;
    const tune=difficulty==='cozy'?{detect:12,shoot:9.5,damage:.20,coolMin:1.7,coolMax:2.35,move:.72,patrol:.62}:difficulty==='spicy'?{detect:23,shoot:19,damage:.52,coolMin:.68,coolMax:1.05,move:1.08,patrol:.92}:{detect:17,shoot:14,damage:.34,coolMin:1.05,coolMax:1.55,move:.92,patrol:.76};
    for(const e of world.enemies){
      if(!e.alive)continue;e.bob+=dt*3;e.attack=(e.attack||0)-dt;e.weaponKick=Math.max(0,(e.weaponKick||0)-dt*8);e.muzzleFlash=Math.max(0,(e.muzzleFlash||0)-dt);
      if(e.training){e.moveBlend=0;continue;}
      let target=null,best=Infinity;for(const p of Object.values(players)){if(!p.alive||activeSafeZoneAt(p.x,p.z))continue;const d=dist2(e,p);if(d<best){best=d;target=p;}}
      if(!target||best>tune.detect){
        if(!e.patrolTarget)choosePatrolTarget(e);
        if((e.patrolWait||0)>0){e.patrolWait-=dt;e.yaw+=dt*.28;e.moveBlend=lerp(e.moveBlend||0,0,Math.min(1,dt*7));continue;}
        const tx=e.patrolTarget.x-e.x,tz=e.patrolTarget.z-e.z,d=Math.hypot(tx,tz)||1;
        if(d<.75){e.patrolTarget=null;e.patrolWait=.7+Math.random()*2.0;e.moveBlend=0;continue;}
        e.yaw=Math.atan2(tx,tz);const beforeX=e.x,beforeZ=e.z;
        moveEntityWithCollisions(e,tx/d*e.speed*tune.patrol*dt,tz/d*e.speed*tune.patrol*dt,.45);
        e.moveBlend=lerp(e.moveBlend||0,1,Math.min(1,dt*7));e.walkTime=(e.walkTime||0)+dt*6.2;
        if(Math.hypot(e.x-beforeX,e.z-beforeZ)<.004){e.patrolTarget=null;e.patrolWait=.25;}
        continue;
      }
      e.patrolTarget=null;
      const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;e.yaw=Math.atan2(dx,dz);
      const blocked=staticBlocksLine(e.x,e.z,target.x,target.z),preferred=difficulty==='cozy'?10:8+(e.id.charCodeAt(0)%4);let move=0,strafe=0;
      if(best>preferred||blocked)move=1;else if(best<4.8)move=-.55;else strafe=Math.sin(performance.now()/1050+(e.bob||0))*.36;
      const fx=dx/d,fz=dz/d,rx=fz,rz=-fx,nx=fx*move+rx*strafe,nz=fz*move+rz*strafe,nextX=e.x+nx*e.speed*tune.move*dt,nextZ=e.z+nz*e.speed*tune.move*dt;
      e.moveBlend=Math.abs(move)+Math.abs(strafe)>.08?1:0;if(e.moveBlend)e.walkTime=(e.walkTime||0)+dt*7;
      if(!activeSafeZoneAt(nextX,nextZ))moveEntityWithCollisions(e,nx*e.speed*tune.move*dt,nz*e.speed*tune.move*dt,.45);
      if(best<tune.shoot&&!blocked&&e.attack<=0){e.attack=tune.coolMin+Math.random()*(tune.coolMax-tune.coolMin);enemyShoot(e,target,best,tune.damage);}else if(best<1.2&&e.attack<=0){e.attack=1.35;damagePlayer(target,5*(difficulty==='cozy'?.6:difficulty==='spicy'?1.2:1));}
    }
  }
  let nearbyChestId=null;
  function findInteraction(p){
    let best=null,dmin=2.2;for(const pu of world.pickups){const d=Math.hypot(p.x-pu.x,p.z-pu.z);if(d<dmin){dmin=d;best={type:'pickup',obj:pu,label:`Pick up ${ITEMS[pu.item.id].name} ×${pu.item.qty}`};}}
    for(const ch of world.chests){const d=Math.hypot(p.x-ch.x,p.z-ch.z);if(d<dmin){dmin=d;const death=ch.kind==='deathbox';best={type:'chest',obj:ch,label:death?`Loot ${ch.ownerName||'Raider'} Death Box`:(ch.opened?'Search opened supply crate':'Open Meadow Supply Crate')};}}
    const de=Math.hypot(p.x-world.extract.x,p.z-world.extract.z);if(de<3.1){const berries=countItem(backpack,'moonberry'),primary=match?.objectives?.primary;best={type:'extract',obj:world.extract,label:!primary?.done?`Complete contract: ${primary?.title||'Drop Contract'}`:berries<5?`Need ${Math.max(0,5-berries)} more Moonberries`:'Hold E to extract'};}
    return best;
  }
  function updateInteraction(dt){
    const p=getLocalPlayer();if(!p||!p.alive)return;currentInteract=findInteraction(p);dom.interaction.hidden=!currentInteract;
    if(!currentInteract){extracting=0;return;}dom.interactionText.textContent=currentInteract.label;dom.interactionBar.style.width=`${extracting/2*100}%`;
    if(!input.interact){extracting=0;dom.interactionBar.style.width='0%';return;}
    if(currentInteract.type==='pickup'){interactPickup(currentInteract.obj,p);input.interact=false;}
    else if(currentInteract.type==='chest'){openChest(currentInteract.obj,p);input.interact=false;}
    else if(currentInteract.type==='extract'&&canExtractNow()){extracting+=dt;dom.interactionBar.style.width=`${clamp(extracting/2*100,0,100)}%`;if(extracting>=2)endMatch(true,'The beacon carried your critter and every secured item safely home.');}
  }
  function interactPickup(pu,p){
    if(match.role==='guest'){input.useSeq++;sendNet({type:'pickupRequest',id:pu.id});return;}
    const n=addItem(p.id===localPlayerId?backpack:(p.inventory||(p.inventory=starterBackpack())),pu.item.id,pu.item.qty,MAX_WEIGHT);if(!n)return p.id===localPlayerId&&toast('Backpack is full or too heavy');pu.item.qty-=n;if(pu.item.qty<=0)world.pickups=world.pickups.filter(x=>x!==pu);if(p.id===localPlayerId){audio.pickup();renderQuickbar();updateHUD();toast(`Picked up ${ITEMS[pu.item.id].name} ×${n}`);}else sendNet({type:'grantItem',id:pu.item.id,qty:n},p.id);
  }
  function openChest(ch,p){
    const firstOpen=!ch.opened;
    ch.opened=true;nearbyChestId=ch.id;
    if(firstOpen&&ch.kind!=='deathbox'&&match?.metrics)match.metrics.chestsOpened=(match.metrics.chestsOpened||0)+1;
    const sourceName=ch.kind==='deathbox'?`${ch.ownerName||'Raider'} Death Box`:'Meadow Supply Crate';
    if(p.id===localPlayerId){openInventory('match',ch.loot);toast(`${sourceName} opened`);}
    else sendNet({type:'openLoot',chestId:ch.id,loot:ch.loot,sourceName},p.id);
  }
  function syncGuestChest(){if(match?.role==='guest'&&nearbyChestId&&networkConnected())sendNet({type:'syncLoot',chestId:nearbyChestId,loot:nearbyLoot});}
  dom.inventoryModal.addEventListener('close',()=>{syncGuestChest();nearbyLoot=null;nearbyChestId=null;if(match)resumePointer();});

  function updateHUD(){
    const p=getLocalPlayer();if(!p)return;const weapon=weaponFor(p),berries=countItem(backpack,'moonberry'),timer=fmtTime(match?.timer||0),pvp=isPvpMatch();
    const setObjective=(row,check,status,done,active,text)=>{if(check)check.checked=done;if(status)status.textContent=text;if(row){row.classList.toggle('complete',done);row.classList.toggle('active',active&&!done);row.classList.toggle('locked',!active&&!done);}};
    dom.hpBar.style.width=`${clamp(p.hp,0,100)}%`;dom.shieldBar.style.width=`${clamp(p.shield/Math.max(1,p.maxShield)*100,0,100)}%`;dom.hpText.textContent=Math.ceil(p.hp);dom.shieldText.textContent=Math.ceil(p.shield);dom.lootText.textContent=pvp?`${Object.values(players).filter(x=>x.alive).length} ALIVE`:`${berries} / 5`;dom.ammoText.textContent=`${p.mag} / ${reserveAmmoFor(p)}`;if(dom.ammoWeaponName)dom.ammoWeaponName.textContent=weapon.name.toUpperCase();dom.timerText.textContent=timer;
    const selfBar=document.getElementById('squadSelfBar');if(selfBar)selfBar.style.width=`${clamp((p.hp+p.shield)/(100+p.maxShield)*100,0,100)}%`;
    const heading=((p.yaw*180/Math.PI)%360+360)%360,headingEl=document.getElementById('compassHeading');if(headingEl)headingEl.textContent=String(Math.round(heading)).padStart(3,'0');
    const miniTimer=document.getElementById('miniTimer');if(miniTimer)miniTimer.textContent=timer;const hudKills=document.getElementById('hudKills');if(hudKills)hudKills.textContent=p.kills||0;
    if(pvp){
      const alivePlayers=Object.values(players).filter(x=>x.alive),rivalsAlive=alivePlayers.filter(x=>x.id!==p.id).length;
      if(dom.aliveCount)dom.aliveCount.textContent=alivePlayers.length;if(dom.lootLabel)dom.lootLabel.textContent='PLAYERS';if(dom.missionListTitle)dom.missionListTitle.textContent='MATCH OBJECTIVES';if(dom.findObjectiveTitle)dom.findObjectiveTitle.textContent='PvP arena active';if(dom.lootObjectiveTitle)dom.lootObjectiveTitle.textContent='Loot supplies';if(dom.extractObjectiveTitle)dom.extractObjectiveTitle.textContent='Last critter standing';
      setObjective(dom.findObjectiveRow,dom.findObjectiveCheck,dom.findObjectiveStatus,true,false,'PvP arena active');
      if(dom.contractObjectiveTitle)dom.contractObjectiveTitle.textContent='Eliminate Rival Critters';
      if(dom.bonusObjectiveTitle)dom.bonusObjectiveTitle.textContent='Rival Eliminations';
      setObjective(dom.contractObjectiveRow,dom.contractObjectiveCheck,dom.contractObjectiveStatus,rivalsAlive===0,p.alive&&rivalsAlive>0,p.alive?`${rivalsAlive} rival${rivalsAlive===1?'':'s'} remaining`:'You were eliminated');
      setObjective(dom.bonusObjectiveRow,dom.bonusObjectiveCheck,dom.bonusObjectiveStatus,(p.kills||0)>=2,p.alive,`${p.kills||0} / 2 player eliminations`);
      setObjective(dom.lootObjectiveRow,dom.lootObjectiveCheck,dom.lootObjectiveStatus,false,p.alive,'Loot and supplies are optional');
      setObjective(dom.extractObjectiveRow,dom.extractObjectiveCheck,dom.extractObjectiveStatus,rivalsAlive===0,p.alive&&rivalsAlive>0,p.alive?'Last critter standing wins':'Spectating match result');
      const label=document.getElementById('extractionLabel');if(label)label.textContent='PLAYER VS PLAYER';
      if(dom.objectiveStep)dom.objectiveStep.textContent=p.alive?'PVP SKIRMISH':'ELIMINATED';
      if(dom.objectiveDetail)dom.objectiveDetail.textContent=p.alive?`${rivalsAlive} rival${rivalsAlive===1?'':'s'} still active • Friendly fire always on`:'Wait for the host to finish the round';
      const safeBadge=document.getElementById('safeZoneBadge');if(safeBadge)safeBadge.hidden=true;
    }else{
      if(dom.lootLabel)dom.lootLabel.textContent='MOONBERRIES';if(dom.missionListTitle)dom.missionListTitle.textContent='DROP OBJECTIVES';if(dom.findObjectiveTitle)dom.findObjectiveTitle.textContent='Locate extraction beacon';if(dom.lootObjectiveTitle)dom.lootObjectiveTitle.textContent='Collect Moonberries';if(dom.extractObjectiveTitle)dom.extractObjectiveTitle.textContent='Extract alive';
      const distanceToExtract=Math.hypot(p.x-world.extract.x,p.z-world.extract.z);
      if(match?.objectives&&!match.objectives.foundExtract&&distanceToExtract<=11){match.objectives.foundExtract=true;toast('Extraction beacon located');}
      updateContractCompletion();if(match?.objectives)match.objectives.berriesReady=berries>=5;
      const found=!!match?.objectives?.foundExtract,berriesReady=berries>=5,extracted=!!match?.objectives?.extracted,primary=match?.objectives?.primary,bonus=match?.objectives?.bonus;
      const primaryCurrent=questProgress(primary),bonusCurrent=questProgress(bonus),primaryDone=!!primary?.done,bonusDone=!!bonus?.done,ready=primaryDone&&berriesReady;
      if(dom.aliveCount)dom.aliveCount.textContent=world.enemies.filter(e=>e.alive).length;
      setObjective(dom.findObjectiveRow,dom.findObjectiveCheck,dom.findObjectiveStatus,found,!found,found?'Beacon located':`${Math.max(0,Math.round(distanceToExtract))}m away`);
      if(dom.contractObjectiveTitle)dom.contractObjectiveTitle.textContent=primary?.title||'Drop contract';if(dom.bonusObjectiveTitle)dom.bonusObjectiveTitle.textContent=bonus?.title||'Bonus contract';if(dom.bonusObjectiveRow)dom.bonusObjectiveRow.classList.add('bonus');
      setObjective(dom.contractObjectiveRow,dom.contractObjectiveCheck,dom.contractObjectiveStatus,primaryDone,found&&!primaryDone,primary?questProgressText(primary,primaryCurrent):'Selecting contract…');
      setObjective(dom.bonusObjectiveRow,dom.bonusObjectiveCheck,dom.bonusObjectiveStatus,bonusDone,found&&!bonusDone,bonus?questProgressText(bonus,bonusCurrent):'Selecting bonus…');
      setObjective(dom.lootObjectiveRow,dom.lootObjectiveCheck,dom.lootObjectiveStatus,berriesReady,found&&primaryDone&&!berriesReady,`${berries} / 5 collected`);
      setObjective(dom.extractObjectiveRow,dom.extractObjectiveCheck,dom.extractObjectiveStatus,extracted,found&&ready,extracted?'Extraction complete':!primaryDone?'Complete drop contract':!berriesReady?'Collect 5 Moonberries':'Ready — hold E at beacon');
      const label=document.getElementById('extractionLabel');if(label)label.textContent=!found?'LOCATE EXTRACTION BEACON':!primaryDone?(primary?.title||'COMPLETE DROP CONTRACT').toUpperCase():!berriesReady?'COLLECT MOONBERRIES':'EXTRACTION READY';
      if(dom.objectiveStep)dom.objectiveStep.textContent=!found?'STEP 1':!primaryDone?'DROP CONTRACT':!berriesReady?'STEP 3':'FINAL STEP';if(dom.objectiveDetail)dom.objectiveDetail.textContent=!found?`${Math.max(0,Math.round(distanceToExtract))}m to the beacon`:!primaryDone?questProgressText(primary,primaryCurrent):!berriesReady?`${Math.max(0,5-berries)} Moonberries remaining`:'Hold E for 2 seconds at the beacon';
      const safe=activeSafeZoneAt(p.x,p.z),safeBadge=document.getElementById('safeZoneBadge');if(safeBadge){safeBadge.hidden=!safe;safeBadge.textContent=safe?`SAFE ZONE • ${safe.label}`:'';}
    }
    const mp=document.getElementById('minimapPlayer');if(mp){mp.style.left=`${clamp(50+p.x/80*100,5,95)}%`;mp.style.top=`${clamp(50+p.z/80*100,5,95)}%`;mp.style.transform=`translate(-50%,-50%) rotate(${heading}deg)`;}
    if(dom.controlHint)dom.controlHint.hidden=!activeAccount().settings.showHints||performance.now()>(match?.hintUntil||0);renderQuickbar();renderSquadHUD();
  }

  function renderSquadHUD(){
    if(!match||!dom.squadMembers)return;const local=getLocalPlayer();if(!local)return;
    setAvatar(dom.hudAvatar,local.profile||activeAccount());dom.hudName.textContent=local.profile?.displayName||activeAccount().displayName;
    dom.squadMembers.innerHTML='';
    for(const p of Object.values(players).filter(x=>x.id!==localPlayerId)){
      const row=document.createElement('div');row.className=`squad-member${p.alive?'':' is-down'}`;
      const av=document.createElement('span');av.className='avatar';setAvatar(av,p.profile||{displayName:p.id});
      const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=p.profile?.displayName||p.id;const bar=document.createElement('i');const fill=document.createElement('b');fill.style.width=`${clamp((p.hp+p.shield)/(100+p.maxShield)*100,0,100)}%`;bar.append(fill);info.append(strong,bar);row.append(av,info);dom.squadMembers.append(row);
    }
    if(match.role!=='solo')dom.networkBadge.textContent=`${match.role==='host'?'HOST':'CO-OP'} • ${Object.keys(players).length}/4`;
  }
  const worldLabelNodes=new Map();
  function projectWorld(camera,x,y,z){
    const canvas=dom.gameCanvas,rect=canvas.getBoundingClientRect(),w=rect.width||canvas.clientWidth||1,h=rect.height||canvas.clientHeight||1;

    // Project through the same renderer matrices that draw the character.
    // This keeps labels locked to heads in WebGL even when the third-person
    // camera is offset, collides with cover, changes FOV, or uses render scale.
    if(rendererMode==='webgl'&&renderer?.view&&renderer?.proj){
      const v=renderer.view,p=renderer.proj;
      const vx=v[0]*x+v[4]*y+v[8]*z+v[12],vy=v[1]*x+v[5]*y+v[9]*z+v[13],vz=v[2]*x+v[6]*y+v[10]*z+v[14],vw=v[3]*x+v[7]*y+v[11]*z+v[15];
      const cx=p[0]*vx+p[4]*vy+p[8]*vz+p[12]*vw,cy=p[1]*vx+p[5]*vy+p[9]*vz+p[13]*vw,cw=p[3]*vx+p[7]*vy+p[11]*vz+p[15]*vw;
      if(cw<=.05)return null;
      const nx=cx/cw,ny=cy/cw,sx=(nx*.5+.5)*w,sy=(.5-ny*.5)*h;
      if(sx<-120||sx>w+120||sy<-120||sy>h+120)return null;
      return{x:sx,y:sy,depth:cw};
    }

    // Canvas fallback already exposes the exact projection used for meshes.
    if(rendererMode==='canvas'&&renderer?.project){
      const q=renderer.project(x,y,z);if(!q)return null;
      const sx=q.x*w/Math.max(1,canvas.width),sy=q.y*h/Math.max(1,canvas.height);
      if(sx<-120||sx>w+120||sy<-120||sy>h+120)return null;
      return{x:sx,y:sy,depth:q.depth};
    }

    // Last-resort projection for a renderer that has not completed a frame.
    const normalize=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];};
    const f=normalize([camera.target[0]-camera.eye[0],camera.target[1]-camera.eye[1],camera.target[2]-camera.eye[2]]),r=normalize([f[2],0,-f[0]]),u=normalize([f[1]*r[2]-f[2]*r[1],f[2]*r[0]-f[0]*r[2],f[0]*r[1]-f[1]*r[0]]);
    const d=[x-camera.eye[0],y-camera.eye[1],z-camera.eye[2]],depth=d[0]*f[0]+d[1]*f[1]+d[2]*f[2];if(depth<.18)return null;
    const focal=(h*.5)/Math.tan(camera.fov*Math.PI/360),sx=w/2+(d[0]*r[0]+d[1]*r[1]+d[2]*r[2])*focal/depth,sy=h/2-(d[0]*u[0]+d[1]*u[1]+d[2]*u[2])*focal/depth;
    if(sx<-120||sx>w+120||sy<-120||sy>h+120)return null;return{x:sx,y:sy,depth};
  }
  function critterNameplateAnchor(entity,appearance){
    const y=Number.isFinite(Number(entity?.y))?Number(entity.y):.9,crouch=clamp(Number(entity?.crouch)||0,0,1);
    const bob=Math.abs(Math.sin(Number(entity?.walkTime)||0))*.055*clamp(Number(entity?.moveBlend)||0,0,1);
    const ap=appearance||{},species=ap.species||'puppy',accessory=ap.accessory||'none';
    const speciesTop={puppy:2.62,bunny:3.10,kitty:2.81,fox:2.81,redpanda:2.81,bear:2.59,panda:2.59,raccoon:2.59}[species]||2.59;
    const accessoryTop={none:0,cap:2.72,crown:2.905,antenna:3.26,headphones:2.56,bandana:1.80}[accessory]||0;
    const baseY=y-.73+bob-crouch*.48;
    return baseY+Math.max(2.53,speciesTop,accessoryTop)+.04;
  }
  function playerNameplateAnchor(p){return critterNameplateAnchor(p,p.profile?.appearance);}
  function enemyNameplateAnchor(e){return critterNameplateAnchor(e,{species:e.species||'fox',accessory:'bandana'});}
  function labelNode(key,type){let node=worldLabelNodes.get(key);if(node)return node;node=document.createElement('div');node.className=`world-label ${type}`;const name=document.createElement('span');name.className='world-label-name';const user=document.createElement('span');user.className='world-label-user';const vitals=document.createElement('span');vitals.className='world-label-vitals';const icon=document.createElement('span');icon.className='world-label-icon';const health=document.createElement('span');health.className='world-label-health';const fill=document.createElement('i');health.append(fill);vitals.append(icon,health);node.append(name,user,vitals);dom.worldLabels?.append(node);worldLabelNodes.set(key,node);return node;}
  function renderWorldLabels(camera){
    if(!dom.worldLabels||!match)return;const seen=new Set(),local=getLocalPlayer();
    for(const p of Object.values(players)){
      if(!p.alive)continue;const isLocal=p.id===localPlayerId;if(isLocal&&cameraMode==='first')continue;
      const headY=playerNameplateAnchor(p),pos=projectWorld(camera,p.x,headY,p.z);if(!pos||pos.depth>90)continue;
      const key=`p:${p.id}`,node=labelNode(key,'player'),ratio=clamp((p.hp+p.shield)/(100+p.maxShield),0,1);seen.add(key);
      node.hidden=false;node.classList.toggle('local-player',isLocal);node.classList.toggle('pvp-rival',isPvpMatch()&&!isLocal);node.classList.toggle('damaged',ratio<.5);node.classList.toggle('critical',ratio<.25);node.style.left=`${Math.round(pos.x)}px`;node.style.top=`${Math.round(pos.y)}px`;node.style.opacity=String(clamp(1-pos.depth/94,.58,1));
      node.querySelector('.world-label-name').textContent=p.profile?.displayName||p.id;const user=node.querySelector('.world-label-user');const username=String(p.profile?.username||'').trim();user.textContent=username?`@${username}`:(isLocal?'YOU':'');user.hidden=!user.textContent;node.querySelector('.world-label-health>i').style.width=`${ratio*100}%`;
    }
    for(const e of world.enemies){
      if(!e.alive)continue;const ratio=clamp(e.hp/Math.max(1,e.maxHp),0,1),distance=local?Math.hypot(e.x-local.x,e.z-local.z):0,maxDistance=e.training?70:(ratio<1?86:58);if(distance>maxDistance)continue;
      const headY=enemyNameplateAnchor(e),pos=projectWorld(camera,e.x,headY,e.z);if(!pos||pos.depth>92)continue;const key=`e:${e.id}`,node=labelNode(key,'enemy');seen.add(key);
      node.hidden=false;node.classList.remove('local-player');node.classList.toggle('damaged',ratio<.5);node.classList.toggle('critical',ratio<.25);node.style.left=`${Math.round(pos.x)}px`;node.style.top=`${Math.round(pos.y)}px`;node.style.opacity=String(clamp(1-pos.depth/96,.55,1));node.querySelector('.world-label-name').textContent=e.training?'Training Raider':`${SPECIES[e.species]?.name||'Meadow'} Raider`;const user=node.querySelector('.world-label-user');user.hidden=true;user.textContent='';node.querySelector('.world-label-health>i').style.width=`${ratio*100}%`;
    }
    for(const [key,node] of worldLabelNodes)if(!seen.has(key))node.hidden=true;
  }

  // -------------------- Scene drawing --------------------
  function drawPine(x,z,s=1){
    renderer.draw('cone',x,1.30*s,z,.58*s,2.6*s,.58*s,'#6b4935');renderer.draw('cylinder',x,.23*s,z,1.05*s,.18*s,1.05*s,'#5d3b2f');
    renderer.draw('cone',x,2.35*s,z,2.25*s,2.55*s,2.25*s,'#286b4c');renderer.draw('cone',x,3.25*s,z,1.78*s,2.30*s,1.78*s,'#37865b');
    if(graphicsProfile().key!=='low')renderer.draw('cone',x,4.08*s,z,1.20*s,1.95*s,1.20*s,'#4da06d');
    if(graphicsProfile().extraCharacterParts){renderer.draw('cone',x-.46*s,2.05*s,z+.20*s,.82*s,1.25*s,.82*s,'#327b54',-.35);renderer.draw('cone',x+.43*s,2.18*s,z-.16*s,.74*s,1.18*s,.74*s,'#438f63',.42);}
  }
  function drawBarn(x,z,s=1,r=0){
    const right=[Math.cos(r),-Math.sin(r)],front=[Math.sin(r),Math.cos(r)],at=(ri,fo)=>[x+right[0]*ri+front[0]*fo,z+right[1]*ri+front[1]*fo];
    renderer.draw('cube',x,1.8*s,z,6.4*s,3.6*s,5.2*s,'#9a4f43',r);
    renderer.draw('cube',x,3.72*s,z,6.9*s,.42*s,5.7*s,'#6c3938',r,0,.10);
    let p=at(0,2.64*s);renderer.draw('cube',p[0],1.45*s,p[1],2.1*s,2.9*s,.18*s,'#342f37',r);
    p=at(0,2.76*s);renderer.draw('cube',p[0],2.22*s,p[1],.22*s,1.15*s,.09*s,'#f2d27c',r);
    p=at(-2.15*s,2.68*s);renderer.draw('cube',p[0],2.2*s,p[1],1.05*s,1.1*s,.12*s,'#8ed0dc',r);
    p=at(2.15*s,2.68*s);renderer.draw('cube',p[0],2.2*s,p[1],1.05*s,1.1*s,.12*s,'#8ed0dc',r);
  }
  function drawWatchtower(x,z,s=1,r=0){
    const right=[Math.cos(r),-Math.sin(r)],front=[Math.sin(r),Math.cos(r)],at=(ri,fo)=>[x+right[0]*ri+front[0]*fo,z+right[1]*ri+front[1]*fo];
    for(const ri of [-1,1])for(const fo of [-1,1]){const p=at(ri*.72*s,fo*.72*s);renderer.draw('cylinder',p[0],1.65*s,p[1],.18*s,3.3*s,.18*s,'#73533e');}
    renderer.draw('cube',x,3.25*s,z,2.25*s,.28*s,2.25*s,'#6c4b36',r);
    renderer.draw('cube',x,4.05*s,z,1.85*s,1.35*s,1.85*s,'#8e694a',r);
    renderer.draw('cube',x,4.82*s,z,2.4*s,.22*s,2.4*s,'#4b3b34',r);
    for(let i=0;i<5;i++){const p=at(-1.08*s+i*.54*s,1.02*s);renderer.draw('cube',p[0],3.65*s,p[1],.09*s,.75*s,.09*s,'#4b3b34',r);}
  }
  function drawRegionFeature(feature){
    if(!feature)return;const {x,z,type}=feature,s=feature.s||1,r=feature.rot||0,right=[Math.cos(r),-Math.sin(r)],front=[Math.sin(r),Math.cos(r)],at=(ri,fo)=>[x+right[0]*ri+front[0]*fo,z+right[1]*ri+front[1]*fo];
    if(type==='pine-camp'){
      const sign=at(0,1.35*s);for(const side of [-1,1]){const q=at(side*.78*s,1.25*s);renderer.draw('cylinder',q[0],1.05*s,q[1],.16*s,2.1*s,.16*s,'#604532',r);}
      renderer.draw('cube',sign[0],1.62*s,sign[1],1.9*s,.66*s,.18*s,'#8c623f',r);renderer.draw('cube',sign[0],1.62*s,sign[1]+.1,1.18*s,.12*s,.08*s,'#78e4ce',r,0,-.1);
      const fire=at(0,-.75*s);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;renderer.draw('sphere',fire[0]+Math.sin(a)*.58*s,.17*s,fire[1]+Math.cos(a)*.58*s,.34*s,.24*s,.34*s,'#6f6b68');}
      renderer.draw('sphere',fire[0],.47*s,fire[1],.72*s,.78*s,.72*s,'#ff9f46',0,0,0,.8);renderer.draw('sphere',fire[0],.88*s,fire[1],.36*s,.72*s,.36*s,'#ffd36f',0,0,0,1);
    }else if(type==='amber-silo'){
      renderer.draw('cylinder',x,2.4*s,z,2.25*s,4.8*s,2.25*s,'#b88954',r);renderer.draw('cone',x,5.10*s,z,2.52*s,1.42*s,2.52*s,'#6c5142',r);
      renderer.draw('cube',x+front[0]*1.16*s,2.15*s,z+front[1]*1.16*s,.78*s,1.45*s,.12*s,'#483a32',r);for(let i=-2;i<=2;i++)renderer.draw('cube',x+right[0]*i*.38*s+front[0]*1.2*s,3.35*s,z+right[1]*i*.38*s+front[1]*1.2*s,.08*s,.32*s,.08*s,'#f2d27c',r);
      for(const side of [-1,1]){const q=at(side*2.05*s,-.45*s);renderer.draw('cylinder',q[0],.56*s,q[1],1.15*s,1.12*s,1.15*s,'#d6b35d',r,Math.PI/2);renderer.draw('cube',q[0],.56*s,q[1],.14*s,1.18*s,1.18*s,'#9c6c3e',r);}
    }else if(type==='marsh-dock'){
      renderer.draw('cylinder',x,.02,z,5.1*s,.05,4.2*s,[.24,.56,.72,.55],r,0,0,.25);
      for(let i=-3;i<=3;i++){const q=at(i*.62*s,0);renderer.draw('cube',q[0],.28*s,q[1],.56*s,.24*s,3.4*s,i%2?'#75553e':'#876247',r);}
      for(const side of [-1,1]){const q=at(side*2.1*s,.85*s);renderer.draw('cylinder',q[0],1.08*s,q[1],.12*s,2.15*s,.12*s,'#503d35',r);renderer.draw('sphere',q[0],2.26*s,q[1],.36*s,.46*s,.36*s,'#a491ff',0,0,0,1);}
    }else if(type==='clover-windmill'){
      renderer.draw('cone',x,2.35*s,z,1.62*s,4.7*s,1.62*s,'#e2d2aa',r);renderer.draw('cone',x,5.02*s,z,1.88*s,1.42*s,1.88*s,'#7a5946',r);
      const hub=at(0,1.0*s);renderer.draw('sphere',hub[0],3.55*s,hub[1],.48*s,.48*s,.48*s,'#ffd36f',0,0,0,.6);
      const spin=(performance.now()/1800)%Math.PI;for(let i=0;i<4;i++){const a=spin+i*Math.PI/2,ri=Math.cos(a)*1.25*s,up=Math.sin(a)*1.25*s,q=at(ri,1.06*s);renderer.draw('wedge',q[0],3.55*s+up,q[1],.52*s,2.45*s,.14*s,'#f0e5c7',r,0,-a);}
      for(let i=0;i<7;i++){const a=i/7*Math.PI*2;renderer.draw('sphere',x+Math.sin(a)*2.25*s,.22*s,z+Math.cos(a)*2.25*s,.26*s,.22*s,.26*s,i%2?'#f8ef72':'#ee82b7');}
    }else if(type==='frost-crystal'){
      renderer.draw('cylinder',x,.07,z,4.4*s,.10,4.4*s,[.75,.91,1,.34],r,0,0,.4);
      for(let i=0;i<7;i++){const a=i/7*Math.PI*2,rad=(i%2?1.25:.55)*s,h=(1.6+(i%3)*.55)*s;renderer.draw('crystal',x+Math.sin(a)*rad,h*.48,z+Math.cos(a)*rad,.74*s,h,.74*s,i%2?'#8fddea':'#b9f4ff',a,.18,a*.25,.7);}
      renderer.draw('crystal',x,2.8*s,z,.82*s,1.12*s,.82*s,'#a491ff',0,0,0,1);
    }else if(type==='redwood-gate'){
      for(const side of [-1,1]){const q=at(side*1.65*s,0);renderer.draw('cone',q[0],2.65*s,q[1],1.05*s,5.3*s,1.05*s,'#7f4936',r);renderer.draw('cone',q[0],5.45*s,q[1],2.35*s,2.8*s,2.35*s,'#396a4b',r);}
      renderer.draw('cube',x,3.75*s,z,4.4*s,.55*s,.66*s,'#6b3d30',r);renderer.draw('cube',x,3.77*s,z+.37,2.2*s,.16*s,.09*s,'#74dfc6',r);
      for(const side of [-1,1]){const q=at(side*2.75*s,-1.25*s);renderer.draw('cylinder',q[0],.45*s,q[1],1.2*s,.9*s,1.2*s,'#8c573c',r);}
    }
  }
  function drawRegionDecor(o,map){
    const s=o.s||1,r=o.rot||0;
    if(o.type==='pine-marker'){drawPine(o.x,o.z,.48*s);renderer.draw('sphere',o.x+.42*s,.18*s,o.z+.25*s,.22*s,.32*s,.22*s,'#8c5b3a');}
    else if(o.type==='hay-bale'){renderer.draw('cylinder',o.x,.48*s,o.z,1.05*s,.96*s,1.05*s,'#d7b458',r,Math.PI/2);renderer.draw('cube',o.x,.48*s,o.z,.12*s,1.02*s,1.08*s,'#9d713e',r);}
    else if(o.type==='marsh-reeds'){renderer.draw('cylinder',o.x,.01,o.z,2.0*s,.04,1.5*s,[.25,.58,.72,.36]);for(let i=-2;i<=2;i++){renderer.draw('cube',o.x+i*.18*s,.55*s,o.z+(i%2)*.16*s,.06*s,1.1*s,.06*s,map.grassA,r,0,i*.16);renderer.draw('sphere',o.x+i*.18*s,1.12*s,o.z+(i%2)*.16*s,.10*s,.25*s,.10*s,'#6a4d39');}}
    else if(o.type==='wildflowers'){for(let i=0;i<7;i++){const a=i/7*Math.PI*2,rad=.45*s+(i%2)*.18*s,x=o.x+Math.sin(a)*rad,z=o.z+Math.cos(a)*rad;renderer.draw('cylinder',x,.28*s,z,.04*s,.56*s,.04*s,'#4f8e4e');renderer.draw('sphere',x,.62*s,z,.19*s,.15*s,.19*s,i%3===0?'#ffd36f':i%3===1?'#ff8eaa':'#a491ff',0,0,0,.25);}}
    else if(o.type==='ice-shard'){for(let i=0;i<3;i++){const a=r+i*2.1,rad=i*.25*s;renderer.draw('crystal',o.x+Math.sin(a)*rad,.62*s+i*.18*s,o.z+Math.cos(a)*rad,.42*s,1.24*s+i*.36*s,.42*s,i%2?'#a7e7ed':'#d2f7ff',a,.16,a*.2,.55);}}
    else if(o.type==='redwood-stump'){renderer.draw('cylinder',o.x,.47*s,o.z,1.15*s,.94*s,1.15*s,'#80513b',r);renderer.draw('cylinder',o.x,.96*s,o.z,1.18*s,.10*s,1.18*s,'#c09268',r);for(let i=0;i<4;i++){const a=i/4*Math.PI*2;renderer.draw('sphere',o.x+Math.sin(a)*.75*s,.18*s,o.z+Math.cos(a)*.75*s,.25*s,.20*s,.25*s,map.grassA);}}
  }
  function drawSupplyCamp(){
    const map=world.map||MAP_VARIANTS[0];
    for(const path of map.paths||[world.route||[]])for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),rot=Math.atan2(dx,dz),segments=Math.max(1,Math.ceil(length/3.1));
      for(let j=0;j<segments;j++){const t=(j+.5)/segments,x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t);renderer.draw('cube',x,-.02,z,6.0,.045,length/segments+.16,j%2?map.pathA:map.pathB,rot);}
    }
    if(map.barn)drawBarn(map.barn.x,map.barn.z,.88,map.barn.rot);if(map.tower)drawWatchtower(map.tower.x,map.tower.z,.9,map.tower.rot);
    if(map.feature)drawRegionFeature(map.feature);for(const o of map.themeDecor||[])drawRegionDecor(o,map);
    for(const crate of map.campCrates||[]){const r=crate.rot||0,front=[Math.sin(r),Math.cos(r)];renderer.draw('cube',crate.x,.55,crate.z,1.6,1.1,1.6,'#a66f42',r);renderer.draw('cube',crate.x+front[0]*.82,.58,crate.z+front[1]*.82,1.4,.12,.08,'#dfb36c',r);renderer.draw('cube',crate.x-front[0]*.82,.58,crate.z-front[1]*.82,1.4,.12,.08,'#dfb36c',r);}
    for(const pine of map.decorativePines||[])drawPine(pine.x,pine.z,pine.s);
    for(const cliff of map.cliffs||[]){const s=cliff.s;renderer.draw('sphere',cliff.x,1.4*s,cliff.z,2.4*s,2.8*s,2.0*s,map.rockA||'#596474',0,.15,.25);if(graphicsProfile().key==='high')renderer.draw('sphere',cliff.x+1.1*s,2.2*s,cliff.z-.5*s,1.35*s,1.8*s,1.2*s,map.rockB||'#6d7683');}
  }
  function drawTrainCar(c){
    const x=c.x,z=c.z,r=c.rot||0,body=c.color||'#a8443f';
    renderer.draw('cube',x,1.78,z,c.w,c.h*.78,c.d,body,r);
    renderer.draw('sphere',x,3.05,z,c.w*1.02,.42,c.d*1.01,'#303940',r);
    renderer.draw('cube',x,2.95,z,c.w*1.02,.22,c.d*1.03,'#4a545b',r);
    const co=Math.cos(r),si=Math.sin(r),right=[co,-si],front=[si,co];
    for(const side of [-1,1])for(const off of [-3.7,-1.3,1.3,3.7]){
      const wx=x+front[0]*off+right[0]*side*(c.w*.44),wz=z+front[1]*off+right[1]*side*(c.w*.44);
      renderer.draw('cylinder',wx,.34,wz,.46,.35,.46,'#1d242a',r,Math.PI/2,0);
      renderer.draw('sphere',wx,.34,wz,.25,.28,.25,'#72787a');
    }
    for(const side of [-1,1]){
      const sx=x+right[0]*side*(c.w*.505),sz=z+right[1]*side*(c.w*.505);
      for(const off of [-3.3,-1.1,1.1,3.3]){
        renderer.draw('cube',sx+front[0]*off,2.12,sz+front[1]*off,.08,.75,1.25,'#90c5cf',r);
        renderer.draw('cube',sx+front[0]*off,1.16,sz+front[1]*off,.10,.95,1.45,'#743a35',r);
      }
      renderer.draw('cube',sx,1.82,sz,.11,2.55,c.d*.92,'#352d31',r);
    }
    renderer.draw('cube',x+front[0]*(c.d*.48),1.56,z+front[1]*(c.d*.48),c.w*.68,2.25,.13,'#252d33',r);
    renderer.draw('cube',x-front[0]*(c.d*.48),1.56,z-front[1]*(c.d*.48),c.w*.68,2.25,.13,'#252d33',r);
    renderer.draw('cube',x,1.02,z,c.w*.30,.42,c.d*.17,'#d5aa55',r);
  }
  function drawFreightCover(c){
    renderer.draw('cube',c.x,c.h*.48,c.z,c.w,c.h,c.d,c.color,c.rot);
    renderer.draw('cube',c.x,c.h+.11,c.z,c.w*1.03,.22,c.d*1.03,'#303b40',c.rot);
    for(let i=-2;i<=2;i++)renderer.draw('cube',c.x+Math.cos(c.rot)*i*.65,c.h*.55,c.z-Math.sin(c.rot)*i*.65,.08,c.h*.72,c.d*.93,'#4c5f67',c.rot);
  }
  function drawContainerCover(c){
    renderer.draw('cube',c.x,c.h*.5,c.z,c.w,c.h,c.d,c.color,c.rot);
    const co=Math.cos(c.rot),si=Math.sin(c.rot);for(let i=-3;i<=3;i++){const off=i*c.w/7;renderer.draw('cube',c.x+co*off,c.h*.52,c.z-si*off,.08,c.h*.82,c.d*1.01,'#5d3c31',c.rot);}
    renderer.draw('cube',c.x,c.h+.08,c.z,c.w*1.02,.16,c.d*1.02,'#3f4749',c.rot);
  }
  function drawCrateWall(c){
    for(let row=0;row<2;row++)for(let col=-2;col<=2;col++){const xx=c.x+Math.cos(c.rot)*col*1.05,zz=c.z-Math.sin(c.rot)*col*1.05;renderer.draw('cube',xx,.55+row*1.05,zz,1,1,1.48,c.color,c.rot);renderer.draw('cube',xx,.55+row*1.05,zz,1.03,.10,1.51,'#d7ab6a',c.rot);}
  }
  function drawCoverYard(){
    // Rails and sleepers make the train area readable as tactical cover.
    const rail=world.map?.rail||{x:-13,z:0,rot:0},r=rail.rot||0,right=[Math.cos(r),-Math.sin(r)],front=[Math.sin(r),Math.cos(r)];
    for(const off of [-1.35,1.35])renderer.draw('cube',rail.x+right[0]*off,.03,rail.z+right[1]*off,.12,.08,38,'#2b3033',r);
    for(let along=-19;along<=19;along+=1.25)renderer.draw('cube',rail.x+front[0]*along,.015,rail.z+front[1]*along,4.0,.08,.18,'#77543c',r);
    for(const c of world.cover||[]){if(c.type==='train')drawTrainCar(c);else if(c.type==='freight')drawFreightCover(c);else if(c.type==='container')drawContainerCover(c);else if(c.type==='cratewall')drawCrateWall(c);else renderer.draw('sphere',c.x,c.h*.42,c.z,c.w,c.h,c.d,c.color,c.rot,.15,.08);}
  }
  function drawGrassClump(x,z,s=1,color='#467f46'){
    for(let i=-1;i<=1;i++)renderer.draw('cube',x+i*.16*s,.23*s,z+(i%2)*.08*s,.06*s,.48*s,.08*s,color,i*.38,0,i*.22);
  }

  function drawWorld() {
    if(!renderer||!match)return;const p=getLocalPlayer();if(!p)return;const cam=cameraFor(p);renderer.begin(cam);
    const map=world.map||MAP_VARIANTS[0];renderer.draw('cube',0,-.22,0,82,.35,82,map.ground||'#68bd82');
    // Seeded tile offsets and irregular patches make the terrain silhouette differ every run.
    const gp=graphicsProfile(),step=gp.patchStep,tile=step*.95,ox=map.tileOffsetX||0,oz=map.tileOffsetZ||0;for(let x=-36+ox;x<=36;x+=step)for(let z=-36+oz;z<=36;z+=step){const c=((Math.round((x-ox)/step)+Math.round((z-oz)/step))%2===0)?map.patchA:map.patchB;renderer.draw('cube',x,-.035,z,tile,.03,tile,c);}
    for(const patch of map.terrainPatches||[])renderer.draw('cube',patch.x,-.012,patch.z,patch.w,.018,patch.d,patch.color,patch.rot||0);
    drawSupplyCamp();drawCoverYard();
    for(let i=0;i<20;i++){const a=i/20*Math.PI*2,rad=45+(i%3)*2;renderer.draw('sphere',Math.sin(a)*rad,5+(i%4),Math.cos(a)*rad,10,12,8,i%2?'#526c5a':'#5e6d61',a);}
    for(const o of world.statics){if(o.type==='tree'){renderer.draw('cone',o.x,.92*o.s,o.z,.68*o.s,1.84*o.s,.68*o.s,'#7b523b',o.rot);renderer.draw('capsule',o.x,2.08*o.s,o.z,2.28*o.s,1.90*o.s,2.28*o.s,o.hue>.5?map.treeA:map.treeB,o.rot);if(gp.secondaryCanopy)renderer.draw('capsule',o.x+.66*o.s,2.32*o.s,o.z-.31*o.s,1.36*o.s,1.34*o.s,1.36*o.s,map.treeC);if(gp.extraCharacterParts)renderer.draw('capsule',o.x-.58*o.s,2.22*o.s,o.z+.40*o.s,.88*o.s,.78*o.s,.88*o.s,map.patchA);}else{renderer.draw('sphere',o.x,.38*o.s,o.z,1.5*o.s,.8*o.s,1.2*o.s,o.hue>.5?map.rockA:map.rockB,o.rot,0,o.rot*.3);}}
    // Visible safe zones. Enemy movement, sight, and damage stop at the ring.
    for(const zone of world.safeZones||[]){if(zone.kind==='extract'&&!canExtractNow())continue;renderer.draw('cylinder',zone.x,.035,zone.z,zone.r*2,.045,zone.r*2,[.18,.86,.92,.16],0,0,0,.35);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;renderer.draw('sphere',zone.x+Math.sin(a)*zone.r,.16,zone.z+Math.cos(a)*zone.r,.16,.16,.16,'#67f0ef',0,0,0,.7);}}
    // Extraction beacon with a bright red smoke column like the target art direction.
    if(gp.key!=='low'){for(let i=0;i<55;i++){const a=(i*2.399963),rad=7+(i%12)*2.3,x=Math.sin(a)*rad,z=Math.cos(a)*rad,rail=world.map?.rail,q=rail?coverLocalPoint(x,z,{...rail,w:7,d:40}):null;if(q&&Math.abs(q.x)<3.5&&Math.abs(q.z)<20)continue;drawGrassClump(x,z,.7+(i%4)*.12,i%3?map.grassA:map.grassB);}}
    const ex=world.extract;renderer.draw('cylinder',ex.x,.08,ex.z,4.2,.15,4.2,'#503c32',0,0,0,.35);renderer.draw('sphere',ex.x,.35,ex.z,1.2,.42,1.2,'#ffd06d',0,0,0,.8);
    for(let i=0;i<7;i++){const sway=Math.sin((performance.now()/520)+i)*.38;renderer.draw('sphere',ex.x+sway,1.0+i*.72,ex.z+Math.cos(i*.8)*.28,1.2+i*.11,.92+i*.08,1.2+i*.11,[.92,.16,.17,.24],0,0,0,.8);}
    for(const ch of world.chests)drawChest(ch);
    for(const pu of world.pickups)drawPickup(pu);
    for(const e of world.enemies)if(e.alive){drawEnemy(e);if(activeAccount().settings.showHitboxes){for(const z of [{y:2.18,r:.55,c:[1,.25,.25,.23]},{y:1.43,r:.58,c:[.25,1,.35,.18]},{y:.93,r:.50,c:[.25,.65,1,.16]},{y:.38,r:.42,c:[1,.8,.2,.14]}])renderer.draw('sphere',e.x,z.y-(e.crouch||0)*.45,e.z,z.r*2,z.r*2,z.r*2,z.c,0,0,0,.2);}}
    for(const pl of Object.values(players)){if(!pl.alive)continue;if(pl.id===localPlayerId&&cameraMode==='first')continue;drawCritter(pl);}
    if(cameraMode==='first')drawFirstPersonWeapon(p,cam);
    for(const fx of world.effects)drawEffect(fx);
    renderer.end?.(); renderWorldLabels(cam);
  }
  function drawWeaponModel(p, baseY, frontX, frontZ, rightX, rightZ, viewScale=1) {
    const w=weaponFor(p), kick=(p.weaponKick||0)*.16, yaw=p.yaw, pitch=-p.pitch*.28;
    const x=p.x+frontX*(.84-kick)+rightX*.43, y=baseY+1.26+(p.weaponKick||0)*.07, z=p.z+frontZ*(.84-kick)+rightZ*.43, s=viewScale;
    const part=(mesh,fo,ri,up,sx,sy,sz,color,ry=yaw,rx=pitch,rz=0,em=0)=>renderer.draw(mesh,x+frontX*fo*s+rightX*ri*s,y+up*s,z+frontZ*fo*s+rightZ*ri*s,sx*s,sy*s,sz*s,color,ry,rx,rz,em);
    part('sphere',.10,-.22,-.02,.18,.20,.18,'#d8b18e');part('sphere',.10,.22,-.02,.18,.20,.18,'#d8b18e');
    if(p.weaponId==='acorn_sprayer'){
      part('wedge',-.44,0,.02,.48,.34,.58,'#34434c');part('cube',-.08,0,.02,.48,.42,.72,w.color);part('sphere',.04,0,-.30,.44,.46,.24,'#6d4b32');part('cube',.48,-.10,.06,.12,.12,.78,'#252e35');part('cube',.48,.10,.06,.12,.12,.78,'#252e35');part('cone',.78,0,.06,.23,.48,.23,'#7c5839',yaw,pitch+Math.PI/2);part('cube',-.16,.20,-.30,.14,.46,.18,'#26333b');part('wedge',-.02,0,.38,.30,.15,.30,'#151e24');
    }else if(p.weaponId==='honey_carbine'){
      part('wedge',-.54,0,.00,.52,.40,.78,'#4a3d2a');part('cube',-.05,0,.02,.52,.38,1.04,w.color);part('cylinder',.04,0,-.34,.34,.48,.34,'#b86b24',yaw,pitch,0);part('cube',.55,0,.04,.20,.19,.94,'#42382d');part('cone',.95,0,.04,.20,.48,.20,'#f5c75d',yaw,pitch+Math.PI/2);part('cube',-.08,0,.36,.48,.12,.44,'#5d401f');part('crystal',.12,0,.48,.18,.26,.18,'#fff0a5',yaw,pitch,0,.45);
    }else if(p.weaponId==='carrot_scatter'){
      part('wedge',-.56,0,-.01,.60,.44,.82,'#68442f');part('cube',-.08,0,.02,.48,.38,.76,w.color);part('cylinder',.53,-.13,.08,.17,1.04,.17,'#253b35',yaw,pitch+Math.PI/2);part('cylinder',.53,.13,.08,.17,1.04,.17,'#253b35',yaw,pitch+Math.PI/2);part('cone',.24,0,-.33,.38,.62,.38,'#ff9a55',yaw,pitch,0);part('wedge',.12,0,.38,.42,.22,.36,'#76bf67');part('cube',-.18,0,-.34,.22,.52,.24,'#4f3428',yaw,pitch,0);
    }else if(p.weaponId==='moonbeam'){
      part('wedge',-.70,0,.00,.48,.34,1.04,'#303755');part('cube',-.16,0,.03,.44,.34,.88,w.color);part('crystal',.02,0,.02,.24,.46,.24,'#73eaf2',yaw,pitch,0,.6);part('cube',.60,0,.04,.16,.15,1.26,'#222a3d');part('cone',1.20,0,.04,.18,.42,.18,'#8cecf4',yaw,pitch+Math.PI/2,0,.35);part('cube',-.04,0,.42,.58,.11,.58,'#171d2e');part('capsule',-.04,0,.54,.20,.32,.20,'#a491ff',yaw,pitch,0,.45);part('cube',-.22,0,-.35,.19,.58,.23,'#202638',yaw,pitch,.10);
    }else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){
      part('wedge',-.48,0,.00,.50,.38,.66,w.dark);part('cube',-.08,0,.02,.46,.38,.78,w.color);part('sphere',.12,0,-.27,.38,.42,.24,'#76a94c');part('capsule',.48,0,.05,.18,.84,.18,'#313644',yaw,pitch+Math.PI/2);part('cone',.86,0,.05,.22,.46,.22,'#8fd466',yaw,pitch+Math.PI/2);part('sphere',.24,0,.31,.28,.20,.24,'#b5ee86');part('cube',-.15,0,-.34,.20,.50,.22,'#4a3a31',yaw,pitch,.08);
    }
    if((p.muzzleFlash||0)>0){part('sphere',1.25,0,.03,.62,.48,.62,'#fff2a8',0,0,0,1);part('sphere',1.47,0,.03,.26,.26,.48,'#ff9f46',0,0,0,1);}
  }

  function drawAccessory(p, ap, baseY, rightX, rightZ, frontX, frontZ, backX, backZ) {
    if(ap.accessory==='cap'){renderer.draw('sphere',p.x-backX*.05,baseY+2.61,p.z-backZ*.05,.92,.22,.82,ap.accentColor,p.yaw);renderer.draw('cube',p.x+frontX*.48,baseY+2.58,p.z+frontZ*.48,.72,.10,.38,ap.accentColor,p.yaw);}
    else if(ap.accessory==='crown'){for(let i=-1;i<=1;i++)renderer.draw('cube',p.x+rightX*i*.25,baseY+2.68,p.z+rightZ*i*.25,.18,.45,.18,'#ffd36f',p.yaw,0,i*.16);}
    else if(ap.accessory==='antenna'){renderer.draw('cylinder',p.x,baseY+2.82,p.z,.08,.65,.08,'#8e82ff');renderer.draw('sphere',p.x,baseY+3.15,p.z,.22,.22,.22,'#63dff5',0,0,0,.9);}
    else if(ap.accessory==='headphones'){renderer.draw('sphere',p.x-rightX*.60,baseY+2.08,p.z-rightZ*.60,.18,.48,.20,'#64e8ea',p.yaw);renderer.draw('sphere',p.x+rightX*.60,baseY+2.08,p.z+rightZ*.60,.18,.48,.20,'#64e8ea',p.yaw);renderer.draw('cylinder',p.x,baseY+2.52,p.z,.08,1.12,.08,'#262b4c',p.yaw,0,Math.PI/2);}
    else if(ap.accessory==='bandana'){renderer.draw('cylinder',p.x,baseY+1.63,p.z,.78,.16,.78,'#ff6f91',p.yaw);renderer.draw('cube',p.x+backX*.55+rightX*.16,baseY+1.57,p.z+backZ*.55+rightZ*.16,.18,.46,.12,'#ff6f91',p.yaw,0,.35);}
  }

  function drawSpeciesFeatures(p, ap, baseY, rightX, rightZ, frontX, frontZ, backX, backZ, dark, paw) {
    const species=ap.species||'puppy', body=ap.bodyColor, accent=ap.accentColor;
    if(species==='puppy'){
      for(const side of [-1,1])renderer.draw('capsule',p.x+rightX*side*.54+backX*.04,baseY+2.28,p.z+rightZ*side*.54+backZ*.04,.34,.82,.28,accent,p.yaw,0,side*.36);renderer.draw('capsule',p.x+frontX*.60,baseY+1.84,p.z+frontZ*.60,.70,.45,.50,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.88,baseY+1.91,p.z+frontZ*.88,.19,.15,.15,dark,p.yaw);renderer.draw('capsule',p.x+backX*.58+rightX*.13,baseY+1.05,p.z+backZ*.58+rightZ*.13,.18,.92,.18,accent,p.yaw,.18,.72);
    }else if(species==='bunny'){
      for(const side of [-1,1])renderer.draw('capsule',p.x+rightX*side*.30+backX*.03,baseY+2.74,p.z+rightZ*side*.30+backZ*.03,.28,1.14,.23,accent,p.yaw,0,side*.16);renderer.draw('sphere',p.x+backX*.54,baseY+1.02,p.z+backZ*.54,.44,.44,.44,'#fff8f6');renderer.draw('capsule',p.x+frontX*.52,baseY+1.83,p.z+frontZ*.52,.52,.31,.40,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.76,baseY+1.88,p.z+frontZ*.76,.13,.11,.12,'#eaa2ad',p.yaw);
    }else if(species==='kitty'){
      for(const side of [-1,1])renderer.draw('wedge',p.x+rightX*side*.40+backX*.02,baseY+2.48,p.z+rightZ*side*.40+backZ*.02,.42,.68,.34,accent,p.yaw,0,side*.18);renderer.draw('capsule',p.x+frontX*.55,baseY+1.84,p.z+frontZ*.55,.60,.34,.43,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.82,baseY+1.90,p.z+frontZ*.82,.14,.11,.12,dark,p.yaw);renderer.draw('capsule',p.x+backX*.61+rightX*.20,baseY+1.08,p.z+backZ*.61+rightZ*.20,.15,1.18,.15,accent,p.yaw,.16,.76);
    }else if(species==='fox'){
      for(const side of [-1,1])renderer.draw('wedge',p.x+rightX*side*.42+backX*.03,baseY+2.53,p.z+rightZ*side*.42+backZ*.03,.40,.78,.34,body,p.yaw,0,side*.20);renderer.draw('cone',p.x+frontX*.65,baseY+1.85,p.z+frontZ*.65,.62,.84,.52,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.94,baseY+1.91,p.z+frontZ*.94,.15,.12,.13,dark,p.yaw);renderer.draw('capsule',p.x+backX*.73+rightX*.27,baseY+1.18,p.z+backZ*.73+rightZ*.27,.46,1.28,.46,body,p.yaw,.18,.70);renderer.draw('cone',p.x+backX*1.02+rightX*.41,baseY+1.43,p.z+backZ*1.02+rightZ*.41,.48,.70,.48,paw,p.yaw,.18,.70);
    }else if(species==='panda'){
      for(const side of [-1,1])renderer.draw('sphere',p.x+rightX*side*.48+backX*.02,baseY+2.42,p.z+rightZ*side*.48+backZ*.02,.36,.36,.30,accent,p.yaw);renderer.draw('capsule',p.x+frontX*.53,baseY+1.84,p.z+frontZ*.53,.62,.38,.46,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.82,baseY+1.90,p.z+frontZ*.82,.16,.13,.13,dark,p.yaw);renderer.draw('sphere',p.x+backX*.48,baseY+1.02,p.z+backZ*.48,.30,.30,.30,accent);
    }else if(species==='bear'){
      for(const side of [-1,1]){renderer.draw('sphere',p.x+rightX*side*.47,baseY+2.43,p.z+rightZ*side*.47,.36,.36,.31,accent,p.yaw);renderer.draw('sphere',p.x+rightX*side*.47+frontX*.02,baseY+2.43,p.z+rightZ*side*.47+frontZ*.02,.18,.18,.12,paw,p.yaw);}renderer.draw('capsule',p.x+frontX*.58,baseY+1.82,p.z+frontZ*.58,.74,.44,.54,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.90,baseY+1.90,p.z+frontZ*.90,.18,.15,.15,dark,p.yaw);renderer.draw('sphere',p.x+backX*.50,baseY+1.00,p.z+backZ*.50,.25,.25,.25,accent);
    }else if(species==='raccoon'){
      for(const side of [-1,1])renderer.draw('wedge',p.x+rightX*side*.42+backX*.02,baseY+2.46,p.z+rightZ*side*.42+backZ*.02,.36,.58,.30,accent,p.yaw,0,side*.18);renderer.draw('capsule',p.x+frontX*.56,baseY+1.84,p.z+frontZ*.56,.62,.37,.46,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.84,baseY+1.90,p.z+frontZ*.84,.15,.12,.13,dark,p.yaw);renderer.draw('capsule',p.x+backX*.70+rightX*.23,baseY+1.13,p.z+backZ*.70+rightZ*.23,.34,1.16,.34,body,p.yaw,.16,.70);for(let i=0;i<3;i++)renderer.draw('cylinder',p.x+backX*(.61+i*.12)+rightX*.21,baseY+1.00+i*.12,p.z+backZ*(.61+i*.12)+rightZ*.21,.36,.12,.36,i%2?body:'#353846',p.yaw,.16,.70);
    }else{
      for(const side of [-1,1])renderer.draw('wedge',p.x+rightX*side*.43+backX*.02,baseY+2.50,p.z+rightZ*side*.43+backZ*.02,.44,.70,.36,accent,p.yaw,0,side*.22);renderer.draw('capsule',p.x+frontX*.56,baseY+1.84,p.z+frontZ*.56,.66,.38,.48,paw,p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.86,baseY+1.90,p.z+frontZ*.86,.15,.12,.13,dark,p.yaw);renderer.draw('capsule',p.x+backX*.73+rightX*.25,baseY+1.18,p.z+backZ*.73+rightZ*.25,.44,1.24,.44,body,p.yaw,.18,.70);for(let i=0;i<3;i++)renderer.draw('cylinder',p.x+backX*(.63+i*.12)+rightX*.23,baseY+1.02+i*.12,p.z+backZ*(.63+i*.12)+rightZ*.23,.46,.13,.46,i%2?'#f6e0c5':'#5a3a35',p.yaw,.18,.70);
    }
    const eyeY=2.08, eyeF=.48;
    if(ap.eyeStyle==='cool'){renderer.draw('cube',p.x+frontX*.53,baseY+eyeY,p.z+frontZ*.53,.70,.22,.10,'#171a2c',p.yaw);}
    else {for(const side of [-1,1]){renderer.draw('sphere',p.x+frontX*eyeF+rightX*side*.24,baseY+eyeY,p.z+frontZ*eyeF+rightZ*side*.24,.105,ap.eyeStyle==='happy'?.07:.15,.08,dark);if(ap.eyeStyle==='sparkle')renderer.draw('sphere',p.x+frontX*.56+rightX*side*.24,baseY+2.12,p.z+frontZ*.56+rightZ*side*.24,.045,.045,.035,'#fff',0,0,0,1);}}
  }
  function drawSpeciesMarkings(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,paw){
    const species=ap.species||'puppy',body=ap.bodyColor,accent=ap.accentColor;
    if(species==='puppy'){
      renderer.draw('cylinder',p.x,baseY+1.64,p.z,.80,.15,.80,'#63dff5',p.yaw);renderer.draw('crystal',p.x+frontX*.79,baseY+1.58,p.z+frontZ*.79,.16,.24,.10,'#ffd36f',p.yaw,0,0,.5);renderer.draw('capsule',p.x+frontX*.47,baseY+2.32,p.z+frontZ*.47,.26,.34,.12,paw,p.yaw,Math.PI/2);
    }else if(species==='bunny'){
      for(const side of [-1,1])renderer.draw('capsule',p.x+rightX*side*.30+frontX*.02,baseY+2.75,p.z+rightZ*side*.30+frontZ*.02,.11,.76,.09,'#efadc7',p.yaw,0,side*.16);for(const side of [-1,1])renderer.draw('sphere',p.x+frontX*.49+rightX*side*.31,baseY+1.83,p.z+frontZ*.49+rightZ*side*.31,.13,.11,.07,'#f5b6c9',p.yaw);
    }else if(species==='kitty'){
      for(let i=-1;i<=1;i++)renderer.draw('wedge',p.x+frontX*.50+rightX*i*.20,baseY+2.39-Math.abs(i)*.06,p.z+frontZ*.50+rightZ*i*.20,.12,.38,.10,accent,p.yaw,0,i*.14);for(const side of [-1,1])for(let i=-1;i<=1;i++)renderer.draw('cube',p.x+frontX*.77+rightX*side*(.30+i*.10),baseY+1.84+i*.07,p.z+frontZ*.77+rightZ*side*(.30+i*.10),.30,.025,.025,paw,p.yaw,0,side*(.08+i*.04));
    }else if(species==='fox'){
      renderer.draw('cone',p.x+frontX*.72,baseY+1.84,p.z+frontZ*.72,.42,.58,.38,'#fff0d9',p.yaw,Math.PI/2);for(const side of [-1,1])renderer.draw('wedge',p.x+frontX*.46+rightX*side*.40,baseY+1.88,p.z+frontZ*.46+rightZ*side*.40,.24,.34,.12,'#fff0d9',p.yaw,0,side*.14);
    }else if(species==='panda'){
      for(const side of [-1,1]){renderer.draw('capsule',p.x+frontX*.48+rightX*side*.27,baseY+2.08,p.z+frontZ*.48+rightZ*side*.27,.28,.36,.12,'#292b38',p.yaw,Math.PI/2);renderer.draw('capsule',p.x+rightX*side*.53+frontX*.30,baseY+1.25,p.z+rightZ*side*.53+frontZ*.30,.28,.52,.28,'#292b38',p.yaw,0,side*.28);}
    }else if(species==='bear'){
      for(const side of [-1,1])renderer.draw('capsule',p.x+frontX*.54+rightX*side*.25,baseY+2.26,p.z+frontZ*.54+rightZ*side*.25,.25,.09,.08,'#6b4432',p.yaw,Math.PI/2);renderer.draw('capsule',p.x+frontX*.62,baseY+1.80,p.z+frontZ*.62,.58,.36,.45,paw,p.yaw,Math.PI/2);
    }else if(species==='raccoon'){
      renderer.draw('capsule',p.x+frontX*.48,baseY+2.08,p.z+frontZ*.48,.78,.30,.12,'#353846',p.yaw,Math.PI/2);renderer.draw('sphere',p.x+frontX*.84,baseY+1.91,p.z+frontZ*.84,.15,.12,.13,'#25263b',p.yaw);for(const side of [-1,1])renderer.draw('sphere',p.x+frontX*.52+rightX*side*.25,baseY+2.08,p.z+frontZ*.52+rightZ*side*.25,.08,.10,.05,'#f4f6f8',p.yaw,0,0,.4);
    }else if(species==='redpanda'){
      for(const side of [-1,1]){renderer.draw('wedge',p.x+frontX*.48+rightX*side*.41,baseY+1.91,p.z+frontZ*.48+rightZ*side*.41,.27,.38,.13,'#f6e0c5',p.yaw,0,side*.14);renderer.draw('sphere',p.x+frontX*.47+rightX*side*.31,baseY+2.20,p.z+frontZ*.47+rightZ*side*.31,.16,.20,.09,'#f6e0c5',p.yaw);}renderer.draw('cone',p.x+frontX*.69,baseY+1.84,p.z+frontZ*.69,.40,.54,.36,'#f6e0c5',p.yaw,Math.PI/2);
    }
    renderer.draw('sphere',p.x+frontX*.60,baseY+1.38,p.z+frontZ*.60,.14,.14,.08,accent,p.yaw,0,0,.35);
  }

  function drawCritter(p){
    const ap=p.profile?.appearance||{species:'puppy',bodyColor:'#d9a06f',accentColor:'#7b4d35',accessory:'cap',eyeStyle:'dot'};
    const speciesStyle=SPECIES[ap.species]||SPECIES.puppy;
    const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw),rightX=cy,rightZ=-sy,frontX=sy,frontZ=cy,backX=-frontX,backZ=-frontZ;
    const walk=Math.sin(p.walkTime||0)*(p.moveBlend||0),walkOpp=Math.sin((p.walkTime||0)+Math.PI)*(p.moveBlend||0),bob=Math.abs(Math.sin(p.walkTime||0))*.055*(p.moveBlend||0);
    const baseY=p.y-.73+bob-(p.crouch||0)*.48, body=ap.bodyColor, accent=ap.accentColor, dark='#292741', vest=speciesStyle.vest, paw=speciesStyle.paw,species=ap.species||'puppy',headWide=species==='bear'?1.20:species==='bunny'?.96:species==='fox'||species==='redpanda'?1.03:1.10,headTall=species==='bunny'?1.04:species==='bear'?.94:.98,headDeep=species==='fox'||species==='redpanda'?.92:.96;
    renderer.draw('sphere',p.x,.045,p.z,1.22,.035,.92,[.08,.12,.16,.30],p.yaw);
    renderer.draw('capsule',p.x-rightX*.25+frontX*.09,baseY+.08,p.z-rightZ*.25+frontZ*.09,.44,.25,.64,accent,p.yaw,walk*.18,0);renderer.draw('capsule',p.x+rightX*.25+frontX*.09,baseY+.08,p.z+rightZ*.25+frontZ*.09,.44,.25,.64,accent,p.yaw,walkOpp*.18,0);
    renderer.draw('capsule',p.x-rightX*.25+frontX*walk*.10,baseY+.48,p.z-rightZ*.25+frontZ*walk*.10,.30,.78,.30,body,p.yaw,walk*.45,0);renderer.draw('capsule',p.x+rightX*.25+frontX*walkOpp*.10,baseY+.48,p.z+rightZ*.25+frontZ*walkOpp*.10,.30,.78,.30,body,p.yaw,walkOpp*.45,0);
    renderer.draw('capsule',p.x,baseY+.92,p.z,.90,.66,.75,body,p.yaw);renderer.draw('capsule',p.x+frontX*.20,baseY+1.27,p.z+frontZ*.20,.78,.86,.57,paw,p.yaw);renderer.draw('capsule',p.x,baseY+1.34,p.z,1.00,1.06,.70,body,p.yaw);renderer.draw('capsule',p.x+backX*.51,baseY+1.30,p.z+backZ*.51,.78,.90,.34,'#58638a',p.yaw);renderer.draw('capsule',p.x,baseY+1.35,p.z,1.02,.69,.74,vest,p.yaw);renderer.draw('wedge',p.x+backX*.73,baseY+1.18,p.z+backZ*.73,.32,.46,.23,'#c8945e',p.yaw);renderer.draw('cube',p.x+backX*.62-rightX*.30,baseY+1.45,p.z+backZ*.62-rightZ*.30,.28,.50,.24,'#42536a',p.yaw);renderer.draw('cube',p.x+backX*.62+rightX*.30,baseY+1.45,p.z+backZ*.62+rightZ*.30,.28,.50,.24,'#42536a',p.yaw);renderer.draw('cone',p.x+backX*.48,baseY+1.82,p.z+backZ*.48,.12,.82,.12,'#7aa0a8',p.yaw,0,Math.PI/2);
    renderer.draw('capsule',p.x-rightX*.55+frontX*.16,baseY+1.34,p.z-rightZ*.55+frontZ*.16,.25,.76,.25,body,p.yaw,walkOpp*.2,-.22);renderer.draw('capsule',p.x+rightX*.55+frontX*.25,baseY+1.34,p.z+rightZ*.55+frontZ*.25,.25,.76,.25,body,p.yaw,walk*.2,.30);renderer.draw('capsule',p.x-rightX*.52+frontX*.47,baseY+1.17,p.z-rightZ*.52+frontZ*.47,.30,.27,.30,paw,p.yaw);renderer.draw('capsule',p.x+rightX*.48+frontX*.52,baseY+1.17,p.z+rightZ*.48+frontZ*.52,.30,.27,.30,paw,p.yaw);
    renderer.draw('capsule',p.x,baseY+2.04,p.z,headWide,headTall,headDeep,body,p.yaw);renderer.draw('sphere',p.x+frontX*.47-rightX*.43,baseY+1.89,p.z+frontZ*.47-rightZ*.43,.23,.22,.18,paw,p.yaw);renderer.draw('sphere',p.x+frontX*.47+rightX*.43,baseY+1.89,p.z+frontZ*.47+rightZ*.43,.23,.22,.18,paw,p.yaw);drawSpeciesFeatures(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,dark,paw);drawSpeciesMarkings(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,paw);drawWeaponModel(p,baseY,frontX,frontZ,rightX,rightZ);drawAccessory(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ);
    if(graphicsProfile().extraCharacterParts){renderer.draw('sphere',p.x-rightX*.27+frontX*.36,baseY+.06,p.z-rightZ*.27+frontZ*.36,.13,.11,.15,paw,p.yaw);renderer.draw('sphere',p.x+rightX*.27+frontX*.36,baseY+.06,p.z+rightZ*.27+frontZ*.36,.13,.11,.15,paw,p.yaw);renderer.draw('cube',p.x-rightX*.48,baseY+1.38,p.z-rightZ*.48,.10,.62,.08,'#83b7a6',p.yaw);renderer.draw('cube',p.x+rightX*.48,baseY+1.38,p.z+rightZ*.48,.10,.62,.08,'#83b7a6',p.yaw);}
  }

  function drawFirstPersonWeapon(p,cam){
    const f=cam.forward,r=cam.right,u=cam.up||[0,1,0],ap=p.profile?.appearance||activeAccount().appearance;
    const speciesStyle=SPECIES[ap.species]||SPECIES.puppy,species=ap.species||'puppy',body=ap.bodyColor,accent=ap.accentColor,paw=speciesStyle.paw,w=weaponFor(p),armColor=species==='panda'||species==='raccoon'?accent:body,pawMesh=species==='bunny'?'capsule':'sphere',pawW=species==='bear'?.26:species==='bunny'?.20:.22,pawH=species==='bunny'?.25:species==='bear'?.21:.18;
    const ads=input.aim?1:0,kick=(p.weaponKick||0)*.12,bob=Math.sin(p.walkTime||0)*.012*(p.moveBlend||0),lift=Math.abs(Math.cos(p.walkTime||0))*.008*(p.moveBlend||0);
    // Keep the view-model close to the critter's chest instead of making the
    // paws look detached or fully stretched across the screen.
    const baseForward=lerp(2.10,1.88,ads)-kick,baseRight=lerp(.30,0,ads),baseUp=lerp(-.45,-.21,ads)+lift;
    const point=(fo,ri,up)=>[cam.eye[0]+f[0]*fo+r[0]*ri+u[0]*up,cam.eye[1]+f[1]*fo+r[1]*ri+u[1]*up,cam.eye[2]+f[2]*fo+r[2]*ri+u[2]*up];
    const leftArm=point(1.04,-.34,-.56-bob),rightArm=point(1.00,.38,-.54+bob),leftPaw=point(1.55,-.22,-.39),rightPaw=point(1.51,.25,-.38);
    renderer.draw('capsule',leftArm[0],leftArm[1],leftArm[2],.17,.42,.17,armColor,p.yaw,-p.pitch,-.26);renderer.draw('capsule',rightArm[0],rightArm[1],rightArm[2],.17,.42,.17,armColor,p.yaw,-p.pitch,.28);
    renderer.draw('capsule',leftArm[0]-f[0]*.13,leftArm[1]-f[1]*.13,leftArm[2]-f[2]*.13,.19,.22,.19,accent,p.yaw,-p.pitch,-.26);renderer.draw('capsule',rightArm[0]-f[0]*.13,rightArm[1]-f[1]*.13,rightArm[2]-f[2]*.13,.19,.22,.19,accent,p.yaw,-p.pitch,.28);
    renderer.draw(pawMesh,leftPaw[0],leftPaw[1],leftPaw[2],pawW,pawH,.23,paw,p.yaw,-p.pitch);renderer.draw(pawMesh,rightPaw[0],rightPaw[1],rightPaw[2],pawW,pawH,.23,paw,p.yaw,-p.pitch);
    if(species==='kitty'||species==='fox'||species==='redpanda'){for(const q of [leftPaw,rightPaw])for(const side of [-1,0,1])renderer.draw('cone',q[0]+r[0]*side*.07+f[0]*.12,q[1]+r[1]*side*.07+f[1]*.12,q[2]+r[2]*side*.07+f[2]*.12,.035,.12,.035,'#fff4df',p.yaw,-p.pitch,Math.PI/2);}else if(species==='bunny'){for(const q of [leftPaw,rightPaw])renderer.draw('capsule',q[0]+f[0]*.08,q[1]+f[1]*.08,q[2]+f[2]*.08,.12,.18,.08,'#efadc7',p.yaw,-p.pitch);}else if(species==='panda'){for(const q of [leftPaw,rightPaw])renderer.draw('sphere',q[0]+f[0]*.08,q[1]+f[1]*.08,q[2]+f[2]*.08,.12,.10,.07,'#292b38',p.yaw,-p.pitch);}else if(species==='raccoon'){for(const q of [leftPaw,rightPaw])renderer.draw('cube',q[0]+f[0]*.08,q[1]+f[1]*.08,q[2]+f[2]*.08,.16,.05,.08,'#353846',p.yaw,-p.pitch);}else{for(const q of [leftPaw,rightPaw])renderer.draw('sphere',q[0]+f[0]*.08,q[1]+f[1]*.08,q[2]+f[2]*.08,.11,.09,.07,accent,p.yaw,-p.pitch);}
    const part=(fo,ri,up,sx,sy,sz,color,rz=0,mesh='cube',em=0)=>{const q=point(baseForward+fo,baseRight+ri,baseUp+up);renderer.draw(mesh,q[0],q[1],q[2],sx,sy,sz,color,p.yaw,-p.pitch,rz,em);};
    if(p.weaponId==='acorn_sprayer'){part(-.48,0,.02,.38,.28,.48,'#34434c',0,'wedge');part(-.16,0,.02,.38,.34,.62,w.color);part(-.02,0,-.27,.36,.36,.20,'#6d4b32',0,'sphere');part(.34,-.08,.05,.09,.10,.62,'#252e35');part(.34,.08,.05,.09,.10,.62,'#252e35');part(.70,0,.05,.18,.20,.24,'#7c5839',0,'cone');part(-.12,0,.30,.26,.10,.24,'#151e24',0,'wedge');}
    else if(p.weaponId==='honey_carbine'){part(-.55,0,.01,.42,.30,.62,'#4a3d2a',0,'wedge');part(-.15,0,.02,.40,.32,.84,w.color);part(-.02,0,-.29,.28,.42,.28,'#b86b24',0,'cylinder');part(.38,0,.04,.15,.14,.78,'#42382d');part(.78,0,.04,.16,.18,.26,'#f5c75d',0,'cone');part(-.04,0,.34,.36,.10,.34,'#5d401f');part(.08,0,.43,.14,.20,.14,'#fff0a5',0,'crystal',.45);}
    else if(p.weaponId==='carrot_scatter'){part(-.56,0,.00,.46,.34,.66,'#68442f',0,'wedge');part(-.15,0,.02,.40,.32,.62,w.color);part(.34,-.11,.07,.13,.13,.78,'#253b35');part(.34,.11,.07,.13,.13,.78,'#253b35');part(.02,0,-.29,.32,.46,.32,'#ff9a55',0,'cone');part(.06,0,.32,.34,.17,.30,'#76bf67',0,'wedge');}
    else if(p.weaponId==='moonbeam'){part(-.70,0,.01,.38,.28,.82,'#303755',0,'wedge');part(-.22,0,.03,.36,.29,.70,w.color);part(-.02,0,.03,.19,.34,.19,'#73eaf2',0,'crystal',.6);part(.40,0,.04,.12,.12,1.02,'#222a3d');part(.88,0,.04,.14,.16,.28,'#8cecf4',0,'cone',.35);part(-.06,0,.38,.48,.09,.48,'#171d2e');part(-.06,0,.48,.16,.27,.16,'#a491ff',0,'capsule',.45);}
    else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){part(-.50,0,.01,.40,.30,.54,w.dark,0,'wedge');part(-.16,0,.02,.38,.31,.64,w.color);part(-.02,0,-.25,.32,.35,.21,'#76a94c',0,'sphere');part(.34,0,.05,.14,.14,.70,'#313644');part(.70,0,.05,.18,.20,.24,'#8fd466',0,'cone');part(.12,0,.28,.24,.16,.20,'#b5ee86',0,'sphere');}
    // Clear iron sight / optic centered only while aiming.
    if(ads>.1){part(-.02,0,.38,.28,.035,.05,'#10191f');part(-.02,0,.43,.035,.10,.035,'#78f5ff',0,'cube',.8);}
    if((p.muzzleFlash||0)>0){part(.98,0,.01,.38,.31,.38,'#fff2a8',0,'sphere',1);part(1.16,0,.01,.17,.16,.31,'#ff9f46',0,'sphere',1);}
  }

  function drawEnemy(e){
    const fake={
      x:e.x,y:.9,z:e.z,yaw:e.yaw||0,pitch:0,alive:true,walkTime:e.walkTime||0,moveBlend:e.moveBlend||0,weaponKick:0,muzzleFlash:0,
      weaponId:e.weaponId||'acorn_sprayer',weaponKick:e.weaponKick||0,muzzleFlash:e.muzzleFlash||0,
      profile:{displayName:'Meadow Raider',appearance:{species:e.species||'fox',bodyColor:e.body||'#e98b4c',accentColor:e.accent||'#fff0d9',accessory:'bandana',eyeStyle:'cool'}}
    };
    drawCritter(fake);
  }
  function pickupColor(id){return({moonberry:'#8e82ff',pea_ammo:'#ffd36f',acorn_ammo:'#f0a25e',nectar_cells:'#ffb74f',carrot_shells:'#ff8b52',moon_slugs:'#a491ff',bandage:'#ff8eaa',medkit:'#ff6f78',shield_pod:'#63dff5',armor_plate:'#c98b58',armor_leaf_vest:'#66bd70',armor_feather_vest:'#8fddea',armor_bark_guard:'#9b6744',armor_root_padding:'#8f6c4b',armor_star_cloak:'#a491ff',zoomberry:'#74e48d',scrap:'#a9a7a0',crystal:'#ff72d3',seed_cache:'#7ef7d4'})[id]||'#fff';}
  function drawPickup(pu){
    pu.spin+=.025;const id=pu.item.id,c=pickupColor(id),bob=Math.sin(pu.spin*2)*.1,y=pu.y+bob,d=(mesh,ox,oy,oz,sx,sy,sz,color,ry=pu.spin,rx=0,rz=0,em=0)=>renderer.draw(mesh,pu.x+ox,y+oy,pu.z+oz,sx,sy,sz,color,ry,rx,rz,em);
    if(ITEMS[id]?.equipment==='weapon'){
      const wid=ITEMS[id].weaponId;
      if(wid==='acorn_sprayer'){d('wedge',-.34,0,0,.38,.28,.48,'#34434c');d('cube',0,0,0,.42,.33,.66,c);d('sphere',0,-.25,0,.35,.35,.20,'#6d4b32');d('cube',.38,0,-.08,.10,.10,.62,'#252e35');d('cube',.38,0,.08,.10,.10,.62,'#252e35');}
      else if(wid==='honey_carbine'){d('wedge',-.38,0,0,.42,.30,.62,'#4a3d2a');d('cube',0,0,0,.42,.32,.84,c);d('cylinder',0,-.27,0,.27,.38,.27,'#b86b24');d('cube',.48,0,0,.15,.14,.72,'#42382d');d('crystal',.05,.32,0,.14,.22,.14,'#fff0a5',pu.spin,0,0,.45);}
      else if(wid==='carrot_scatter'){d('wedge',-.40,0,0,.48,.34,.66,'#68442f');d('cube',-.05,0,0,.40,.32,.62,c);d('cube',.40,.08,-.10,.12,.12,.76,'#253b35');d('cube',.40,.08,.10,.12,.12,.76,'#253b35');d('cone',.04,-.28,0,.30,.46,.30,'#ff9a55');}
      else if(wid==='moonbeam'){d('wedge',-.50,0,0,.36,.26,.78,'#303755');d('cube',-.10,0,0,.34,.28,.68,c);d('crystal',0,0,0,.18,.34,.18,'#73eaf2',pu.spin,0,0,.6);d('cube',.52,0,0,.11,.11,1.05,'#222a3d');d('capsule',-.05,.34,0,.15,.25,.15,'#a491ff',pu.spin,0,0,.45);}
      else if(wid==='pea_popper'){d('wedge',-.35,0,0,.40,.30,.54,'#4c486b');d('cube',0,0,0,.38,.31,.64,c);d('sphere',.02,-.24,0,.30,.34,.20,'#76a94c');d('cube',.42,0,0,.13,.13,.70,'#313644');d('sphere',.12,.28,0,.22,.16,.18,'#b5ee86');}
    }else if(id==='armor_leaf_vest'){d('wedge',0,0,0,.72,.78,.24,c);d('wedge',-.34,-.02,.03,.34,.64,.18,'#3d8750',pu.spin,0,-.26);d('wedge',.34,-.02,.03,.34,.64,.18,'#3d8750',pu.spin,0,.26);d('capsule',0,.11,.16,.14,.55,.07,'#d9e7a5');}
    else if(id==='armor_feather_vest'){for(let i=-2;i<=2;i++)d('capsule',i*.13,-Math.abs(i)*.05,0,.18,.72-Math.abs(i)*.08,.12,i%2?c:'#d6f7f3',pu.spin,0,i*.18);d('cube',0,.25,.12,.58,.11,.07,'#597a8c');}
    else if(id==='armor_bark_guard'){d('cube',0,0,0,.72,.72,.25,c);for(let i=-1;i<=1;i++)d('wedge',i*.22,.02,.15,.24,.60,.08,i?'#7a4d36':'#ad7750',pu.spin,0,i*.08);d('cube',0,.24,.17,.58,.10,.06,'#d0a16e');}
    else if(id==='armor_root_padding'){for(let i=-1;i<=1;i++)d('capsule',i*.20,0,0,.26,.70,.22,i===0?c:'#765438',pu.spin,0,i*.22);for(let i=-1;i<=1;i++)d('cylinder',0,i*.20,.15,.62,.08,.62,'#c09268',pu.spin);}
    else if(id==='armor_star_cloak'){d('wedge',0,-.02,0,.82,.92,.18,'#49466f',pu.spin);d('wedge',-.28,-.02,.04,.38,.78,.14,c,pu.spin,0,-.18);d('wedge',.28,-.02,.04,.38,.78,.14,c,pu.spin,0,.18);for(let i=-1;i<=1;i++)d('crystal',i*.23,.18+Math.abs(i)*.10,.15,.12,.18,.08,'#fff3a8',pu.spin,0,0,.55);}
    else if(id==='pea_ammo'){d('capsule',0,0,0,.62,.38,.46,'#6f8b43',pu.spin,0,Math.PI/2);for(let i=-1;i<=1;i++)d('sphere',i*.17,.03,.27,.16,.16,.13,c,pu.spin,0,0,.25);}
    else if(id==='acorn_ammo'){for(let i=-1;i<=1;i++){d('sphere',i*.20,-.02,0,.24,.30,.24,c);d('cone',i*.20,.20,0,.27,.22,.27,'#6d4b32');}}
    else if(id==='nectar_cells'){for(let i=-1;i<=1;i++){d('capsule',i*.18,0,0,.16,.58,.16,c,pu.spin,0,0,.3);d('cylinder',i*.18,.31,0,.18,.10,.18,'#5d401f');}d('cube',0,-.28,.04,.62,.10,.32,'#6b5336');}
    else if(id==='carrot_shells'){for(let i=-1;i<=1;i++){d('cone',i*.18,0,0,.18,.62,.18,c,pu.spin,0,0);d('capsule',i*.18,.29,0,.15,.16,.15,'#76bf67');}}
    else if(id==='moon_slugs'){for(let i=-1;i<=1;i++)d('crystal',i*.18,0,0,.16,.60,.16,i===0?'#d9d2ff':c,pu.spin,0,0,.55);d('cube',0,-.31,.02,.62,.10,.30,'#303755');}
    else if(id==='moonberry'){d('sphere',-.15,0,0,.36,.36,.36,c,pu.spin,0,0,.5);d('sphere',.15,0,0,.36,.36,.36,'#a99dff',pu.spin,0,0,.5);d('sphere',0,.20,0,.36,.36,.36,'#7566e8',pu.spin,0,0,.5);d('cone',0,.48,0,.09,.36,.09,'#7bdc86',pu.spin);}
    else if(id==='bandage'){d('capsule',0,0,0,.78,.20,.34,'#ffe1ea',pu.spin,0,.55);d('capsule',0,0,.03,.78,.20,.34,c,pu.spin,0,-.55);d('cube',0,.02,.20,.22,.22,.05,'#fff6e8',pu.spin);}
    else if(id==='medkit'){d('cube',0,0,0,.76,.62,.56,'#f6f0de',pu.spin);d('capsule',0,.36,0,.42,.16,.24,'#6e4b3a',pu.spin,0,Math.PI/2);d('cube',0,.02,.30,.13,.44,.06,c,pu.spin);d('cube',0,.02,.30,.45,.13,.06,c,pu.spin);d('cube',-.29,-.12,.31,.09,.28,.05,'#9b7655',pu.spin);d('cube',.29,-.12,.31,.09,.28,.05,'#9b7655',pu.spin);}
    else if(id==='shield_pod'){d('capsule',0,0,0,.56,.72,.56,c,pu.spin,0,0,.55);d('capsule',0,.08,.34,.38,.17,.09,'#d6fbff',pu.spin,Math.PI/2);d('cylinder',0,-.37,0,.42,.12,.42,'#31546a',pu.spin);d('crystal',0,.42,0,.16,.20,.16,'#b9f4ff',pu.spin,0,0,.8);}
    else if(id==='armor_plate'){d('wedge',0,0,0,.72,.72,.24,c,pu.spin);d('wedge',0,.03,.15,.52,.52,.07,'#dfb07f',pu.spin);d('cube',0,.02,.20,.12,.48,.05,'#6d4b32',pu.spin);}
    else if(id==='zoomberry'){d('capsule',0,0,0,.36,.72,.36,c,pu.spin);d('cylinder',0,.42,0,.28,.12,.28,'#d8ffe0',pu.spin);d('cone',0,.52,0,.22,.24,.22,'#55a75f',pu.spin);d('crystal',0,0,.22,.14,.42,.06,'#fff36f',pu.spin,0,.35,.55);}
    else if(id==='crystal'){d('crystal',0,0,0,.62,.96,.62,c,pu.spin,pu.spin*.3,0,.75);d('crystal',-.28,-.18,.04,.24,.52,.24,'#a491ff',pu.spin,-.25,.20,.55);d('crystal',.28,-.20,-.02,.22,.46,.22,'#73eaf2',pu.spin,.22,-.18,.55);}
    else if(id==='seed_cache'){d('capsule',0,0,0,.82,.70,.66,'#466b55',pu.spin);d('cylinder',0,.34,0,.74,.14,.74,'#795b3d',pu.spin);d('wedge',0,.08,.35,.38,.38,.06,c,pu.spin);d('crystal',0,.10,.40,.13,.20,.06,'#d8ffe0',pu.spin,0,0,.45);}
    else if(id==='scrap'){d('wedge',-.18,-.08,0,.42,.46,.36,'#7f858b',pu.spin,pu.spin*.3);d('cylinder',.19,.02,0,.22,.54,.22,'#b7aa8f',pu.spin,.42,.32);d('cube',.04,.17,.16,.44,.13,.12,c,pu.spin,0,.38);d('sphere',-.20,.18,.20,.16,.16,.12,'#d39b52',pu.spin);}
    else d('cube',0,0,0,.52,.52,.52,c,pu.spin,pu.spin*.3);
    renderer.draw('cylinder',pu.x,.05,pu.z,.65,.03,.65,[.15,.18,.28,.3]);
  }
  function drawChest(ch){
    if(ch.kind==='deathbox'){
      const base=ch.opened?'#4b5059':'#2d343d',trim=ch.opened?'#6b727e':'#bd5b48';
      renderer.draw('cube',ch.x,.29,ch.z,1.34,.52,.92,base,0);renderer.draw('cube',ch.x,.58,ch.z-.08,1.38,.22,.96,trim,0,ch.opened?-.48:0);renderer.draw('cube',ch.x,.35,ch.z+.49,.22,.22,.08,'#ffb04e');renderer.draw('cube',ch.x,.62,ch.z+.13,.11,.31,.08,'#f3e2c6');renderer.draw('cube',ch.x,.62,ch.z+.13,.31,.11,.08,'#f3e2c6');
      return;
    }
    renderer.draw('cube',ch.x,.38,ch.z,1.25,.7,.9,ch.opened?'#7a694d':'#b77b50',0);renderer.draw('cube',ch.x,.8,ch.z-.12,1.28,.3,.92,ch.opened?'#8b7858':'#d19460',0,ch.opened?-.65:0);renderer.draw('cube',ch.x,.43,ch.z+.48,.22,.24,.08,'#ffd36f');
  }
  function drawEffect(fx){if(fx.type==='tracer'){const x=fx.x+fx.dx*fx.len/2,y=fx.y+fx.dy*fx.len/2,z=fx.z+fx.dz*fx.len/2;const yaw=Math.atan2(fx.dx,fx.dz),pitch=-Math.asin(clamp(fx.dy,-1,1));renderer.draw('cube',x,y,z,.035,.035,fx.len,fx.color||'#fff4aa',yaw,pitch,0,1);}else if(fx.type==='impact'){const s=Math.max(.05,fx.life*1.8);renderer.draw('sphere',fx.x,fx.y,fx.z,s,s,s,fx.color||'#fff',0,0,0,1);}}
  function updateEffects(dt){for(const fx of world.effects)fx.life-=dt;world.effects=world.effects.filter(f=>f.life>0);}


  // -------------------- Petals economy and Trading Post --------------------
  let merchantMode = 'sell', merchantSelection = null, pendingSale = null, economyBusy = false;
  function recordEconomy(account, entry) {
    account.economyTransactions = Array.isArray(account.economyTransactions) ? account.economyTransactions : [];
    account.economyTransactions.push({ id:uid(), at:Date.now(), version:GAME_VERSION, ...entry });
    account.economyTransactions = account.economyTransactions.slice(-40);
  }
  function openMerchant(mode='sell') {
    if (match) return toast('The Trading Post is available between drops');
    merchantMode = mode === 'buy' ? 'buy' : 'sell'; merchantSelection = null; pendingSale = null;
    if (dom.inventoryModal.open) dom.inventoryModal.close();
    renderMerchant(); if (!dom.merchantModal.open) dom.merchantModal.showModal();
  }
  function setMerchantMode(mode) { merchantMode=mode; merchantSelection=null; dom.merchantSellPanel.hidden=mode!=='sell'; dom.merchantBuyPanel.hidden=mode!=='buy'; dom.merchantSellTab.className=mode==='sell'?'primary':'secondary'; dom.merchantBuyTab.className=mode==='buy'?'primary':'secondary'; renderMerchant(); }
  function renderMerchant() {
    const a=activeAccount(); a.petals=safePetals(a.petals); if(dom.merchantPetals)dom.merchantPetals.textContent=petalLabel(a.petals);
    if(merchantMode==='sell') renderMerchantSell(); else renderMerchantBuy(); refreshAccountUI();
  }
  function renderMerchantSell() {
    if(!dom.merchantSellGrid)return; const a=activeAccount(); dom.merchantSellGrid.innerHTML='';
    a.stash.forEach((item,index)=>{
      const btn=document.createElement('button');btn.type='button';btn.className=`item-slot item-tile rarity-${item?ITEMS[item.id].rarity:'common'}${item?.locked?' locked item-locked':''}${merchantSelection===index?' selected':''}`;
      if(!item){btn.classList.add('empty-tile');btn.disabled=true;btn.innerHTML='<span class="empty-slot-mark"></span>';}
      else {const d=ITEMS[item.id];btn.innerHTML=`<span class="item-tile-qty">${item.qty>1?`×${item.qty}`:''}</span><span class="item-icon"><img src="${d.asset}" alt=""></span><span class="item-tile-name">${d.name}</span>`;btn.title=`${d.name} • ${d.sellPrice} Petals each`;btn.onclick=()=>{merchantSelection=index;renderMerchantSell();};}
      dom.merchantSellGrid.append(btn);
    });
    const item=a.stash[merchantSelection], d=item&&ITEMS[item.id];
    if(!item||!d){dom.merchantDetails.innerHTML='<span class="eyebrow">SALE DETAILS</span><h3>Select a stash item</h3><p>Choose an item to see its value and selling options.</p>';return;}
    const blocked=!d.canSell||d.objective, total=d.sellPrice*item.qty;
    dom.merchantDetails.innerHTML=`<span class="eyebrow">${d.rarity.toUpperCase()} • ${d.merchantCategory.toUpperCase()}</span><h3>${d.name} ×${item.qty}</h3><p>${d.description}</p><div class="merchant-price-table"><span><small>PRICE EACH</small><strong>🌸 ${d.sellPrice}</strong></span><span><small>STACK VALUE</small><strong>🌸 ${total}</strong></span><span><small>BALANCE</small><strong>${petalLabel(a.petals)}</strong></span></div><div class="merchant-actions"><button class="secondary" data-merchant-action="lock">${item.locked?'Unlock Item':'Lock Item'}</button><button class="secondary" data-merchant-action="one" ${blocked||item.locked?'disabled':''}>Sell One</button><button class="primary" data-merchant-action="stack" ${blocked||item.locked?'disabled':''}>Sell Stack</button></div>${blocked?'<p class="inventory-validation">This item cannot be sold.</p>':item.locked?'<p class="inventory-validation">Unlock this item before selling it.</p>':''}`;
    dom.merchantDetails.querySelector('[data-merchant-action="lock"]').onclick=()=>{item.locked=!item.locked;saveDB();renderMerchantSell();};
    dom.merchantDetails.querySelector('[data-merchant-action="one"]').onclick=()=>prepareSale(merchantSelection,1);
    dom.merchantDetails.querySelector('[data-merchant-action="stack"]').onclick=()=>prepareSale(merchantSelection,item.qty);
  }
  function prepareSale(index,qty){const a=activeAccount(),item=a.stash[index],d=item&&ITEMS[item.id];qty=Math.max(1,Math.floor(Number(qty)||0));if(!item||!d||!d.canSell||item.locked||qty>item.qty)return toast('CE-SELL-INVALID: This sale is no longer valid');pendingSale={accountId:a.id,index,itemId:item.id,qty,total:d.sellPrice*qty};dom.sellConfirmTitle.textContent=`Sell ${d.name}?`;dom.sellConfirmBody.innerHTML=`<div class="sell-confirm-item"><img src="${d.asset}" alt=""><div><strong>${d.name} ×${qty}</strong><small>${d.rarity.toUpperCase()}</small></div></div><div class="merchant-price-table"><span><small>PRICE EACH</small><strong>🌸 ${d.sellPrice}</strong></span><span><small>SALE TOTAL</small><strong>🌸 ${pendingSale.total}</strong></span><span><small>AFTER SALE</small><strong>${petalLabel(a.petals+pendingSale.total)}</strong></span></div>`;dom.sellConfirmModal.showModal();}
  function processSale(){if(economyBusy||!pendingSale)return;economyBusy=true;dom.confirmSellBtn.disabled=true;const sale={...pendingSale},a=activeAccount(),snapshot=deepCopy({stash:a.stash,petals:a.petals,economyTransactions:a.economyTransactions});try{const item=a.id===sale.accountId?a.stash[sale.index]:null,d=item&&ITEMS[item.id];if(!item||item.id!==sale.itemId||item.locked||!d?.canSell||sale.qty<1||sale.qty>item.qty)throw new Error('CE-SELL-INVALID');const total=Math.floor(d.sellPrice*sale.qty);if(total!==sale.total||total<0)throw new Error('CE-SELL-INVALID');item.qty-=sale.qty;if(item.qty<=0)a.stash[sale.index]=null;a.petals=safePetals(a.petals+total);recordEconomy(a,{type:'sell',itemId:sale.itemId,qty:sale.qty,amount:total});if(!saveDB())throw new Error('CE-SELL-SAVE');dom.sellConfirmModal.close();pendingSale=null;merchantSelection=null;toast(`Sold ${d.name} for ${formatPetals(total)}`);renderMerchant();}catch(error){a.stash=snapshot.stash;a.petals=snapshot.petals;a.economyTransactions=snapshot.economyTransactions;saveDB();toast(`${error.message||'CE-SELL-SAVE'}: Sale cancelled; no items or Petals changed.`,3500);}finally{economyBusy=false;dom.confirmSellBtn.disabled=false;}}
  function sellJunk(){if(economyBusy)return;const a=activeAccount(),snapshot=deepCopy({stash:a.stash,petals:a.petals,economyTransactions:a.economyTransactions});let total=0,count=0;for(let i=0;i<a.stash.length;i++){const item=a.stash[i],d=item&&ITEMS[item.id];if(!item||item.locked||item.favorite||!SAFE_JUNK_IDS.has(item.id)||!d?.canSell)continue;total+=d.sellPrice*item.qty;count+=item.qty;a.stash[i]=null;}if(!count)return toast('No safe junk is available to sell');a.petals=safePetals(a.petals+total);recordEconomy(a,{type:'sell-junk',qty:count,amount:total});if(!saveDB()){a.stash=snapshot.stash;a.petals=snapshot.petals;a.economyTransactions=snapshot.economyTransactions;saveDB();return toast('CE-SELL-SAVE: Sale cancelled; save failed.',3500);}toast(`Sold ${count} junk item${count===1?'':'s'} for ${formatPetals(total)}`);merchantSelection=null;renderMerchant();}
  function renderMerchantBuy(){if(!dom.merchantBuyGrid)return;const a=activeAccount();dom.merchantBuyGrid.innerHTML='';MERCHANT_BUY_IDS.forEach(id=>{const d=ITEMS[id],card=document.createElement('article');card.className='merchant-buy-card';card.innerHTML=`<img src="${d.asset}" alt=""><div><span class="eyebrow">${d.merchantCategory.toUpperCase()}</span><h3>${d.name}</h3><strong>🌸 ${d.buyPrice}</strong></div><p>${d.description}</p><footer><button class="primary full" type="button">Buy One</button></footer>`;card.querySelector('button').onclick=()=>buyItem(id,1);dom.merchantBuyGrid.append(card);});}
  function buyItem(id,qty=1){if(economyBusy)return;const a=activeAccount(),d=ITEMS[id];qty=Math.max(1,Math.floor(qty));const cost=d.buyPrice*qty;if(a.petals<cost)return toast('CE-BUY-NO-FUNDS: Not enough Petals');if(!canAdd(a.stash,id,qty))return toast('CE-BUY-NO-SPACE: Account Stash has no room');economyBusy=true;const snapshot=deepCopy({stash:a.stash,petals:a.petals,economyTransactions:a.economyTransactions});try{const moved=addItem(a.stash,id,qty);if(moved!==qty)throw new Error('CE-BUY-NO-SPACE');a.petals=safePetals(a.petals-cost);recordEconomy(a,{type:'buy',itemId:id,qty,amount:-cost});if(!saveDB())throw new Error('CE-SAVE-WRITE');toast(`Bought ${d.name} for ${formatPetals(cost)}`);renderMerchant();}catch(error){a.stash=snapshot.stash;a.petals=snapshot.petals;a.economyTransactions=snapshot.economyTransactions;saveDB();toast(`${error.message}: Purchase cancelled; no Petals changed.`,3500);}finally{economyBusy=false;}}
  if(dom.topPetalsBtn)dom.topPetalsBtn.onclick=()=>openMerchant('sell');if(dom.profileMerchantBtn)dom.profileMerchantBtn.onclick=()=>openMerchant('sell');if(dom.merchantBtn)dom.merchantBtn.onclick=()=>openMerchant('sell');if(dom.openMerchantFromInventoryBtn)dom.openMerchantFromInventoryBtn.onclick=()=>openMerchant('sell');if(dom.merchantSellTab)dom.merchantSellTab.onclick=()=>setMerchantMode('sell');if(dom.merchantBuyTab)dom.merchantBuyTab.onclick=()=>setMerchantMode('buy');if(dom.sellJunkBtn)dom.sellJunkBtn.onclick=sellJunk;if(dom.confirmSellBtn)dom.confirmSellBtn.onclick=processSale;

  // -------------------- Main loop and match results --------------------
  let netInputClock = 0, netSnapshotClock = 0;
  function updateRemoteInteraction(p, src, dt) {
    if (!p || !p.alive || !src) return;
    const de = Math.hypot(p.x - world.extract.x, p.z - world.extract.z);
    if (src.interact && de < 3.1 && match?.objectives?.primary?.done && Number(src.berries || 0) >= 5) {
      p.extractProgress = (p.extractProgress || 0) + dt;
      if (p.extractProgress >= 2) endMatch(true, `${p.profile.displayName} activated the extraction beacon.`);
    } else p.extractProgress = 0;
  }
  function updateAuthoritative(dt) {
    const local = players.host;
    match.elapsed=(match.elapsed||0)+dt;
    updatePlayer(local, input, dt, true);
    if (match.role === 'host') {
      for(const [id,src] of Object.entries(guestInputs)){
        const gp=players[id]; if(!gp||!src)continue;
        updatePlayer(gp,src,dt,true);
        if(src.reloadSeq!==gp.lastReloadSeq){gp.lastReloadSeq=src.reloadSeq;reloadPlayer(gp);}
        updateRemoteInteraction(gp,src,dt);
      }
    }
    updateEnemies(dt); updateInteraction(dt); updateEffects(dt);
    match.timer -= dt; if (match.timer <= 0) { if(isPvpMatch())concludePvp('Time expired; score and remaining health broke the tie.'); else endMatch(false, 'The storm closed the Moonmeadow extraction window.'); }
    if (match.role === 'host') { netSnapshotClock += dt; if (netSnapshotClock >= .1) { netSnapshotClock = 0; sendSnapshot(); } }
  }
  function updateGuest(dt) {
    const p = players[localPlayerId]; if(!p)return;
    updatePlayer(p, input, dt, false);
    const interaction = findInteraction(p); currentInteract = interaction; dom.interaction.hidden = !interaction;
    if (interaction) {
      dom.interactionText.textContent = interaction.label;
      if (input.interact) {
        if (interaction.type === 'pickup') { sendNet({type:'pickupRequest', id:interaction.obj.id}); input.interact = false; }
        else if (interaction.type === 'chest') { sendNet({type:'chestRequest', id:interaction.obj.id}); input.interact = false; }
        else if (interaction.type === 'extract' && canExtractNow()) extracting = Math.min(2, extracting + dt);
      } else extracting = 0;
      dom.interactionBar.style.width = `${extracting / 2 * 100}%`;
    } else extracting = 0;
    updateEffects(dt);
    netInputClock += dt;
    if (netInputClock >= .04) {
      netInputClock = 0;
      sendNet({type:'input', keys:[...input.keys], fire:input.fire, shotSeq:input.shotSeq, jumpSeq:input.jumpSeq, aim:input.aim, interact:input.interact, yaw:p.yaw, pitch:p.pitch, cameraMode, shoulderSide, berries:countItem(backpack,'moonberry'), reloadSeq:input.reloadSeq});
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    if (!match) return;
    if (!paused && !match.ended) {
      if (match.role === 'guest') updateGuest(dt); else updateAuthoritative(dt);
      updateHUD();
    }
    drawWorld();
  }
  requestAnimationFrame(frame);

  function bankExtractedItems() {
    const a = activeAccount(); const berries = countItem(backpack, 'moonberry'); let banked = 0, overflow = 0;
    for (const it of backpack) {
      if (!it) continue;
      // Starter ammo and basic bandages are consumed at the end of a run to avoid free-item duplication.
      if (ITEMS[it.id]?.ammo) continue;
      const moved = addItem(a.stash, it.id, it.qty); banked += moved; overflow += it.qty - moved;
    }
    const extractedPlayer=getLocalPlayer();
    if(extractedPlayer?.weaponId&&WEAPONS[extractedPlayer.weaponId])a.equippedWeaponId=extractedPlayer.weaponId;
    if(extractedPlayer?.armorId&&ARMORS[extractedPlayer.armorId])a.equippedArmorId=extractedPlayer.armorId;
    syncAccountLoadout(a);
    a.stats.extracts++; a.stats.berries += berries; a.stats.kills += extractedPlayer?.kills || 0;
    const xp = 60 + berries * 18 + (getLocalPlayer()?.kills || 0) * 12 + Math.floor(inventoryValue(backpack) / 50); a.xp += xp;
    const petalsEarned = 15 + (match?.objectives?.bonus?.done ? 10 : 0); a.petals = safePetals(a.petals + petalsEarned); a.economyTransactions.push({id:uid(),type:'reward',amount:petalsEarned,reason:'extraction',at:Date.now()}); a.economyTransactions=a.economyTransactions.slice(-40); finishCustomDrop(a); saveDB(); return { berries, xp, petalsEarned, overflow, banked };
  }
  function endMatch(success, reason, immediateMenu = false, remotePayload = null, suppressNetwork = false) {
    if (!match || match.ended) return;
    if(success&&match.objectives){match.objectives.extracted=true;updateHUD();}
    match.ended = true; pauseMenuOpen=false; pauseSubmenuOpen=false; paused=false; resetTouchControls(); dom.playOverlay.hidden=true; document.exitPointerLock?.(); dom.pauseModal.close(); if (dom.inventoryModal.open) dom.inventoryModal.close();
    let result;
    if (remotePayload) result = remotePayload;
    else if (success) result = bankExtractedItems();
    else { const a=activeAccount(); a.stats.kills += getLocalPlayer()?.kills || 0; a.xp += (getLocalPlayer()?.kills || 0) * 5; finishCustomDrop(a); saveDB(); result = { berries:0, xp:(getLocalPlayer()?.kills || 0)*5, petalsEarned:0, overflow:0 }; }
    if (!suppressNetwork && match.role === 'host' && networkConnected()) sendNet({type:'matchEnd',success,reason,hostSummary:result});
    if (immediateMenu) return returnToMenu();
    const pvpResultScreen=match.mode==='pvp';dom.resultEyebrow.textContent = pvpResultScreen?(success?'PVP VICTORY':'PVP ELIMINATED'):(success?'EXTRACTION COMPLETE':'DROP FAILED'); dom.resultTitle.textContent = pvpResultScreen?(success?'Last Critter Standing':'Skirmish Complete'):(success?'Loot Secured':'Back to Camp');
    dom.resultText.textContent = `${reason}${success && result.overflow ? ` ${result.overflow} item(s) could not fit in the stash.` : ''}`;
    dom.resultLoot.textContent = success ? result.berries : 0; if(dom.resultPetals) dom.resultPetals.textContent = result.petalsEarned || 0; dom.resultKills.textContent = getLocalPlayer()?.kills || 0; dom.resultXP.textContent = result.xp || 0;
    dom.resultModal.showModal(); refreshAccountUI();
  }
  function handleRemoteMatchEnd(msg) {
    if (!match || match.ended) return;
    if (msg.success) {
      const localResult = bankExtractedItems(); endMatch(true, msg.reason || 'The host completed extraction.', false, localResult);
    } else endMatch(false, msg.reason || 'The co-op drop ended.', false, {berries:0,xp:(getLocalPlayer()?.kills||0)*5,petalsEarned:0,overflow:0});
  }
  function returnToMenu() {
    if (match?.role !== 'solo') closePeer();
    match = null; players = {}; guestInputs=Object.create(null); paused = false; pauseMenuOpen = false; pauseSubmenuOpen = false; nearbyLoot = null; backpack = emptySlots(SLOT_COUNT);
    document.body.classList.remove('in-match'); if(dom.worldLabels)dom.worldLabels.innerHTML=''; worldLabelNodes.clear(); dom.resultModal.close(); dom.playOverlay.hidden=true; dom.gameScreen.classList.remove('active'); dom.menuScreen.classList.add('active'); dom.interaction.hidden = true; refreshAccountUI();
  }
  $('#resultMenuBtn').onclick = returnToMenu;
  $('#soloBtn').onclick = () => startMatch('solo');

  // -------------------- Code-only online WebRTC co-op (up to four players) --------------------
  const MAX_PLAYERS=4, GUEST_IDS=['guest1','guest2','guest3'];
  let peer=null, guestChannel=null, networkRole='solo', roomPin='', assignedGuestId='', joinBusy=false, networkSession=0, peerJsPromise=null;
  const hostChannels=new Map();
  function roomRuleText(rules=roomRules){const normalized=normalizeRoomRules(rules);return normalized.mode==='pvp'?'Player vs Player • Player damage always enabled':`Co-op Extraction • Friendly fire ${normalized.friendlyFire?'enabled':'disabled'}`;}
  function renderRoomRules(){
    const normalized=normalizeRoomRules(roomRules),pvp=normalized.mode==='pvp';
    if(dom.hostModeCoop)dom.hostModeCoop.checked=!pvp;if(dom.hostModePvp)dom.hostModePvp.checked=pvp;if(dom.hostFriendlyFire)dom.hostFriendlyFire.checked=!!normalized.friendlyFire&&!pvp;
    if(dom.hostFriendlyFireRow)dom.hostFriendlyFireRow.classList.toggle('disabled',pvp);if(dom.hostFriendlyFire)dom.hostFriendlyFire.disabled=pvp;
    if(dom.hostRulesHelp)dom.hostRulesHelp.textContent=pvp?'PvP removes AI raiders and ends when one player remains.':'Co-op Extraction keeps every player on one team.';
    if(dom.joinRulesSummary)dom.joinRulesSummary.innerHTML=`<strong>ROOM RULES</strong><span>${roomRuleText(normalized)}</span>`;
  }
  function syncHostRulesFromUI(){roomRules=normalizeRoomRules({mode:dom.hostModePvp?.checked?'pvp':'coop',friendlyFire:!!dom.hostFriendlyFire?.checked});renderRoomRules();return roomRules;}
  function broadcastRoomRules(){if(networkRole==='host'){lobbyProfiles=currentRoster();sendNet({type:'roster',roster:lobbyProfiles,rules:normalizeRoomRules(roomRules)});}renderRoomRules();updateHostStartButton();}
  let lobbyProfiles={host:null};
  // Prefer the bundled client so GitHub Pages multiplayer does not depend on
  // a third-party CDN. HTTPS CDN copies remain recovery fallbacks.
  const PEERJS_SOURCES=[localAsset('vendor/peerjs.min.js'),'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js'];
  const makeRoomPin=()=>{if(globalThis.crypto?.getRandomValues){const n=new Uint32Array(1);crypto.getRandomValues(n);return String(100000+(n[0]%900000));}return String(Math.floor(100000+Math.random()*900000));};
  const roomPeerId=pin=>`harleys-critter-${pin}`;
  function safeAvatar(value){const v=String(value||'').trim();if(v.length>450000)return '';return /^(data:image\/(?:png|jpeg|jpg|webp|gif);base64,|https?:\/\/)/i.test(v)?v:'';}
  function normalizeNetworkProfile(profile={},fallback='Critter'){
    const appearance=profile.appearance&&typeof profile.appearance==='object'?profile.appearance:{};
    const species=SPECIES[appearance.species]?appearance.species:'puppy';
    const loadoutId=LOADOUTS[profile.loadoutId]?profile.loadoutId:defaultLoadoutId,kit=LOADOUTS[loadoutId];
    return {displayName:safeText(profile.displayName||fallback,24)||fallback,username:safeText(profile.username||'',24),avatar:safeAvatar(profile.avatar),appearance:{species,bodyColor:String(appearance.bodyColor||SPECIES[species].body).slice(0,20),accentColor:String(appearance.accentColor||SPECIES[species].accent).slice(0,20),accessory:safeText(appearance.accessory||'none',20),eyeStyle:safeText(appearance.eyeStyle||'dot',20)},loadoutId,equippedWeaponId:WEAPONS[profile.equippedWeaponId]?profile.equippedWeaponId:kit.weapon,equippedArmorId:ARMORS[profile.equippedArmorId]?profile.equippedArmorId:kit.armorId};
  }
  function normalizeRoster(roster){const out={};for(const id of ['host',...GUEST_IDS])if(roster?.[id])out[id]=normalizeNetworkProfile(roster[id],id==='host'?'Host Critter':'Co-op Critter');return out;}
  function currentRoster(){const r=normalizeRoster(lobbyProfiles);if(networkRole==='host'){r.host=profilePacket();}else if(networkRole==='guest'){if(assignedGuestId)r[assignedGuestId]=profilePacket();else if(!Object.keys(r).length)r.guest1=profilePacket();}else if(!r.host)r.host=profilePacket();return r;}
  function setNetworkStatus(role,text,state='',help=''){const status=role==='host'?dom.hostNetworkStatus:dom.joinNetworkStatus,dot=role==='host'?dom.hostNetworkDot:dom.joinNetworkDot,helper=role==='host'?dom.hostNetworkHelp:dom.joinNetworkHelp;if(status)status.textContent=text;if(dot)dot.className=state;if(helper)helper.textContent=help||'';}
  function ensurePeerJs(){if(window.Peer)return Promise.resolve(window.Peer);if(peerJsPromise)return peerJsPromise;peerJsPromise=new Promise((resolve,reject)=>{let i=0;const next=()=>{if(window.Peer)return resolve(window.Peer);if(i>=PEERJS_SOURCES.length)return reject(new Error('Online room service library could not load'));const script=document.createElement('script');script.src=PEERJS_SOURCES[i++];script.async=true;script.crossOrigin='anonymous';script.dataset.optionalNetworkScript='true';script.onload=()=>window.Peer?resolve(window.Peer):(script.remove(),next());script.onerror=()=>{script.remove();next();};document.head.appendChild(script);};next();}).catch(err=>{peerJsPromise=null;throw err;});return peerJsPromise;}
  function peerOptions(){return {host:'0.peerjs.com',port:443,path:'/',secure:true,key:'peerjs',debug:1,config:{iceCandidatePoolSize:4,iceTransportPolicy:'all',iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'},{urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478'],username:'peerjs',credential:'peerjsp'}]}};}
  function coOpReadinessError(){if(globalThis.navigator?.onLine===false)return 'You are offline. Reconnect before using online co-op.';if(!globalThis.RTCPeerConnection)return 'This browser does not provide the WebRTC data channels required for co-op.';if(location.protocol==='http:')return 'Online co-op requires HTTPS. Open the GitHub Pages address instead of an insecure copy.';return '';}
  function cleanJoinPin(){return String(dom.joinRoomPin?.value||'').replace(/\D/g,'').slice(0,6);}
  function copyText(text,label){if(!text)return toast(`No ${label.toLowerCase()} is ready`);const fallback=()=>{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();document.execCommand('copy');area.remove();toast(`${label} copied`);};if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast(`${label} copied`)).catch(fallback);else fallback();}
  function makeAdapter(conn){return {conn,get readyState(){return conn.open?'open':(conn._closed?'closed':'connecting');},send(data){conn.send(data);},close(){conn.close();}};}
  function networkConnected(){if(networkRole==='host')return [...hostChannels.values()].some(c=>c.readyState==='open');return guestChannel?.readyState==='open';}
  function connectedCount(){return 1+(networkRole==='host'?[...hostChannels.values()].filter(c=>c.readyState==='open').length:Object.keys(currentRoster()).filter(id=>id!=='host').length);}
  function sendVia(adapter,data){if(adapter?.readyState==='open')try{adapter.send(JSON.stringify(data));}catch(err){console.warn('Network send failed',err);}}
  function sendNet(data,targetId=''){if(networkRole==='host'){if(targetId)return sendVia(hostChannels.get(targetId),data);for(const adapter of hostChannels.values())sendVia(adapter,data);}else sendVia(guestChannel,data);}
  function renderLobbyRoster(){
    const roster=currentRoster(),ids=['host',...GUEST_IDS],localId=networkRole==='host'?'host':(assignedGuestId||'guest1');
    for(const [root,count] of [[dom.hostLobbyRoster,dom.hostLobbyCount],[dom.joinLobbyRoster,dom.joinLobbyCount]]){
      if(!root)continue;root.innerHTML='';let used=0;
      for(const id of ids){const profile=roster[id];if(profile){used++;const row=document.createElement('div');row.className='lobby-player';const av=document.createElement('span');av.className='avatar';setAvatar(av,profile);const info=document.createElement('div');info.className='lobby-player-info';const strong=document.createElement('strong');strong.textContent=profile.displayName;const small=document.createElement('small');small.textContent=profile.username?`@${profile.username}`:(id==='host'?'Room host':'Connected player');info.append(strong,small);const badge=document.createElement('span');badge.className=id===localId?'lobby-you':(id==='host'?'lobby-host':'lobby-ready');badge.textContent=id===localId?'YOU':(id==='host'?'HOST':'READY');row.append(av,info,badge);root.append(row);}else{const empty=document.createElement('div');empty.className='lobby-empty';empty.textContent='Open player slot';root.append(empty);}}
      if(count)count.textContent=`${used} / ${MAX_PLAYERS}`;
    }
  }
  function broadcastRoster(){lobbyProfiles=currentRoster();sendNet({type:'roster',roster:lobbyProfiles,rules:normalizeRoomRules(roomRules)});renderLobbyRoster();renderRoomRules();updateHostStartButton();}
  function updateHostStartButton(){if(!dom.startCoopBtn)return;const openGuests=GUEST_IDS.filter(id=>hostChannels.get(id)?.readyState==='open'),readyGuests=openGuests.filter(id=>lobbyProfiles[id]);dom.startCoopBtn.disabled=readyGuests.length<1;dom.startCoopBtn.textContent=readyGuests.length?`Start ${roomRules.mode==='pvp'?'PvP Skirmish':'Co-op Drop'} • ${readyGuests.length+1}/4`:(openGuests.length?'Loading Player Profile…':'Waiting for Players…');}
  function refreshJoinAction(){if(!dom.joinRoomBtn)return;const pin=cleanJoinPin(),connected=guestChannel?.readyState==='open';if(dom.joinRoomPin&&dom.joinRoomPin.value!==pin)dom.joinRoomPin.value=pin;if(connected){dom.joinRoomBtn.textContent=`Connected • ${connectedCount()}/4`;dom.joinRoomBtn.disabled=true;if(dom.joinActionHelp)dom.joinActionHelp.textContent='Connected. The host can start when the lobby is ready.';return;}if(joinBusy){dom.joinRoomBtn.textContent='Joining Room…';dom.joinRoomBtn.disabled=true;if(dom.joinActionHelp)dom.joinActionHelp.textContent='Finding the host and opening the direct connection.';return;}dom.joinRoomBtn.textContent='Join Room';dom.joinRoomBtn.disabled=false;if(dom.joinActionHelp)dom.joinActionHelp.textContent=/^\d{6}$/.test(pin)?'Press Enter or click Join Room.':'Enter all six digits, then press Enter or click Join Room.';}
  function closePeer(){networkSession++;for(const c of hostChannels.values())try{c.close();}catch(_){}hostChannels.clear();try{guestChannel?.close?.();}catch(_){}try{peer?.destroy?.();}catch(_){}try{peer?.disconnect?.();}catch(_){}guestChannel=null;peer=null;guestInputs=Object.create(null);lastGuestShots=Object.create(null);assignedGuestId='';joinBusy=false;networkRole='solo';lobbyProfiles={host:null};updateHostStartButton();renderLobbyRoster();}
  function attachHostConnection(conn,playerId){const adapter=makeAdapter(conn);hostChannels.set(playerId,adapter);let opened=false;const onOpen=()=>{if(opened||hostChannels.get(playerId)!==adapter)return;opened=true;setNetworkStatus('host',`${hostChannels.size} player${hostChannels.size===1?'':'s'} connected`,'connected',`Lobby has ${hostChannels.size+1} of ${MAX_PLAYERS} players.`);sendVia(adapter,{type:'welcome',playerId,hostProfile:profilePacket(),roster:currentRoster(),rules:normalizeRoomRules(roomRules),maxPlayers:MAX_PLAYERS});updateHostStartButton();renderLobbyRoster();};conn.on('open',onOpen);conn.on('data',data=>{try{handleNet(typeof data==='string'?JSON.parse(data):data,playerId);}catch(err){console.warn('Bad network message',err);}});conn.on('close',()=>{if(hostChannels.get(playerId)===adapter)hostChannels.delete(playerId);delete guestInputs[playerId];delete lastGuestShots[playerId];delete lobbyProfiles[playerId];broadcastRoster();setNetworkStatus('host',hostChannels.size?'Player disconnected — room still open':'Room ready — waiting for players',hostChannels.size?'connected':'working',`Lobby has ${hostChannels.size+1} of ${MAX_PLAYERS} players.`);if(match&&!match.ended){const departed=players[playerId]?.profile?.displayName||'A player';delete players[playerId];renderSquadHUD();toast(`${departed} disconnected`);}});conn.on('error',err=>console.error('Peer connection error',err));if(conn.open)setTimeout(onOpen,0);}
  function attachGuestConnection(conn){const adapter=makeAdapter(conn);guestChannel=adapter;let opened=false;const onOpen=()=>{if(opened||guestChannel!==adapter)return;opened=true;joinBusy=false;setNetworkStatus('join','Connected — joining lobby','connected','Loading player profiles…');sendVia(adapter,{type:'profile',profile:profilePacket()});refreshJoinAction();};conn.on('open',onOpen);conn.on('data',data=>{try{handleNet(typeof data==='string'?JSON.parse(data):data,'host');}catch(err){console.warn('Bad network message',err);}});conn.on('close',()=>{if(guestChannel===adapter)guestChannel=null;joinBusy=false;setNetworkStatus('join','Connection closed','','Enter the room code again to reconnect.');refreshJoinAction();if(match&&!match.ended)toast('Disconnected from host');});conn.on('error',err=>{console.error('Peer connection error',err);joinBusy=false;setNetworkStatus('join','Connection error','','The network may be blocking the direct WebRTC connection.');refreshJoinAction();});if(conn.open)setTimeout(onOpen,0);}
  function peerErrorText(err){if(err?.type==='peer-unavailable')return ['Room not found','Check the six-digit code and make sure the host room is still open.'];if(err?.type==='unavailable-id')return ['Room code already in use','Creating a different six-digit code…'];if(['network','server-error','socket-error','socket-closed'].includes(err?.type))return ['Room service unavailable','Check the internet connection and try again.'];return ['Connection failed',safeText(err?.message||'Try again or create a new room.',120)];}
  async function createHost(){const readiness=coOpReadinessError();if(readiness){if(!dom.hostModal.open)dom.hostModal.showModal();setNetworkStatus('host','Co-op unavailable','',readiness);return toast(readiness,3600);}closePeer();syncHostRulesFromUI();networkRole='host';lobbyProfiles={host:profilePacket()};renderLobbyRoster();const session=networkSession;if(!dom.hostModal.open)dom.hostModal.showModal();if(dom.hostRoomPin)dom.hostRoomPin.textContent='------';setNetworkStatus('host','Connecting to room service','working','Creating a six-digit online room for up to four players…');try{const PeerCtor=await ensurePeerJs();if(session!==networkSession)return;const openRoom=(attempt=0)=>{if(session!==networkSession)return;roomPin=makeRoomPin();if(dom.hostRoomPin)dom.hostRoomPin.textContent=roomPin;const currentPeer=peer=new PeerCtor(roomPeerId(roomPin),peerOptions()),openTimer=setTimeout(()=>{if(session!==networkSession||currentPeer.open)return;setNetworkStatus('host','Room service timed out','','Check the connection, then create a new room.');try{currentPeer.destroy();}catch(_){}},15000);currentPeer.on('open',()=>{clearTimeout(openTimer);if(session!==networkSession)return;setNetworkStatus('host','Room ready — waiting for players','working',`Send code ${roomPin} to up to three friends.`);});currentPeer.on('connection',conn=>{if(session!==networkSession){conn.close();return;}if(match){conn.on('open',()=>{try{conn.send(JSON.stringify({type:'matchStarted'}));}catch(_){}setTimeout(()=>conn.close(),150);});return;}const playerId=GUEST_IDS.find(id=>!hostChannels.has(id));if(!playerId){conn.on('open',()=>{try{conn.send(JSON.stringify({type:'roomFull'}));}catch(_){}setTimeout(()=>conn.close(),150);});toast('Lobby is full (4/4)');return;}setNetworkStatus('host','Player found — connecting','working','Opening a direct game connection…');attachHostConnection(conn,playerId);});currentPeer.on('disconnected',()=>{if(session===networkSession&&!networkConnected())setNetworkStatus('host','Room service disconnected','','Create a new room to reconnect.');});currentPeer.on('error',err=>{clearTimeout(openTimer);console.error('Host peer error',err);if(session!==networkSession)return;if(err?.type==='unavailable-id'&&attempt<8){try{currentPeer.destroy();}catch(_){}setNetworkStatus('host','Choosing another room code','working','The first code was already being used.');setTimeout(()=>openRoom(attempt+1),120);return;}const [title,help]=peerErrorText(err);setNetworkStatus('host',title,'',help);});};openRoom();}catch(err){console.error(err);setNetworkStatus('host','Online room service did not load','','Internet access is required for code-only hosting.');toast('Could not load online co-op service');}}
  async function runJoinAction(){const pin=cleanJoinPin();if(!/^\d{6}$/.test(pin)){setNetworkStatus('join','Enter the complete room code','','The room code must contain exactly six digits.');toast('Enter all 6 digits');dom.joinRoomPin?.focus();refreshJoinAction();return;}const readiness=coOpReadinessError();if(readiness){setNetworkStatus('join','Co-op unavailable','',readiness);return toast(readiness,3600);}closePeer();networkRole='guest';roomPin=pin;lobbyProfiles={};renderLobbyRoster();joinBusy=true;const session=networkSession;refreshJoinAction();setNetworkStatus('join','Connecting to room service','working',`Looking for room ${pin}…`);try{const PeerCtor=await ensurePeerJs();if(session!==networkSession)return;const currentPeer=peer=new PeerCtor(undefined,peerOptions());let connectTimer=0,serviceTimer=setTimeout(()=>{if(session!==networkSession||currentPeer.open)return;joinBusy=false;setNetworkStatus('join','Room service timed out','','Check the connection and try the room code again.');refreshJoinAction();try{currentPeer.destroy();}catch(_){}},15000);currentPeer.on('open',()=>{clearTimeout(serviceTimer);if(session!==networkSession)return;setNetworkStatus('join','Room found — connecting','working','Opening the direct game connection…');const conn=currentPeer.connect(roomPeerId(pin),{reliable:true,metadata:{game:'critter-extraction',pin}});attachGuestConnection(conn);connectTimer=setTimeout(()=>{if(session===networkSession&&!networkConnected()){joinBusy=false;setNetworkStatus('join','Connection timed out','','Make sure the host is still waiting in the room, then try again.');refreshJoinAction();}},15000);conn.on('open',()=>clearTimeout(connectTimer));conn.on('close',()=>clearTimeout(connectTimer));});currentPeer.on('error',err=>{clearTimeout(serviceTimer);console.error('Guest peer error',err);if(session!==networkSession)return;clearTimeout(connectTimer);joinBusy=false;const [title,help]=peerErrorText(err);setNetworkStatus('join',title,'',help);refreshJoinAction();});}catch(err){console.error(err);joinBusy=false;setNetworkStatus('join','Online room service did not load','','Internet access is required for code-only joining.');toast('Could not load online co-op service');refreshJoinAction();}}
  $('#hostBtn').onclick=createHost;
  $('#joinBtn').onclick=()=>{closePeer();networkRole='guest';lobbyProfiles={};renderLobbyRoster();if(dom.joinRoomPin)dom.joinRoomPin.value='';setNetworkStatus('join','Enter the room code','','Ask the host for their six-digit code.');refreshJoinAction();dom.joinModal.showModal();setTimeout(()=>dom.joinRoomPin?.focus(),40);};
  dom.joinRoomPin?.addEventListener('input',refreshJoinAction);dom.joinRoomPin?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runJoinAction();}});dom.joinRoomBtn.onclick=runJoinAction;$('#refreshHostCodeBtn').onclick=createHost;dom.startCoopBtn.onclick=()=>startMatch('host',Math.floor(Math.random()*0xffffffff),{roster:lobbyProfiles,rules:syncHostRulesFromUI()});$('#copyRoomPinBtn').onclick=()=>copyText(roomPin,'Room code');
  [dom.hostModeCoop,dom.hostModePvp,dom.hostFriendlyFire].forEach(control=>control?.addEventListener('change',()=>{syncHostRulesFromUI();broadcastRoomRules();}));renderRoomRules();
  function sendSnapshot(){if(!match||match.role!=='host')return;const ps={};for(const [id,p] of Object.entries(players))ps[id]={id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,velocityY:p.velocityY,grounded:p.grounded,hp:p.hp,maxShield:p.maxShield,shield:p.shield,speed:p.speed,speedBoost:p.speedBoost,weaponId:p.weaponId,armorId:p.armorId,alive:p.alive,mag:p.mag,reload:p.reload,kills:p.kills,profile:p.profile,walkTime:p.walkTime,moveBlend:p.moveBlend,weaponKick:p.weaponKick,muzzleFlash:p.muzzleFlash};sendNet({type:'snapshot',timer:match.timer,elapsed:match.elapsed,mode:match.mode,friendlyFire:match.friendlyFire,objectives:match.objectives,metrics:match.metrics,players:ps,enemies:world.enemies.map(e=>({id:e.id,type:e.type,species:e.species,body:e.body,accent:e.accent,weaponId:e.weaponId,training:!!e.training,x:e.x,y:e.y,z:e.z,yaw:e.yaw,hp:e.hp,maxHp:e.maxHp,bob:e.bob,walkTime:e.walkTime,moveBlend:e.moveBlend,alive:e.alive})),pickups:world.pickups,chests:world.chests.map(c=>({id:c.id,kind:c.kind||'supply',ownerName:c.ownerName||'',x:c.x,z:c.z,opened:c.opened})),extract:world.extract});}
  function applySnapshot(msg){if(!match||match.role!=='guest')return;match.timer=msg.timer;if(msg.mode==='pvp'||msg.mode==='coop')match.mode=msg.mode;if(typeof msg.friendlyFire==='boolean')match.friendlyFire=msg.friendlyFire;if(Number.isFinite(Number(msg.elapsed)))match.elapsed=Number(msg.elapsed);if(msg.objectives)match.objectives=deepCopy(msg.objectives);if(msg.metrics)match.metrics=deepCopy(msg.metrics);for(const [id,data] of Object.entries(msg.players||{})){if(!players[id])players[id]=createPlayer(id,data.x,data.z,data.profile||{displayName:id,appearance:{}},id!==localPlayerId);const p=players[id],keepLook=id===localPlayerId?{yaw:p.yaw,pitch:p.pitch}:null;Object.assign(p,data);if(keepLook){p.yaw=keepLook.yaw;p.pitch=keepLook.pitch;}}world.enemies=(msg.enemies||[]).map(e=>{const maxHp=Math.max(1,Number(e.maxHp)||70);return {...e,maxHp,hp:clamp(Number.isFinite(Number(e.hp))?Number(e.hp):maxHp,0,maxHp),speed:e.type==='slime'?1.65:2.1,attack:0};});world.pickups=msg.pickups||[];const chestMap=new Map(world.chests.map(c=>[c.id,c]));world.chests=(msg.chests||[]).map(c=>({...chestMap.get(c.id),...c,loot:chestMap.get(c.id)?.loot||emptySlots(15)}));world.extract=msg.extract||world.extract;}
  function handleNet(msg,sourceId='host'){
    if(msg.type==='matchStarted'){setNetworkStatus('join','Match already started','','Ask the host to create a new room after the current drop.');try{guestChannel?.close();}catch(_){}return;}
    if(msg.type==='roomFull'){setNetworkStatus('join','Room is full','','This lobby already has four players. Ask the host to create another room.');try{guestChannel?.close();}catch(_){}return;}
    if(msg.type==='welcome'&&networkRole==='guest'){assignedGuestId=msg.playerId||'guest1';localPlayerId=assignedGuestId;roomRules=normalizeRoomRules(msg.rules||DEFAULT_ROOM_RULES);renderRoomRules();lobbyProfiles=normalizeRoster(msg.roster||{});lobbyProfiles.host=normalizeNetworkProfile(msg.hostProfile||lobbyProfiles.host,'Host Critter');lobbyProfiles[assignedGuestId]=profilePacket();renderLobbyRoster();setNetworkStatus('join',`Connected • ${Object.keys(currentRoster()).length}/4`,'connected','Waiting for the host to start the co-op drop.');refreshJoinAction();return;}
    if(msg.type==='profile'&&networkRole==='host'){lobbyProfiles[sourceId]=normalizeNetworkProfile(msg.profile,'Co-op Critter');broadcastRoster();toast(`${lobbyProfiles[sourceId].displayName} connected`);if(match&&players[sourceId])players[sourceId].profile=lobbyProfiles[sourceId];return;}
    if(msg.type==='roster'){if(msg.rules){roomRules=normalizeRoomRules(msg.rules);renderRoomRules();}lobbyProfiles=normalizeRoster(msg.roster||{});if(networkRole==='guest'&&assignedGuestId)lobbyProfiles[assignedGuestId]=profilePacket();renderLobbyRoster();refreshJoinAction();return;}
    if(msg.type==='start'&&networkRole==='guest'){lobbyProfiles=normalizeRoster(msg.roster||lobbyProfiles);startMatch('guest',msg.seed,{playerId:assignedGuestId,roster:lobbyProfiles,hostProfile:lobbyProfiles.host,rules:normalizeRoomRules(msg.rules||roomRules)});return;}
    if(msg.type==='input'&&networkRole==='host'){if(msg.shotSeq!=null&&msg.shotSeq!==lastGuestShots[sourceId]){lastGuestShots[sourceId]=msg.shotSeq;msg.fireQueued=1;}guestInputs[sourceId]=msg;return;}
    if(msg.type==='snapshot'&&networkRole==='guest'){applySnapshot(msg);return;}
    if(msg.type==='pickupRequest'&&networkRole==='host'&&match){const pu=world.pickups.find(x=>x.id===msg.id),p=players[sourceId];if(pu&&p)interactPickup(pu,p);return;}
    if(msg.type==='chestRequest'&&networkRole==='host'&&match){const ch=world.chests.find(x=>x.id===msg.id),p=players[sourceId];if(ch&&p&&Math.hypot(p.x-ch.x,p.z-ch.z)<2.5)openChest(ch,p);return;}
    if(msg.type==='grantItem'&&networkRole==='guest'){const n=addItem(backpack,msg.id,msg.qty,MAX_WEIGHT);if(n){audio.pickup();toast(`Picked up ${ITEMS[msg.id].name} ×${n}`);renderQuickbar();updateHUD();}return;}
    if(msg.type==='openLoot'&&networkRole==='guest'){nearbyChestId=msg.chestId;nearbyLoot=normalizeSlots(msg.loot,15);openInventory('match',nearbyLoot);toast(`${safeText(msg.sourceName||'Loot container',40)} opened`);return;}
    if(msg.type==='syncLoot'&&networkRole==='host'){const ch=world.chests.find(x=>x.id===msg.chestId);if(ch)ch.loot=normalizeSlots(msg.loot,15);return;}
    if(msg.type==='equipGear'&&networkRole==='host'&&players[sourceId]){const p=players[sourceId];if(msg.equipment==='weapon'&&WEAPONS[msg.id]){p.weaponId=msg.id;p.mag=Math.min(p.mag||0,WEAPONS[msg.id].mag);if(p.mag<=0)p.mag=WEAPONS[msg.id].mag;p.reload=0;}else if(msg.equipment==='armor'&&ARMORS[msg.id]){const armor=ARMORS[msg.id],ratio=p.maxShield>0?p.shield/p.maxShield:0;p.armorId=msg.id;p.maxShield=armor.shield;p.shield=clamp(Math.round(Math.max(p.shield,armor.shield*ratio)),0,armor.shield);p.speed=(LOADOUTS[p.profile?.loadoutId]?.speed||5.4)+armor.speedMod;}return;}
    if(msg.type==='consume'&&networkRole==='host'&&players[sourceId]){applyConsumable(players[sourceId],msg.id,true);return;}
    if(msg.type==='hitConfirm'&&networkRole==='guest'){audio.enemyHit();showHitmarker(!!msg.critical,!!msg.kill,msg.target==='player'?'player':'enemy');return;}
    if(msg.type==='damageTaken'&&networkRole==='guest'){dom.damageFlash.classList.add('show');setTimeout(()=>dom.damageFlash.classList.remove('show'),150);audio.hit();if(msg.source)toast(`${safeText(msg.source,24)} hit you`);return;}
    if(msg.type==='pvpEnd'&&networkRole==='guest'){finishPvpClient(msg.winnerId,msg.reason||'PvP skirmish complete.');return;}
    if(msg.type==='matchEnd'&&networkRole==='guest')handleRemoteMatchEnd(msg);
  }

  // -------------------- Installation and startup --------------------
  function runStudioBoot() {
    if (!dom.studioBoot) {
      window.__critterBootReport?.('ready', 'Startup overlay was not present; the game initialized normally.');
      return;
    }
    const stages = ['Loading Harley’s Studios assets…','Building cute character models…','Checking weapons and loadouts…','Preparing Moonmeadow…'];
    let i = 0;
    let finished = false;
    dom.bootBar.style.width = '8%';
    dom.bootStatus.textContent = stages[0];
    const timer = setInterval(() => {
      i++;
      dom.bootBar.style.width = `${Math.min(92, 12 + i * 22)}%`;
      dom.bootStatus.textContent = stages[Math.min(i, stages.length - 1)];
    }, 240);
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      dom.bootBar.style.width = '100%';
      dom.bootStatus.textContent = 'Ready to extract!';
      window.__critterBootReport?.('ready', 'The menu and local game systems finished initializing.');
      setTimeout(() => {
        dom.studioBoot.classList.add('is-hiding');
        setTimeout(() => { dom.studioBoot.hidden = true; }, 460);
      }, 180);
    };
    const poster = new Image();
    poster.onload = poster.onerror = () => setTimeout(finish, 520);
    poster.src = localAsset('loading/gameplay-reference.webp');
    setTimeout(finish, 3500);
  }
  // Local/offline edition: all required game assets are included in this folder.
  // No service worker, web host, account server, or installation prompt is required.
  window.addEventListener('resize',()=>renderer?.resize());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&match&&!pauseMenuOpen)openPauseMenu();});
  [dom.inventoryModal,dom.settingsModal,dom.customizeModal,dom.helpModal].forEach(d=>d?.addEventListener('cancel',()=>{if(match&&!pauseMenuOpen)resumePointer();}));
  [dom.settingsModal,dom.helpModal].forEach(d=>d?.addEventListener('close',()=>{if(match&&pauseMenuOpen&&pauseSubmenuOpen){pauseSubmenuOpen=false;if(!dom.pauseModal.open)dom.pauseModal.showModal();}else if(match&&!pauseMenuOpen)resumePointer();}));
  [dom.hostModal,dom.joinModal].forEach(modal=>modal.addEventListener('close',()=>{if(!match&&!networkConnected())closePeer();}));

  renderCharacterRoster(); refreshAccountUI(); renderAccounts(); loadSettingsForm(); renderQuickbar();
  window.__critterBootReport?.('game-initialized', 'Account, inventory, settings, and menu systems are ready.');
  runStudioBoot();
  window.__CRITTER_DIAGNOSTICS__ = {
    version:GAME_VERSION, build:BUILD_VERSION, petals:()=>safePetals(activeAccount().petals),
    renderer:()=>rendererMode,
    chromebook:IS_CHROMEOS,
    startSolo:seed=>startMatch('solo',Number.isFinite(Number(seed))?Number(seed)>>>0:Math.floor(Math.random()*0xffffffff)),
    activeName:()=>activeAccount().displayName,
    appearance:()=>deepCopy(activeAccount().appearance),
    loadout:()=>activeAccount().loadoutId,
    weapon:()=>weaponFor(getLocalPlayer()).name,
    camera:()=>cameraMode,cameraPose:()=>{const p=getLocalPlayer();return p?deepCopy(cameraFor(p,{instant:true})):null;},lastShot:()=>deepCopy(lastShotDebug),setLook:(yaw,pitch)=>{const p=getLocalPlayer();if(!p)return false;p.yaw=wrapAngle(yaw);p.pitch=clamp(Number(pitch)||0,-1.25,1.15);cameraRigEye=null;return {yaw:p.yaw,pitch:p.pitch};},setCameraMode:mode=>{if(mode!=='first'&&mode!=='third')return false;cameraMode=mode;const p=getLocalPlayer();if(p)p.cameraMode=mode;cameraRigEye=null;return mode;},setShoulder:side=>{shoulderSide=side==='left'?-1:1;const p=getLocalPlayer();if(p)p.shoulderSide=shoulderSide;cameraRigEye=null;return shoulderSide>0?'right':'left';},inventoryCategories:()=>backpack.filter(Boolean).map((item,index)=>({index,id:item.id,category:inventoryCategory(item.id),qty:item.qty})),
    backpack:()=>deepCopy(backpack),
    playerPosition:()=>{const p=getLocalPlayer();return p?{x:p.x,y:p.y,z:p.z}:null;},
    teleport:(x,z)=>{const p=getLocalPlayer();if(!p)return false;p.x=Number(x)||0;p.z=Number(z)||0;updateHUD();return {x:p.x,z:p.z};},
    grant:(id,qty=1)=>{if(!ITEMS[id])return 0;const n=addItem(backpack,id,Math.max(1,Math.floor(Number(qty)||1)),MAX_WEIGHT);updateHUD();return n;},
    playerCount:()=>Object.keys(players).length,
    lobby:()=>deepCopy(currentRoster()),
    enemyCount:()=>world.enemies.filter(e=>e.alive).length,
    enemySpecies:()=>[...new Set(world.enemies.map(e=>e.species).filter(Boolean))],
    lootBoxCount:()=>world.chests.filter(c=>c.kind!=='deathbox').length,
    deathBoxCount:()=>world.chests.filter(c=>c.kind==='deathbox').length,
    equipmentLoot:()=>world.chests.map(c=>({kind:c.kind,gear:(c.loot||[]).filter(Boolean).map(i=>i.id).filter(id=>ITEMS[id]?.equipment)})),
    map:()=>deepCopy({id:world.map?.id,name:world.map?.name,seed:world.seed,seedCode:world.map?.seedCode,assetPack:world.map?.assetPack,feature:world.map?.feature,themeDecorCount:world.map?.themeDecor?.length||0,layoutIndex:world.map?.layoutIndex,rotation:world.map?.rotation,mirror:world.map?.mirror,spawn:world.spawn,spawnPoints:world.spawnPoints,route:world.route,extract:world.extract,rail:world.map?.rail,landmarks:world.landmarks,validation:world.validation,cover:world.cover.map(c=>({type:c.type,x:c.x,z:c.z,w:c.w,d:c.d,h:c.h,rot:c.rot||0})),chests:world.chests.map(c=>({id:c.id,x:c.x,z:c.z,kind:c.kind})),enemies:world.enemies.map(e=>({id:e.id,x:e.x,z:e.z,training:!!e.training}))}),
    regenerateWorld:seed=>{generateWorld(Number(seed)>>>0);return deepCopy({name:world.map?.name,seed:world.seed,spawn:world.spawn,spawnPoints:world.spawnPoints,route:world.route,extract:world.extract,validation:world.validation,cover:world.cover.map(c=>({type:c.type,x:c.x,z:c.z,w:c.w,d:c.d,h:c.h,rot:c.rot||0})),chests:world.chests.map(c=>({x:c.x,z:c.z})),pickups:world.pickups.map(p=>({x:p.x,z:p.z})),enemies:world.enemies.map(e=>({x:e.x,z:e.z,training:!!e.training}))});},
    applyLookDelta:(dx,dy,invertY=activeAccount().settings.invertY)=>{const p=getLocalPlayer();if(!p)return false;const sensitivity=activeAccount().settings.sensitivity*.0022;p.yaw=wrapAngle(p.yaw+Number(dx||0)*sensitivity);p.pitch+=Number(dy||0)*sensitivity*(invertY?1:-1);p.pitch=clamp(p.pitch,-1.25,1.15);cameraRigEye=null;return {yaw:p.yaw,pitch:p.pitch};},
    setAim:value=>{input.aim=!!value;const p=getLocalPlayer();if(p)p.aim=input.aim;cameraRigEye=null;return input.aim;},
    mapCatalog:()=>MAP_VARIANTS.map(m=>m.name),
    mapAssetCatalog:()=>MAP_VARIANTS.map(m=>({id:m.id,assetPack:m.assetPack,featureType:m.featureType,decorType:m.decorType})),
    speciesCatalog:()=>Object.entries(SPECIES).map(([id,s])=>({id,name:s.name,role:s.role,asset:s.asset})),
    contractCatalog:()=>CONTRACT_TEMPLATES.map(q=>({id:q.id,title:q.title,type:q.type,target:q.target})),
    objectives:()=>deepCopy(match?.objectives||{}),
    metrics:()=>deepCopy(match?.metrics||{}),
    killFirstEnemy:()=>{const p=getLocalPlayer(),e=world.enemies.find(x=>x.alive&&!x.training)||world.enemies.find(x=>x.alive);if(!p||!e)return false;e.hp=0;e.alive=false;p.kills=(p.kills||0)+1;spawnEnemyDeathBox(e,p);updateHUD();return e.id;},
    headshotFirstEnemy:()=>{const p=getLocalPlayer(),e=world.enemies.find(x=>x.alive&&!x.training)||world.enemies.find(x=>x.alive);if(!p||!e)return false;e.hp=0;e.alive=false;p.kills=(p.kills||0)+1;if(match?.metrics)match.metrics.headshotKills=(match.metrics.headshotKills||0)+1;spawnEnemyDeathBox(e,p);updateHUD();return e.id;},
    openFirstSupplyCrate:()=>{const p=getLocalPlayer(),ch=world.chests.find(c=>c.kind!=='deathbox'&&!c.opened);if(!p||!ch)return false;openChest(ch,p);updateHUD();return ch.id;},
    advanceTime:seconds=>{if(!match)return 0;const amount=Math.max(0,Number(seconds)||0);match.elapsed=(match.elapsed||0)+amount;match.timer=Math.max(0,match.timer-amount);updateHUD();return match.elapsed;},
    completePrimary:()=>{if(!match?.objectives?.primary)return false;match.objectives.primary.done=true;updateHUD();return true;},
    worldLabels:()=>[...dom.worldLabels.children].filter(n=>!n.hidden).map(n=>({type:n.classList.contains('enemy')?'enemy':'player',name:n.querySelector('.world-label-name')?.textContent||'',health:n.querySelector('.world-label-health>i')?.style.width||'',left:n.style.left,top:n.style.top})),
    firstEnemy:()=>{const e=world.enemies.find(x=>x.alive&&!x.training)||world.enemies.find(x=>x.alive);return e?{x:e.x,z:e.z,hp:e.hp,training:!!e.training,patrolTarget:e.patrolTarget?{...e.patrolTarget}:null}:null;},
    fireOnce:()=>{const p=getLocalPlayer();if(!p)return false;fireWeapon(p);return true;},
    hitMarker:state=>{const mode=String(state||'normal').toLowerCase();showHitmarker(mode==='critical'||mode==='headshot',mode==='kill'||mode==='elimination',mode==='player'?'player':'enemy');return mode;},roomRules:()=>deepCopy(roomRules),
    aimAtFirstVisibleEnemy:()=>{const p=getLocalPlayer();if(!p)return false;const old={yaw:p.yaw,pitch:p.pitch};for(const e of world.enemies){if(!e.alive)continue;for(let step=0;step<3;step++){const cam=cameraFor(p,{instant:true}),dx=e.x-cam.eye[0],dy=1.48-cam.eye[1],dz=e.z-cam.eye[2];p.yaw=Math.atan2(dx,dz);p.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-1.25,1.15);}const cam=cameraFor(p,{instant:true}),hit=hitTestCritter(cam.eye,cam.forward,e,weaponFor(p).range),geometry=nearestWorldGeometryHit(cam.eye,cam.forward,hit?.t??weaponFor(p).range,0,true);if(hit&&(!geometry||geometry.t>=hit.t-.01)){cameraRigEye=null;return{id:e.id,x:e.x,z:e.z,part:hit.part,distance:hit.t};}}p.yaw=old.yaw;p.pitch=old.pitch;cameraRigEye=null;return false;},
    nearbyLootCount:()=>nearbyLoot?nearbyLoot.reduce((sum,it)=>sum+(it?.qty||0),0):0,
    safeZone:()=>{const p=getLocalPlayer();return p?activeSafeZoneAt(p.x,p.z)?.label||'':null;},
    controlScreenDirection:key=>{const p=getLocalPlayer();if(!p||!renderer)return null;const mv=movementFromInput({keys:[String(key)]},p),cam=cameraFor(p);renderer.begin(cam);const y=p.y+1.18,a=projectWorld(cam,p.x,y,p.z),b=projectWorld(cam,p.x+mv.x*1.5,y,p.z+mv.z*1.5);renderer.end?.();return a&&b?{key:String(key),worldX:mv.x,worldZ:mv.z,deltaX:b.x-a.x}:null;},
    savedSettings:()=>deepCopy(activeAccount().settings),
    storageKey:STORAGE_KEY,
    graphics:()=>{const gp=graphicsProfile();const mesh=rendererMode==='webgl'?renderer?.meshes?.[`sphere_${gp.key}`]:null;return {quality:gp.key,label:gp.label,sphereTriangles:mesh?mesh.count/3:(gp.sphereLat*gp.sphereLon*2)};},
    setQuality:q=>{if(!GRAPHICS_PROFILES[q])return false;activeAccount().settings.quality=q;saveDB();applySettings();return true;}
  };
})();
