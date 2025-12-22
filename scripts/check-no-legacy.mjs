import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANNED_FILE_PATTERNS = [
  /(^|\/)app\.js$/,
  /(^|\/)modules\/bootstrap\.mjs$/,
  /(^|\/)modules\/tabs\/.*\.mjs$/
];
const BANNED_STRINGS = ['legacyAutoInit', 'legacyFree', '__mode', 'legacy-free', 'MovementEngineer.legacy'];
const CONTENT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html']);
const EXCLUDED_PATH_PREFIXES = ['tests/', 'test-fixtures/', 'docs/'];
const EXCLUDED_EXACT_FILES = ['scripts/check-no-legacy.mjs'];
const EXCLUDED_FILENAME_PATTERNS = [/check-no-legacy\.mjs$/];
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
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function isExcluded(file) {
  return (
    EXCLUDED_EXACT_FILES.includes(file) ||
    EXCLUDED_PATH_PREFIXES.some(prefix => file.startsWith(prefix)) ||
    EXCLUDED_FILENAME_PATTERNS.some(pattern => pattern.test(file))
  );
}

function shouldScanContent(file) {
  if (isExcluded(file)) return false;
  const ext = path.extname(file).toLowerCase();
  return CONTENT_EXTENSIONS.has(ext);
}

function findBannedFileMatches(files) {
  const hits = [];
  for (const file of files) {
    for (const pattern of BANNED_FILE_PATTERNS) {
      if (pattern.test(file)) {
        hits.push(file);
        break;
      }
    }
  }
  return hits;
}

async function findBannedStringsInFile(filePath) {
  let content;
  try {
    content = await fs.readFile(path.join(ROOT, filePath), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const lines = content.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, idx) => {
    for (const needle of BANNED_STRINGS) {
      if (line.includes(needle)) {
        hits.push(`${filePath}:${idx + 1}: contains "${needle}"`);
      }
    }
  });
  return hits;
}

async function checkTrackedFiles(trackedFiles) {
  const bannedFiles = findBannedFileMatches(trackedFiles);
  if (bannedFiles.length) {
    fail('Found banned legacy file(s) in tracked files.', bannedFiles);
  }

  const stringHits = [];
  for (const file of trackedFiles) {
    if (!shouldScanContent(file)) continue;
    const hits = await findBannedStringsInFile(file);
    stringHits.push(...hits);
  }

  if (stringHits.length) {
    fail('Found banned legacy string(s) in tracked files.', stringHits);
  }
}

async function walkDir(dir) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return results;
    throw err;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function checkArtifactDirs() {
  const artifactHits = [];
  for (const dir of ARTIFACT_DIRS) {
    const files = await walkDir(path.join(ROOT, dir));
    if (!files.length) continue;

    const relativeFiles = files.map(file => path.relative(ROOT, file));
    artifactHits.push(...findBannedFileMatches(relativeFiles));

    for (const file of relativeFiles) {
      if (!shouldScanContent(file)) continue;
      const hits = await findBannedStringsInFile(file);
      artifactHits.push(...hits);
    }
  }

  if (artifactHits.length) {
    fail('Found banned legacy artifact(s).', artifactHits);
  }
}

export async function runNoLegacyScriptCheck() {
  const trackedFiles = listTrackedFiles();
  await checkTrackedFiles(trackedFiles);
  await checkArtifactDirs();
  return 'Legacy bootstrap artifacts and strings not detected.';
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
