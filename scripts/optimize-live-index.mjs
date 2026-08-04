import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liveRoot = path.join(root, 'live');
const indexPath = path.join(liveRoot, 'index.html');
const packageJson = JSON.parse(await readFile(path.join(liveRoot, 'package.json'), 'utf8'));
const version = String(packageJson.version || '').trim();
if (!version) throw new Error('Could not determine the Critter Extraction package version.');

let html = await readFile(indexPath, 'utf8');

const preloadBlock = `  <!-- Critter Extraction canonical startup resource hints -->
  <link rel="preload" href="./core/loader/game-loader.js?v=${version}" as="script" fetchpriority="high">
  <link rel="preload" href="./core/game/game-core.js?v=2026-08-03-main-menu-fix-1" as="fetch" crossorigin="anonymous" fetchpriority="high">
  <link rel="preload" href="./assets/branding/HTG.png" as="image">
`;

const oldPreloadBlock = /  <!-- Critter Extraction (?:Fast Boot|canonical startup) resource hints -->[\s\S]*?(?=  <link rel="stylesheet")/;
if (oldPreloadBlock.test(html)) {
  html = html.replace(oldPreloadBlock, preloadBlock);
} else {
  const stylesheet = '  <link rel="stylesheet" href="./styles.css?v=2026-08-03-main-menu-fix-1" data-required-boot-file="styles.css">';
  if (!html.includes(stylesheet)) throw new Error('Could not find the live stylesheet insertion point.');
  html = html.replace(stylesheet, `${preloadBlock}${stylesheet}`);
}

html = html
  .replace(/<script src="\.\/core\/config\/build-info\.js(?:\?v=[^"]*)?"><\/script>/, `<script src="./core/config/build-info.js?v=${version}"></script>`)
  .replace(/<script src="\.\/core\/loader\/game-loader\.js(?:\?v=[^"]*)?" data-required-boot-file="core\/loader\/game-loader\.js"><\/script>/, `<script src="./core/loader/game-loader.js?v=${version}" data-required-boot-file="core/loader/game-loader.js"></script>`)
  .replace(/\n?<script src="\.\/core\/security\/profile-panel-integrity\.js(?:\?v=[^"]*)?"[^>]*><\/script>/g, '')
  .replace('<script src="./core/shared/github-issues.js"></script>', '<script defer src="./core/shared/github-issues.js"></script>')
  .replace('<script src="./core/ui/github-feedback.js"></script>', '<script defer src="./core/ui/github-feedback.js"></script>');

if (!html.includes(`game-loader.js?v=${version}`)) {
  throw new Error('Could not update the canonical game-loader cache token.');
}
if (/game-runtime\.js\?v=|live-patches\.bundle\.js\?v=/.test(html.match(oldPreloadBlock)?.[0] || '')) {
  throw new Error('Retired Fast Boot preloads remain in the startup block.');
}

await writeFile(indexPath, html, 'utf8');
console.log(`Optimized live/index.html for canonical startup with release cache key ${version}.`);
