import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const read = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath);
};

const patch = read('core/rendering/high-end-rock-patches.js').toString('utf8');
const modelLibrary = read('core/rendering/model-library.js').toString('utf8');
const rockPath = 'assets/models/rocks/pine_valley_rock/pine_valley_rock_lod0.glb';
const rock = read(rockPath);

for (const marker of [
  "const ROCK_ID = 'rock.pine_valley_cover'",
  "map.id==='pine-valley'",
  "renderer.drawAuthored?.('rock.pine_valley_cover'",
  'HarleyHighEndRuntime?.loadAsset',
  'patchRockSource'
]) {
  if (!patch.includes(marker)) errors.push(`Rock runtime patch is missing marker: ${marker}`);
}

if (!modelLibrary.includes('high-end-rock-patches.js')) {
  errors.push('model-library.js does not load high-end-rock-patches.js');
}
if (!modelLibrary.includes(rockPath)) {
  errors.push(`model-library.js does not register ${rockPath}`);
}

if (rock.length) {
  if (rock.length < 20) errors.push(`${rockPath} is too small to be GLB 2.0`);
  if (rock.toString('ascii', 0, 4) !== 'glTF') errors.push(`${rockPath} has invalid GLB magic`);
  if (rock.readUInt32LE(4) !== 2) errors.push(`${rockPath} is not GLB version 2`);
  if (rock.readUInt32LE(8) !== rock.length) errors.push(`${rockPath} header length does not match file size`);
}

if (errors.length) {
  console.error(`Pine Valley rock validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Authored Pine Valley rock asset and runtime integration OK');
