import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const loader = await readFile(path.join(repo, 'live/core/boot/project-paths.js'), 'utf8');

assert.ok(
  loader.includes("const FASTBOOT_VERSION = '2026-08-04-issue63-cache-bust-2'"),
  'the live boot loader must use the issue #63 cache-busting release key'
);
assert.ok(
  loader.includes('new-critter-appearance.js?v=${uiVersion}'),
  'the Appearance integration must load with the active boot release key'
);
assert.ok(
  loader.includes('new-critter-runtime-patch.js?v=${uiVersion}'),
  'the matching runtime patch must use the same release key'
);
assert.ok(
  !loader.includes("new-critter-appearance.js?v=2026-08-03-1"),
  'the stale Appearance cache key must not remain in the live loader'
);

console.log('Issue #63 Appearance cache-loading checks passed.');
