const fs = require('fs');
const path = require('path');

const ROUTE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ROUTE_ROOT = path.join(process.cwd(), 'src', 'app');

function isRouteFile(filePath) {
  if (filePath.endsWith('.d.ts')) return false;
  return ROUTE_EXTENSIONS.has(path.extname(filePath));
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function deriveRouteKey(relativePath) {
  const withoutExt = relativePath.replace(/\.[^.]+$/, '');
  const segments = withoutExt
    .split('/')
    .filter(Boolean)
    .filter(segment => !/^\(.*\)$/.test(segment))
    .filter(segment => segment !== 'index');

  const key = `/${segments.join('/')}`;
  return key === '/' ? '/' : key;
}

function walkDir(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.isFile() && isRouteFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  if (!fs.existsSync(ROUTE_ROOT)) {
    console.error(`Route root not found: ${ROUTE_ROOT}`);
    process.exit(1);
  }

  const files = walkDir(ROUTE_ROOT)
    .map(filePath => path.relative(process.cwd(), filePath))
    .sort();

  const keyMap = new Map();

  const routes = files.map(filePath => {
    const relative = toPosixPath(path.relative(ROUTE_ROOT, filePath));
    const key = deriveRouteKey(relative);

    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key).push(filePath);

    return { filePath, key };
  });

  console.log('ROUTES');
  routes.forEach(route => {
    console.log(`- ${route.filePath} -> ${route.key}`);
  });

  const collisions = Array.from(keyMap.entries()).filter(([, entries]) => entries.length > 1);

  console.log('\nWARNINGS');
  if (collisions.length === 0) {
    console.log('- No duplicate route keys detected.');
    return;
  }

  collisions.forEach(([key, entries]) => {
    console.log(`- ${key}`);
    entries.forEach(entry => console.log(`  - ${entry}`));
  });
}

main();
