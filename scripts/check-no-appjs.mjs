import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const legacyName = ['app', '.js'].join('');
const repoRoot = process.cwd();

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result.stdout || '';
}

function fail(message, details = '') {
  const suffix = details.trim() ? `\n${details.trim()}` : '';
  console.error(`${message}${suffix}`);
  process.exit(1);
}

function listTrackedFiles() {
  const output = run('git', ['ls-files']);
  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function findLegacyFiles(files) {
  return files.filter(f => path.basename(f) === legacyName);
}

function findLegacyHtmlReferences(files) {
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  const hits = [];
  for (const file of htmlFiles) {
    const contents = readFileSync(path.join(repoRoot, file), 'utf8');
    if (contents.includes(legacyName)) {
      hits.push(file);
    }
  }
  return hits;
}

function crawlOutputs(dir) {
  const found = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!existsSync(current)) continue;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.name === legacyName) {
        found.push(fullPath);
      }
      if (entry.name.endsWith('.html')) {
        const contents = readFileSync(fullPath, 'utf8');
        if (contents.includes(legacyName)) {
          found.push(fullPath);
        }
      }
    }
  }
  return found;
}

const tracked = listTrackedFiles();
const legacyFiles = findLegacyFiles(tracked);
if (legacyFiles.length) {
  fail('Tracked files still include the legacy runtime file name.', legacyFiles.join('\n'));
}

const htmlRefs = findLegacyHtmlReferences(tracked);
if (htmlRefs.length) {
  fail('HTML entrypoints still reference the legacy runtime.', htmlRefs.join('\n'));
}

const outputDirs = ['dist', 'build'];
const outputHits = outputDirs
  .map(dir => crawlOutputs(path.join(repoRoot, dir)))
  .flat();

if (outputHits.length) {
  fail('Build output contains a legacy runtime reference.', outputHits.join('\n'));
}

console.log('Legacy runtime guard passed ✅');
