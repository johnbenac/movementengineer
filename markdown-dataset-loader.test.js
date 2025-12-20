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

  const multiRepoPath = path.join(__dirname, 'test-fixtures/multi-movement-repo');
  const multi = await loadMovementDataset({
    source: 'local',
    repoPath: multiRepoPath
  });

  const snapshotLike = {
    ...multi.data,
    version: multi.specVersion,
    specVersion: multi.specVersion,
    __repoFileIndex: multi.fileIndex,
    __repoRawMarkdownByPath: multi.rawMarkdownByPath,
    __repoBaselineByMovement: multi.baselineByMovement,
    __repoSource: { source: 'local', repoPath: multiRepoPath }
  };

  const scopedExport = await exportMovementToZip(snapshotLike, 'mov-catholic');
  const scopedZip = await JSZip.loadAsync(scopedExport.archive);
  const scopedFiles = Object.keys(scopedZip.files).filter(name => !scopedZip.files[name].dir);
  assert(
    scopedFiles.includes('movements/catholic/movement.md'),
    'Scoped export should include movement file'
  );
  assert(
    scopedFiles.includes('movements/catholic/entities/ent-guide.md'),
    'Scoped export should include the movement entity'
  );
  assert(
    scopedFiles.includes('movements/catholic/texts/txt-root.md'),
    'Scoped export should include the movement text'
  );
  assert(
    !scopedFiles.some(f => f.startsWith('movements/upside/')),
    'Scoped export should exclude other movements'
  );
  assert(!scopedFiles.includes('app.js'), 'Scoped export should exclude app code');
  assert(!scopedFiles.some(f => f.startsWith('docs/')), 'Scoped export should exclude docs');

  const catholicPaths = [
    'movements/catholic/movement.md',
    'movements/catholic/entities/ent-guide.md',
    'movements/catholic/texts/txt-root.md'
  ];

  for (const pathName of catholicPaths) {
    const exported = await scopedZip.file(pathName).async('string');
    const original = multi.rawMarkdownByPath[pathName];
    assert(
      exported === original,
      `Round-trip export should preserve original bytes for ${pathName}`
    );
  }

  const mutatedSnapshot = JSON.parse(JSON.stringify(snapshotLike));
  const entity = mutatedSnapshot.entities.find(e => e.id === 'ent-guide');
  entity.name = 'Updated Catholic Guide';
  const mutatedExport = await exportMovementToZip(mutatedSnapshot, 'mov-catholic');
  const mutatedZip = await JSZip.loadAsync(mutatedExport.archive);
  const mutatedEntity = await mutatedZip
    .file('movements/catholic/entities/ent-guide.md')
    .async('string');
  assert(
    mutatedEntity !== multi.rawMarkdownByPath['movements/catholic/entities/ent-guide.md'],
    'Edited entity should change exported markdown'
  );

  for (const pathName of catholicPaths.filter(p => p !== 'movements/catholic/entities/ent-guide.md')) {
    const exported = await mutatedZip.file(pathName).async('string');
    const original = multi.rawMarkdownByPath[pathName];
    assert(
      exported === original,
      `Unchanged files should remain byte-identical for ${pathName}`
    );
  }

  console.log('All markdown dataset loader tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
