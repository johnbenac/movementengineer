#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4173;
const ROOT = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm'
};

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

function sendForbidden(res) {
  res.writeHead(403, { 'Content-Type': 'text/plain' });
  res.end('Forbidden');
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const normalizedPath = path.normalize(urlPath);
  let filePath = path.join(ROOT, normalizedPath);

  if (!filePath.startsWith(ROOT)) {
    sendForbidden(res);
    return;
  }

  const respondWithFile = targetPath => {
    fs.readFile(targetPath, (err, data) => {
      if (err) {
        sendNotFound(res);
        return;
      }
      const ext = path.extname(targetPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  };

  fs.stat(filePath, (err, stats) => {
    if (err) {
      sendNotFound(res);
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    respondWithFile(filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Static server listening on http://localhost:${PORT}`);
});
