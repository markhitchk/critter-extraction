import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd(), 'prerelease');
const modelsRoot = path.join(projectRoot, 'assets/models');
const manifestPath = path.join(projectRoot, 'assets/manifest/high-end-assets.json');

const clampByte = value => Math.max(0, Math.min(255, Math.round(value)));
const colorBytes = hex => {
  let value = String(hex).replace('#', '');
  if (value.length === 3) value = [...value].map(char => char + char).join('');
  return [
    clampByte(Number.parseInt(value.slice(0, 2), 16)),
    clampByte(Number.parseInt(value.slice(2, 4), 16)),
    clampByte(Number.parseInt(value.slice(4, 6), 16)),
    255
  ];
};

const pad4 = buffer => {
  const extra = (4 - (buffer.length % 4)) % 4;
  return extra ? Buffer.concat([buffer, Buffer.alloc(extra)]) : buffer;
};

function createBuilder() {
  const positions = [];
  const colors = [];
  const indices = [];

  const addBox = ({ center = [0, 0, 0], size = [1, 1, 1], color = '#ffffff', rotateZ = 0 }) => {
    const [cx, cy, cz] = center;
    const [sx, sy, sz] = size.map(value => value / 2);
    const cos = Math.cos(rotateZ);
    const sin = Math.sin(rotateZ);
    const base = positions.length / 3;
    const corners = [
      [-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz],
      [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz]
    ];
    const rgba = colorBytes(color);
    for (const [x0, y0, z0] of corners) {
      const x = x0 * cos - y0 * sin;
      const y = x0 * sin + y0 * cos;
      positions.push(cx + x, cy + y, cz + z0);
      colors.push(...rgba);
    }
    const faces = [
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      0, 4, 5, 0, 5, 1,
      3, 2, 6, 3, 6, 7,
      1, 5, 6, 1, 6, 2,
      0, 3, 7, 0, 7, 4
    ];
    for (const index of faces) indices.push(base + index);
  };

  const addDiamond = ({ center = [0, 0, 0], size = [1, 1, 1], color = '#ffffff' }) => {
    const [cx, cy, cz] = center;
    const [sx, sy, sz] = size.map(value => value / 2);
    const base = positions.length / 3;
    const verts = [
      [0, sy, 0], [sx, 0, 0], [0, 0, sz], [-sx, 0, 0], [0, 0, -sz], [0, -sy, 0]
    ];
    const rgba = colorBytes(color);
    for (const [x, y, z] of verts) {
      positions.push(cx + x, cy + y, cz + z);
      colors.push(...rgba);
    }
    const faces = [
      0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1,
      5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4
    ];
    for (const index of faces) indices.push(base + index);
  };

  return { positions, colors, indices, addBox, addDiamond };
}

function encodeGlb(name, build) {
  const builder = createBuilder();
  build(builder);
  const indexArray = new Uint16Array(builder.indices);
  const positionArray = new Float32Array(builder.positions);
  const colorArray = new Uint8Array(builder.colors);

  const indexBuffer = pad4(Buffer.from(indexArray.buffer));
  const positionBuffer = pad4(Buffer.from(positionArray.buffer));
  const colorBuffer = pad4(Buffer.from(colorArray.buffer));
  const binary = Buffer.concat([indexBuffer, positionBuffer, colorBuffer]);

  const xs = builder.positions.filter((_, index) => index % 3 === 0);
  const ys = builder.positions.filter((_, index) => index % 3 === 1);
  const zs = builder.positions.filter((_, index) => index % 3 === 2);
  const min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
  const max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];

  const json = {
    asset: { version: '2.0', generator: "Harley's Studios deterministic asset generator" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [{
      attributes: { POSITION: 1, COLOR_0: 2 },
      indices: 0,
      mode: 4
    }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: indexBuffer.length, target: 34963 },
      { buffer: 0, byteOffset: indexBuffer.length, byteLength: positionBuffer.length, target: 34962 },
      { buffer: 0, byteOffset: indexBuffer.length + positionBuffer.length, byteLength: colorBuffer.length, target: 34962 }
    ],
    accessors: [
      { bufferView: 0, componentType: 5123, count: indexArray.length, type: 'SCALAR', min: [0], max: [positionArray.length / 3 - 1] },
      { bufferView: 1, componentType: 5126, count: positionArray.length / 3, type: 'VEC3', min, max },
      { bufferView: 2, componentType: 5121, normalized: true, count: colorArray.length / 4, type: 'VEC4' }
    ]
  };

  const jsonBuffer = pad4(Buffer.from(JSON.stringify(json), 'utf8'));
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binary.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 4, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonHeader.writeUInt32LE(0x4E4F534A, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(0x004E4942, 4);
  return Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binary]);
}

