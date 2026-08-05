import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const liveRoot = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(liveRoot, relative), 'utf8');

const catalogSource = read('core/rendering/model-library.js');
const modelsSource = read('core/rendering/species-models.js');
const runtimeSource = read('core/rendering/model-runtime.js');
const patchSource = read('core/ui/new-critter-runtime-patch.js');
const appearanceSource = read('core/ui/new-critter-appearance.js');
const rosterSource = read('core/ui/issue-62-live-roster.js');
const copySource = read('core/ui/issue-62-live-copy.js');
const generatedGameSource = read('core/game/game-runtime.js');

for (const [name, source] of [
  ['model-library.js',catalogSource],['species-models.js',modelsSource],['model-runtime.js',runtimeSource],
  ['new-critter-runtime-patch.js',patchSource],['new-critter-appearance.js',appearanceSource],
  ['issue-62-live-roster.js',rosterSource],['issue-62-live-copy.js',copySource],
  ['game-runtime.js',generatedGameSource]
]) assert.doesNotThrow(() => new vm.Script(source,{ filename:name }),`${name} must parse`);

class FakeBlob {
  constructor(parts = [], options = {}) { this.parts = parts; this.type = options.type || ''; }
}
class FakeHead {
  appendChild(node) { return node; }
}
const loadedScript = () => ({ dataset:{ loaded:'true' }, addEventListener() {} });
const storage = new Map();
const windowObject = {
  Blob:FakeBlob,
  CritterPaths:{ resolve:path => path }
};
const documentObject = {
  head:new FakeHead(),
  getElementById:() => loadedScript(),
  createElement:tagName => ({
    tagName:String(tagName).toUpperCase(),
    dataset:{},
    addEventListener() {},
    set src(value) { this._src = value; },
    get src() { return this._src || ''; }
  })
};
const context = vm.createContext({
  console,
  window:windowObject,
  document:documentObject,
  HTMLHeadElement:FakeHead,
  location:{ protocol:'https:' },
  fetch:async () => { throw new Error('fetch must not run during the unit test'); },
  URL:{ createObjectURL:() => 'blob:test', revokeObjectURL() {} },
  navigator:{ deviceMemory:8, hardwareConcurrency:8 },
  matchMedia:() => ({ matches:false }),
  localStorage:{
    getItem:key => storage.get(key) ?? null,
    setItem:(key,value) => storage.set(key,String(value)),
    removeItem:key => storage.delete(key)
  },
  CustomEvent:class CustomEvent {
    constructor(type,options={}) { this.type=type; this.detail=options.detail; }
  },
  encodeURIComponent
});
windowObject.dispatchEvent = () => true;

vm.runInContext(catalogSource,context,{ filename:'model-library.js' });
vm.runInContext(modelsSource,context,{ filename:'species-models.js' });
vm.runInContext(runtimeSource,context,{ filename:'model-runtime.js' });
vm.runInContext(patchSource,context,{ filename:'new-critter-runtime-patch.js' });
await windowObject.__CRITTER_ISSUE_62_READY__;

const catalog = windowObject.HARLEYS_GAME_ASSETS;
const models = windowObject.CritterSpeciesModels;
const runtime = windowObject.CritterModelRuntime;
const runtimePatch = windowObject.NewCritterRuntimePatch;

assert.ok(catalog,'catalog initializes');
assert.ok(models,'procedural model recipes initialize');
assert.ok(runtime,'live model runtime initializes');
assert.ok(runtimePatch,'generated-runtime patch initializes');
assert.equal(catalog.speciesOrder.length,39,'catalog contains all 39 issue #62 critters');
assert.equal(catalog.availableSpecies.length,39,'all 39 critters are playable');
assert.equal(catalog.gameplaySpecies.length,39,'all 39 critters are gameplay species');
assert.equal(catalog.plannedSpecies.length,0,'no critter remains a placeholder');
assert.equal(catalog.enemyRoster.length,39,'enemy AI can use every modeled species');
assert.equal(runtime.liveRuntimeIds.length,39,'all 39 critters enter the generated live runtime');
assert.equal(runtime.additionalRuntimeIds.length,31,'31 species are injected beyond the original eight');
assert.equal(models.validateModels().count,39,'all 39 procedural recipes validate');
assert.equal(models.validateModels().ok,true,'all procedural recipes are complete');

