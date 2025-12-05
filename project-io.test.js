const ProjectIO = require('./project-io');
const StorageService = require('./storage');
const JSZip = require('jszip');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function bufferEquals(a, b) {
  if (!a || !b) return false;
  return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
}

function buildSampleSnapshot() {
  return StorageService.ensureAllCollections({
    version: '3.4',
    movements: [
      {
        id: 'mov-demo',
        name: 'Demo Movement',
        shortName: 'DEMO',
        summary: 'Demo summary',
        notes: null,
        tags: ['demo']
      }
    ],
    textCollections: [
      {
        id: 'txc-1',
        movementId: 'mov-demo',
        name: 'Main',
        description: 'Main canon',
        tags: []
      }
    ],
    texts: [
      {
        id: 'txt-1',
        movementId: 'mov-demo',
        collectionId: 'txc-1',
        parentId: null,
        level: 'work',
        title: 'Doc 1',
        label: 'D1',
        content: 'Hello world',
        mainFunction: 'teaching',
        tags: [],
        mentionsEntityIds: []
      }
    ],
    entities: [
      {
        id: 'ent-1',
        movementId: 'mov-demo',
        name: 'Figure',
        kind: null,
        summary: 'Person of interest',
        notes: null,
        tags: [],
        sourcesOfTruth: [],
        sourceEntityIds: []
      }
    ],
    practices: [],
    events: [],
    rules: [],
    claims: [],
    media: [
      {
        id: 'med-1',
        movementId: 'mov-demo',
        kind: 'image',
        uri: 'assets/images/figure.png',
        title: 'Portrait',
        description: null,
        tags: [],
        linkedEntityIds: ['ent-1'],
        linkedPracticeIds: [],
        linkedEventIds: [],
        linkedTextIds: []
      }
    ],
    notes: [
      {
        id: 'note-1',
        movementId: 'mov-demo',
        targetType: 'entity',
        targetId: 'ent-1',
        author: 'Demo Author',
        body: 'Note body',
        context: null,
        tags: []
      }
    ],
    relations: [
      {
        id: 'rel-1',
        movementId: 'mov-demo',
        fromEntityId: 'ent-1',
        toEntityId: 'ent-1',
        relationType: 'self',
        tags: []
      }
    ]
  });
}

async function testZipRoundTrip() {
  const snapshot = buildSampleSnapshot();
  const assets = {
    'assets/images/figure.png': Buffer.from('png-bytes'),
    'assets/data/summary.csv': Buffer.from('a,b,c\n1,2,3')
  };

  const zipBlob = await ProjectIO.exportProject(snapshot, { format: 'zip', assets });
  const zip = await JSZip.loadAsync(zipBlob);

  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert(manifest.format === 'zip', 'Manifest should describe zip format');
  assert(manifest.collections.movements.count === 1, 'Manifest should track movement count');

  const roundTrip = await ProjectIO.importProject(zipBlob);
  assert(
    JSON.stringify(roundTrip) === JSON.stringify(StorageService.ensureAllCollections(snapshot)),
    'Zip import should recreate the snapshot'
  );

  const assetPaths = ProjectIO.listAssetPaths();
  assert(assetPaths.includes('assets/images/figure.png'), 'Assets should be indexed from zip');
  const restoredAsset = await ProjectIO.getAssetBlob('assets/images/figure.png');
  assert(bufferEquals(restoredAsset, assets['assets/images/figure.png']), 'Asset bytes should survive round trip');
}

async function testJsonRoundTrip() {
  const snapshot = buildSampleSnapshot();
  const jsonBlob = await ProjectIO.exportProject(snapshot, { format: 'json' });
  const jsonText = jsonBlob.toString();
  const parsed = JSON.parse(jsonText);
  assert(parsed.format === 'json', 'JSON export should declare json format');
  assert(parsed.snapshot, 'JSON export should wrap snapshot payload');

  const roundTrip = await ProjectIO.importProject(jsonBlob);
  assert(
    JSON.stringify(roundTrip) === JSON.stringify(StorageService.ensureAllCollections(snapshot)),
    'JSON import should recreate the snapshot'
  );
  assert(ProjectIO.listAssetPaths().length === 0, 'JSON import should not register assets');
}

async function run() {
  await testZipRoundTrip();
  await testJsonRoundTrip();
  console.log('project-io tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
