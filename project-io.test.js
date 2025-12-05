const ProjectIO = require('./project-io');
const StorageService = require('./storage');
const JSZip = require('jszip');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function createSampleSnapshot() {
  return StorageService.ensureAllCollections({
    version: '3.4',
    movements: [
      { id: 'mov-test', name: 'Test Movement', shortName: 'Test', summary: 'Example', tags: [] }
    ],
    entities: [
      { id: 'ent-1', movementId: 'mov-test', name: 'Entity 1', kind: 'person', summary: 'Hi', tags: [] }
    ],
    texts: [
      {
        id: 'txt-1',
        movementId: 'mov-test',
        parentId: null,
        level: 'work',
        title: 'Sample Text',
        label: '1',
        content: '# Title\n\nBody of text.',
        mentionsEntityIds: ['ent-1'],
        tags: []
      }
    ],
    notes: [
      {
        id: 'note-1',
        movementId: 'mov-test',
        targetType: 'Entity',
        targetId: 'ent-1',
        author: 'Tester',
        body: 'A quick note.',
        tags: []
      }
    ],
    media: [
      {
        id: 'med-1',
        movementId: 'mov-test',
        kind: 'audio',
        uri: 'assets/audio/test.mp3',
        title: 'Test audio',
        tags: []
      }
    ]
  });
}

async function testJsonRoundTrip() {
  const snapshot = createSampleSnapshot();
  const blob = ProjectIO.exportSnapshotAsJson(snapshot);
  const asString = typeof blob === 'string' ? blob : blob.toString('utf8');
  const parsed = JSON.parse(asString);

  assert(!parsed.format && !parsed.data, 'Exported JSON should be the bare snapshot');
  assert(deepEqual(parsed, snapshot), 'Exported JSON should match the snapshot shape');

  const imported = await ProjectIO.importProject(blob);
  assert(
    deepEqual(imported, snapshot),
    'JSON export/import should preserve snapshot structure'
  );
}

async function testLegacyWrappedImport() {
  const snapshot = createSampleSnapshot();
  const wrapped = JSON.stringify({
    format: 'json',
    schemaVersion: '3.4',
    data: snapshot
  });

  const imported = await ProjectIO.importProject(wrapped);
  assert(
    deepEqual(imported, snapshot),
    'Importer should accept legacy wrapped JSON projects'
  );
}

async function testZipRoundTrip() {
  const snapshot = createSampleSnapshot();
  const zipBlob = await ProjectIO.exportSnapshotAsZip(snapshot);
  const zip = await JSZip.loadAsync(zipBlob);

  assert(zip.file('manifest.json'), 'Zip should contain manifest.json');
  assert(zip.file('snapshot.json'), 'Zip should contain snapshot.json');
  assert(
    zip.file('collections/texts/bodies/txt-1.md'),
    'Zip should break out text bodies into markdown files'
  );

  const imported = await ProjectIO.importProject(zipBlob);
  assert(
    deepEqual(imported, snapshot),
    'Zip export/import should preserve snapshot structure'
  );
}

async function runTests() {
  console.log('Running project-io tests...');
  await testJsonRoundTrip();
  await testLegacyWrappedImport();
  await testZipRoundTrip();
  console.log('All project-io tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
