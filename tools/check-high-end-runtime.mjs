import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const requireFile = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return null;
  }
  return absolutePath;
};

const readText = relativePath => {
  const file = requireFile(relativePath);
  return file ? fs.readFileSync(file, 'utf8') : '';
};

const core = readText('core/game/game-core.js');
const runtime = readText('core/rendering/high-end-glb-runtime.js');
const modelLibrary = readText('core/rendering/model-library.js');

const patchAnchors = [
  {
    name: 'renderer mesh initialization',
    text: 'this.meshes={cube:this.makeMesh(makeCubeData()),wedge:this.makeMesh(makeWedgeData())};'
  },
  {
    name: 'renderer makeMesh implementation',
    text: 'makeMesh(d){const gl=this.gl;const mesh={count:d.idx.length};'
  },
  {
    name: 'renderer startup completion',
    text: "document.documentElement.dataset.renderer = rendererMode;"
  },
  {
    name: 'third-person Pea Popper branch',
    text: "}else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){"
  },
  {
    name: 'first-person Pea Popper branch',
    text: "else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){part(-.50,0,.01"
  }
];

for (const anchor of patchAnchors) {
  if (!core.includes(anchor.text)) errors.push(`game-core.js no longer contains the ${anchor.name} patch anchor`);
}

for (const marker of [
  'function parseGlb(buffer)',
  'installAuthoredGroup(name,parts)',
  "drawAuthored(name,x,y,z",
  "'weapon.pea_popper'",
  'patchGameSource(source)'
]) {
  if (!runtime.includes(marker)) errors.push(`Authored runtime is missing marker: ${marker}`);
}

if (!modelLibrary.includes('high-end-glb-runtime.js')) {
  errors.push('model-library.js does not load the authored GLB runtime');
}

function validateGlb(relativePath) {
  const file = requireFile(relativePath);
  if (!file) return;
  const buffer = fs.readFileSync(file);
  if (buffer.length < 20) {
    errors.push(`${relativePath} is too small to be a GLB 2.0 file`);
    return;
  }
  if (buffer.toString('ascii', 0, 4) !== 'glTF') errors.push(`${relativePath} has an invalid GLB magic header`);
  if (buffer.readUInt32LE(4) !== 2) errors.push(`${relativePath} is not GLB version 2`);
  if (buffer.readUInt32LE(8) !== buffer.length) errors.push(`${relativePath} header length does not match file length`);

  let offset = 12;
  let jsonChunk = false;
  let binChunk = false;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const next = offset + 8 + chunkLength;
    if (next > buffer.length) {
      errors.push(`${relativePath} contains a truncated GLB chunk`);
      break;
    }
    if (chunkType === 0x4e4f534a) jsonChunk = true;
    if (chunkType === 0x004e4942) binChunk = true;
    offset = next;
  }
  if (!jsonChunk) errors.push(`${relativePath} is missing its JSON chunk`);
  if (!binChunk) errors.push(`${relativePath} is missing its binary chunk`);
}

for (const glb of [
  'assets/models/weapons/pea_popper/pea_popper_lod0.glb',
  'assets/models/loot/supply_crate/supply_crate.glb',
  'assets/models/vegetation/pine_tree/pine_tree_lod0.glb'
]) validateGlb(glb);

if (errors.length) {
  console.error(`High-end runtime validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('High-end GLB runtime, patch anchors, and binary assets OK');
