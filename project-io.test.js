const assert = (condition, message) => {
  if (!condition) throw new Error(message || 'Assertion failed');
};

const JSZip = require('jszip');
const ProjectIO = require('./project-io');
const StorageService = require('./storage');

function buildSampleSnapshot() {
  return StorageService.ensureAllCollections({
    version: '3.4',
    movements: [{ id: 'mov-sample', name: 'Sample Movement', shortName: 'SM' }],
    entities: [
      {
        id: 'ent-1',
        movementId: 'mov-sample',
        name: 'First entity',
        kind: 'person'
      }
    ],
    media: [
      {
        id: 'med-1',
        movementId: 'mov-sample',
        title: 'Sample audio',
        uri: 'assets/audio/sample.mp3',
        kind: 'audio'
      }
    ],
    notes: [
      {
        id: 'note-1',
        movementId: 'mov-sample',
        text: 'Remember to practice daily.'
      }
    ]
  });
}

async function testJsonRoundTrip() {
  const snapshot = buildSampleSnapshot();
  const blob = await ProjectIO.exportSnapshot(snapshot, { format: 'json' });
  const text = await blob.text();
  const parsed = JSON.parse(text);

  assert(parsed.format === 'json', 'JSON export should mark format json');
  assert(parsed.schemaVersion === '3.4', 'JSON export should preserve schema version');

  const imported = await ProjectIO.importSnapshot(new Blob([text], { type: 'application/json' }));
  assert(imported.movements.length === 1, 'Imported JSON should include movements');
  assert(imported.entities.length === 1, 'Imported JSON should include entities');
  assert(imported.media.length === 1, 'Imported JSON should include media entries');
  assert(imported.notes[0].text.includes('practice'), 'Imported JSON should preserve note text');
}

async function testZipRoundTripWithAssets() {
  const snapshot = buildSampleSnapshot();
  const assetBlob = new Blob(['hello world'], { type: 'text/plain' });
  const zipBlob = await ProjectIO.exportSnapshot(snapshot, {
    format: 'zip',
    assets: { 'assets/data/sample.txt': assetBlob }
  });

  const buffer = Buffer.from(await zipBlob.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert(manifest.format === 'zip', 'Manifest should indicate zip format');
  assert(manifest.collections.movements.count === 1, 'Manifest should count movements');

  const imported = await ProjectIO.importSnapshot(buffer);
  assert(imported.movements[0].id === 'mov-sample', 'Imported zip should preserve movement id');
  assert(imported.entities[0].name === 'First entity', 'Imported zip should preserve entity name');

  const assetFromZip = await ProjectIO.getAssetBlob('assets/data/sample.txt');
  const assetText = await assetFromZip.text();
  assert(assetText === 'hello world', 'Asset blob should be retrievable after import');
}

async function runTests() {
  console.log('Running project-io tests...');
  await testJsonRoundTrip();
  await testZipRoundTripWithAssets();
  console.log('All project-io tests passed ✅');
}

runTests();
