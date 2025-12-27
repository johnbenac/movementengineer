import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'src', 'app');
const validExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

function isRouteFile(filePath) {
  if (filePath.endsWith('.d.ts')) return false;
  return validExtensions.has(path.extname(filePath));
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(fullPath)));
    } else if (entry.isFile() && isRouteFile(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function normalizeSegments(segments) {
  return segments.filter(segment => {
    if (!segment) return false;
    if (segment === 'index') return false;
    if (segment.startsWith('(') && segment.endsWith(')')) return false;
    return true;
  });
}

function deriveRouteKey(filePath) {
  const relativePath = path.relative(appRoot, filePath);
  const parsed = path.parse(relativePath);
  const withoutExt = path.join(parsed.dir, parsed.name);
  const segments = withoutExt.split(path.sep);
  const normalized = normalizeSegments(segments);
  const key = `/${normalized.join('/')}`;
  return key === '/' ? '/' : key;
}

async function main() {
  const files = (await walk(appRoot)).sort();
  const keyed = files.map(file => ({
    file,
    relative: path.relative(repoRoot, file),
    key: deriveRouteKey(file)
  }));

  const keyMap = new Map();
  for (const entry of keyed) {
    const list = keyMap.get(entry.key) || [];
    list.push(entry.relative);
    keyMap.set(entry.key, list);
  }

  console.log('ROUTES');
  for (const entry of keyed) {
    console.log(`- ${entry.relative} -> ${entry.key}`);
  }

  const duplicates = Array.from(keyMap.entries()).filter(([, filesForKey]) => filesForKey.length > 1);

  console.log('\nWARNINGS');
  if (duplicates.length === 0) {
    console.log('No duplicate route keys detected.');
  } else {
    for (const [key, filesForKey] of duplicates) {
      console.log(`- ${key}`);
      for (const file of filesForKey) {
        console.log(`  - ${file}`);
      }
    }
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Route audit failed:', err);
  process.exitCode = 1;
});