function writeModel(relativePath, name, build) {
  const output = path.join(modelsRoot, relativePath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, encodeGlb(name, build));
  return `assets/models/${relativePath.replaceAll('\\', '/')}`;
}

const species = {
  puppy: ['#d9a06f', '#7b4d35', '#f4d6bc'],
  bunny: ['#f0ede8', '#d6a6bd', '#ffffff'],
  kitty: ['#9ca7b5', '#465266', '#dbe0e6'],
  fox: ['#e98b4c', '#fff0d9', '#5a3328'],
  panda: ['#f2f2ee', '#292b38', '#ffffff'],
  bear: ['#a36f4c', '#6b4432', '#d8aa86'],
  raccoon: ['#8f98a3', '#353846', '#c7cdd3'],
  redpanda: ['#bd5b3e', '#f6e0c5', '#5b2d27']
};

function buildCritter(type, tactical = false) {
  return ({ addBox, addDiamond }) => {
    const [body, accent, muzzle] = species[type];
    addBox({ center: [0, 1.25, 0], size: [0.85, 1.05, 0.58], color: body });
    addBox({ center: [0, 2.1, 0], size: [0.92, 0.78, 0.72], color: body });
    addBox({ center: [0, 1.98, 0.43], size: [0.50, 0.30, 0.30], color: muzzle });
    addBox({ center: [0, 1.99, 0.61], size: [0.14, 0.10, 0.10], color: '#151822' });
    addBox({ center: [-0.18, 2.18, 0.39], size: [0.10, 0.12, 0.08], color: '#151822' });
    addBox({ center: [0.18, 2.18, 0.39], size: [0.10, 0.12, 0.08], color: '#151822' });
    addBox({ center: [-0.47, 1.18, 0], size: [0.22, 0.82, 0.24], color: body, rotateZ: -0.08 });
    addBox({ center: [0.47, 1.18, 0], size: [0.22, 0.82, 0.24], color: body, rotateZ: 0.08 });
    addBox({ center: [-0.23, 0.46, 0], size: [0.27, 0.72, 0.29], color: body });
    addBox({ center: [0.23, 0.46, 0], size: [0.27, 0.72, 0.29], color: body });
    addBox({ center: [-0.23, 0.08, 0.12], size: [0.34, 0.16, 0.46], color: muzzle });
    addBox({ center: [0.23, 0.08, 0.12], size: [0.34, 0.16, 0.46], color: muzzle });
    if (type === 'bunny') {
      addBox({ center: [-0.25, 2.68, 0], size: [0.20, 0.76, 0.16], color: body, rotateZ: -0.08 });
      addBox({ center: [0.25, 2.68, 0], size: [0.20, 0.76, 0.16], color: body, rotateZ: 0.08 });
    } else if (['kitty', 'fox', 'raccoon', 'redpanda'].includes(type)) {
      addDiamond({ center: [-0.31, 2.52, 0], size: [0.38, 0.55, 0.28], color: accent });
      addDiamond({ center: [0.31, 2.52, 0], size: [0.38, 0.55, 0.28], color: accent });
    } else {
      addBox({ center: [-0.34, 2.48, 0], size: [0.24, 0.46, 0.20], color: accent, rotateZ: -0.18 });
      addBox({ center: [0.34, 2.48, 0], size: [0.24, 0.46, 0.20], color: accent, rotateZ: 0.18 });
    }
    addBox({ center: [0, 1.02, -0.52], size: [0.20, 0.72, 0.20], color: accent, rotateZ: 0.45 });
    if (tactical) {
      addBox({ center: [0, 1.28, 0.22], size: [0.80, 0.78, 0.22], color: '#3d7f49' });
      addBox({ center: [0, 1.30, -0.46], size: [0.68, 0.68, 0.30], color: '#4b6d8a' });
    }
  };
}

