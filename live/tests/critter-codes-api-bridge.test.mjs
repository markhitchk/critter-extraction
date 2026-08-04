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
class HTMLHeadElement {
  appendChild(node) { return node; }
}
const document = {
  head: new HTMLHeadElement(),
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {}
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

const packedRuntime = `
const CritterCodes=Object.freeze({redeem(){return 'redeemed';}});
const CritterRewardRuntime=Object.freeze({version:'test'});
`;
const patched = sandbox.__CRITTER_CODES_API_BRIDGE__.patchPackedRuntime(packedRuntime);
assert.match(patched, /const CritterCodes=window\.CritterCodes=/, 'CritterCodes declaration was not exported');
assert.match(patched, /const CritterRewardRuntime=window\.CritterRewardRuntime=/, 'reward runtime declaration was not exported');

vm.runInContext(patched, sandbox, { filename: 'synthetic-packed-critter-codes-runtime.js' });
assert.equal(typeof sandbox.CritterCodes?.redeem, 'function', 'packed runtime API was not published to window');
assert.equal(sandbox.CritterCodes.redeem(), 'redeemed');
assert.equal(sandbox.CritterRewardRuntime?.version, 'test');

scheduled();
assert.equal(sandbox.__CRITTER_CODES_API_BRIDGE__.state().status, 'ready');
console.log('Critter Codes packed-runtime API export test passed.');
