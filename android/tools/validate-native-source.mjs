import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const javaRoot = path.join(root, 'android/app/src/main/java');

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const javaFiles = walk(javaRoot).filter(file => file.endsWith('.java'));
const javaSource = javaFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const gradle = read('android/app/build.gradle');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const profileStore = read('android/app/src/main/java/com/harleystudios/critterextraction/NativeProfileStore.java');
const activity = read('android/app/src/main/java/com/harleystudios/critterextraction/MainActivity.java');

for (const [name, source, marker] of [
  ['application id', gradle, "applicationId = 'com.harleystudios.critterextraction.mobile'"],
  ['version code', gradle, 'versionCode = 410'],
  ['version name', gradle, "versionName = '0.41.0-native-3d-alpha'"],
  ['Android 14 minimum', gradle, 'minSdk = 34'],
  ['native OpenGL requirement', manifest, 'android:glEsVersion="0x00030000"'],
  ['explicit first-run account gate', activity, 'if(store.hasAccounts())showMenu();else showFirstRunAccount();'],
  ['non-silent empty account store', profileStore, 'if(accounts.isEmpty()){activeId="";return;}']
]) {
  if (!source.includes(marker)) failures.push(`${name} is missing ${marker}`);
}

for (const forbidden of ['android.webkit.WebView', 'new WebView(', 'loadUrl(', 'critterdev2026']) {
  if (javaSource.includes(forbidden) || gradle.includes(forbidden)) failures.push(`Forbidden native source marker found: ${forbidden}`);
}

if (profileStore.includes('username="rookie"') || profileStore.includes('?"rookie"')) {
  failures.push('NativeProfileStore still silently creates a rookie account');
}

if (fs.existsSync(path.join(javaRoot, 'com/harleystudios/critterextraction/GameView.java'))) {
  failures.push('Unused legacy GameView runtime must not be restored');
}

const secretFiles = walk(path.join(root, 'android')).filter(file => /\.(jks|keystore|p12|pfx)$/i.test(file) || /keystore\.b64$/i.test(file));
if (secretFiles.length) failures.push(`Committed signing material found: ${secretFiles.map(file => path.relative(root, file)).join(', ')}`);

for (const jsonFile of walk(path.join(root, 'android/app/src/main/assets')).filter(file => file.endsWith('.json'))) {
  try {
    JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  } catch (error) {
    failures.push(`${path.relative(root, jsonFile)} is invalid JSON: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`Native Android source validation failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Native Android source contract OK (${javaFiles.length} Java files; no WebView or committed signing material).`);
