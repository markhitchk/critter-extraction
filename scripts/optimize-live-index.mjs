import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'live/index.html');
const version = '2026-08-03-profile-panel-3';
const profileIntegrityVersion = '1.0.3';
let html = await readFile(indexPath, 'utf8');

const preloadBlock = `  <!-- Critter Extraction Fast Boot resource hints -->
  <link rel="preload" href="./core/game/game-runtime.js?v=${version}" as="script" fetchpriority="high">
  <link rel="preload" href="./core/loader/live-patches.bundle.js?v=${version}" as="script" fetchpriority="high">
  <link rel="preload" href="./core/loader/game-loader-base.js?v=${version}" as="script">
  <link rel="preload" href="./core/game/game-core.js?v=2026-08-03-main-menu-fix-1" as="fetch" crossorigin="anonymous" fetchpriority="high">
  <link rel="preload" href="./assets/branding/HTG.png" as="image">
`;

if (!html.includes('Critter Extraction Fast Boot resource hints')) {
  const stylesheet = '  <link rel="stylesheet" href="./styles.css?v=2026-08-03-main-menu-fix-1" data-required-boot-file="styles.css">';
  if (!html.includes(stylesheet)) throw new Error('Could not find the live stylesheet insertion point.');
  html = html.replace(stylesheet, `${preloadBlock}${stylesheet}`);
}

html = html
  .replace(/\.\/core\/game\/game-runtime\.js\?v=[^"']+/g, `./core/game/game-runtime.js?v=${version}`)
  .replace(/\.\/core\/loader\/live-patches\.bundle\.js\?v=[^"']+/g, `./core/loader/live-patches.bundle.js?v=${version}`)
  .replace(/\.\/core\/loader\/game-loader-base\.js\?v=[^"']+/g, `./core/loader/game-loader-base.js?v=${version}`)
  .replace(/<script src="\.\/core\/config\/build-info\.js(?:\?v=[^"]*)?"><\/script>/, `<script src="./core/config/build-info.js?v=${version}"></script>`)
  .replace(/<script src="\.\/core\/loader\/game-loader\.js(?:\?v=[^"]*)?" data-required-boot-file="core\/loader\/game-loader\.js"><\/script>/, `<script src="./core/loader/game-loader.js?v=${version}" data-required-boot-file="core/loader/game-loader.js"></script>`)
  .replace('<script src="./core/shared/github-issues.js"></script>', '<script defer src="./core/shared/github-issues.js"></script>')
  .replace('<script src="./core/ui/github-feedback.js"></script>', '<script defer src="./core/ui/github-feedback.js"></script>');

const buildInfoTag = `<script src="./core/config/build-info.js?v=${version}"></script>`;
const integrityTag = `<script src="./core/security/profile-panel-integrity.js?v=${profileIntegrityVersion}" data-required-boot-file="core/security/profile-panel-integrity.js"></script>`;
if (/profile-panel-integrity\.js(?:\?v=[^"]*)?/.test(html)) {
  html = html.replace(/<script src="\.\/core\/security\/profile-panel-integrity\.js(?:\?v=[^"]*)?"[^>]*><\/script>/, integrityTag);
} else {
  if (!html.includes(buildInfoTag)) throw new Error('Could not find the cache-busted build-info insertion point.');
  html = html.replace(buildInfoTag, `${buildInfoTag}\n${integrityTag}`);
}

await writeFile(indexPath, html, 'utf8');
console.log(`Optimized live/index.html with LIVE cache key ${version} and direct profile-panel integrity loading.`);
