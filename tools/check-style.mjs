import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'tests', 'tools'].map(dir => path.join(ROOT, dir));
const TABS_DIR = path.join(ROOT, 'src', 'app', 'tabs');
const TAB_KIT = path.join(TABS_DIR, 'tabKit.js');
const PERSISTENCE_ALLOWLIST = new Set([
  path.join(ROOT, 'src', 'app', 'persistenceFacade.js'),
  path.join(ROOT, 'src', 'app', 'store.js')
]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath);
}

function addError(errors, rule, file, line, snippet, message) {
  errors.push({ rule, file, line, snippet, message });
}

function reportErrors(errors) {
  if (!errors.length) return;
  const byRule = new Map();
  errors.forEach(err => {
    const list = byRule.get(err.rule) || [];
    list.push(err);
    byRule.set(err.rule, list);
  });

  for (const [rule, list] of byRule.entries()) {
    const header = list[0]?.message ? `: ${list[0].message}` : '';
    console.error(`[style-check] ${rule}${header}`);
    list.forEach(err => {
      console.error(`  ${err.file}:${err.line}`);
      console.error(`    ${err.snippet}`);
    });
  }
}

async function ruleNoTypeScriptArtifacts(errors) {
  const targets = await Promise.all(
    SCAN_DIRS.map(async dir => ({ dir, files: await walk(dir) }))
  );
  targets.forEach(({ files }) => {
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.ts' || ext === '.tsx') {
        addError(
          errors,
          'Rule A',
          toRelative(file),
          1,
          `TypeScript artifact detected (${ext})`,
          'No TypeScript artifacts (*.ts or *.tsx) allowed.'
        );
      }
    });
  });
}

async function ruleNoTabActiveQuery(errors) {
  const files = await walk(TABS_DIR);
  for (const file of files) {
    if (file === TAB_KIT) continue;
    const contents = await fs.readFile(file, 'utf8');
    const lines = contents.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('querySelector') && line.includes('.tab.active')) {
        addError(
          errors,
          'Rule B',
          toRelative(file),
          idx + 1,
          line.trim(),
          'Tab modules must not query .tab.active; use shell APIs instead.'
        );
      }
    });
  }
}

async function ruleNoGlobalTabRegistry(errors) {
  const files = await walk(TABS_DIR);
  for (const file of files) {
    if (file === TAB_KIT) continue;
    const contents = await fs.readFile(file, 'utf8');
    const lines = contents.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('MovementEngineer.tabs')) {
        addError(
          errors,
          'Rule C',
          toRelative(file),
          idx + 1,
          line.trim(),
          'Tab modules must not touch MovementEngineer.tabs directly.'
        );
      }
    });
  }
}

async function ruleNoDirectStorageSave(errors) {
  const files = await walk(path.join(ROOT, 'src', 'app'));
  for (const file of files) {
    if (PERSISTENCE_ALLOWLIST.has(file)) continue;
    const contents = await fs.readFile(file, 'utf8');
    const lines = contents.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('StorageService.saveSnapshot')) {
        addError(
          errors,
          'Rule D',
          toRelative(file),
          idx + 1,
          line.trim(),
          'App code must not call StorageService.saveSnapshot directly.'
        );
      }
    });
  }
}

async function ruleNoSnapshotMarkDirty(errors) {
  const files = await walk(path.join(ROOT, 'src', 'app'));
  const regex = /markDirty\(\s*['\"]snapshot['\"]\s*\)/;
  for (const file of files) {
    const contents = await fs.readFile(file, 'utf8');
    const lines = contents.split('\n');
    lines.forEach((line, idx) => {
      if (regex.test(line)) {
        addError(
          errors,
          'Rule E',
          toRelative(file),
          idx + 1,
          line.trim(),
          'Use normalized dirty scopes; markDirty("snapshot") is forbidden in app code.'
        );
      }
    });
  }
}

async function main() {
  const errors = [];
  await ruleNoTypeScriptArtifacts(errors);
  await ruleNoTabActiveQuery(errors);
  await ruleNoGlobalTabRegistry(errors);
  await ruleNoDirectStorageSave(errors);
  await ruleNoSnapshotMarkDirty(errors);

  reportErrors(errors);
  if (errors.length) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
