import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const text = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
};
const bytes = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return Buffer.alloc(0);
  }
  return fs.readFileSync(absolutePath);
};

const core = text('core/game/game-core.js');
const patch = text('core/rendering/high-end-ground-patches.js');
const modelLibrary = text('core/rendering/model-library.js');

for (const marker of [
  "const GRASS_ID = 'vegetation.pine_grass'",
  "const RAIL_ID = 'rail.pine_track_set'",
  "renderer.drawAuthored?.('${GRASS_ID}'",
  "renderer.drawAuthored('${RAIL_ID}'",
  'patchGroundSource(source)',
  "world?.map?.id==='pine-valley'",
  "world.map?.id==='pine-valley'"
]) {
  if (!patch.includes(marker)) errors.push(`Ground runtime patch is missing marker: ${marker}`);
}

for (const anchor of [
  "function drawGrassClump(x,z,s=1,color='#467f46')",
  "for(const off of [-1.35,1.35])renderer.draw('cube'",
  "for(let along=-19;along<=19;along+=1.25)renderer.draw('cube'"
]) {
  if (!core.includes(anchor)) errors.push(`game-core.js no longer contains ground patch anchor: ${anchor}`);
}

for (const required of [
  'high-end-ground-patches.js',
  'assets/models/vegetation/pine_grass/pine_grass_cluster.glb',
  'assets/models/railway/pine_rail_segment/pine_rail_segment.glb'
]) {
  if (!modelLibrary.includes(required)) errors.push(`model-library.js does not register ${required}`);
}

function validateGlb(relativePath, expectedAssetId) {
  const buffer = bytes(relativePath);
  if (!buffer.length) return;
  if (buffer.length < 20) errors.push(`${relativePath} is too small to be GLB 2.0`);
  if (buffer.toString('ascii', 0, 4) !== 'glTF') errors.push(`${relativePath} has invalid GLB magic`);
  if (buffer.readUInt32LE(4) !== 2) errors.push(`${relativePath} is not GLB version 2`);
  if (buffer.readUInt32LE(8) !== buffer.length) errors.push(`${relativePath} header length does not match file size`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) {
    errors.push(`${relativePath} does not begin with a JSON chunk`);
    return;
  }
  try {
    const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
    const extras = json.scenes?.[json.scene || 0]?.extras || {};
    if (extras.asset_id !== expectedAssetId) errors.push(`${relativePath} asset_id must be ${expectedAssetId}`);
    if (extras.source_up_axis !== 'Z') errors.push(`${relativePath} must declare source_up_axis Z for the current loader`);
  } catch (error) {
    errors.push(`${relativePath} JSON chunk is invalid: ${error.message}`);
  }
}

validateGlb('assets/models/vegetation/pine_grass/pine_grass_cluster.glb', 'vegetation.pine_grass');
validateGlb('assets/models/railway/pine_rail_segment/pine_rail_segment.glb', 'rail.pine_track_set');

if (errors.length) {
  console.error(`Pine Valley grass and railway validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Authored Pine Valley grass and railway assets and runtime integration OK');
