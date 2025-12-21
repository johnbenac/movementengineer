import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TARGET = ['app', 'js'].join('.');
const TARGET_REGEX = new RegExp(['app', 'js'].join('\\.'), 'i');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

async function findInDir(dir) {
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
      found.push(...(await findInDir(fullPath)));
    } else if (entry.name.toLowerCase() === TARGET) {
      found.push(fullPath);
    }
  }
  return found;
}

export async function runNoLegacyScriptCheck() {
  const trackedFiles = run('git ls-files').split('\n').filter(Boolean);
  const trackedMatches = trackedFiles.filter(file => new RegExp(`(^|/)${TARGET}$`).test(file));
  if (trackedMatches.length) {
    fail(`Found tracked ${TARGET} file(s).`, trackedMatches);
  }

  const htmlFilesOutput = run("git ls-files -- '*.html'");
  const htmlFiles = htmlFilesOutput ? htmlFilesOutput.split('\n').filter(Boolean) : [];
  const htmlHits = [];
  for (const file of htmlFiles) {
    const contents = await fs.readFile(path.join(ROOT, file), 'utf8');
    if (TARGET_REGEX.test(contents)) {
      htmlHits.push(file);
    }
  }
  if (htmlHits.length) {
    fail(`Found ${TARGET} reference(s) in HTML files.`, htmlHits);
  }

  const directoriesToScan = ['dist', 'build', 'public'];
  const artifactHits = [];
  for (const dir of directoriesToScan) {
    const matches = await findInDir(path.join(ROOT, dir));
    artifactHits.push(...matches);
  }
  if (artifactHits.length) {
    fail(`Found ${TARGET} artifact(s) in output directories.`, artifactHits.map(p => path.relative(ROOT, p)));
  }

  return `${TARGET} not detected in tracked files, HTML, or build artifacts.`;
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
