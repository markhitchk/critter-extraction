import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const fix = await readFile(path.join(repo, 'live/core/ui/appearance-short-desktop-fix.js'), 'utf8');
const loader = await readFile(path.join(repo, 'live/core/boot/project-paths.js'), 'utf8');

new vm.Script(fix, { filename: 'appearance-short-desktop-fix.js' });
new vm.Script(loader, { filename: 'project-paths.js' });

assert.ok(
  fix.includes('@media (min-width: 761px)'),
  'desktop Appearance layout must have an explicit width-scoped correction'
);
assert.ok(
  fix.includes('grid-template-rows: minmax(0, 1fr) !important'),
  'desktop preview and controls must share one content row'
);
assert.ok(
  fix.includes('grid-row: 1 !important') && fix.includes('grid-column: 2 !important'),
  'preview and controls must be pinned to the intended desktop row and columns'
);
assert.ok(
  fix.includes('@media (min-width: 761px) and (max-height: 600px)'),
  'short desktop and high browser zoom need a dedicated breakpoint'
);
assert.ok(
  fix.includes('grid-template-columns: repeat(4, minmax(72px, 1fr)) !important'),
  'short desktop must retain a compact four-column roster instead of the mobile two-column layout'
);
assert.ok(
  loader.includes("const FASTBOOT_VERSION = '2026-08-04-issue63-short-desktop-3'"),
  'the live loader must use the new issue #63 release key'
);
assert.ok(
  loader.includes('appearance-short-desktop-fix.js?v=${uiVersion}'),
  'the correction must load after the Appearance integration'
);
assert.ok(
  loader.indexOf('new-critter-appearance.js?v=${uiVersion}') < loader.indexOf('appearance-short-desktop-fix.js?v=${uiVersion}'),
  'the correction must load after the stylesheet that caused the regression'
);

console.log('Issue #63 short desktop and browser-zoom Appearance checks passed.');
