import { promises as fs } from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(process.cwd(), 'src/app');
const routeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );
  return files.flat();
}

function isRouteFile(filePath) {
  if (filePath.endsWith('.d.ts')) return false;
  return routeExtensions.has(path.extname(filePath));
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function deriveRouteKey(filePath) {
  const relative = toPosix(path.relative(appRoot, filePath));
  const withoutExt = relative.replace(/\.[^./]+$/, '');
  const segments = withoutExt
    .split('/')
    .filter(Boolean)
    .filter(segment => !(segment.startsWith('(') && segment.endsWith(')')))
    .filter(segment => segment !== 'index');

  if (segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

function classifyRouteKind(filePath) {
  const baseName = path.basename(filePath, path.extname(filePath));
  if (baseName === '_layout') return 'layout';
  return 'route';
}

async function main() {
  const allFiles = await walk(appRoot);
  const routeFiles = allFiles.filter(isRouteFile);

  const routes = routeFiles
    .map(file => {
      const relative = toPosix(path.relative(process.cwd(), file));
      return {
        file: relative,
        kind: classifyRouteKind(file),
        key: deriveRouteKey(file)
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));

  const keyMap = new Map();
  for (const route of routes.filter(route => route.kind === 'route')) {
    const list = keyMap.get(route.key) || [];
    list.push(route.file);
    keyMap.set(route.key, list);
  }

  console.log('ROUTES');
  routes.forEach(route => {
    console.log(`- ${route.file} -> ${route.key} (${route.kind})`);
  });

  const duplicates = Array.from(keyMap.entries()).filter(([, files]) => files.length > 1);

  console.log('\nWARNINGS');
  if (duplicates.length === 0) {
    console.log('- none');
  } else {
    duplicates.forEach(([key, files]) => {
      console.log(`- Duplicate key "${key}"`);
      files.forEach(file => console.log(`  - ${file}`));
    });
  }

  if (duplicates.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
