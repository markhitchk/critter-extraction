import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const liveRoot = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(liveRoot, relative), 'utf8');

const catalogSource = read('core/rendering/model-library.js');
const runtimeSource = read('core/rendering/model-runtime.js');
const patchSource = read('core/ui/new-critter-runtime-patch.js');
const rosterSource = read('core/ui/issue-62-live-roster.js');

for (const [name, source] of [
  ['model-library.js', catalogSource],
  ['model-runtime.js', runtimeSource],
  ['new-critter-runtime-patch.js', patchSource],
  ['issue-62-live-roster.js', rosterSource]
]) {
  assert.doesNotThrow(() => new vm.Script(source, { filename: name }), `${name} must parse`);
}

const storage = new Map();
const windowObject = {};
const context = vm.createContext({
  console,
  window: windowObject,
  navigator: { deviceMemory: 8, hardwareConcurrency: 8 },
  matchMedia: () => ({ matches: false }),
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  },
  CustomEvent: class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }
});
windowObject.dispatchEvent = () => true;

vm.runInContext(catalogSource, context, { filename: 'model-library.js' });
vm.runInContext(runtimeSource, context, { filename: 'model-runtime.js' });

const catalog = windowObject.HARLEYS_GAME_ASSETS;
const runtime = windowObject.CritterModelRuntime;

assert.ok(catalog, 'catalog initializes');
assert.ok(runtime, 'live model runtime initializes');
assert.equal(catalog.speciesOrder.length, 39, 'catalog contains all 39 issue #62 critters');
assert.equal(catalog.availableSpecies.length, 15, '15 existing critters are registered');
assert.equal(catalog.plannedSpecies.length, 24, '24 new critters remain gated until complete');
assert.equal(runtime.liveRuntimeIds.length, 15, 'all 15 existing critters enter the live runtime');
assert.deepEqual(
  Array.from(runtime.rewardRuntimeIds),
  ['penguin', 'crow', 'frog', 'arcticfox', 'capybara', 'axolotl', 'otter'],
  'the seven previously Appearance-only critters are runtime-integrated'
);
assert.equal(runtime.sanitizeLiveSpecies('snow-leopard'), 'puppy', 'unfinished critters safely fall back');
assert.equal(runtime.sanitizeLiveSpecies('arctic-fox'), 'arcticfox', 'normalized existing critters remain available');
assert.equal(runtime.sanitizeAppearance({ species: 'invalid' }).species, 'puppy', 'invalid saves use Puppy');
assert.equal(runtime.sanitizeNetworkAppearance({ species: 'otter' }).species, 'otter', 'multiplayer payload preserves a valid species');
assert.equal(runtime.anchor('puppy', 'accessory').position.length, 3, 'Puppy accessory anchor is usable');
assert.equal(runtime.qualityBudget('low').allowInstancing, true, 'low quality keeps browser instancing enabled');
assert.equal(runtime.qualityBudget('high').targetFps, 60, 'high quality retains the target performance budget');

const appendSource = runtime.runtimeSpeciesAppendSource();
for (const id of runtime.rewardRuntimeIds) {
  assert.ok(appendSource.includes(`${id}:{`), `${id} is injected into the generated runtime`);
}
for (const id of catalog.plannedSpecies) {
  assert.ok(!appendSource.includes(`${id}:{`), `${id} stays unavailable until its complete model ships`);
}

assert.match(patchSource, /__ISSUE_62_LIVE_SPECIES_RUNTIME_V3__/, 'runtime patch is versioned and idempotent');
assert.match(patchSource, /model-runtime\.js/, 'runtime patch loads the model bridge');
assert.match(patchSource, /issue-62-live-roster\.js/, 'runtime patch loads the live roster controller');
assert.match(rosterSource, /liveRuntimeIds\.length/, 'roster reports the live collection');
assert.doesNotMatch(rosterSource, /testing\//, 'live integration does not load testing files');
assert.doesNotMatch(rosterSource, /tech-preview\//, 'live integration does not load tech-preview files');

console.log('Issue #62 live runtime tests passed.');
