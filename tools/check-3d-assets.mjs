import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestRelativePath = 'assets/manifest/high-end-assets.json';
const manifestPath = path.join(root, manifestRelativePath);
const errors = [];
const warnings = [];

const normalizeRelativePath = value => String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
const exists = value => fs.existsSync(path.join(root, normalizeRelativePath(value)));
const isExternal = value => /^(?:[a-z]+:)?\/\//i.test(String(value || ''));
const isRuntimeModel = value => /\.(?:glb|gltf)$/i.test(String(value || ''));
const isRuntimeTexture = value => /\.(?:webp|png|jpg|jpeg|ktx2|basis)$/i.test(String(value || ''));

function report(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Unable to parse ${path.relative(root, filePath)}: ${error.message}`);
    return null;
  }
}

function validateRepositoryPath(value, label, extensions = null, mustExist = false) {
  const normalized = normalizeRelativePath(value);
  report(Boolean(normalized), `${label} must not be empty`);
  if (!normalized) return;
  report(!path.isAbsolute(normalized), `${label} must be repository-relative: ${normalized}`);
  report(!normalized.startsWith('../'), `${label} must not leave the repository: ${normalized}`);
  report(!isExternal(normalized), `${label} must not use an external URL: ${normalized}`);
  if (extensions === 'model') report(isRuntimeModel(normalized), `${label} must use .glb or .gltf: ${normalized}`);
  if (extensions === 'texture') report(isRuntimeTexture(normalized), `${label} uses an unsupported texture format: ${normalized}`);
  if (mustExist) report(exists(normalized), `${label} does not exist: ${normalized}`);
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(fullPath));
    else output.push(fullPath);
  }
  return output;
}

report(fs.existsSync(manifestPath), `Missing ${manifestRelativePath}`);
const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;

if (manifest) {
  report(Number.isInteger(manifest.schemaVersion) && manifest.schemaVersion >= 1, 'schemaVersion must be a positive integer');
  report(manifest.project === 'Critter Extraction', 'manifest project must be Critter Extraction');
  report(manifest.studio === "Harley's Studios", "manifest studio must be Harley's Studios");
  report(Array.isArray(manifest.assets), 'assets must be an array');
  report(Array.isArray(manifest.verticalSlice), 'verticalSlice must be an array');

  const preferredFormat = String(manifest.runtime?.preferredModelFormat || '').toLowerCase();
  report(preferredFormat === 'glb' || preferredFormat === 'gltf', 'runtime.preferredModelFormat must be glb or gltf');
  report(manifest.runtime?.upAxis === 'Y', 'runtime.upAxis must be Y for glTF assets');
  report(manifest.runtime?.units === 'meters', 'runtime.units must be meters');

  const tiers = manifest.runtime?.supportedQualityTiers;
  report(Array.isArray(tiers), 'runtime.supportedQualityTiers must be an array');
  for (const requiredTier of ['low', 'medium', 'high']) {
    report(tiers?.includes(requiredTier), `Missing required quality tier: ${requiredTier}`);
    report(Boolean(manifest.qualityTiers?.[requiredTier]), `Missing qualityTiers.${requiredTier}`);
  }

  for (const [name, referencePath] of Object.entries(manifest.references || {})) {
    validateRepositoryPath(referencePath, `references.${name}`, null, true);
  }

  const allowedStatuses = new Set(['planned', 'in-progress', 'ready', 'deprecated']);
  const idPattern = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
  const ids = new Set();
  const referencedRuntimeModels = new Set();
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];

  for (const [index, asset] of assets.entries()) {
    const prefix = `assets[${index}]`;
    report(asset && typeof asset === 'object' && !Array.isArray(asset), `${prefix} must be an object`);
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) continue;

    report(idPattern.test(String(asset.id || '')), `${prefix}.id must use category.asset_name format`);
    report(!ids.has(asset.id), `Duplicate asset id: ${asset.id}`);
    ids.add(asset.id);

    report(typeof asset.category === 'string' && asset.category.length > 0, `${asset.id || prefix} must declare category`);
    report(allowedStatuses.has(asset.status), `${asset.id || prefix} has unsupported status: ${asset.status}`);

    if (asset.currentFallback) {
      validateRepositoryPath(asset.currentFallback, `${asset.id}.currentFallback`, null, true);
    }

    const declaredModels = [];
    if (asset.runtimePath) declaredModels.push(['runtimePath', asset.runtimePath]);
    if (asset.firstPersonPath) declaredModels.push(['firstPersonPath', asset.firstPersonPath]);
    if (asset.collisionPath) declaredModels.push(['collisionPath', asset.collisionPath]);
    for (const [lodName, lodPath] of Object.entries(asset.lods || {})) {
      declaredModels.push([`lods.${lodName}`, lodPath]);
    }

    for (const [field, modelPath] of declaredModels) {
      const mustExist = asset.status === 'ready';
      validateRepositoryPath(modelPath, `${asset.id}.${field}`, 'model', mustExist);
      referencedRuntimeModels.add(normalizeRelativePath(modelPath));
    }

    if (asset.status === 'ready') {
      report(Boolean(asset.runtimePath || Object.keys(asset.lods || {}).length), `${asset.id} is ready but has no runtime model path`);
      if (asset.requiresLods) {
        const lods = asset.lods || {};
        report(Boolean(lods.lod0 && lods.lod1 && lods.lod2), `${asset.id} requires lod0, lod1, and lod2`);
      }
      if (asset.requiresCollisionProxy) {
        report(Boolean(asset.collisionPath), `${asset.id} requires a collisionPath`);
      }
    }

    for (const [textureName, texturePath] of Object.entries(asset.textures || {})) {
      validateRepositoryPath(texturePath, `${asset.id}.textures.${textureName}`, 'texture', asset.status === 'ready');
    }

    if (asset.targetTriangles !== undefined) {
      if (typeof asset.targetTriangles === 'number') {
        report(Number.isFinite(asset.targetTriangles) && asset.targetTriangles > 0, `${asset.id}.targetTriangles must be positive`);
      } else {
        const triangleValues = Object.values(asset.targetTriangles || {}).map(Number);
        report(triangleValues.length > 0 && triangleValues.every(value => Number.isFinite(value) && value > 0), `${asset.id}.targetTriangles LOD values must be positive`);
        const lod0 = Number(asset.targetTriangles?.lod0);
        const lod1 = Number(asset.targetTriangles?.lod1);
        const lod2 = Number(asset.targetTriangles?.lod2);
        if ([lod0, lod1, lod2].every(Number.isFinite)) {
          report(lod0 > lod1 && lod1 > lod2, `${asset.id} triangle budgets must decrease from lod0 to lod2`);
        }
      }
    }

    for (const field of ['attachmentNodes', 'requiredAnimations', 'states', 'materialLayers']) {
      if (asset[field] === undefined) continue;
      report(Array.isArray(asset[field]), `${asset.id}.${field} must be an array`);
      if (Array.isArray(asset[field])) {
        report(new Set(asset[field]).size === asset[field].length, `${asset.id}.${field} contains duplicate values`);
      }
    }
  }

  for (const id of manifest.verticalSlice || []) {
    report(ids.has(id), `verticalSlice references an unknown asset: ${id}`);
  }

  const runtimeModelDirectory = path.join(root, 'assets/models');
  const diskModels = walk(runtimeModelDirectory)
    .map(filePath => normalizeRelativePath(path.relative(root, filePath)))
    .filter(isRuntimeModel);

  for (const modelPath of diskModels) {
    warn(referencedRuntimeModels.has(modelPath), `Untracked runtime model is not declared in the manifest: ${modelPath}`);
  }

  const readyCount = assets.filter(asset => asset.status === 'ready').length;
  const inProgressCount = assets.filter(asset => asset.status === 'in-progress').length;
  const plannedCount = assets.filter(asset => asset.status === 'planned').length;

  console.log(`3D asset manifest: ${assets.length} entries (${readyCount} ready, ${inProgressCount} in progress, ${plannedCount} planned)`);
}

for (const message of warnings) console.warn(`Warning: ${message}`);

if (errors.length) {
  console.error(`3D asset validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log('High-end 3D asset manifest OK');
