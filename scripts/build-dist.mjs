import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, 'dist');

const entries = [
  'index.html',
  'legacy-free.html',
  'styles.css',
  'script.js',
  'storage.js',
  'domain-service.js',
  'graph-colors.js',
  'graph-view.js',
  'comparison-model.js',
  'comparison-services.js',
  'markdown-dataset-loader.js',
  'view-models.js',
  'modules',
  'src',
  'scripts',
  'movements',
  'docs'
];

function copyEntry(entry) {
  const from = path.join(repoRoot, entry);
  const to = path.join(distDir, entry);
  if (!existsSync(from)) {
    console.warn(`Skipping missing build entry: ${entry}`);
    return;
  }
  cpSync(from, to, { recursive: true });
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

entries.forEach(copyEntry);

console.log(`Build completed. Assets copied to ${distDir}`);
