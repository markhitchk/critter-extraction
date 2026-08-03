import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const readText = relative => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing file: ${relative}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
};
const readBytes = relative => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing file: ${relative}`);
    return Buffer.alloc(0);
  }
  return fs.readFileSync(absolute);
};

const manifestPath = 'prerelease/assets/manifest/real-cc0-assets.json';
const manifestText = readText(manifestPath);
let manifest = null;
try {
  manifest = JSON.parse(manifestText);
} catch (error) {
  errors.push(`${manifestPath} is invalid JSON: ${error.message}`);
}

if (manifest) {
  if (manifest.status !== 'real-cc0-models-imported') errors.push('Real model manifest has the wrong status');
  if (!Array.isArray(manifest.assets) || manifest.assets.length < 15) errors.push('Real model manifest must include at least 15 assets');
  if (!manifest.assets?.every(asset => asset.productionState === 'external-authored-cc0')) {
    errors.push('Real model manifest includes a generated blockout');
  }
  const rigged = manifest.assets?.filter(asset => (asset.skins || 0) > 0 || (asset.animations || 0) > 0) || [];
  if (rigged.length < 6) errors.push(`Expected six rigged or animated source models; found ${rigged.length}`);

  for (const asset of manifest.assets || []) {
    const relative = `prerelease/${asset.runtimePath}`;
    const buffer = readBytes(relative);
    if (!buffer.length) continue;
    if (buffer.length < 1024) errors.push(`${asset.id} is too small to be a substantive authored GLB`);
    if (buffer.toString('ascii', 0, 4) !== 'glTF') errors.push(`${asset.id} has invalid GLB magic`);
    if (buffer.readUInt32LE(4) !== 2) errors.push(`${asset.id} is not GLB version 2`);
    if (buffer.readUInt32LE(8) !== buffer.length) errors.push(`${asset.id} has an invalid GLB length header`);
    if ((asset.meshes || 0) < 1 || (asset.primitives || 0) < 1) errors.push(`${asset.id} contains no substantive mesh primitives`);
  }
}

const library = readText('prerelease/core/rendering/model-library.js');
const runtimePatch = readText('prerelease/core/rendering/real-cc0-runtime-patches.js');
const acornPatch = readText('prerelease/core/rendering/high-end-acorn-patches.js');
const gameCore = readText('prerelease/core/game/game-core.js');

for (const marker of [
  'real-cc0-runtime-patches.js',
  'third_party/quaternius/toon-shooter/weapons/smg.glb',
  'third_party/quaternius/toon-shooter/weapons/ak.glb',
  'third_party/quaternius/toon-shooter/weapons/shotgun.glb',
  'third_party/quaternius/toon-shooter/weapons/sniper.glb',
  'third_party/quaternius/toon-shooter/environment/tree.glb',
  'third_party/quaternius/toon-shooter/environment/crate.glb'
]) {
  if (!library.includes(marker)) errors.push(`model-library.js is missing: ${marker}`);
}

for (const marker of [
  "'real.weapon.honey_carbine'",
  "'real.weapon.carrot_scatter'",
  "'real.weapon.moonbeam'",
  "'real.vegetation.pine_tree'",
  "'real.loot.supply_crate'",
  "'real.environment.shipping_container'",
  "renderer.drawAuthored?.('real.weapon.honey_carbine'",
  "renderer.drawAuthored?.('real.weapon.carrot_scatter'",
  "renderer.drawAuthored?.('real.weapon.moonbeam'",
  'patchRealAssets(source)'
]) {
  if (!runtimePatch.includes(marker)) errors.push(`real-cc0-runtime-patches.js is missing: ${marker}`);
}

if (!acornPatch.includes("third_party/quaternius/toon-shooter/weapons/smg.glb")) {
  errors.push('Acorn Sprayer does not use the real authored SMG path');
}

for (const anchor of [
  "p.weaponId==='honey_carbine'",
  "p.weaponId==='carrot_scatter'",
  "p.weaponId==='moonbeam'",
  'function drawContainerCover(c)',
  'function drawCrateWall(c)'
]) {
  if (!gameCore.includes(anchor)) errors.push(`game-core.js no longer contains runtime patch anchor: ${anchor}`);
}

if (errors.length) {
  console.error(`Real CC0 runtime validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Real authored CC0 model import and runtime integration OK (${manifest.assets.length} models).`);
console.table(manifest.assets.map(({ id, bytes, meshes, primitives, skins, animations, runtimeIntegrated }) => ({
  id, bytes, meshes, primitives, skins, animations, runtimeIntegrated
})));
