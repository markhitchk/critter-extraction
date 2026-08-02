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

const core = readText('core/game/game-core.js');
const patch = readText('core/rendering/high-end-acorn-patches.js');
const modelLibrary = readText('core/rendering/model-library.js');
const assetPath = 'assets/models/weapons/acorn_sprayer/acorn_sprayer_lod2.glb';

for (const marker of [
  "const ACORN_ID = 'weapon.acorn_sprayer'",
  `const ACORN_URL = './${assetPath}'`,
  "renderer.installAuthoredGroup?.('weapon.acorn_sprayer'",
  "renderer.drawAuthored?.('weapon.acorn_sprayer'",
  "document.documentElement.dataset.acornSprayerModel='ready'",
  'patchAcornSource(source)',
  'if(!renderer.drawAuthored?.'
]) {
  if (!patch.includes(marker)) errors.push(`Acorn Sprayer runtime patch is missing marker: ${marker}`);
}

for (const anchor of [
  "if(p.weaponId==='acorn_sprayer'){",
  "part('wedge',-.44,0,.02,.48,.34,.58,'#34434c')",
  "part(-.48,0,.02,.38,.28,.48,'#34434c',0,'wedge')"
]) {
  if (!core.includes(anchor)) errors.push(`game-core.js no longer contains Acorn Sprayer patch anchor: ${anchor}`);
}

for (const required of ['high-end-acorn-patches.js', assetPath]) {
  if (!modelLibrary.includes(required)) errors.push(`model-library.js does not register ${required}`);
}

const buffer = readBytes(assetPath);
if (buffer.length) {
  if (buffer.length < 20) errors.push(`${assetPath} is too small to be GLB 2.0`);
  if (buffer.toString('ascii', 0, 4) !== 'glTF') errors.push(`${assetPath} has invalid GLB magic`);
  if (buffer.readUInt32LE(4) !== 2) errors.push(`${assetPath} is not GLB version 2`);
  if (buffer.readUInt32LE(8) !== buffer.length) errors.push(`${assetPath} header length does not match file size`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) {
    errors.push(`${assetPath} does not begin with a JSON chunk`);
  } else {
    try {
      const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
      const extras = json.scenes?.[json.scene || 0]?.extras || {};
      if (extras.asset_id !== 'weapon.acorn_sprayer') errors.push(`${assetPath} asset_id must be weapon.acorn_sprayer`);
      if (Number(extras.lod) !== 2) errors.push(`${assetPath} must declare lod 2`);
      if (extras.source_up_axis !== 'Z') errors.push(`${assetPath} must declare source_up_axis Z`);
      const attachmentNodes = extras.attachment_nodes || [];
      for (const node of ['grip_primary', 'grip_support', 'muzzle', 'drum']) {
        if (!attachmentNodes.includes(node)) errors.push(`${assetPath} is missing attachment node metadata: ${node}`);
      }
      if (!Array.isArray(json.meshes) || json.meshes.length < 6) errors.push(`${assetPath} must contain at least six distinct mesh parts`);
    } catch (error) {
      errors.push(`${assetPath} JSON chunk is invalid: ${error.message}`);
    }
  }
}

if (errors.length) {
  console.error(`Acorn Sprayer validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Authored Acorn Sprayer asset and first/third-person integration OK');
