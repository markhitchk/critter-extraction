import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'live/index.html',
  'live/core/config/build-info.js',
  'live/core/loader/live-patches.bundle.js',
  'live/core/game/game-runtime.js'
];

for (const file of files) {
  const target = path.join(root, file);
  const source = await readFile(target, 'utf8');
  const clean = `${source.replace(/[ \t]+$/gm, '').replace(/\s*$/, '')}\n`;
  if (clean !== source) await writeFile(target, clean, 'utf8');
}

console.log('Normalized generated Fast Boot output.');
