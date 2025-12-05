const assert = require('assert');
const ProjectIO = require('./project-io');
const StorageService = require('./storage');

function createSampleSnapshot() {
  return StorageService.ensureAllCollections({
    version: 'test',
    movements: [
      { id: 'mov-1', name: 'Test Movement', shortName: 'TM', summary: 'Sample', tags: [] }
    ],
    textCollections: [
      {
        id: 'tc-1',
        movementId: 'mov-1',
        name: 'Main',
        description: 'Primary collection',
        tags: [],
        rootTextIds: ['txt-1']
      }
    ],
    texts: [
      {
        id: 'txt-1',
        movementId: 'mov-1',
        parentId: null,
        level: 'work',
        title: 'Opening',
        label: 'Opening',
        content: 'Hello world content',
        mainFunction: null,
        tags: [],
        mentionsEntityIds: [],
        mentionsPracticeIds: [],
        mentionsEventIds: [],
        mentionsClaimIds: []
      }
    ],
    entities: [
      {
        id: 'ent-1',
        movementId: 'mov-1',
        name: 'Entity',
        kind: 'being',
        summary: 'entity',
        tags: []
      }
    ],
    practices: [],
    events: [],
    rules: [],
    claims: [],
    media: [
      {
        id: 'med-1',
        movementId: 'mov-1',
        kind: 'audio',
        uri: 'assets/audio/chant.mp3',
        title: 'Chant',
        description: 'Sample audio',
        tags: [],
        linkedEntityIds: [],
        linkedPracticeIds: [],
        linkedEventIds: [],
        linkedTextIds: []
      }
    ],
    notes: [
      {
        id: 'note-1',
        movementId: 'mov-1',
        targetType: 'Movement',
        targetId: 'mov-1',
        author: 'system',
        body: 'Note body',
        context: 'designer',
        tags: []
      }
    ],
    relations: []
  });
}

async function testJsonRoundTrip() {
  const snapshot = createSampleSnapshot();
  const exported = ProjectIO.exportSnapshotToJson(snapshot);
  const imported = ProjectIO.importSnapshotFromJsonText(exported);
  assert.deepStrictEqual(imported, snapshot, 'JSON round trip should preserve snapshot');
}

async function testZipRoundTripWithAssets() {
  const snapshot = createSampleSnapshot();
  const assetBlobs = {
    'assets/audio/chant.mp3': Buffer.from('chant-data'),
    'images/icon.png': Buffer.from([1, 2, 3])
  };

  const zipBuffer = await ProjectIO.exportSnapshotToZip(snapshot, { assetBlobs });
  const imported = await ProjectIO.importSnapshotFromZip(zipBuffer);

  assert.strictEqual(imported.texts[0].content, 'Hello world content');
  assert.strictEqual(imported.notes[0].body, 'Note body');
  assert.strictEqual(imported.movements[0].id, 'mov-1');

  const assetPaths = ProjectIO.listImportedAssetPaths().sort();
  assert.deepStrictEqual(assetPaths, ['assets/audio/chant.mp3', 'assets/images/icon.png']);

  const audioBlob = await ProjectIO.getAssetBlob('assets/audio/chant.mp3');
  assert(audioBlob, 'Audio asset should be retrievable after import');
  assert.strictEqual(Buffer.compare(Buffer.from(audioBlob), Buffer.from('chant-data')), 0);
}

async function run() {
  console.log('Running project-io tests...');
  await testJsonRoundTrip();
  await testZipRoundTripWithAssets();
  console.log('All project-io tests passed ✅');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
