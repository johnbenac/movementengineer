#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SKIP_DIRS = new Set([
  '.git',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
  'tests',
  'test-fixtures'
]);
const SKIP_FILES = new Set([
  'package-lock.json'
]);

function shouldInclude(sourcePath) {
  const rel = path.relative(ROOT, sourcePath);
  if (!rel) return false;
  const [head] = rel.split(path.sep);
  if (SKIP_DIRS.has(head)) return false;
  if (SKIP_FILES.has(rel)) return false;
  return true;
}

function cleanDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copyTree(source, destination) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    const rel = path.relative(ROOT, source);
    if (rel && !shouldInclude(source)) return;
    fs.mkdirSync(destination, { recursive: true });
    const entries = fs.readdirSync(source);
    for (const entry of entries) {
      const srcEntry = path.join(source, entry);
      const destEntry = path.join(destination, entry);
      copyTree(srcEntry, destEntry);
    }
    return;
  }

  if (!shouldInclude(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

cleanDist();
copyTree(ROOT, DIST);
console.log(`Built static assets into ${DIST}`);