for (const id of catalog.speciesOrder) {
  const entry = runtime.runtimeDefinition(id);
  assert.equal(runtime.sanitizeLiveSpecies(id),id,`${id} remains playable`);
  assert.ok(entry.model.head,`${id} has a head recipe`);
  assert.ok(entry.model.ears,`${id} has an ear or horn recipe`);
  assert.ok(entry.model.tail,`${id} has a tail recipe`);
  assert.ok(entry.firstPersonLimb,`${id} has first-person limbs`);
  assert.equal(models.previewDataUri(id).startsWith('data:image/svg+xml'),true,`${id} has a generated preview`);
  assert.equal(runtime.anchor(id,'accessory').position.length,3,`${id} has an accessory anchor`);
}

assert.equal(runtime.sanitizeLiveSpecies('snow-leopard'),'snowleopard','normalized Snow Leopard is playable');
assert.equal(runtime.sanitizeLiveSpecies('not-a-critter'),'puppy','unknown saves safely fall back to Puppy');
assert.equal(runtime.sanitizeNetworkAppearance({ species:'tiger' }).species,'tiger','multiplayer preserves a modeled species');
assert.equal(runtime.qualityBudget('low').allowInstancing,true,'low quality keeps instancing enabled');
assert.equal(runtime.qualityBudget('high').targetFps,60,'high quality retains its target budget');

const appendSource = runtime.runtimeSpeciesAppendSource();
for (const id of runtime.additionalRuntimeIds) assert.ok(appendSource.includes(`${id}:{`),`${id} is prepared for generated-runtime injection`);

const patchedGameSource = runtimePatch.assertPatchedSource(runtimePatch.patchSource(generatedGameSource));
for (const id of runtime.additionalRuntimeIds) assert.ok(patchedGameSource.includes(`${id}:{`),`${id} is actually injected into game-runtime.js`);
assert.match(patchedGameSource,/CritterSpeciesModels\?\.drawThirdPerson/,'the real generated runtime calls third-person species recipes');
assert.match(patchedGameSource,/CritterSpeciesModels\?\.drawFirstPerson/,'the real generated runtime calls first-person species recipes');
assert.equal(runtimePatch.verification(patchedGameSource).complete,true,'the actual generated runtime receives the complete model patch');
assert.deepEqual([...runtimePatch.report.missing],[],'the real generated runtime has no missing patch anchors');

assert.match(patchSource,/__ISSUE_62_ALL_39_RUNTIME_V6__/,'runtime patch is versioned and idempotent');
assert.match(patchSource,/drawThirdPerson/,'third-person model hook is installed');
assert.match(patchSource,/drawFirstPerson/,'first-person model hook is installed');
assert.match(patchSource,/species-models\.js/,'model recipes load before gameplay');
assert.match(patchSource,/directRuntime/,'the runtime is built through a verified direct path');
assert.match(patchSource,/__CRITTER_CODE_RUNTIME_INTERCEPTOR__/,'reward and species patches are composed explicitly');
assert.match(patchSource,/assertPatchedSource/,'an incomplete all-39 runtime is rejected');
assert.match(patchSource,/issue-62-live-copy\.js/,'visible game copy is updated');
assert.match(appearanceSource,/liveRuntimeIds/,'Appearance populates all live species');
assert.match(rosterSource,/39 playable procedural 3D models/,'roster announces all 39 models');
assert.doesNotMatch(rosterSource,/testing\//,'live integration does not load testing files');
assert.doesNotMatch(rosterSource,/tech-preview\//,'live integration does not load tech-preview files');

console.log('Issue #62 all-39 model tests passed.');
