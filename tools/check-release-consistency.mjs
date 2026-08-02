// Enforced by npm run validate for PRs, releases, and Pages deployment.
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
if (!issueApi.includes("const OWNER = 'markhitchk';")) failures.push('GitHub issue API owner is missing or changed');
if (!issueApi.includes("const REPO = 'critter-extraction';")) failures.push('GitHub issue API repository is missing or changed');
if (!issueApi.includes('const createUrl = `${repositoryUrl}/issues/new`;')) failures.push('GitHub new-issue route is missing');
if (!issueApi.includes('const viewerUrl = `${repositoryUrl}/issues`;')) failures.push('GitHub issue-viewer route is missing');
if (!issueApi.includes('https://api.github.com/repos/')) failures.push('GitHub public issue API base is missing');
if (!issueApi.includes('listIssues') || !issueApi.includes('getComments') || !issueApi.includes('submit')) failures.push('In-game issue API capabilities are incomplete');

const feedbackUi = fs.readFileSync('core/ui/github-feedback.js', 'utf8');
if (!feedbackUi.includes('Feedback Center') || !feedbackUi.includes('Issues & Updates')) failures.push('In-game Feedback Center UI is missing');
if (feedbackUi.includes('critter-feedback-menu')) failures.push('Legacy external-link feedback menu must stay removed');

if (fs.existsSync('icon.svg')) failures.push('icon.svg: duplicate root icon must stay removed; use assets/branding/icon.svg');
if (!fs.existsSync('assets/branding/icon.svg')) failures.push('assets/branding/icon.svg: canonical branding icon is missing');
if (fs.existsSync('playwright.config.js')) failures.push('playwright.config.js: browser config must not be stored at repository root');
if (!fs.existsSync('tests/browser/playwright.config.js')) failures.push('tests/browser/playwright.config.js: organized browser config is missing');
if (pkg.scripts?.['test:browser'] !== 'playwright test --config=tests/browser/playwright.config.js') failures.push('package.json: test:browser must use the organized browser config');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Release consistency OK (${expectedDisplay}, ${currentTitle})`);
