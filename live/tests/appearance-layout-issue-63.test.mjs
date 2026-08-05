import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const appearancePath = path.join(repo, 'live/core/ui/new-critter-appearance.js');
const appearance = await readFile(appearancePath, 'utf8');

new vm.Script(appearance, { filename: 'new-critter-appearance.js' });

assert.ok(appearance.includes('__NEW_CRITTER_APPEARANCE_V6__'), 'the fixed Appearance integration must use the v6 guard');
assert.ok(appearance.includes('grid-template-rows: auto minmax(0, 1fr) auto'), 'the modal card must reserve header, scrollable content, and footer rows');
assert.ok(appearance.includes('height: min(90dvh, 720px)'), 'the desktop modal must have a definite viewport-based height');
assert.ok(appearance.includes('max-height: calc(100dvh - 24px)'), 'the desktop modal must stay inside the available viewport');
assert.ok(appearance.includes('#customizeModal .customize-controls'), 'the Appearance controls pane must be explicitly styled');
assert.ok(appearance.includes('min-height: 0 !important'), 'grid children must be allowed to shrink instead of clipping');
assert.ok(appearance.includes('overflow-y: auto !important'), 'the controls pane must own vertical scrolling');
assert.ok(appearance.includes('@media (min-width: 761px) and (max-height: 820px)'), 'short desktop and Chromebook viewports need their own breakpoint');
assert.ok(appearance.includes('height: calc(100dvh - 20px)'), 'the short-desktop breakpoint must use nearly the full available height');
assert.ok(appearance.includes('object-fit: contain'), 'the critter preview image must remain fully visible');
assert.ok(!appearance.includes('#customizeModal{overflow:hidden}'), 'the regression-causing dialog overflow rule must not return');

console.log('Issue #63 Appearance modal layout and scrolling checks passed.');
