#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const APP_ROOT = path.join(PROJECT_ROOT, 'src', 'app');
const ROUTE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function isRouteFile(filePath) {
  if (filePath.endsWith('.d.ts')) return false;
  return ROUTE_EXTENSIONS.has(path.extname(filePath));
}

function deriveRouteKey(relativePath) {
  const ext = path.extname(relativePath);
  const withoutExt = relativePath.slice(0, -ext.length);
  const segments = withoutExt.split(path.sep).filter(Boolean);

  const normalized = segments.filter(segment => {
    if (segment === 'index') return false;
    if (segment === '_layout') return false;
    return !(/^\(.*\)$/.test(segment));
  });

  if (normalized.length === 0) return '/';
  return `/${normalized.join('/')}`;
}

async function main() {
  const allFiles = await walk(APP_ROOT);
  const routeFiles = allFiles
    .filter(isRouteFile)
    .map(filePath => path.relative(PROJECT_ROOT, filePath))
    .sort((a, b) => a.localeCompare(b));

  const routes = routeFiles.map(routeFile => {
    const relToApp = path.relative(APP_ROOT, path.join(PROJECT_ROOT, routeFile));
    const derivedKey = deriveRouteKey(relToApp);
    return {
      routeFile,
      derivedKey
    };
  });

  console.log('ROUTES');
  routes.forEach(route => {
    console.log(`- ${toPosix(route.routeFile)} -> ${route.derivedKey}`);
  });

  const keyMap = new Map();
  routes.forEach(route => {
    const list = keyMap.get(route.derivedKey) || [];
    list.push(route.routeFile);
    keyMap.set(route.derivedKey, list);
  });

  const collisions = Array.from(keyMap.entries()).filter(([, files]) => files.length > 1);

  console.log('\nWARNINGS');
  if (collisions.length === 0) {
    console.log('None detected.');
    return;
  }

  collisions.forEach(([key, files]) => {
    console.log(`- ${key}`);
    files.forEach(file => {
      console.log(`  - ${toPosix(file)}`);
    });
  });

  process.exitCode = 1;
}

main().catch(error => {
  console.error('Route audit failed:', error);
  process.exitCode = 1;
});
