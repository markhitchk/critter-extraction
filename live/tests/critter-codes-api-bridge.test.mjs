import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bridgePath = path.join(root, 'live/core/rewards/critter-codes-api-bridge.js');
const source = await readFile(bridgePath, 'utf8');
new vm.Script(source, { filename: 'critter-codes-api-bridge.js' });

let scheduled = null;
const appendedNodes = [];
class HTMLHeadElement {
  appendChild(node) {
    appendedNodes.push(node);
    return node;
  }
}
const document = {
  head: new HTMLHeadElement(),
  scripts: [],
  baseURI: 'https://example.test/live/core/rewards/critter-codes-api-bridge.js',
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {},
  createElement(tagName) {
    return {
      tagName: String(tagName || '').toUpperCase(),
      id: '',
      src: '',
      async: true,
      dataset: {},
      addEventListener() {}
    };
  }
};
const sandbox = {
  console,
  document,
  HTMLHeadElement,
  Blob,
  URL,
  fetch,
  queueMicrotask,
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  },
  setInterval(callback) { scheduled = callback; return 1; },
  clearInterval() {},
  addEventListener() {},
  dispatchEvent() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

vm.runInContext(source, sandbox, { filename: 'critter-codes-api-bridge.js' });
assert.equal(sandbox.CritterCodes, undefined, 'bridge must not invent an API before the runtime loads');
assert.equal(typeof scheduled, 'function', 'bridge must continue checking while the runtime loads');
assert.equal(sandbox.__CRITTER_CODES_API_BRIDGE__.version, '1.4.0');
assert.equal(sandbox.__CRITTER_CODES_API_BRIDGE__.state().blobPatchInstalled, true, 'runtime Blob patch must install before the loader starts');
assert.equal(appendedNodes[0]?.id, 'critter-codes-insurance-loader', 'bridge must request the insurance helper');

const packedRuntime = `
const CritterCodes=Object.freeze({
  redeem(){return 'redeemed';},
  open(){return 'opened';}
});
const CritterRewardRuntime=Object.freeze({version:'test'});
`;
const runtimeBlob = new sandbox.Blob([
  `${packedRuntime}\n//# sourceURL=critter-codes.runtime.js`
], { type: 'text/javascript' });
const patched = await runtimeBlob.text();
assert.match(patched, /const CritterCodes=globalThis\.CritterCodes=/, 'CritterCodes declaration was not exported');
assert.match(patched, /const CritterRewardRuntime=globalThis\.CritterRewardRuntime=/, 'reward runtime declaration was not exported');
assert.equal(sandbox.__CRITTER_CODES_API_BRIDGE__.state().blobPatched, true, 'real loader Blob path was not patched');

vm.runInContext(patched, sandbox, { filename: 'synthetic-packed-critter-codes-runtime.js' });
assert.equal(typeof sandbox.CritterCodes?.redeem, 'function', 'packed runtime API was not published to window');
assert.equal(typeof sandbox.CritterCodes?.open, 'function', 'packed runtime rewards UI was not published to window');
assert.equal(sandbox.CritterCodes.redeem(), 'redeemed');
assert.equal(sandbox.CritterCodes.open(), 'opened');
assert.equal(sandbox.CritterRewardRuntime?.version, 'test');

scheduled();
assert.equal(sandbox.__CRITTER_CODES_API_BRIDGE__.state().status, 'ready');
console.log('Critter Codes direct Blob runtime API export test passed.');
