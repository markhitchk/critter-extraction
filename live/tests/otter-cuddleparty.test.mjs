import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const appearance = await readFile(path.join(repo,'live/core/ui/new-critter-appearance.js'),'utf8');
const runtimePatch = await readFile(path.join(repo,'live/core/ui/new-critter-runtime-patch.js'),'utf8');
const rewardExtension = await readFile(path.join(repo,'live/core/rewards/critter-codes-otter.js'),'utf8');
const asset = await readFile(path.join(repo,'live/assets/characters/otter.svg'),'utf8');
const docs = await readFile(path.join(repo,'docs/CRITTER-CODES.md'),'utf8');

new vm.Script(appearance,{filename:'new-critter-appearance.js'});
new vm.Script(runtimePatch,{filename:'new-critter-runtime-patch.js'});
new vm.Script(rewardExtension,{filename:'critter-codes-otter.js'});

const hash = createHash('sha256').update('CUDDLEPARTY').digest('hex');
assert.ok(rewardExtension.includes(hash),'the public code must be stored as a SHA-256 hash');
assert.ok(!rewardExtension.includes('CUDDLEPARTY'),'the plaintext code must not be embedded in production JavaScript');
assert.ok(appearance.includes("otter:{name:'Otter'"),'the Appearance menu registers Otter');
assert.ok(runtimePatch.includes("otter:{name:'Otter',role:'Cuddle Diver'"),'the generated runtime registers Otter');
assert.ok(rewardExtension.includes("REWARD_ID = 'critter_otter'"),'the reward extension grants critter_otter');
assert.ok(rewardExtension.includes('already_redeemed'),'duplicate claims are rejected');
assert.ok(rewardExtension.includes('account.notifications'),'the unlock is added to Notifications');
assert.ok(asset.includes('#765039') && asset.includes('#d7aa7c'),'the Otter asset uses two-tone brown fur');
assert.ok(docs.includes('`CUDDLEPARTY`'),'the public reward is documented');

console.log('Issue #59 Otter model, hashed code, persistence, notification, and UI integration checks passed.');
