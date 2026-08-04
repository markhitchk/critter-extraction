import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const rewardsDir = path.join(repo,'live/core/rewards');
const registryPath = path.join(rewardsDir,'critter-codes.registry.js');
const loaderPath = path.join(rewardsDir,'critter-codes.js');
const integrationPath = path.join(repo,'live/core/boot/project-paths.js');
const generatorPath = path.join(repo,'tools/critter-codes/generate-registry.mjs');

const fragments = (await readdir(rewardsDir))
  .filter(name => /^critter-codes\.payload\.\d+\.js$/.test(name))
  .sort((a,b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
assert.equal(fragments.length,7,'all packed production fragments must exist');
let packed = '';
for (const name of fragments) {
  const text = await readFile(path.join(rewardsDir,name),'utf8');
  const match = text.match(/\.push\('([^']+)'\);/);
  assert.ok(match,`${name} has an opaque payload chunk`);
  packed += match[1];
}
const source = gunzipSync(Buffer.from(packed,'base64')).toString('utf8');
new vm.Script(source,{filename:'critter-codes.runtime.js'});

const loader = await readFile(loaderPath,'utf8');
new vm.Script(loader,{filename:'critter-codes.js'});
for (const anchor of [
  'critterCodesTopEntry',
  'critterCodesDashboardEntry',
  'critterCodesEntryModal',
  '#menuScreen .dashboard',
  '.top-actions',
  'Open Critter Codes',
  'Redeem Code',
  'View Rewards',
  'MutationObserver',
  'prefers-reduced-motion',
  '@media(max-width:760px)'
]) assert.ok(loader.includes(anchor),`${anchor} visible entry UI is required`);
assert.ok(loader.indexOf('ensureEntryUi()') < loader.indexOf('bootRuntime()'),'visible UI must initialize before the packed runtime');
assert.ok(loader.includes("setState('error'"),'loader failures must remain visible to the player');

const context = { window:{} };
vm.createContext(context);
vm.runInContext(await readFile(registryPath,'utf8'),context);
const registry = context.window.__CRITTER_CODE_REGISTRY__;
assert.equal(registry.v,2);
assert.equal(registry.e.length,10);
assert.equal(new Set(registry.e.map(entry=>entry.h)).size,10);
for (const entry of registry.e) {
  assert.match(entry.h,/^[a-f0-9]{64}$/);
  assert.ok(entry.i && Array.isArray(entry.r) && entry.r.length);
  assert.ok(!Object.hasOwn(entry,'code'));
}

const normalize = value => String(value||'').toUpperCase().replace(/[\s-]+/g,'').replace(/[^A-Z0-9]/g,'').slice(0,64);
assert.equal(normalize('  TeSt-Code Alpha  '),'TESTCODEALPHA');
assert.equal(
  createHash('sha256').update(normalize('test code-alpha')).digest('hex'),
  createHash('sha256').update('TESTCODEALPHA').digest('hex')
);

for (const id of ['critter_penguin','critter_crow','critter_raccoon','critter_red_panda','critter_frog','critter_arctic_fox','critter_capybara','critter_axolotl']) assert.ok(source.includes(id),`${id} is implemented`);
for (const id of ['backpack_frozen_expedition','trail_snowflake','backpack_shiny_scavenger','trail_feather','backpack_scavenger','title_loot_bandit','outfit_tactical_hoodie','nameplate_red_panda','outfit_raincoat','effect_lily_pad','armor_winter','wrap_frost','emote_relaxed','hat_orange','set_aquatic','trail_bubble']) assert.ok(source.includes(id),`${id} is implemented`);
for (const action of ['Equip Now','View Rewards','Continue','Claim to Stash','Notifications']) assert.ok(source.includes(action),`${action} UI exists`);
for (const state of ['already_redeemed','expired_code','disabled_code','not_active','version_locked','profile_corrupt','reward_definition_missing']) assert.ok(source.includes(state),`${state} is handled`);

const integration = await readFile(integrationPath,'utf8');
for (const anchor of ['drawCritterExtras','styledWeapon','drawWorldEffects','displayName','onMatchEnd','equippedRewards','game-runtime']) assert.ok(integration.includes(anchor),`${anchor} runtime integration exists`);

const temp = await mkdtemp(path.join(tmpdir(),'critter-codes-'));
const privateFile = path.join(temp,'private.json');
const generated = path.join(temp,'registry.js');
await writeFile(privateFile,JSON.stringify([{code:'TEST CODE ALPHA',id:'test_bundle',rewards:['r01'],active:true,minimumVersion:'0.22.0'}]));
const run = spawnSync(process.execPath,[generatorPath,privateFile,generated],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr);
const generatedText = await readFile(generated,'utf8');
assert.ok(!generatedText.includes('TEST CODE ALPHA'));
assert.ok(generatedText.includes(createHash('sha256').update('TESTCODEALPHA').digest('hex')));

console.log('Critter Codes production, registry, generator, visible lobby UI, integration, and error-state checks passed.');
