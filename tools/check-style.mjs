import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'tests', 'tools'];
const TAB_DIR = path.join(ROOT, 'src', 'app', 'tabs');
const APP_DIR = path.join(ROOT, 'src', 'app');

const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function lineInfo(content, index) {
  const before = content.slice(0, index);
  const lineNumber = before.split('\n').length;
  const line = content.split('\n')[lineNumber - 1] || '';
  return { lineNumber, line };
}

function formatIssue({ file, lineNumber, line, message }) {
  const rel = path.relative(ROOT, file);
  return `${rel}:${lineNumber}: ${message}\n  ${line.trim()}`;
}

async function checkNoTypeScriptArtifacts() {
  const issues = [];
  for (const dir of SCAN_DIRS) {
    const fullDir = path.join(ROOT, dir);
    const files = await listFiles(fullDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.ts' || ext === '.tsx') {
        const content = await fs.readFile(file, 'utf8');
        const firstLine = content.split('\n')[0] || '';
        issues.push({
          file,
          lineNumber: 1,
          line: firstLine,
          message: 'TypeScript artifacts are not allowed in src/, tests/, or tools/.'
        });
      }
    }
  }
  return issues;
}

async function checkTabActiveProbing() {
  const issues = [];
  const files = await listFiles(TAB_DIR);
  const disallowedRegex =
    /querySelector\??\.?\s*\(\s*['"`][^'"`]*\.tab\.active[^'"`]*['"`]\s*\)/g;
  for (const file of files) {
    if (path.basename(file) === 'tabKit.js') continue;
    if (!JS_EXTENSIONS.has(path.extname(file))) continue;
    const content = await fs.readFile(file, 'utf8');
    for (const match of content.matchAll(disallowedRegex)) {
      const { lineNumber, line } = lineInfo(content, match.index || 0);
      issues.push({
        file,
        lineNumber,
        line,
        message: 'Tab modules must not probe .tab.active directly.'
      });
    }
  }
  return issues;
}

async function checkNoDirectTabRegistryUsage() {
  const issues = [];
  const files = await listFiles(TAB_DIR);
  const disallowedRegex = /MovementEngineer\s*\.\s*tabs/g;
  for (const file of files) {
    if (path.basename(file) === 'tabKit.js') continue;
    if (!JS_EXTENSIONS.has(path.extname(file))) continue;
    const content = await fs.readFile(file, 'utf8');
    for (const match of content.matchAll(disallowedRegex)) {
      const { lineNumber, line } = lineInfo(content, match.index || 0);
      issues.push({
        file,
        lineNumber,
        line,
        message: 'Tab modules must not touch MovementEngineer.tabs directly.'
      });
    }
  }
  return issues;
}

async function checkNoStorageServiceSaveSnapshot() {
  const issues = [];
  const files = await listFiles(APP_DIR);
  const disallowed = 'StorageService.saveSnapshot';
  const allowlist = new Set([
    path.join(APP_DIR, 'persistenceFacade.js'),
    path.join(APP_DIR, 'store.js')
  ]);
  for (const file of files) {
    if (!JS_EXTENSIONS.has(path.extname(file))) continue;
    if (allowlist.has(file)) continue;
    const content = await fs.readFile(file, 'utf8');
    const idx = content.indexOf(disallowed);
    if (idx !== -1) {
      const { lineNumber, line } = lineInfo(content, idx);
      issues.push({
        file,
        lineNumber,
        line,
        message: 'Do not call StorageService.saveSnapshot directly in app code.'
      });
    }
  }
  return issues;
}

async function checkNoSnapshotMarkDirty() {
  const issues = [];
  const files = await listFiles(APP_DIR);
  const disallowedRegex = /markDirty\s*\(\s*['"`]snapshot['"`]\s*\)/g;
  for (const file of files) {
    if (!JS_EXTENSIONS.has(path.extname(file))) continue;
    const content = await fs.readFile(file, 'utf8');
    for (const match of content.matchAll(disallowedRegex)) {
      const { lineNumber, line } = lineInfo(content, match.index || 0);
      issues.push({
        file,
        lineNumber,
        line,
        message: 'Do not call markDirty("snapshot") in app code.'
      });
    }
  }
  return issues;
}

async function main() {
  const checks = await Promise.all([
    checkNoTypeScriptArtifacts(),
    checkTabActiveProbing(),
    checkNoDirectTabRegistryUsage(),
    checkNoStorageServiceSaveSnapshot(),
    checkNoSnapshotMarkDirty()
  ]);
  const issues = checks.flat();
  if (!issues.length) return;
  console.error('Style guardrails failed:\n');
  issues.forEach(issue => {
    console.error(formatIssue(issue));
  });
  process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
