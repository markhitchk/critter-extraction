import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const sourceRoot = process.env.CC0_SOURCE_ROOT || '/tmp/cc0-assets';
const outputRoot = path.join(repoRoot, 'prerelease/assets/models/third_party');
const manifestPath = path.join(repoRoot, 'prerelease/assets/manifest/real-cc0-assets.json');
const markerPath = path.join(outputRoot, '.import-complete.json');

const normalize = value => String(value)
  .toLowerCase()
  .replace(/\.(gltf|glb)$/i, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (/\.(gltf|glb)$/i.test(entry.name)) output.push(full);
  }
  return output;
}

function scoreCandidate(file, patterns) {
  const normalized = normalize(path.basename(file));
  let score = 0;
  for (const pattern of patterns) {
    const wanted = normalize(pattern);
    if (normalized === wanted) score = Math.max(score, 1000);
    else if (normalized.startsWith(`${wanted} `) || normalized.endsWith(` ${wanted}`)) score = Math.max(score, 800);
    else if (normalized.includes(wanted)) score = Math.max(score, 600);
  }
  if (/\/gltf\//i.test(file.replaceAll('\\', '/'))) score += 100;
  if (/\.glb$/i.test(file)) score += 25;
  return score;
}

function findModel(sourceDirectory, patterns) {
  const candidates = walk(sourceDirectory)
    .map(file => ({ file, score: scoreCandidate(file, patterns) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  if (!candidates.length) {
    throw new Error(`No GLTF/GLB model matched ${patterns.join(', ')} under ${sourceDirectory}`);
  }
  return candidates[0].file;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: repoRoot });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
}

function convertToGlb(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (/\.glb$/i.test(source)) {
    fs.copyFileSync(source, destination);
    return;
  }
  run('npx', ['--yes', '@gltf-transform/cli', 'copy', source, destination]);
}

function inspectGlb(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(`${file} is not a GLB 2.0 binary`);
  }
  if (buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) {
    throw new Error(`${file} has an invalid GLB header`);
  }
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error(`${file} does not start with a JSON chunk`);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
  const primitiveCount = (json.meshes || []).reduce((sum, mesh) => sum + (mesh.primitives?.length || 0), 0);
  return {
    bytes: buffer.length,
    nodes: json.nodes?.length || 0,
    meshes: json.meshes?.length || 0,
    primitives: primitiveCount,
    skins: json.skins?.length || 0,
    animations: json.animations?.length || 0,
    materials: json.materials?.length || 0,
    textures: json.textures?.length || 0
  };
}

const packs = {
  toon: path.join(sourceRoot, 'toon-shooter'),
  sushi: path.join(sourceRoot, 'sushi-restaurant'),
  animals: path.join(sourceRoot, 'animated-animals')
};

const assets = [
  {
    id: 'character.toon_soldier',
    pack: 'toon',
    patterns: ['Character Soldier', 'Soldier'],
    output: 'quaternius/toon-shooter/characters/character_soldier.glb',
    role: 'rigged shooter body and animation reference'
  },
  {
    id: 'character.toon_enemy',
    pack: 'toon',
    patterns: ['Character Enemy'],
    output: 'quaternius/toon-shooter/characters/character_enemy.glb',
    role: 'rigged enemy body and animation reference'
  },
  {
    id: 'character.rabbit',
    pack: 'sushi',
    patterns: ['Rabbit'],
    output: 'quaternius/sushi-restaurant/characters/rabbit.glb',
    role: 'authored anthropomorphic critter character'
  },
  {
    id: 'character.panda',
    pack: 'sushi',
    patterns: ['Panda'],
    output: 'quaternius/sushi-restaurant/characters/panda.glb',
    role: 'authored anthropomorphic critter character'
  },
  {
    id: 'animal.husky',
    pack: 'animals',
    patterns: ['Husky'],
    output: 'quaternius/animated-animals/husky.glb',
    role: 'authored animated canine anatomy reference'
  },
  {
    id: 'animal.shiba',
    pack: 'animals',
    patterns: ['Shiba Inu', 'Shiba'],
    output: 'quaternius/animated-animals/shiba_inu.glb',
    role: 'authored animated canine anatomy reference'
  },
  {
    id: 'weapon.smg',
    pack: 'toon',
    patterns: ['Smg'],
    output: 'quaternius/toon-shooter/weapons/smg.glb',
    role: 'Acorn Sprayer replacement base'
  },
  {
    id: 'weapon.ak47',
    pack: 'toon',
    patterns: ['Ak47', 'AK 47'],
    output: 'quaternius/toon-shooter/weapons/ak47.glb',
    role: 'Honey Carbine replacement base'
  },
  {
    id: 'weapon.shotgun',
    pack: 'toon',
    patterns: ['Shotgun'],
    output: 'quaternius/toon-shooter/weapons/shotgun.glb',
    role: 'Carrot Scatter replacement base'
  },
  {
    id: 'weapon.sniper',
    pack: 'toon',
    patterns: ['Sniper'],
    output: 'quaternius/toon-shooter/weapons/sniper.glb',
    role: 'Moonbeam replacement base'
  },
  {
    id: 'weapon.pistol',
    pack: 'toon',
    patterns: ['Pistol'],
    output: 'quaternius/toon-shooter/weapons/pistol.glb',
    role: 'sidearm model'
  },
  {
    id: 'environment.tree',
    pack: 'toon',
    patterns: ['Tree'],
    output: 'quaternius/toon-shooter/environment/tree.glb',
    role: 'authored tree replacement'
  },
  {
    id: 'environment.crate',
    pack: 'toon',
    patterns: ['Crate'],
    output: 'quaternius/toon-shooter/environment/crate.glb',
    role: 'authored loot crate replacement'
  },
  {
    id: 'environment.shipping_container',
    pack: 'toon',
    patterns: ['Shipping Container'],
    output: 'quaternius/toon-shooter/environment/shipping_container.glb',
    role: 'authored cover and railway-yard prop'
  },
  {
    id: 'environment.barrier',
    pack: 'toon',
    patterns: ['Barrier Large', 'Barrier Fixed', 'Barrier'],
    output: 'quaternius/toon-shooter/environment/barrier.glb',
    role: 'authored tactical cover prop'
  }
];

const records = [];
for (const asset of assets) {
  const source = findModel(packs[asset.pack], asset.patterns);
  const destination = path.join(outputRoot, asset.output);
  convertToGlb(source, destination);
  const inspection = inspectGlb(destination);
  records.push({
    id: asset.id,
    sourcePack: asset.pack,
    sourceFile: path.relative(sourceRoot, source).replaceAll('\\', '/'),
    runtimePath: path.relative(path.join(repoRoot, 'prerelease'), destination).replaceAll('\\', '/'),
    role: asset.role,
    productionState: 'external-authored-cc0',
    runtimeIntegrated: false,
    ...inspection
  });
  console.log(`Imported ${asset.id}: ${source} -> ${destination}`);
}

const manifest = {
  schemaVersion: 1,
  project: 'Critter Extraction',
  generatedAt: new Date().toISOString(),
  status: 'real-cc0-models-imported',
  note: 'These are original authored assets from CC0 packs, not procedural blockouts. Runtime integration and Critter Extraction-specific redesign remain separate steps.',
  sources: [
    {
      id: 'quaternius-toon-shooter',
      title: 'Toon Shooter Game Kit',
      author: 'Quaternius',
      license: 'CC0-1.0',
      source: 'https://quaternius.com/packs/toonshootergamekit.html',
      downloadFolder: 'https://drive.google.com/drive/folders/1-BDs_EIyd6uiF2XuoyiZEcqnMQIJrE0C'
    },
    {
      id: 'quaternius-sushi-restaurant',
      title: 'Sushi Restaurant Kit',
      author: 'Quaternius',
      license: 'CC0-1.0',
      source: 'https://quaternius.com/packs/sushirestaurantkit.html',
      downloadFolder: 'https://drive.google.com/drive/folders/1srOaThdSqYBtmrqq9couZShM5r0cw_bH'
    },
    {
      id: 'quaternius-ultimate-animated-animals',
      title: 'Ultimate Animated Animal Pack',
      author: 'Quaternius',
      license: 'CC0-1.0',
      source: 'https://quaternius.com/packs/ultimateanimatedanimals.html',
      downloadFolder: 'https://drive.google.com/drive/folders/1uJ3N5HfB7jKTseJUNQr3N4YaN0UuEtHk'
    }
  ],
  assets: records
};

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.mkdirSync(path.dirname(markerPath), { recursive: true });
fs.writeFileSync(markerPath, `${JSON.stringify({ importedAt: manifest.generatedAt, count: records.length }, null, 2)}\n`);

console.log(`Imported and validated ${records.length} real authored GLB models.`);
