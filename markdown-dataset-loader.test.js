const path = require('path');
const { loadMovementDataset } = require('./markdown-dataset-loader');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('Running markdown dataset loader tests...');
  const result = await loadMovementDataset({
    source: 'local',
    repoPath: path.join(__dirname, 'test-fixtures/markdown-repo')
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

  const legacyResult = await loadMovementDataset({
    source: 'local',
    repoPath: path.join(__dirname, 'test-fixtures/markdown-repo-movements-structure')
  });
  assert(legacyResult.data.movements.length === 1, 'Legacy layout should load one movement');
  assert(
    legacyResult.data.entities.length === 1 &&
      legacyResult.data.entities[0].id === 'ent-legacy',
    'Legacy layout should load nested entities'
  );

  // Ensure the legacy GitHub importer shim is exposed when a window object exists.
  const loaderPath = require.resolve('./markdown-dataset-loader');
  delete require.cache[loaderPath];
  const originalWindow = global.window;
  global.window = {};
  require(loaderPath);
  assert(
    window.GitHubRepoImporter &&
      typeof window.GitHubRepoImporter.importMovementRepo === 'function',
    'GitHubRepoImporter should be available on window'
  );
  let shimThrew = false;
  try {
    await window.GitHubRepoImporter.importMovementRepo('');
  } catch (err) {
    shimThrew = true;
    assert(
      /repoUrl is required/.test(err.message),
      'Shim should validate repoUrl before loading'
    );
  } finally {
    global.window = originalWindow;
  }
  assert(shimThrew, 'Shim should reject missing repoUrl');

  console.log('All markdown dataset loader tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
