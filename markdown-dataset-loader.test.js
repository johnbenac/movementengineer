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
  const multiCompiled = await loadMovementDataset({
    source: 'local',
    repoPath: multiRepoPath
  });
  const multiSnapshot = {
    ...multiCompiled.data,
    __repoFileIndex: multiCompiled.fileIndex,
    __repoRawMarkdownByPath: multiCompiled.rawMarkdownByPath,
    __repoBaselineByMovement: multiCompiled.baselineByMovement,
    __repoInfo: multiCompiled.repoInfo || null
  };

  const catholicZip = await exportMovementToZip(multiSnapshot, 'mov-catholic', {
    outputType: 'nodebuffer'
  });
  const catholicArchive = await JSZip.loadAsync(catholicZip.archive);
  const catholicFiles = Object.keys(catholicArchive.files).filter(name => !catholicArchive.files[name].dir);
  assert(
    catholicFiles.includes('movements/catholic/movement.md'),
    'Movement export should include selected movement file'
  );
  assert(
    catholicFiles.includes('movements/catholic/entities/ent-guide.md'),
    'Movement export should include selected movement entities'
  );
  assert(
    catholicFiles.includes('movements/catholic/notes/not-catholic.md'),
    'Movement export should include selected movement notes'
  );
  assert(
    !catholicFiles.some(name => name.startsWith('movements/upside')),
    'Movement export should exclude other movements'
  );
  assert(
    !catholicFiles.includes('app.js') && !catholicFiles.some(name => name.startsWith('docs/')),
    'Movement export should exclude non-movement files'
  );

  for (const file of catholicFiles) {
    const archived = await catholicArchive.file(file).async('string');
    const original = await fs.readFile(path.join(multiRepoPath, file), 'utf8');
    assert(archived === original, `Unchanged file ${file} should be byte-identical`);
  }

  const updatedSnapshot = JSON.parse(JSON.stringify(multiSnapshot));
  const guide = updatedSnapshot.entities.find(e => e.id === 'ent-guide');
  guide.name = 'Updated Guide';
  const catholicZipUpdated = await exportMovementToZip(updatedSnapshot, 'mov-catholic', {
    outputType: 'nodebuffer'
  });
  const updatedArchive = await JSZip.loadAsync(catholicZipUpdated.archive);
  const updatedFiles = Object.keys(updatedArchive.files).filter(name => !updatedArchive.files[name].dir);
  const guidePath = multiSnapshot.__repoFileIndex['entities:ent-guide'];
  const changedGuide = await updatedArchive.file(guidePath).async('string');
  const originalGuide = await fs.readFile(path.join(multiRepoPath, guidePath), 'utf8');
  assert(changedGuide !== originalGuide, 'Changed record should be rewritten in export');
  updatedFiles
    .filter(name => name !== guidePath)
    .forEach(name => {
      assert(
        updatedArchive.file(name),
        'Export should include all other movement files'
      );
    });
  for (const name of updatedFiles) {
    if (name === guidePath) continue;
    const archived = await updatedArchive.file(name).async('string');
    const original = await fs.readFile(path.join(multiRepoPath, name), 'utf8');
    assert(archived === original, `Unchanged file ${name} should remain identical`);
  }

  updatedSnapshot.texts.push({
    id: 'txt-new',
    movementId: 'mov-catholic',
    title: 'New Text',
    content: 'Fresh content for the new text.'
  });
  const catholicZipWithNew = await exportMovementToZip(updatedSnapshot, 'mov-catholic', {
    outputType: 'nodebuffer'
  });
  const archiveWithNew = await JSZip.loadAsync(catholicZipWithNew.archive);
  const newFilePath = 'movements/catholic/texts/txt-new.md';
  assert(archiveWithNew.file(newFilePath), 'New record should use deterministic path under movement');
  const newFileContent = await archiveWithNew.file(newFilePath).async('string');
  assert(
    newFileContent.includes('id: txt-new') && newFileContent.includes('title: New Text'),
    'New record markdown should be rendered with front matter'
  );

  console.log('All markdown dataset loader tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
