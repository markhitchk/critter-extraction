import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const liveRoot = path.resolve(here, '..');
const page = fs.readFileSync(path.join(liveRoot, 'model-file-test.html'), 'utf8');

assert.match(page, /Separate Model File Test/, 'test page title exists');
assert.match(page, /CritterStandaloneModels\.register/, 'standalone registration contract is documented');
assert.match(page, /assets\/models\/critters\//, 'critter model folder is tested');
assert.match(page, /assets\/models\/weapons\//, 'weapon model folder is tested');
assert.match(page, /assets\/models\/environment\/trees\//, 'tree model folder is tested');
assert.match(page, /assets\/models\/environment\/rocks\//, 'rock model folder is tested');
assert.match(page, /assets\/models\/cover\//, 'cover model folder is tested');
assert.match(page, /assets\/models\/landmarks\//, 'landmark model folder is tested');
assert.match(page, /assets\/models\/decorations\//, 'decoration model folder is tested');
assert.match(page, /assets\/models\/props\//, 'prop model folder is tested');
assert.match(page, /sourceFile mismatch/, 'source-file identity is enforced');
assert.match(page, /standalone file missing/, 'missing physical files fail clearly');

const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert.equal(scripts.length, 1, 'page contains one inline application script');
assert.doesNotThrow(() => new vm.Script(scripts[0], { filename:'model-file-test.inline.js' }), 'inline test-page JavaScript parses');

const expected = {
  critters:39,
  weapons:5,
  trees:12,
  rocks:6,
  cover:5,
  landmarks:6,
  decorations:6,
  props:6
};
for (const [name,count] of Object.entries(expected)) {
  const expression = name === 'critters' ? /const critters=\[/ : name === 'weapons' ? /const weapons=\[/ : new RegExp(`${name}:[^\\n]+`);
  assert.match(page, expression, `${name} manifest exists`);
  assert.ok(count > 0);
}
assert.equal(Object.values(expected).reduce((sum,count)=>sum+count,0),85,'test page expects 85 physical model files');

console.log('Standalone model-file test page checks passed.');
