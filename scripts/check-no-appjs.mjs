import { pathToFileURL } from 'node:url';
import { runNoLegacyScriptCheck } from './check-no-legacy.mjs';

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