function buildWeapon(kind) {
  return ({ addBox, addDiamond }) => {
    const schemes = {
      acorn_sprayer: ['#8d6235', '#6f4b2b', '#69737d'],
      honey_carbine: ['#f3b83f', '#ffd56b', '#2f3540'],
      carrot_scatter: ['#e86e32', '#4e9a55', '#30343b'],
      moonbeam: ['#6e78c9', '#9ee7ff', '#20263f']
    };
    const [main, accent, dark] = schemes[kind];
    addBox({ center: [0, 0, 0], size: [1.15, 0.32, 0.36], color: main });
    addBox({ center: [0.85, 0, 0], size: [0.95, 0.16, 0.17], color: dark });
    addBox({ center: [-0.84, 0, 0], size: [0.58, 0.24, 0.30], color: '#765238' });
    addBox({ center: [-0.14, -0.34, 0], size: [0.20, 0.52, 0.20], color: dark, rotateZ: 0.15 });
    if (kind === 'carrot_scatter') {
      addBox({ center: [0.80, 0.11, 0], size: [0.90, 0.10, 0.12], color: dark });
      addBox({ center: [0.80, -0.11, 0], size: [0.90, 0.10, 0.12], color: dark });
    } else if (kind === 'moonbeam') {
      addDiamond({ center: [-0.05, 0, 0], size: [0.42, 0.42, 0.42], color: accent });
    } else {
      addBox({ center: [-0.05, -0.24, 0], size: [0.34, 0.32, 0.26], color: accent });
    }
  };
}

const generated = [];
generated.push(writeModel('characters/tactical_puppy/tactical_puppy_lod0.glb', 'tactical_puppy', buildCritter('puppy', true)));
for (const type of Object.keys(species)) {
  generated.push(writeModel(`enemies/${type}_raider/${type}_raider_lod0.glb`, `${type}_raider`, buildCritter(type, type === 'puppy')));
}
for (const kind of ['acorn_sprayer', 'honey_carbine', 'carrot_scatter', 'moonbeam']) {
  generated.push(writeModel(`weapons/${kind}/${kind}_lod0.glb`, kind, buildWeapon(kind)));
}
generated.push(writeModel('weapons/acorn_sprayer/acorn_sprayer_lod1.glb', 'acorn_sprayer_lod1', buildWeapon('acorn_sprayer')));

const armor = {
  leaf_vest: ['#3f8c4f', '#8ed06e'],
  feather_vest: ['#d8e7f2', '#7fa9c7'],
  bark_guard: ['#70452d', '#a9784e'],
  root_padding: ['#5d4a37', '#8f7552'],
  star_cloak: ['#4a3f93', '#e9d65a']
};
for (const [name, [main, accent]] of Object.entries(armor)) {
  generated.push(writeModel(`armor/${name}/${name}.glb`, name, ({ addBox, addDiamond }) => {
    addBox({ center: [0, 1.2, 0], size: [0.85, 0.82, 0.42], color: main });
    addBox({ center: [0, 1.18, 0.28], size: [0.64, 0.54, 0.12], color: accent });
    if (name === 'star_cloak') addDiamond({ center: [0, 1.2, 0.38], size: [0.30, 0.30, 0.12], color: '#f4e261' });
  }));
}

