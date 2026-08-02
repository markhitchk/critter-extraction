import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const expected = String(pkg.version || '').trim();
const expectedDisplay = `v${expected}`;
const retiredTitle = ['Cartoon-Realistic', 'Art Upgrade'].join(' ');
const currentTitle = 'Cartoon-Realistic Extraction Shooter';
const staleRuntime = /0\.27\.1-hotfix/i;
const textExtensions = new Set(['.html', '.js', '.mjs', '.css', '.md', '.json', '.yml', '.yaml', '.txt']);
const failures = [];

function walk(entry) {
  if (!fs.existsSync(entry)) return [];
  const stat = fs.statSync(entry);
  if (stat.isFile()) return [entry];
  return fs.readdirSync(entry, { withFileTypes: true }).flatMap(item => {
    if (item.name === '.git' || item.name === 'node_modules') return [];
    return walk(path.join(entry, item.name));
  });
}

for (const file of walk('.')) {
  if (file.endsWith('tools/check-release-consistency.mjs')) continue;
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(retiredTitle)) failures.push(`${file}: retired product wording remains`);
}

const runtimeEntries = ['index.html', 'START_HERE.html', '404.html', 'error.html', 'invite.html', 'core', 'js', 'invite', 'reset', 'portable'];
for (const entry of runtimeEntries) {
  for (const file of walk(entry)) {
    if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (staleRuntime.test(text)) failures.push(`${file}: stale 0.27.1 hotfix token remains`);
  }
}

const index = fs.readFileSync('index.html', 'utf8');
if (!index.includes(`Critter Extraction ${expectedDisplay} — ${currentTitle}`)) failures.push('index.html: current title/version is missing');
if (!index.includes(`game-loader.js?v=${expected}`)) failures.push('index.html: canonical loader cache token does not match package version');
if (!index.includes('data-required-boot-file="core/loader/game-loader.js"')) failures.push('index.html: loader required-file metadata is not canonical');

const issueApi = fs.readFileSync('core/shared/github-issues.js', 'utf8');
if (!issueApi.includes('https://github.com/markhitchk/critter-extraction/issues/new')) failures.push('GitHub new-issue URL is missing');
if (!issueApi.includes('https://github.com/markhitchk/critter-extraction/issues')) failures.push('GitHub issue-viewer URL is missing');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Release consistency OK (${expectedDisplay}, ${currentTitle})`);
