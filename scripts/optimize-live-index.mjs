import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'live/index.html');
const version = '2026-08-03-fastboot-1';
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
  .replace('<script src="./core/shared/github-issues.js"></script>', '<script defer src="./core/shared/github-issues.js"></script>')
  .replace('<script src="./core/ui/github-feedback.js"></script>', '<script defer src="./core/ui/github-feedback.js"></script>');

await writeFile(indexPath, html, 'utf8');
console.log('Optimized live/index.html with preload hints and deferred feedback scripts.');
