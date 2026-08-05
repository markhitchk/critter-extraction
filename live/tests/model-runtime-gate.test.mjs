import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here, '../core/config/build-info.js'), 'utf8');
assert.doesNotThrow(() => new vm.Script(source), 'build-info model gate must parse');

const appended = [];
class FakeHead {
  appendChild(node) {
    appended.push(node);
    return node;
  }
}

const head = new FakeHead();
const windowObject = {};
const context = vm.createContext({
  console,
  window: windowObject,
  document: { head },
  HTMLHeadElement: FakeHead,
  performance,
  setTimeout,
  clearTimeout,
  Event: class Event { constructor(type) { this.type = type; } },
  Error,
  Object,
  Promise
});

vm.runInContext(source, context, { filename:'build-info.js' });

const runtimeNode = {
  tagName:'SCRIPT',
  src:'https://example.test/core/game/game-runtime.js?v=test',
  dataset:{},
  dispatchEvent() {}
};

head.appendChild(runtimeNode);
assert.equal(appended.length, 0, 'game runtime is held while models are unavailable');
assert.equal(runtimeNode.dataset.modelRuntimeGate, 'waiting');

windowObject.NewCritterRuntimePatch = { report:{ lastError:'' } };
windowObject.CritterAllAssetRuntimePatch = {};
windowObject.CritterCompleteModels = { validateModels:() => ({ ok:true, count:39, unique:39 }) };
windowObject.CritterModelRuntime = { report:() => ({ valid:true, live:39 }) };
windowObject.__CRITTER_ISSUE_62_READY__ = Promise.resolve(true);

await new Promise(resolve => setTimeout(resolve, 60));
assert.equal(appended.length, 1, 'game runtime is appended after all model systems validate');
assert.equal(appended[0], runtimeNode);
assert.equal(runtimeNode.dataset.modelRuntimeGate, 'ready');
assert.equal(windowObject.CritterBuildInfo.buildId, '3391f2959d123859-model-gate-1');

console.log('Model runtime boot gate test passed.');
