import fs from 'node:fs';
import path from 'node:path';
const pages = ['index.html','404.html','error.html','invite.html','invite/index.html','reset/index.html','core/error-system/index.html','core/error-system/fallback.html'];
const missing = [];
for (const file of pages) {
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)) {
    const value = match[1];
    if (/^(?:https?:|data:|blob:|mailto:|javascript:|\/\/)/.test(value)) continue;
    const target = path.resolve(path.dirname(file), value);
    if (!fs.existsSync(target)) missing.push(file + ' -> ' + value);
  }
}
if (missing.length) {
  console.error(missing.join('\n'));
  process.exit(1);
}
console.log('Relative links OK');
