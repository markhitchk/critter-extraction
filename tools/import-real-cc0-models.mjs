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

function findModel(sourceDirectory, patterns) {
  const candidates = walk(sourceDirectory)
    .map(file => {
      const name = normalize(path.basename(file));
      let score = 0;
      for (const pattern of patterns) {
        const wanted = normalize(pattern);
        if (name === wanted) score = Math.max(score, 1000);
        else if (name.startsWith(`${wanted} `) || name.endsWith(` ${wanted}`)) score = Math.max(score, 800);
        else if (name.includes(wanted)) score = Math.max(score, 600);
      }
      if (/\.glb$/i.test(file)) score += 25;
      return { file, score };
    })
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  if (!candidates.length) throw new Error(`No GLTF/GLB model matched ${patterns.join(', ')} under ${sourceDirectory}`);
  return candidates[0].file;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: repoRoot });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
}

function convertToGlb(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (/\.glb$/i.test(source)) fs.copyFileSync(source, destination);
  else run('npx', ['--yes', '@gltf-transform/cli', 'copy', source, destination]);
}

function inspectGlb(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${file} is not GLB 2.0`);
  if (buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) throw new Error(`${file} has an invalid GLB header`);
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${file} does not start with a JSON chunk`);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
  return {
    bytes: buffer.length,
    nodes: json.nodes?.length || 0,
    meshes: json.meshes?.length || 0,
    primitives: (json.meshes || []).reduce((sum, mesh) => sum + (mesh.primitives?.length || 0), 0),
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
  ['character.toon_soldier', 'toon', ['Character Soldier'], 'quaternius/toon-shooter/characters/character_soldier.glb', 'rigged shooter body and animation reference'],
  ['character.toon_enemy', 'toon', ['Character Enemy'], 'quaternius/toon-shooter/characters/character_enemy.glb', 'rigged enemy body and animation reference'],
  ['character.rabbit', 'sushi', ['Rabbit'], 'quaternius/sushi-restaurant/characters/rabbit.glb', 'authored anthropomorphic critter character'],
  ['character.panda', 'sushi', ['Panda'], 'quaternius/sushi-restaurant/characters/panda.glb', 'authored anthropomorphic critter character'],
  ['animal.husky', 'animals', ['Husky'], 'quaternius/animated-animals/husky.glb', 'authored animated canine anatomy reference'],
  ['animal.shiba', 'animals', ['Shiba Inu', 'Shiba'], 'quaternius/animated-animals/shiba_inu.glb', 'authored animated canine anatomy reference'],
  ['weapon.smg', 'toon', ['SMG'], 'quaternius/toon-shooter/weapons/smg.glb', 'Acorn Sprayer replacement base'],
  ['weapon.ak', 'toon', ['AK'], 'quaternius/toon-shooter/weapons/ak.glb', 'Honey Carbine replacement base'],
  ['weapon.shotgun', 'toon', ['Shotgun'], 'quaternius/toon-shooter/weapons/shotgun.glb', 'Carrot Scatter replacement base'],
  ['weapon.sniper', 'toon', ['Sniper'], 'quaternius/toon-shooter/weapons/sniper.glb', 'Moonbeam replacement base'],
  ['weapon.pistol', 'toon', ['Pistol'], 'quaternius/toon-shooter/weapons/pistol.glb', 'sidearm model'],
  ['environment.tree', 'toon', ['Tree 1'], 'quaternius/toon-shooter/environment/tree.glb', 'authored tree replacement'],
  ['environment.crate', 'toon', ['Crate'], 'quaternius/toon-shooter/environment/crate.glb', 'authored loot crate replacement'],
  ['environment.shipping_container', 'toon', ['Container Long'], 'quaternius/toon-shooter/environment/shipping_container.glb', 'authored cover and railway-yard prop'],
  ['environment.barrier', 'toon', ['Barrier Large'], 'quaternius/toon-shooter/environment/barrier.glb', 'authored tactical cover prop']
].map(([id, pack, patterns, output, role]) => ({ id, pack, patterns, output, role }));

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
  note: 'Original authored CC0 assets, not procedural blockouts. Critter Extraction-specific redesign and runtime integration remain separate work.',
  sources: [
    { id:'quaternius-toon-shooter', title:'Toon Shooter Game Kit', author:'Quaternius', license:'CC0-1.0', source:'https://quaternius.com/packs/toonshootergamekit.html', downloadFolder:'https://drive.google.com/drive/folders/1-BDs_EIyd6uiF2XuoyiZEcqnMQIJrE0C' },
    { id:'quaternius-sushi-restaurant', title:'Sushi Restaurant Kit', author:'Quaternius', license:'CC0-1.0', source:'https://quaternius.com/packs/sushirestaurantkit.html', downloadFolder:'https://drive.google.com/drive/folders/1srOaThdSqYBtmrqq9couZShM5r0cw_bH' },
    { id:'quaternius-ultimate-animated-animals', title:'Ultimate Animated Animal Pack', author:'Quaternius', license:'CC0-1.0', source:'https://quaternius.com/packs/ultimateanimatedanimals.html', downloadFolder:'https://drive.google.com/drive/folders/1uJ3N5HfB7jKTseJUNQr3N4YaN0UuEtHk' }
  ],
  assets: records
};

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.mkdirSync(path.dirname(markerPath), { recursive: true });
fs.writeFileSync(markerPath, `${JSON.stringify({ importedAt: manifest.generatedAt, count: records.length }, null, 2)}\n`);
console.log(`Imported and validated ${records.length} real authored GLB models.`);
