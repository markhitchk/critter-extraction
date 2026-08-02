import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html',
  'styles.css',
  '.nojekyll',
  'js/game.js',
  'assets/HTG.png',
  'assets/icon.svg',
  'assets/models/harleys-model-library.js',
  'assets/vendor/peerjs.min.js',
  'assets/loading/gameplay-reference.webp'
];

for (const name of required) {
  if (!existsSync(join(root, name))) throw new Error(`Required Pages file is missing: ${name}`);
}

const files = new Set();
function walk(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === '.git') continue;
    const full = join(folder, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.add(relative(root, full).replaceAll('\\', '/'));
  }
}
walk(root);

for (const source of ['index.html', 'styles.css']) {
  const contents = readFileSync(join(root, source), 'utf8');
  const references = [...contents.matchAll(/(?:src|href)=["']([^"'#?]+)|url\(["']?([^)'"?#]+)/g)]
    .map(match => match[1] || match[2])
    .filter(Boolean);
  for (const reference of new Set(references)) {
    if (/^(?:data:|https?:|blob:|#|javascript:)/i.test(reference)) continue;
    if (reference.startsWith('/')) throw new Error(`${source} uses a domain-root path that breaks project Pages: ${reference}`);
    const target = reference.replace(/^\.\//, '');
    if (!files.has(target)) throw new Error(`${source} references a missing case-sensitive path: ${reference}`);
  }
}

const game = readFileSync(join(root, 'js/game.js'), 'utf8');
if (!game.includes("localAsset('vendor/peerjs.min.js')")) throw new Error('Local PeerJS client is not configured.');
if (/\b(?:localhost|127\.0\.0\.1)\b/.test(game)) throw new Error('Local development hostname leaked into the production game.');

const portable = readFileSync(join(root, 'START_HERE.html'), 'utf8');
const scriptStart = portable.lastIndexOf('<script>\n(() => {') + '<script>\n'.length;
const scriptEnd = portable.indexOf('\n</script>', scriptStart);
if (scriptStart < '<script>\n'.length || scriptEnd < 0) throw new Error('Portable game script boundary is missing.');
if (portable.slice(scriptStart, scriptEnd).trim() !== game.trim()) throw new Error('START_HERE.html does not match js/game.js.');

console.log(`GitHub Pages validation passed (${files.size} files).`);
