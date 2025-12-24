import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'dist');
const EXCLUDED_PREFIXES = ['tests/', 'test-fixtures/', 'docs/', 'dist/'];

function listTrackedFiles() {
  const output = execSync('git ls-files', {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  });
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function shouldCopy(file) {
  return !EXCLUDED_PREFIXES.some(prefix => file.startsWith(prefix));
}

async function copyFileRelative(file) {
  const source = path.join(ROOT, file);
  const destination = path.join(DIST_DIR, file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

async function main() {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });

  const tracked = listTrackedFiles();
  const runtimeFiles = tracked.filter(shouldCopy);

  await Promise.all(runtimeFiles.map(copyFileRelative));
  const summary = `Copied ${runtimeFiles.length} files into ${path.relative(ROOT, DIST_DIR)}`;
  console.log(summary);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err.message || err);
    process.exitCode = 1;
  });
}
