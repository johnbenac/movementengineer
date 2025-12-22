import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANNED_FILES = [
  { pattern: /(^|\/)app\.js$/i, reason: 'legacy app.js entrypoint' },
  { pattern: /(^|\/)modules\/bootstrap\.mjs$/i, reason: 'legacy bootstrap shim' },
  { pattern: /(^|\/)modules\/tabs\/.*\.mjs$/i, reason: 'legacy module tab' }
];
const BANNED_STRINGS = [
  { pattern: /legacyAutoInit/, reason: 'legacyAutoInit flag' },
  { pattern: /legacyFree/, reason: 'legacyFree flag' },
  { pattern: /__mode/, reason: '__mode legacy mode flag' },
  { pattern: /legacy-free/, reason: 'legacy-free mode' },
  { pattern: /MovementEngineer\.legacy/, reason: 'legacy runtime surface' }
];
const REFERENCE_EXCLUDES = ['tests/', 'test-fixtures/', 'docs/', 'scripts/'];
const ARTIFACT_DIRS = ['dist', 'build', 'public'];
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.cjs',
  '.json',
  '.html',
  '.md',
  '.css'
]);
const CONTENT_IGNORE_SUFFIXES = ['scripts/check-no-legacy.mjs'];

function run(command) {
  const output = execSync(command, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  });
  return output.trim();
}

function fail(message, lines = []) {
  const details = [message, ...lines.map(line => ` - ${line}`)].join('\n');
  throw new Error(details);
}

function pathStartsWith(filePath, prefix) {
  return filePath === prefix || filePath.startsWith(prefix);
}

function isReferenceTarget(file) {
  if (REFERENCE_EXCLUDES.some(prefix => pathStartsWith(file, prefix))) return false;
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function shouldSkipContentScan(file) {
  return CONTENT_IGNORE_SUFFIXES.some(suffix => file.endsWith(suffix));
}

async function listFilesRecursive(dir) {
  const found = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return found;
    throw err;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await listFilesRecursive(fullPath)));
    } else {
      found.push(fullPath);
    }
  }
  return found;
}

function findBannedFiles(files) {
  return files
    .map(file => {
      const hit = BANNED_FILES.find(({ pattern }) => pattern.test(file));
      return hit ? `${file} (${hit.reason})` : null;
    })
    .filter(Boolean);
}

async function findBannedStrings(files) {
  const hits = [];
  for (const file of files) {
    if (shouldSkipContentScan(file)) continue;
    const contents = await fs.readFile(path.join(ROOT, file), 'utf8');
    const lines = contents.split(/\r?\n/);
    lines.forEach((line, idx) => {
      BANNED_STRINGS.forEach(({ pattern, reason }) => {
        if (pattern.test(line)) {
          hits.push(`${file}:${idx + 1} (${reason}) ${line.trim()}`);
        }
      });
    });
  }
  return hits;
}

async function findArtifactIssues() {
  const artifactHits = [];
  for (const dir of ARTIFACT_DIRS) {
    const absoluteDir = path.join(ROOT, dir);
    const files = await listFilesRecursive(absoluteDir);
    const relativeFiles = files.map(file => path.relative(ROOT, file));
    artifactHits.push(...findBannedFiles(relativeFiles));

    const scannable = relativeFiles.filter(file => {
      if (shouldSkipContentScan(file)) return false;
      return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());
    });
    for (const file of scannable) {
      const absolutePath = path.join(ROOT, file);
      const contents = await fs.readFile(absolutePath, 'utf8');
      const lines = contents.split(/\r?\n/);
      lines.forEach((line, idx) => {
        BANNED_STRINGS.forEach(({ pattern, reason }) => {
          if (pattern.test(line)) {
            artifactHits.push(`${file}:${idx + 1} (${reason}) ${line.trim()}`);
          }
        });
      });
    }
  }
  return artifactHits;
}

export async function runNoLegacyScriptCheck() {
  const trackedFiles = run('git ls-files')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const bannedFiles = findBannedFiles(trackedFiles);
  if (bannedFiles.length) {
    fail('Found banned legacy file(s).', bannedFiles);
  }

  const referenceTargets = trackedFiles.filter(isReferenceTarget);
  const referenceHits = await findBannedStrings(referenceTargets);
  if (referenceHits.length) {
    fail('Found legacy runtime references in tracked files.', referenceHits);
  }

  const artifactHits = await findArtifactIssues();
  if (artifactHits.length) {
    fail('Found legacy artifacts or references in build output.', artifactHits);
  }

  return 'Legacy runtime patterns not detected in tracked files or build artifacts.';
}

async function main() {
  const result = await runNoLegacyScriptCheck();
  console.log(result);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err.message || err);
    process.exitCode = 1;
  });
}
