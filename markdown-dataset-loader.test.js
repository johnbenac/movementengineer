const fs = require('fs/promises');
const path = require('path');
const JSZip = require('jszip');
const { loadMovementDataset, exportRepoToZip, exportMovementToZip } = require('./markdown-dataset-loader');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('Running markdown dataset loader tests...');
  const repoPath = path.join(__dirname, 'test-fixtures/markdown-repo');
  const multiRepoPath = path.join(__dirname, 'test-fixtures/multi-movement-repo');
  const result = await loadMovementDataset({
    source: 'local',
    repoPath
  });

  assert(result.specVersion === '2.3', 'Spec version should be 2.3');
  assert(result.data, 'Result should contain data');

  const { data } = result;
  assert(Array.isArray(data.movements) && data.movements.length === 1, 'Should compile one movement');
  const movement = data.movements[0];
  assert(movement.movementId === movement.id, 'Movement should mirror movementId');
  assert(movement.summary.includes('fixture movement'), 'Movement summary should come from body');

  const note = data.notes[0];
  assert(note.targetType === 'Entity', 'Note targetType should be canonicalised');

  const textOrder = data.texts.map(t => t.id);
  assert(
    textOrder[0] === 'txt-chapter' && textOrder[1] === 'txt-root' && textOrder[2] === 'txt-verse',
    'Texts should be sorted by order then id'
  );

  const movementIds = new Set(Object.values(data).flatMap(coll => Array.isArray(coll) ? coll.map(item => item.movementId || null) : []));
  assert(movementIds.has('mov-fixture'), 'All records should carry movementId');

  const zipResult = await exportRepoToZip({
    source: 'local',
    repoPath
  });
  assert(zipResult.fileCount > 0, 'Zip export should include files');
  const zip = await JSZip.loadAsync(zipResult.archive);
  const zipFiles = Object.keys(zip.files).filter(name => !zip.files[name].dir);
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

  const compiledMulti = await loadMovementDataset({
    source: 'local',
    repoPath: multiRepoPath
  });

  const snapshotFromCompiled = (compiled, source) => ({
    ...compiled.data,
    version: compiled.specVersion,
    specVersion: compiled.specVersion,
    __repoInfo: compiled.repoInfo || null,
    __repoSource: source,
    __repoFileIndex: compiled.fileIndex || {},
    __repoRawMarkdownByPath: compiled.rawMarkdownByPath || {},
    __repoBaselineByMovement: compiled.baselineByMovement || {}
  });

  const multiSnapshot = snapshotFromCompiled(compiledMulti, {
    source: 'local',
    repoPath: multiRepoPath
  });

  const movementExport = await exportMovementToZip(multiSnapshot, 'mov-catholic');
  const movementZip = await JSZip.loadAsync(movementExport.archive);
  const movementFiles = Object.keys(movementZip.files).filter(name => !movementZip.files[name].dir);

  assert(
    movementFiles.includes('movements/catholic/movement.md'),
    'Movement export should include selected movement file'
  );
  assert(
    movementFiles.includes('movements/catholic/entities/ent-guide.md'),
    'Movement export should include entity file'
  );
  assert(
    movementFiles.includes('movements/catholic/practices/prc-service.md'),
    'Movement export should include practice file'
  );
  assert(
    movementFiles.includes('movements/catholic/notes/not-guide.md'),
    'Movement export should include note file'
  );
  assert(
    !movementFiles.includes('app.js'),
    'Movement export should not include non-movement files'
  );
  assert(
    !movementFiles.includes('movements/upside/movement.md'),
    'Movement export should not include other movement files'
  );

  for (const filePath of movementFiles) {
    const archived = await movementZip.file(filePath).async('string');
    const original = await fs.readFile(path.join(multiRepoPath, filePath), 'utf8');
    assert(
      archived === original,
      `Exported movement file ${filePath} should match original content`
    );
  }

  const editedSnapshot = JSON.parse(JSON.stringify(multiSnapshot));
  const guide = editedSnapshot.entities.find(e => e.id === 'ent-guide');
  guide.name = 'Updated Guide';

  const editedExport = await exportMovementToZip(editedSnapshot, 'mov-catholic');
  const editedZip = await JSZip.loadAsync(editedExport.archive);

  const changedEntity = await editedZip.file('movements/catholic/entities/ent-guide.md').async('string');
  const originalEntity = await fs.readFile(
    path.join(multiRepoPath, 'movements/catholic/entities/ent-guide.md'),
    'utf8'
  );
  assert(changedEntity !== originalEntity, 'Changed entity should differ in export');

  const unchangedMovement = await editedZip.file('movements/catholic/movement.md').async('string');
  const originalMovementUnchanged = await fs.readFile(
    path.join(multiRepoPath, 'movements/catholic/movement.md'),
    'utf8'
  );
  assert(
    unchangedMovement === originalMovementUnchanged,
    'Unchanged movement file should remain identical'
  );

  console.log('All markdown dataset loader tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
