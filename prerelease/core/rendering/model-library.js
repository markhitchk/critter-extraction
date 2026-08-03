/* Harley's Studios game asset catalog.
   Loaded before game.js and used by character, enemy, weapon, and map systems. */
window.HARLEYS_GAME_ASSETS = Object.freeze({
  studio: "Harley's Studios",
  version: '2.1-real-cc0-source-import',
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
    peaPopperLod1: 'assets/models/weapons/pea_popper/pea_popper_lod1.glb',
    peaPopperLod2: 'assets/models/weapons/pea_popper/pea_popper_lod2.glb',
    acornSprayer: 'assets/models/third_party/quaternius/toon-shooter/weapons/smg.glb',
    honeyCarbine: 'assets/models/third_party/quaternius/toon-shooter/weapons/ak.glb',
    carrotScatter: 'assets/models/third_party/quaternius/toon-shooter/weapons/shotgun.glb',
    moonbeam: 'assets/models/third_party/quaternius/toon-shooter/weapons/sniper.glb',
    supplyCrate: 'assets/models/third_party/quaternius/toon-shooter/environment/crate.glb',
    pineTree: 'assets/models/third_party/quaternius/toon-shooter/environment/tree.glb',
    shippingContainer: 'assets/models/third_party/quaternius/toon-shooter/environment/shipping_container.glb',
    barrier: 'assets/models/third_party/quaternius/toon-shooter/environment/barrier.glb',
    rabbitSource: 'assets/models/third_party/quaternius/sushi-restaurant/characters/rabbit.glb',
    pandaSource: 'assets/models/third_party/quaternius/sushi-restaurant/characters/panda.glb',
    huskySource: 'assets/models/third_party/quaternius/animated-animals/husky.glb',
    shibaSource: 'assets/models/third_party/quaternius/animated-animals/shiba_inu.glb',
    toonSoldierSource: 'assets/models/third_party/quaternius/toon-shooter/characters/character_soldier.glb',
    toonEnemySource: 'assets/models/third_party/quaternius/toon-shooter/characters/character_enemy.glb',
    pineRock: 'assets/models/rocks/pine_valley_rock/pine_valley_rock_lod0.glb',
    pineGrass: 'assets/models/vegetation/pine_grass/pine_grass_cluster.glb',
    pineRail: 'assets/models/railway/pine_rail_segment/pine_rail_segment.glb',
    pineDirtBaseColor: 'assets/textures/terrain/pine_valley/dirt_basecolor.webp'
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
  },
  thirdPartySources: {
    quaternius: {
      license: 'CC0-1.0',
      manifest: 'assets/manifest/real-cc0-assets.json',
      licenseFile: 'assets/models/third_party/LICENSES.md'
    }
  }
});

/* Load GLB bridges synchronously before game-loader.js fetches game-core.js.
   Procedural rendering remains as an automatic fallback. */
function loadAuthoredBridge(path) {
  if (document.readyState === 'loading') {
    document.write(`<script src="${path}" data-required-boot-file="${path.replace(/^\.\//, '')}"><\/script>`);
    return;
  }
  const script = document.createElement('script');
  script.src = path;
  script.dataset.requiredBootFile = path.replace(/^\.\//, '');
  document.head.appendChild(script);
}

if (!window.HarleyHighEndRuntime) loadAuthoredBridge('./core/rendering/high-end-glb-runtime.js');
if (!window.HarleyHighEndWorldPatches) loadAuthoredBridge('./core/rendering/high-end-world-patches.js');
if (!window.HarleyHighEndRockPatches) loadAuthoredBridge('./core/rendering/high-end-rock-patches.js');
if (!window.HarleyHighEndGroundPatches) loadAuthoredBridge('./core/rendering/high-end-ground-patches.js');
if (!window.HarleyHighEndTerrainPatches) loadAuthoredBridge('./core/rendering/high-end-terrain-patches.js');
if (!window.HarleyHighEndLodPatches) loadAuthoredBridge('./core/rendering/high-end-lod-patches.js');
if (!window.HarleyHighEndAcornPatches) loadAuthoredBridge('./core/rendering/high-end-acorn-patches.js');
if (!window.CritterRealCc0RuntimePatches) loadAuthoredBridge('./core/rendering/real-cc0-runtime-patches.js');
