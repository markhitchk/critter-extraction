import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html',
  'invite.html',
  '404.html',
  'error.html',
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
    if (entry.name === '.git') continue;
    const full = join(folder, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.add(relative(root, full).replaceAll('\\', '/'));
  }
}
walk(root);

for (const source of ['index.html', 'invite.html', 'styles.css']) {
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
for (const requiredAccountFeature of ['Download Account', 'Full account downloaded', 'Separate account restored', 'accountToXml(account)']) {
  if (!game.includes(requiredAccountFeature)) throw new Error(`Account download/restore feature is missing: ${requiredAccountFeature}`);
}
for (const requiredControlFeature of ['inputDeviceProfile', 'detectPhoneOrTablet()', 'wrapAngle(p.yaw', 'jumpSeq', "bindTouchTap('touchJump'", 'velocityY']) {
  if (!game.includes(requiredControlFeature)) throw new Error(`Adaptive controls or jumping feature is missing: ${requiredControlFeature}`);
}
for (const requiredCoopFeature of ['0.peerjs.com', 'turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478', 'coOpReadinessError()', 'Room service timed out']) {
  if (!game.includes(requiredCoopFeature)) throw new Error(`GitHub Pages co-op support is missing: ${requiredCoopFeature}`);
}
for (const requiredFairPlayFeature of ['FAIR_PLAY_VERSION', 'sanitizeGuestInput', 'applyGuestLootSync', 'fairPlayRateAllowed', 'authoritativeInventory', 'p.spawnProtection=0']) {
  if (!game.includes(requiredFairPlayFeature)) throw new Error(`System-wide Fair Play feature is missing: ${requiredFairPlayFeature}`);
}
for (const requiredRespawnFeature of ['enemyRespawnRate', 'ENEMY_RESPAWN_SECONDS', 'scheduleEnemyRespawn', 'updateEnemyRespawns', 'maxAlive']) {
  if (!game.includes(requiredRespawnFeature)) throw new Error(`Enemy respawn feature is missing: ${requiredRespawnFeature}`);
}
for (const requiredInviteFeature of ['joinUrlForPin', "searchParams.set('join','room')", 'joinRequestFromUrl', 'roomInviteText', 'copyInviteLinkBtn', 'openJoinFromUrl']) {
  if (!game.includes(requiredInviteFeature)) throw new Error(`Shared room URL support is missing: ${requiredInviteFeature}`);
}
if (/setTimeout\(runJoinAction|openJoinModal\(pin\)/.test(game)) throw new Error('Shared room URLs must not prefill or automatically submit the room code.');
for (const requiredOnboardingFeature of ['firstAccountSetupRequired', 'legacyAccountSetupRequired', 'automaticAccountNeedsSetup', 'accountSetupComplete', 'Create Your First Account', 'Finish Your Account Setup', 'Create your account to continue']) {
  if (!game.includes(requiredOnboardingFeature)) throw new Error(`First-visit account onboarding is missing: ${requiredOnboardingFeature}`);
}
for (const requiredLegacyReplacementFeature of ['legacyRookieAccount', 'replaceLegacyRookieAccount', 'removeLegacyRookieStorageCopies', 'Legacy Rookie removed']) {
  if (!game.includes(requiredLegacyReplacementFeature)) throw new Error(`Legacy Rookie replacement is missing: ${requiredLegacyReplacementFeature}`);
}
for (const requiredPetalCapFeature of ['PETAL_CAP = 1_000_000', 'CE-SELL-CAP', 'petalBalanceBefore']) {
  if (!game.includes(requiredPetalCapFeature)) throw new Error(`Petal cap protection is missing: ${requiredPetalCapFeature}`);
}
for (const requiredRecruitFeature of ['recruitCode', 'recruitedBy', 'pendingRecruitCode', 'consumeInviteParams', "copyText(link, 'Invite link')"]) {
  if (!game.includes(requiredRecruitFeature)) throw new Error(`Account recruitment feature is missing: ${requiredRecruitFeature}`);
}

const index = readFileSync(join(root, 'index.html'), 'utf8');
if (!index.includes('rel="icon" href="./icon.svg"') || !index.includes('rel="apple-touch-icon"')) throw new Error('Primary favicon and touch icon links are missing.');
if (!index.includes('id="touchJump"') || !index.includes('Space</kbd> Jump')) throw new Error('Jump controls are missing from the interface.');
if (!index.includes('id="copyInviteLinkBtn"') || !index.includes('FAIR PLAY ACTIVE')) throw new Error('Invite-link or Fair Play interface is missing.');
if (!index.includes('id="enemyRespawnRate"') || !index.includes('value="off">Off</option>') || !index.includes('value="fast">Fast</option>')) throw new Error('Enemy respawn rate settings are missing from the interface.');
if (!index.includes('id="copyInviteBtn"')) throw new Error('Account recruitment button is missing.');

const recruit = readFileSync(join(root, 'invite.html'), 'utf8');
if (!recruit.includes("params.get('invite')") || !recruit.includes('Create Account &amp; Join') || !recruit.includes('inviteMissing')) throw new Error('Branded account recruitment landing page is incomplete.');

const notFound = readFileSync(join(root, '404.html'), 'utf8');
const errorPage = readFileSync(join(root, 'error.html'), 'utf8');
if (!notFound.includes("target.searchParams.set('code','404')") || !notFound.includes('error.html')) throw new Error('Custom 404 recovery page is not configured.');
if (!notFound.includes('rel="icon"') || !errorPage.includes('rel="icon"')) throw new Error('Custom error pages are missing their favicon.');
for (const errorCode of ['400','403','404','408','429','500','503','OFFLINE']) {
  if (!errorPage.includes(`'${errorCode}'`)) throw new Error(`Custom error page is missing status ${errorCode}.`);
}

const portable = readFileSync(join(root, 'START_HERE.html'), 'utf8');
const scriptStart = portable.lastIndexOf('<script>\n(() => {') + '<script>\n'.length;
const scriptEnd = portable.indexOf('\n</script>', scriptStart);
if (scriptStart < '<script>\n'.length || scriptEnd < 0) throw new Error('Portable game script boundary is missing.');
if (portable.slice(scriptStart, scriptEnd).trim() !== game.trim()) throw new Error('START_HERE.html does not match js/game.js.');

console.log(`GitHub Pages validation passed (${files.size} files).`);
