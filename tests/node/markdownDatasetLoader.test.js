const fs = require('fs/promises');
const path = require('path');
const JSZip = require('jszip');
const {
  loadMovementDataset,
  exportRepoToZip,
  exportMovementToZip,
  buildBaselineByMovement
} = require('../../src/core/markdownDatasetLoader');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function createSnapshotFromCompiled(compiled, sourceConfig = null) {
  return {
    ...compiled.data,
    version: compiled.specVersion,
    specVersion: compiled.specVersion,
    __repoInfo: compiled.repoInfo || null,
    __repoSource: sourceConfig,
    __repoFileIndex: compiled.fileIndex || {},
    __repoRawMarkdownByPath: compiled.rawMarkdownByPath || {},
    __repoBaselineByMovement: buildBaselineByMovement(compiled.data)
  };
}

function listZipFiles(zip) {
  return Object.keys(zip.files).filter(name => !zip.files[name].dir);
}

async function listDirectoryFiles(root, baseRoot = root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await listDirectoryFiles(fullPath, baseRoot);
      files.push(...nested);
    } else {
      const relative = path.relative(baseRoot, fullPath).split(path.sep).join('/');
      files.push(relative);
    }
  }

  return files;
}

async function assertZipMatchesDirectory(zip, basePath) {
  const zipFiles = listZipFiles(zip).sort();
  const repoFiles = (await listDirectoryFiles(basePath)).sort();

  assert(
    zipFiles.length === repoFiles.length,
    `Zip file count ${zipFiles.length} should match repo file count ${repoFiles.length}`
  );
  assert(
    zipFiles.every((file, idx) => file === repoFiles[idx]),
    'Zip file paths should match repository file paths'
  );

  for (const file of repoFiles) {
    const archived = await zip.file(file).async('nodebuffer');
    const original = await fs.readFile(path.join(basePath, file));
    assert(archived.equals(original), `Exported file ${file} should match original bytes`);
  }
}

async function testLoadAndRepoExport() {
  const repoPath = path.join(__dirname, '..', '..', 'test-fixtures/markdown-repo');
  const result = await loadMovementDataset({
    source: 'local',
    repoPath
  });

  assert(result.specVersion === '2.3', 'Spec version should be 2.3');
  assert(result.data, 'Result should contain data');
  assert(result.fileIndex && Object.keys(result.fileIndex).length > 0, 'fileIndex should be populated');
  assert(
    result.rawMarkdownByPath && Object.keys(result.rawMarkdownByPath).length > 0,
    'rawMarkdownByPath should be populated'
  );

  const { data } = result;
  assert(Array.isArray(data.movements) && data.movements.length === 1, 'Should compile one movement');
  const movement = data.movements[0];
  assert(movement.movementId === movement.id, 'Movement should mirror movementId');
  assert(movement.summary.includes('fixture movement'), 'Movement summary should come from body');

  const note = data.notes.find(n => n.id === 'not-guide');
  assert(note && note.targetType === 'Entity', 'Note targetType should be canonicalised');
  const locationNote = data.notes.find(n => n.id === 'not-park');
  assert(locationNote?.targetId === 'loc-park', 'Notes should load universal targets');

  const textOrder = data.texts.map(t => t.id);
  assert(
    textOrder[0] === 'txt-chapter' && textOrder[1] === 'txt-root' && textOrder[2] === 'txt-verse',
    'Texts should be sorted by order then id'
  );

  const movementIds = new Set(
    Object.values(data).flatMap(coll => Array.isArray(coll) ? coll.map(item => item.movementId || null) : [])
  );
  assert(movementIds.has('mov-fixture'), 'All records should carry movementId');

  const zipResult = await exportRepoToZip({
    source: 'local',
    repoPath
  });
  assert(zipResult.fileCount > 0, 'Zip export should include files');
  const zip = await JSZip.loadAsync(zipResult.archive);
  const zipFiles = listZipFiles(zip);
  const movementPath = 'data/movements/mov-fixture.md';
  assert(
    zipFiles.includes(movementPath),
    'Zip archive should contain the movement markdown file'
  );
  const archivedMovement = await zip.file(movementPath).async('string');
  const originalMovement = await fs.readFile(path.join(repoPath, movementPath), 'utf8');
  assert(
    archivedMovement === originalMovement,
    'Exported zip should preserve original file contents'
  );
}

async function testExportRepoMatchesFixture() {
  const repoPath = path.join(__dirname, '..', '..', 'test-fixtures/markdown-repo');
  const zipResult = await exportRepoToZip({
    source: 'local',
    repoPath
  });
  const zip = await JSZip.loadAsync(zipResult.archive);
  await assertZipMatchesDirectory(zip, repoPath);
}

async function testMovementScopedExport() {
  const repoPath = path.join(__dirname, '..', '..', 'test-fixtures/multi-movement-repo');
  const compiled = await loadMovementDataset({
    source: 'local',
    repoPath
  });
  const snapshot = createSnapshotFromCompiled(compiled, { source: 'local', repoPath });
  const movementId = 'mov-catholic';

  const zipResult = await exportMovementToZip(snapshot, movementId, { outputType: 'nodebuffer' });
  const zip = await JSZip.loadAsync(zipResult.archive);
  const zipFiles = listZipFiles(zip);
  const expectedFiles = [
    'movements/catholic/movement.md',
    'movements/catholic/entities/ent-saint.md',
    'movements/catholic/practices/prc-pray.md'
  ];
  expectedFiles.forEach(file => {
    assert(zipFiles.includes(file), `Movement export should include ${file}`);
  });

  const excluded = [
    'docs/readme.md',
    'movements/upside/movement.md',
    'movements/upside/entities/ent-hero.md'
  ];
  excluded.forEach(file => {
    assert(!zipFiles.includes(file), `Movement export should not include ${file}`);
  });

  for (const file of expectedFiles) {
    const archived = await zip.file(file).async('string');
    const original = await fs.readFile(path.join(repoPath, file), 'utf8');
    assert(archived === original, `Exported file ${file} should match original bytes`);
  }

  const mutatedSnapshot = JSON.parse(JSON.stringify(snapshot));
  const targetEntity = mutatedSnapshot.entities.find(e => e.id === 'ent-saint');
  assert(targetEntity, 'Fixture should include ent-saint entity');
  targetEntity.name = 'Updated Saint';

  const changed = await exportMovementToZip(mutatedSnapshot, movementId, { outputType: 'nodebuffer' });
  const changedZip = await JSZip.loadAsync(changed.archive);
  const changedFiles = listZipFiles(changedZip);
  assert(changedFiles.length === expectedFiles.length, 'Movement export should keep file count stable');

  const changedEntity = await changedZip.file('movements/catholic/entities/ent-saint.md').async('string');
  const originalEntity = await fs.readFile(
    path.join(repoPath, 'movements/catholic/entities/ent-saint.md'),
    'utf8'
  );
  assert(changedEntity !== originalEntity, 'Changed entity file should differ after mutation');

  const unchangedFiles = expectedFiles.filter(file => file !== 'movements/catholic/entities/ent-saint.md');
  for (const file of unchangedFiles) {
    const archived = await changedZip.file(file).async('string');
    const original = await fs.readFile(path.join(repoPath, file), 'utf8');
    assert(archived === original, `Unchanged file ${file} should stay byte-identical`);
  }
}

async function runTests() {
  console.log('Running markdown dataset loader tests...');
  await testLoadAndRepoExport();
  await testExportRepoMatchesFixture();
  await testMovementScopedExport();
  console.log('All markdown dataset loader tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
