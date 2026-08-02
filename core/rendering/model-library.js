/* Harley's Studios procedural game asset catalog.
   Loaded before game.js and used by the character, enemy, and map systems. */
window.HARLEYS_GAME_ASSETS = Object.freeze({
  studio: "Harley's Studios",
  version: '2.0-character-map-refresh',
  enemyRoster: [
    { id:'puppy_raider', species:'puppy', body:'#d9a06f', accent:'#7b4d35', weaponId:'pea_popper' },
    { id:'bunny_raider', species:'bunny', body:'#f0ede8', accent:'#d6a6bd', weaponId:'moonbeam' },
    { id:'kitty_raider', species:'kitty', body:'#9ca7b5', accent:'#465266', weaponId:'honey_carbine' },
    { id:'fox_raider', species:'fox', body:'#e98b4c', accent:'#fff0d9', weaponId:'acorn_sprayer' },
    { id:'panda_raider', species:'panda', body:'#f2f2ee', accent:'#292b38', weaponId:'carrot_scatter' },
    { id:'bear_raider', species:'bear', body:'#a36f4c', accent:'#6b4432', weaponId:'carrot_scatter' },
    { id:'raccoon_raider', species:'raccoon', body:'#8f98a3', accent:'#353846', weaponId:'pea_popper' },
    { id:'redpanda_raider', species:'redpanda', body:'#bd5b3e', accent:'#f6e0c5', weaponId:'honey_carbine' }
  ],
  mapAssetPacks: [
    { region:'pine-valley', pack:'ranger-grove', feature:'pine-camp', decor:'pine-marker' },
    { region:'amber-junction', pack:'harvest-yard', feature:'amber-silo', decor:'hay-bale' },
    { region:'moonberry-marsh', pack:'glowwater-dock', feature:'marsh-dock', decor:'marsh-reeds' },
    { region:'clover-highlands', pack:'clover-windmill', feature:'clover-windmill', decor:'wildflowers' },
    { region:'frostflower-ridge', pack:'crystal-outpost', feature:'frost-crystal', decor:'ice-shard' },
    { region:'redwood-run', pack:'redwood-gate', feature:'redwood-gate', decor:'redwood-stump' }
  ],
  sharedLandmarks: [
    'red-barn','wood-watchtower','supply-crates','forest','rock-cliffs',
    'extraction-smoke','passenger-train','freight-car','shipping-containers','rail-yard'
  ],
  characterParts: [
    'head','muzzle','ears','eyes','species-markings','torso','vest','backpack',
    'arms','paws','legs','feet','tail','weapon','accessory'
  ],
  weaponModels: ['pea_popper','acorn_sprayer','honey_carbine','carrot_scatter','moonbeam'],
  authoredRuntimeAssets: {
    peaPopper: 'assets/models/weapons/pea_popper/pea_popper_lod0.glb',
    supplyCrate: 'assets/models/loot/supply_crate/supply_crate.glb',
    pineTree: 'assets/models/vegetation/pine_tree/pine_tree_lod0.glb'
  },
  combatRig: {
    zones: [
      { id:'head', y:2.23, radius:0.62, damageMultiplier:1.65 },
      { id:'chest', y:1.39, radius:0.72, damageMultiplier:1.0 },
      { id:'belly', y:0.88, radius:0.58, damageMultiplier:0.9 },
      { id:'legs', y:0.34, radius:0.54, damageMultiplier:0.72 }
    ],
    aimSource: 'camera-center-ray',
    tracerSource: 'weapon-muzzle'
  }
});

/* Load the authored GLB bridge synchronously before game-loader.js fetches
   game-core.js. Procedural rendering remains available as a safe fallback. */
if (!window.HarleyHighEndRuntime) {
  if (document.readyState === 'loading') {
    document.write('<script src="./core/rendering/high-end-glb-runtime.js" data-required-boot-file="core/rendering/high-end-glb-runtime.js"><\/script>');
  } else {
    const script = document.createElement('script');
    script.src = './core/rendering/high-end-glb-runtime.js';
    script.dataset.requiredBootFile = 'core/rendering/high-end-glb-runtime.js';
    document.head.appendChild(script);
  }
}
