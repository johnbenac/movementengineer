const { listCollections } = require('../../src/core/modelRegistry');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testModelRegistryCollections() {
  const first = listCollections('2.3');
  const second = listCollections('2.3');

  assert(Array.isArray(first), 'listCollections should return an array');
  assert(first.length > 0, 'listCollections should return a non-empty array');
  assert(first.every(name => typeof name === 'string'), 'listCollections should return strings');

  const required = [
    'movements',
    'texts',
    'entities',
    'practices',
    'events',
    'rules',
    'claims',
    'media',
    'notes',
    'textCollections'
  ];
  required.forEach(name => {
    assert(first.includes(name), `listCollections should include ${name}`);
  });

  assert(
    first.length === second.length && first.every((name, idx) => name === second[idx]),
    'listCollections should return a stable order'
  );
}

async function run() {
  testModelRegistryCollections();
  console.log('modelRegistry tests passed');
}

run().catch(err => {
  console.error('modelRegistry tests failed');
  console.error(err);
  process.exit(1);
});
