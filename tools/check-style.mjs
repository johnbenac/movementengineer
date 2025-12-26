import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'tests', 'tools'];
const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx']);
const TAB_KIT_PATH = path.join(ROOT, 'src', 'app', 'tabs', 'tabKit.js');
const STORAGE_ALLOWLIST = new Set([
  path.join(ROOT, 'src', 'app', 'persistenceFacade.js'),
  path.join(ROOT, 'src', 'app', 'store.js')
]);

async function walk(dir, fileList = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function formatPath(filePath) {
  return path.relative(ROOT, filePath);
}

function addError(errors, filePath, lineNumber, snippet, message) {
  const location = lineNumber ? `${formatPath(filePath)}:${lineNumber}` : formatPath(filePath);
  const snippetLine = snippet ? `\n  ${snippet.trimEnd()}` : '';
  errors.push(`${location}: ${message}${snippetLine}`);
}

function getLineInfo(text, index) {
  const lines = text.split(/\r?\n/);
  const prefix = text.slice(0, index);
  const lineNumber = prefix.split(/\r?\n/).length;
  return { lineNumber, lineText: lines[lineNumber - 1] || '' };
}

function checkMatches({ errors, filePath, text, regex, message }) {
  const matches = text.matchAll(regex);
  for (const match of matches) {
    const index = match.index ?? 0;
    const { lineNumber, lineText } = getLineInfo(text, index);
    addError(errors, filePath, lineNumber, lineText, message);
  }
}

async function run() {
  const errors = [];
  const files = [];

  for (const dir of SCAN_DIRS) {
    await walk(path.join(ROOT, dir), files);
  }

  for (const filePath of files) {
    const ext = path.extname(filePath);

    if (ext === '.ts' || ext === '.tsx') {
      addError(errors, filePath, null, null, 'TypeScript artifacts are not allowed.');
      continue;
    }

    if (!CODE_EXTENSIONS.has(ext)) continue;

    const text = await readFile(filePath, 'utf8');

    if (
      filePath.startsWith(path.join(ROOT, 'src', 'app', 'tabs')) &&
      filePath !== TAB_KIT_PATH
    ) {
      checkMatches({
        errors,
        filePath,
        text,
        regex: /querySelector\s*\??\.?\s*\(\s*['"]\.tab\.active['"]\s*\)/g,
        message: 'Active tab DOM probing is forbidden in tab modules.'
      });

      checkMatches({
        errors,
        filePath,
        text,
        regex: /MovementEngineer\s*\.\s*tabs/g,
        message: 'Direct MovementEngineer.tabs usage is only allowed in tabKit.js.'
      });

      checkMatches({
        errors,
        filePath,
        text,
        regex: /MovementEngineer\s*\[\s*['"]tabs['"]\s*\]/g,
        message: 'Direct MovementEngineer.tabs usage is only allowed in tabKit.js.'
      });
    }

    if (filePath.startsWith(path.join(ROOT, 'src', 'app')) && !STORAGE_ALLOWLIST.has(filePath)) {
      checkMatches({
        errors,
        filePath,
        text,
        regex: /StorageService\s*\.\s*saveSnapshot/g,
        message: 'Direct StorageService.saveSnapshot calls are forbidden in app code.'
      });

      checkMatches({
        errors,
        filePath,
        text,
        regex: /markDirty\s*\(\s*['"]snapshot['"]\s*\)/g,
        message: "markDirty('snapshot') is forbidden in app code."
      });
    }
  }

  if (errors.length) {
    console.error('Style guardrails failed:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Style guardrails passed.');
}

run();
