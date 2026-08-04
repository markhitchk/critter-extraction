import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liveRoot = path.join(root, 'live');
const indexPath = path.join(liveRoot, 'index.html');
const packageJson = JSON.parse(await readFile(path.join(liveRoot, 'package.json'), 'utf8'));
const version = String(packageJson.version || '').trim();
const loaderRevision = 'startup-fix-2';
if (!version) throw new Error('Could not determine the Critter Extraction package version.');

const buildInfo = await readFile(path.join(liveRoot, 'core/config/build-info.js'), 'utf8');
const buildId = buildInfo.match(/buildId:\s*'([^']+)'/)?.[1] || loaderRevision;
let html = await readFile(indexPath, 'utf8');

const preloadBlock = `  <!-- Critter Extraction updated UI startup resource hints -->
  <link rel="preload" href="./core/loader/game-loader.js?v=${version}&loader=${loaderRevision}" as="script" fetchpriority="high">
  <link rel="preload" href="./core/game/game-runtime.js?v=${buildId}" as="script" fetchpriority="high">
  <link rel="preload" href="./assets/branding/HTG.png" as="image">
`;

const oldPreloadBlock = /  <!-- Critter Extraction (?:Fast Boot|canonical startup|updated UI startup) resource hints -->[\s\S]*?(?=  <link rel="stylesheet")/;
if (oldPreloadBlock.test(html)) {
  html = html.replace(oldPreloadBlock, preloadBlock);
} else {
  const stylesheet = '  <link rel="stylesheet" href="./styles.css?v=2026-08-03-main-menu-fix-1" data-required-boot-file="styles.css">';
  if (!html.includes(stylesheet)) throw new Error('Could not find the live stylesheet insertion point.');
  html = html.replace(stylesheet, `${preloadBlock}${stylesheet}`);
}

html = html
  .replace(/<script src="\.\/core\/config\/build-info\.js(?:\?v=[^"]*)?"><\/script>/, `<script src="./core/config/build-info.js?v=${version}&loader=${loaderRevision}"></script>`)
  .replace(/<script src="\.\/core\/loader\/game-loader\.js(?:\?v=[^"]*)?" data-required-boot-file="core\/loader\/game-loader\.js"><\/script>/, `<script src="./core/loader/game-loader.js?v=${version}&loader=${loaderRevision}" data-required-boot-file="core/loader/game-loader.js"></script>`)
  .replace(/\n?<script src="\.\/core\/security\/profile-panel-integrity\.js(?:\?v=[^"]*)?"[^>]*><\/script>/g, '')
  .replace('<script src="./core/shared/github-issues.js"></script>', '<script defer src="./core/shared/github-issues.js"></script>')
  .replace('<script src="./core/ui/github-feedback.js"></script>', '<script defer src="./core/ui/github-feedback.js"></script>')
  .replace(/(<span id="(?:host|join)LobbyCount">)1\s*\/\s*4(<\/span>)/g, '$11 / 8$2')
  .replace(/(<input id="joinRoomPin"[^>]*maxlength=")\d+("[^>]*>)/, '$16$2')
  .replace('One host and up to three guests join with a six-digit room code.', 'One host and up to seven guests join with a six-digit room code.');

if (!html.includes(`game-loader.js?v=${version}&loader=${loaderRevision}`)) {
  throw new Error('Could not update the required game-loader release cache token.');
}
if (!html.includes(`game-runtime.js?v=${buildId}`)) {
  throw new Error('Could not add the generated updated UI runtime preload.');
}
if (/live-patches\.bundle\.js\?v=|game-loader-base\.js\?v=/.test(html.match(oldPreloadBlock)?.[0] || '')) {
  throw new Error('Retired multi-loader preloads remain in the startup block.');
}
if (!html.includes('id="hostLobbyCount">1 / 8</span>') || !html.includes('id="joinLobbyCount">1 / 8</span>')) {
  throw new Error('Could not normalize the eight-player lobby counters.');
}
if (!/id="joinRoomPin"[^>]*maxlength="6"/.test(html)) {
  throw new Error('Could not normalize the six-digit room-code input.');
}

await writeFile(indexPath, html, 'utf8');
console.log(`Optimized live/index.html for updated UI runtime ${buildId} with loader revision ${loaderRevision}.`);
