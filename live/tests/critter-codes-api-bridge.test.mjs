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
const document = {
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {}
};
const sandbox = {
  console,
  document,
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
assert.equal(typeof scheduled, 'function', 'bridge must continue checking for a late classic-script binding');

vm.runInContext(`
  const CritterCodes = Object.freeze({ redeem() { return 'redeemed'; } });
  const CritterRewardRuntime = Object.freeze({ version: 'test' });
`, sandbox, { filename: 'synthetic-critter-codes-runtime.js' });

scheduled();
assert.equal(typeof sandbox.CritterCodes?.redeem, 'function', 'global lexical CritterCodes API was not published to window');
assert.equal(sandbox.CritterCodes.redeem(), 'redeemed');
assert.equal(sandbox.CritterRewardRuntime?.version, 'test', 'reward runtime lexical binding was not published');
assert.equal(sandbox.__CRITTER_CODES_API_BRIDGE__.state().status, 'ready');

console.log('Critter Codes global lexical API bridge test passed.');
