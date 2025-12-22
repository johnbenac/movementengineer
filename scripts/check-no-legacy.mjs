import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANNED_FILE_PATTERNS = [
  /(^|\/)app\.js$/i,
  /(^|\/)modules\/bootstrap\.mjs$/i,
  /(^|\/)modules\/tabs\/.*\.mjs$/i
];
const BANNED_CONTENT_PATTERNS = [
  /legacyAutoInit/,
  /legacyFree/,
  /__mode/,
  /legacy-free/,
  /MovementEngineer\.legacy/
];
const CONTENT_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx', '.jsx', '.html']);
const CONTENT_EXCLUDE_PREFIXES = ['tests/', 'test-fixtures/', 'docs/'];
const ARTIFACT_DIRS = ['dist', 'build', 'public'];

function run(command) {
  return execSync(command, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  }).trim();
}

function fail(message, lines = []) {
  const details = [message, ...lines.map(line => ` - ${line}`)].join('\n');
  throw new Error(details);
}

function listTrackedFiles() {
  const output = run('git ls-files');
  return output.split('\n').map(line => line.trim()).filter(Boolean);
}

function shouldScanContent(file) {
  if (file.endsWith('check-no-legacy.mjs')) return false;
  if (CONTENT_EXCLUDE_PREFIXES.some(prefix => file.startsWith(prefix))) return false;
  const ext = path.extname(file).toLowerCase();
  return CONTENT_EXTENSIONS.has(ext);
}

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function findContentHits(files) {
  const hits = [];
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    const content = await readFileSafe(fullPath);
    if (!content) continue;
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      BANNED_CONTENT_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          hits.push(`${file}:${index + 1} matches ${pattern.source}`);
        }
      });
    });
  }
  return hits;
}

async function walkDirectory(dir) {
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(err => (err.code === 'ENOENT' ? [] : Promise.reject(err)));

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function scanArtifacts() {
  const artifactHits = [];
  for (const dir of ARTIFACT_DIRS) {
    const files = await walkDirectory(path.join(ROOT, dir));
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (BANNED_FILE_PATTERNS.some(pattern => pattern.test(rel))) {
        artifactHits.push(rel);
        continue;
      }
      if (!shouldScanContent(rel)) continue;
      const content = await readFileSafe(file);
      if (!content) continue;
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        BANNED_CONTENT_PATTERNS.forEach(pattern => {
          if (pattern.test(line)) {
            artifactHits.push(`${rel}:${index + 1} matches ${pattern.source}`);
          }
        });
      });
    }
  }
  return artifactHits;
}

export async function runNoLegacyCheck() {
  const trackedFiles = listTrackedFiles();
  const bannedTrackedFiles = trackedFiles.filter(file =>
    BANNED_FILE_PATTERNS.some(pattern => pattern.test(file))
  );
  if (bannedTrackedFiles.length) {
    fail('Found banned legacy file(s) in tracked files.', bannedTrackedFiles);
  }

  const contentTargets = trackedFiles.filter(shouldScanContent);
  const contentHits = await findContentHits(contentTargets);
  if (contentHits.length) {
    fail('Found legacy markers in source files.', contentHits);
  }

  const artifactHits = await scanArtifacts();
  if (artifactHits.length) {
    fail('Found legacy artifacts in build output.', artifactHits);
  }

  return 'Legacy checks passed (no app.js, bootstrap shim, or legacy flags detected).';
}

async function main() {
  const result = await runNoLegacyCheck();
  console.log(result);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err.message || err);
    process.exitCode = 1;
  });
}
