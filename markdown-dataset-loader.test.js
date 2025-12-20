const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { loadMovementDataset, exportMovementRepoZip } = require('./markdown-dataset-loader');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('Running markdown dataset loader tests...');
  const fixtureRoot = path.join(__dirname, 'test-fixtures/markdown-repo');
  const result = await loadMovementDataset({
    source: 'local',
    repoPath: fixtureRoot
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

  const zipResult = await exportMovementRepoZip({
    source: 'local',
    repoPath: fixtureRoot
  });

  assert(zipResult.fileName.endsWith('.zip'), 'Export should propose a zip filename');
  assert(Buffer.isBuffer(zipResult.archive), 'Exported archive should be a buffer in Node');

  const zip = await JSZip.loadAsync(zipResult.archive);
  const expectedPaths = [
    'data/movements/mov-fixture.md',
    'data/rules/rul-attend.md',
    'data/textCollections/col-shelf.md',
    'data/practices/prc-reflection.md',
    'data/entities/ent-guide.md',
    'data/entities/ent-place.md',
    'data/media/med-guide.md',
    'data/notes/not-guide.md',
    'data/claims/clm-purpose.md',
    'data/texts/txt-verse.md',
    'data/texts/txt-chapter.md',
    'data/texts/txt-root.md',
    'data/events/evt-weekly.md'
  ];

  const zipFiles = Object.keys(zip.files).filter(name => !zip.files[name].dir);
  assert(zipFiles.length === expectedPaths.length, 'Zip should include all markdown files');
  expectedPaths.forEach(p => assert(zip.file(p), `Zip should include ${p}`));

  const zippedMovement = await zip.file('data/movements/mov-fixture.md').async('string');
  const originalMovement = fs.readFileSync(path.join(fixtureRoot, 'data/movements/mov-fixture.md'), 'utf8');
  assert(zippedMovement === originalMovement, 'Zipped file content should match source file');

  console.log('All markdown dataset loader tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
