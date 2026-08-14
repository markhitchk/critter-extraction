import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative));
const readText = relative => read(relative).toString('utf8');
const contract = JSON.parse(readText('android/app/src/main/assets/native/branding-contract.json'));
const failures = [];

const svg = read(contract.canonicalSvg);
const svgHash = crypto.createHash('sha256').update(svg).digest('hex');
if (svgHash !== contract.canonicalSvgSha256) {
  failures.push(`Canonical SVG hash changed: expected ${contract.canonicalSvgSha256}, found ${svgHash}`);
}

const png = read(contract.launcherRaster);
if (png.length < 24 || png.toString('ascii', 1, 4) !== 'PNG') {
  failures.push('Canonical launcher raster is not a PNG file');
} else {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== contract.launcherRasterWidth || height !== contract.launcherRasterHeight) {
    failures.push(`Launcher raster must be ${contract.launcherRasterWidth}×${contract.launcherRasterHeight}; found ${width}×${height}`);
  }
}

const manifest = readText('android/app/src/main/AndroidManifest.xml');
const foreground = readText('android/app/src/main/res/drawable/ic_critter_foreground.xml');
const launcher = readText('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
const launcherRound = readText('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml');
const menu = readText('android/app/src/main/java/com/harleystudios/critterextraction/LiveMenuView.java');

for (const [name, source, marker] of [
  ['manifest launcher', manifest, 'android:icon="@mipmap/ic_launcher"'],
  ['manifest round launcher', manifest, 'android:roundIcon="@mipmap/ic_launcher_round"'],
  ['adaptive foreground', foreground, '@drawable/critter_icon_canonical'],
  ['adaptive launcher', launcher, '@drawable/ic_critter_foreground'],
  ['round adaptive launcher', launcherRound, '@drawable/ic_critter_foreground'],
  ['native boot/header', menu, 'assets.renderSvg("branding/icon.svg"']
]) {
  if (!source.includes(marker)) failures.push(`${name} is missing ${marker}`);
}

for (const forbidden of ['@drawable/critter_logo', 'critter-dev.keystore', 'critterdev2026']) {
  if (manifest.includes(forbidden) || foreground.includes(forbidden)) {
    failures.push(`Obsolete or unsafe branding/signing marker remains: ${forbidden}`);
  }
}

if (failures.length) {
  console.error(`Canonical Critter Extraction branding validation failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Canonical SVG branding OK (${svgHash}; ${contract.launcherRasterWidth}×${contract.launcherRasterHeight} launcher raster).`);