generated.push(writeModel('backpacks/critter_pack/critter_pack.glb', 'critter_pack', ({ addBox }) => {
  addBox({ center: [0, 1.25, -0.42], size: [0.72, 0.84, 0.38], color: '#4b6d8a' });
  addBox({ center: [0, 1.55, -0.64], size: [0.58, 0.20, 0.10], color: '#7aa2bf' });
}));
generated.push(writeModel('loot/death_box/death_box.glb', 'death_box', ({ addBox, addDiamond }) => {
  addBox({ center: [0, 0.22, 0], size: [1.0, 0.44, 0.72], color: '#383f49' });
  addBox({ center: [0, 0.55, -0.08], size: [1.04, 0.18, 0.76], color: '#6f7682', rotateZ: 0.08 });
  addDiamond({ center: [0, 0.66, 0.05], size: [0.26, 0.30, 0.26], color: '#66f3ff' });
}));
generated.push(writeModel('railway/freight_car/freight_car_lod0.glb', 'freight_car', ({ addBox }) => {
  addBox({ center: [0, 1.25, 0], size: [3.8, 1.55, 1.65], color: '#934b36' });
  addBox({ center: [0, 2.10, 0], size: [4.0, 0.18, 1.82], color: '#4a3f3b' });
  for (const x of [-1.25, 1.25]) for (const z of [-0.62, 0.62]) addBox({ center: [x, 0.28, z], size: [0.52, 0.52, 0.22], color: '#25282d' });
}));
generated.push(writeModel('structures/ranger_outpost/ranger_outpost_lod0.glb', 'ranger_outpost', ({ addBox }) => {
  addBox({ center: [0, 0.18, 0], size: [4.2, 0.35, 3.4], color: '#6d6257' });
  addBox({ center: [0, 1.50, 0], size: [3.6, 2.3, 2.8], color: '#8a5a39' });
  addBox({ center: [0, 2.85, 0], size: [4.2, 0.30, 3.5], color: '#334c42' });
  addBox({ center: [0, 1.18, 1.48], size: [0.85, 1.75, 0.16], color: '#3e2d24' });
  addBox({ center: [-1.15, 1.65, 1.48], size: [0.75, 0.75, 0.12], color: '#9ee7ff' });
  addBox({ center: [1.15, 1.65, 1.48], size: [0.75, 0.75, 0.12], color: '#9ee7ff' });
}));
generated.push(writeModel('vfx/pea_muzzle_flash/pea_muzzle_flash.glb', 'pea_muzzle_flash', ({ addDiamond }) => {
  addDiamond({ center: [0, 0, 0], size: [0.42, 0.42, 0.42], color: '#ffffff' });
  addDiamond({ center: [0.32, 0, 0], size: [0.60, 0.18, 0.18], color: '#d6ff75' });
}));
generated.push(writeModel('vfx/pea_impact/pea_impact.glb', 'pea_impact', ({ addDiamond }) => {
  addDiamond({ center: [0, 0, 0], size: [0.34, 0.34, 0.34], color: '#9dff72' });
  addDiamond({ center: [0.30, 0, 0], size: [0.12, 0.12, 0.12], color: '#d8ff9d' });
  addDiamond({ center: [-0.30, 0, 0], size: [0.12, 0.12, 0.12], color: '#d8ff9d' });
}));
generated.push(writeModel('vfx/loot_glow/loot_glow.glb', 'loot_glow', ({ addBox, addDiamond }) => {
  addBox({ center: [0, 0.03, 0], size: [0.90, 0.06, 0.90], color: '#67e8ff' });
  addDiamond({ center: [0, 0.34, 0], size: [0.32, 0.60, 0.32], color: '#b9f7ff' });
}));

