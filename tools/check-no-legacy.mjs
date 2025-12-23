import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BANNED_PATHS = [
  { label: 'app.js', pattern: /(^|\/)app\.js$/i },
  { label: 'modules/bootstrap.mjs', pattern: /(^|\/)modules\/bootstrap\.mjs$/i },
  { label: 'modules/tabs/*.mjs', pattern: /(^|\/)modules\/tabs\/.+\.mjs$/i }
];

const BANNED_STRINGS = [
  'legacyAutoInit',
  'legacyFree',
  '__mode',
  'legacy-free',
  'MovementEngineer.legacy'
];

const ARTIFACT_DIRS = ['dist', 'build', 'public'];
const STRING_SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html']);
const STRING_SCAN_IGNORES = [
  'tests/',
  'test-fixtures/',
  'tools/check-no-legacy.mjs',
  'tools/check-no-appjs.mjs'
];

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

function isIgnoredForStrings(file) {
  return STRING_SCAN_IGNORES.some(ignore => file.startsWith(ignore));
}

function shouldScanForStrings(file) {
  return STRING_SCAN_EXTENSIONS.has(path.extname(file)) && !isIgnoredForStrings(file);
}

async function fileContainsStrings(file, fullPath) {
  const contents = await fs.readFile(fullPath, 'utf8');
  const hits = [];
  const lines = contents.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const target of BANNED_STRINGS) {
      if (lines[i].includes(target)) {
        hits.push(`${file}:${i + 1}:${lines[i].trim()}`);
      }
    }
  }
  return hits;
}

async function scanTrackedFilesForStrings(files) {
  const hits = [];
  for (const file of files) {
    if (!shouldScanForStrings(file)) continue;
    const fullPath = path.join(ROOT, file);
    hits.push(...(await fileContainsStrings(file, fullPath)));
  }
  return hits;
}

async function findInDir(dir, matcher) {
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
      found.push(...(await findInDir(fullPath, matcher)));
    } else if (matcher(entry, fullPath)) {
      found.push(fullPath);
    }
  }
  return found;
}

async function scanArtifactsForStrings(dir) {
  const hits = [];
  const entries = await findInDir(dir, () => true);
  for (const filePath of entries) {
    const ext = path.extname(filePath);
    if (!STRING_SCAN_EXTENSIONS.has(ext)) continue;
    hits.push(...(await fileContainsStrings(path.relative(ROOT, filePath), filePath)));
  }
  return hits;
}

export async function runNoLegacyScriptCheck() {
  const trackedFiles = run('git ls-files').split('\n').filter(Boolean);

  const bannedFileHits = trackedFiles
    .filter(file => BANNED_PATHS.some(({ pattern }) => pattern.test(file)))
    .map(file => `tracked: ${file}`);
  if (bannedFileHits.length) {
    fail('Found disallowed legacy file(s).', bannedFileHits);
  }

  const stringHits = await scanTrackedFilesForStrings(trackedFiles);
  if (stringHits.length) {
    fail('Found legacy references in tracked files.', stringHits);
  }

  const artifactPathHits = [];
  for (const target of ARTIFACT_DIRS) {
    const dir = path.join(ROOT, target);
    const fileHits = await findInDir(dir, (entry, fullPath) =>
      BANNED_PATHS.some(({ pattern }) => pattern.test(path.relative(ROOT, fullPath)))
    );
    artifactPathHits.push(...fileHits.map(hit => path.relative(ROOT, hit)));

    const artifactStringHits = await scanArtifactsForStrings(dir);
    artifactPathHits.push(...artifactStringHits);
  }
  if (artifactPathHits.length) {
    fail('Found legacy artifacts or references in build output.', artifactPathHits);
  }

  return 'No legacy files or references detected.';
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
