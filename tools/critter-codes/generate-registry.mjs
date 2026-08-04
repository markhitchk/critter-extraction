#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const input = path.resolve(process.argv[2] || 'tools/critter-codes/private-codes.json');
const output = path.resolve(process.argv[3] || 'live/core/rewards/critter-codes.registry.js');
const normalize = value => String(value || '').toUpperCase().replace(/[\s-]+/g,'').replace(/[^A-Z0-9]/g,'').slice(0,64);
const hash = value => createHash('sha256').update(normalize(value)).digest('hex');

const source = JSON.parse(await readFile(input,'utf8'));
if (!Array.isArray(source) || !source.length) throw new Error('Private code file must contain a non-empty array.');
const seen = new Set();
const entries = source.map((definition,index) => {
  const normalized = normalize(definition.code);
  if (!normalized) throw new Error(`Entry ${index + 1} has no usable code.`);
  const digest = hash(normalized);
  if (seen.has(digest)) throw new Error(`Entry ${index + 1} duplicates another normalized code.`);
  seen.add(digest);
  if (!definition.id || !Array.isArray(definition.rewards) || !definition.rewards.length) throw new Error(`Entry ${index + 1} needs id and rewards.`);
  return {
    h:digest,i:String(definition.id),r:definition.rewards.map(String),a:definition.active === false ? 0 : 1,
    s:definition.startsAt ? Date.parse(definition.startsAt) : 0,x:definition.expiresAt ? Date.parse(definition.expiresAt) : 0,
    m:String(definition.minimumVersion || '0.22.0'),l:Math.max(1,Number(definition.perProfileLimit)||1),
    g:Math.max(0,Number(definition.totalLimit)||0),c:String(definition.category||'general'),t:String(definition.theme||'welcome'),
    n:String(definition.notificationTitle||'Critter Code Rewards Claimed'),d:String(definition.notificationDescription||'Your rewards are ready.')
  };
});
const production = `(()=>{'use strict';const e=${JSON.stringify(entries)};window.__CRITTER_CODE_REGISTRY__=Object.freeze({v:2,e:Object.freeze(e.map(Object.freeze))});})();\n`;
await writeFile(output,production,'utf8');
console.log(`Wrote ${entries.length} hashed Critter Code definitions to ${output}`);