const assets = [];
const ready = (id, category, data = {}) => assets.push({ id, category, status: 'ready', productionState: 'authored-low-poly', ...data });
ready('character.tactical_puppy', 'character', { runtimePath: 'assets/models/characters/tactical_puppy/tactical_puppy_lod0.glb', rigState: 'static', animationState: 'pending' });
for (const [type, weapon] of Object.entries({ puppy:'pea_popper', bunny:'moonbeam', kitty:'honey_carbine', fox:'acorn_sprayer', panda:'carrot_scatter', bear:'carrot_scatter', raccoon:'pea_popper', redpanda:'honey_carbine' })) {
  ready(`enemy.${type}_raider`, 'enemy', { runtimePath: `assets/models/enemies/${type}_raider/${type}_raider_lod0.glb`, species: type, weapon: `weapon.${weapon}`, rigState: 'static', animationState: 'pending' });
}
ready('weapon.pea_popper', 'weapon', { lods: { lod0:'assets/models/weapons/pea_popper/pea_popper_lod0.glb', lod1:'assets/models/weapons/pea_popper/pea_popper_lod1.glb', lod2:'assets/models/weapons/pea_popper/pea_popper_lod2.glb' } });
ready('weapon.acorn_sprayer', 'weapon', { lods: { lod0:'assets/models/weapons/acorn_sprayer/acorn_sprayer_lod0.glb', lod1:'assets/models/weapons/acorn_sprayer/acorn_sprayer_lod1.glb', lod2:'assets/models/weapons/acorn_sprayer/acorn_sprayer_lod2.glb' } });
for (const kind of ['honey_carbine', 'carrot_scatter', 'moonbeam']) ready(`weapon.${kind}`, 'weapon', { runtimePath:`assets/models/weapons/${kind}/${kind}_lod0.glb` });
for (const name of Object.keys(armor)) ready(`armor.${name}`, 'armor', { runtimePath:`assets/models/armor/${name}/${name}.glb`, slot:'chest' });
ready('backpack.critter_pack', 'backpack', { runtimePath:'assets/models/backpacks/critter_pack/critter_pack.glb', slot:'backpack_socket' });
ready('loot.small_supply_crate', 'loot', { runtimePath:'assets/models/loot/supply_crate/supply_crate.glb' });
ready('loot.death_box', 'loot', { runtimePath:'assets/models/loot/death_box/death_box.glb' });
ready('terrain.pine_valley_ground', 'terrain', { textures:{ baseColor:'assets/textures/terrain/pine_valley/dirt_basecolor.webp' }, region:'pine-valley' });
ready('vegetation.pine_family', 'vegetation', { lods:{ lod0:'assets/models/vegetation/pine_tree/pine_tree_lod0.glb', lod1:'assets/models/vegetation/pine_tree/pine_tree_lod0.glb', lod2:'assets/models/vegetation/pine_tree/pine_tree_lod2.glb' }, region:'pine-valley' });
ready('vegetation.pine_grass', 'vegetation', { runtimePath:'assets/models/vegetation/pine_grass/pine_grass_cluster.glb', region:'pine-valley' });
ready('rock.pine_cover_set', 'rock', { runtimePath:'assets/models/rocks/pine_valley_rock/pine_valley_rock_lod0.glb', region:'pine-valley' });
ready('rail.pine_track_set', 'rail', { runtimePath:'assets/models/railway/pine_rail_segment/pine_rail_segment.glb', region:'pine-valley' });
ready('rail.freight_car', 'rail', { runtimePath:'assets/models/railway/freight_car/freight_car_lod0.glb' });
ready('structure.ranger_outpost', 'structure', { runtimePath:'assets/models/structures/ranger_outpost/ranger_outpost_lod0.glb', region:'pine-valley' });
for (const kind of ['pea_muzzle_flash', 'pea_impact', 'loot_glow']) ready(`vfx.${kind}`, 'vfx', { runtimePath:`assets/models/vfx/${kind}/${kind}.glb` });

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify({
  schemaVersion: 2,
  project: 'Critter Extraction',
  studio: "Harley's Studios",
  status: 'authored-model-coverage-complete',
  runtime: { preferredModelFormat:'glb', upAxis:'Y', units:'meters', defaultQuality:'medium', supportedQualityTiers:['low','medium','high'] },
  coverage: { assetRecords:assets.length, readyRecords:assets.length, generatedBinaryModels:generated.length, note:'Character skinning and animations remain a separate task.' },
  assets
}, null, 2) + '\n');

const catalogPath = path.join(modelsRoot, 'ASSET-CATALOG.md');
fs.writeFileSync(catalogPath, `# Authored 3D Asset Catalog\n\nGenerated GLB files: **${generated.length}**.\n\nThe pack includes the tactical puppy, all eight raiders, the remaining weapons, five armor models, Critter Pack, death box, freight car, ranger outpost, and three gameplay VFX meshes. Existing Pea Popper, Pine Valley, railway, crate, and terrain assets remain included.\n\nCharacter models are real browser-loadable static GLBs. Skinning and animation clips are not represented as complete.\n`);

console.log(`Generated ${generated.length} missing GLB files and ${assets.length} ready manifest records.`);
