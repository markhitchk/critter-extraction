import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const appearance = await readFile(path.join(repo, 'live/core/ui/new-critter-appearance.js'), 'utf8');
const fix = await readFile(path.join(repo, 'live/core/ui/appearance-short-desktop-fix.js'), 'utf8');
const loader = await readFile(path.join(repo, 'live/core/boot/project-paths.js'), 'utf8');

new vm.Script(appearance, { filename: 'new-critter-appearance.js' });
new vm.Script(fix, { filename: 'appearance-short-desktop-fix.js' });
new vm.Script(loader, { filename: 'project-paths.js' });

assert.ok(
  appearance.includes('__NEW_CRITTER_APPEARANCE_V8__'),
  'the corrected Appearance integration must be installed'
);
assert.ok(
  appearance.includes('grid-template-rows:minmax(0,1fr)!important'),
  'desktop Appearance must explicitly use one content row'
);
assert.ok(
  !appearance.includes('@media(max-width:420px),(max-height:560px)'),
  'short desktop height must not activate the two-row mobile layout'
);
assert.ok(
  appearance.includes('@media(max-width:420px)'),
  'the compact two-row rule must remain limited to narrow phones'
);
assert.ok(
  fix.includes('__CRITTER_APPEARANCE_VIEWPORT_FIX_V2__'),
  'the current Appearance viewport correction must be installed'
);
assert.ok(
  fix.includes('#customizeModal[open]') &&
    fix.includes('inset: 0 !important') &&
    fix.includes('transform: none !important'),
  'the native dialog must own the visible viewport instead of using the older centered max-height shell'
);
assert.ok(
  fix.includes("const ROOT_HEIGHT_PROPERTY = '--critter-appearance-viewport-height'") &&
    fix.includes('window.visualViewport?.height'),
  'the dialog height must follow the real visual viewport in ChromeOS and iframe layouts'
);
assert.ok(
  fix.includes('grid-template-rows: auto minmax(0, 1fr) auto !important'),
  'the card must keep header, content, and footer in three definite rows'
);
assert.ok(
  fix.includes('grid-template-columns: minmax(210px, 280px) minmax(0, 1fr) !important') &&
    fix.includes('grid-template-rows: minmax(0, 1fr) !important'),
  'desktop preview and controls must share one constrained content row'
);
assert.ok(
  fix.includes('overflow-y: auto !important') &&
    fix.includes('scrollbar-gutter: stable !important'),
  'the controls pane must be the usable vertical scroll owner'
);
assert.ok(
  fix.includes('@media (min-width: 761px) and (max-height: 700px)'),
  'short desktop and Chromebook windows need a dedicated compact breakpoint'
);
assert.ok(
  fix.includes('@media (max-width: 760px)') &&
    fix.includes('grid-template-rows: clamp(96px, 22dvh, 170px) minmax(0, 1fr) !important'),
  'narrow layouts must stack the preview above a constrained scroll pane'
);
assert.ok(
  fix.includes("controls.setAttribute('role', 'region')") &&
    fix.includes("controls.setAttribute('aria-label', 'Critter appearance choices')"),
  'the scroll pane must be keyboard-focusable and named for assistive technology'
);
assert.ok(
  loader.includes("const FASTBOOT_VERSION = '2026-08-04-appearance-viewport-4'"),
  'the live loader must bust cached copies of the broken Appearance scripts'
);
assert.ok(
  loader.includes('appearance-short-desktop-fix.js?v=${uiVersion}'),
  'the viewport correction must remain in the live loader'
);
assert.ok(
  loader.indexOf('new-critter-appearance.js?v=${uiVersion}') <
    loader.indexOf('appearance-short-desktop-fix.js?v=${uiVersion}'),
  'the viewport correction must load after the Appearance integration styles'
);

console.log('Issue #63 Appearance viewport, cache, and scrolling checks passed.');
