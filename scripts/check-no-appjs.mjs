#!/usr/bin/env node
import { execSync } from 'node:child_process';

const targetName = ['app', 'js'].join('.');

function run(cmd) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function fail(message, output) {
  console.error(message);
  if (output?.trim()) {
    console.error(output.trim());
  }
  process.exitCode = 1;
}

const trackedAppJs = run(`git ls-files | rg "(^|/)${targetName.replace('.', '\\\\.')}$" || true`);
if (trackedAppJs) {
  fail(`Tracked files named ${targetName} found:`, trackedAppJs);
}

const htmlRefs = run(`rg -n --glob "**/*.html" "${targetName.replace('.', '\\\\.')}" || true`);
if (htmlRefs) {
  fail(`HTML references to ${targetName} found:`, htmlRefs);
}

const buildArtifacts = run(`find dist build public -name "${targetName}" -print 2>/dev/null || true`);
if (buildArtifacts) {
  fail(`Build artifacts named ${targetName} found:`, buildArtifacts);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`✔ No ${targetName} files or references detected.`);
