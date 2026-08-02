import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const readText = relativePath => {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
};
const readBytes = relativePath => {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing required file: ${relativePath}`);
    return Buffer.alloc(0);
  }
  return fs.readFileSync(absolute);
};

const runtime = readText('core/rendering/high-end-glb-runtime.js');
const patch = readText('core/rendering/high-end-lod-patches.js');
const modelLibrary = readText('core/rendering/model-library.js');

for (const marker of [
  "high: './assets/models/weapons/pea_popper/pea_popper_lod0.glb'",
  "medium: './assets/models/weapons/pea_popper/pea_popper_lod1.glb'",
  "low: './assets/models/weapons/pea_popper/pea_popper_lod2.glb'",
  "profile.key==='medium'?'medium':'high'",
  "activeAccount().settings.compatibilityMode",
  "renderer.installAuthoredGroup('weapon.pea_popper',parts)",
  "document.documentElement.dataset.peaPopperLod=tier",
  'patchLodSource(source)'
]) {
  if (!patch.includes(marker)) errors.push(`LOD runtime patch is missing marker: ${marker}`);
}

const installAnchor = "if(rendererMode==='webgl')window.HarleyHighEndRuntime?.install(renderer).then(({loaded})=>";
if (!runtime.includes(installAnchor)) errors.push('Authored runtime no longer contains the LOD selection patch anchor');

for (const required of [
  'high-end-lod-patches.js',
  'assets/models/weapons/pea_popper/pea_popper_lod0.glb',
  'assets/models/weapons/pea_popper/pea_popper_lod1.glb',
  'assets/models/weapons/pea_popper/pea_popper_lod2.glb'
]) {
  if (!modelLibrary.includes(required)) errors.push(`model-library.js does not register ${required}`);
}

function validateGlb(relativePath, expectedLod) {
  const buffer = readBytes(relativePath);
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
    if (extras.asset_id !== 'weapon.pea_popper') errors.push(`${relativePath} asset_id must be weapon.pea_popper`);
    if (expectedLod > 0 && Number(extras.lod) !== expectedLod) errors.push(`${relativePath} must declare lod ${expectedLod}`);
    if (expectedLod > 0 && extras.source_up_axis !== 'Z') errors.push(`${relativePath} must declare source_up_axis Z`);
    if (!Array.isArray(json.meshes) || json.meshes.length < 1) errors.push(`${relativePath} contains no meshes`);
  } catch (error) {
    errors.push(`${relativePath} JSON chunk is invalid: ${error.message}`);
  }
}

validateGlb('assets/models/weapons/pea_popper/pea_popper_lod0.glb', 0);
validateGlb('assets/models/weapons/pea_popper/pea_popper_lod1.glb', 1);
validateGlb('assets/models/weapons/pea_popper/pea_popper_lod2.glb', 2);

const lodSizes = [0, 1, 2].map(lod => fs.statSync(path.join(root, `assets/models/weapons/pea_popper/pea_popper_lod${lod}.glb`)).size);
if (!(lodSizes[0] > lodSizes[1] && lodSizes[1] > lodSizes[2])) {
  errors.push(`Pea Popper LOD file sizes must decrease from LOD0 to LOD2; got ${lodSizes.join(', ')}`);
}

if (errors.length) {
  console.error(`Pea Popper LOD validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Pea Popper authored LOD selection OK (${lodSizes.join(' / ')} bytes)`);
