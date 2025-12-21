import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function listTrackedFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' }).trim();
  return output ? output.split('\n') : [];
}

function runGrep(command) {
  const output = execSync(`${command} || true`, { encoding: 'utf8' }).trim();
  return output ? output.split('\n').filter(Boolean) : [];
}

const failures = [];

const trackedAppJs = listTrackedFiles().filter(path => /(^|\/)app\.js$/.test(path));
if (trackedAppJs.length) {
  failures.push(`Tracked files named app.js:\n${trackedAppJs.join('\n')}`);
}

const htmlReferences = runGrep("rg -n --glob '*.html' 'app\\.js'");
if (htmlReferences.length) {
  failures.push(`HTML references to app.js detected:\n${htmlReferences.join('\n')}`);
}

const outputDirs = ['dist', 'build', 'public'];
const artifactMatches = outputDirs
  .filter(existsSync)
  .flatMap(dir => runGrep(`find ${dir} -name 'app.js' -print`));
if (artifactMatches.length) {
  failures.push(`Build artifacts named app.js found:\n${artifactMatches.join('\n')}`);
}

if (failures.length) {
  console.error('app.js guard failed:');
  failures.forEach(block => console.error(`\n${block}`));
  process.exit(1);
}

console.log('No app.js files or references detected.');
