const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function resolveRequest(urlValue) {
  const pathname = decodeURIComponent(new URL(urlValue, `http://${host}:${port}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const absolute = path.resolve(root, relative);
  return absolute === root || absolute.startsWith(`${root}${path.sep}`) ? absolute : null;
}

const server = http.createServer((request, response) => {
  const absolute = resolveRequest(request.url || '/');
  if (!absolute) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(absolute, (statError, stat) => {
    let file = absolute;
    if (!statError && stat.isDirectory()) file = path.join(absolute, 'index.html');
    fs.readFile(file, (error, content) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
        return;
      }
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream'
      });
      response.end(content);
    });
  });
});

server.listen(port, host, () => {
  process.stdout.write(`Critter Extraction test server: http://${host}:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
