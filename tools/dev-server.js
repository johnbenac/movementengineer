#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.resolve(process.cwd());

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
};

function send(res, code, contentType, body) {
  res.writeHead(code, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendNotFound(res) {
  send(res, 404, 'text/plain; charset=utf-8', 'Not found');
}

function sendForbidden(res) {
  send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function safeResolveUrlToPath(urlPath) {
  const rel = urlPath.replace(/^\/+/, '');
  const normalized = path.normalize(rel);
  const resolved = path.resolve(ROOT, normalized);
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  try {
    const rawPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    const urlPath = rawPath === '/' ? '/index.html' : rawPath;

    const fsPath = safeResolveUrlToPath(urlPath);
    if (!fsPath) return sendForbidden(res);

    fs.stat(fsPath, (err, stats) => {
      if (err) return sendNotFound(res);

      let finalPath = fsPath;
      if (stats.isDirectory()) {
        finalPath = path.join(fsPath, 'index.html');
      }

      const stream = fs.createReadStream(finalPath);
      stream.on('error', () => sendNotFound(res));
      res.writeHead(200, {
        'Content-Type': contentTypeFor(finalPath),
        'Cache-Control': 'no-store'
      });
      stream.pipe(res);
    });
  } catch (e) {
    send(res, 500, 'text/plain; charset=utf-8', 'Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Static server listening on http://127.0.0.1:${PORT}`);
});
