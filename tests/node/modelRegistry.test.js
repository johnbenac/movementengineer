const { listCollections } = require('../../src/core/modelRegistry');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testListCollections() {
  const collections = listCollections('2.3');
  assert(Array.isArray(collections), 'listCollections should return an array');
  assert(collections.length > 0, 'listCollections should return at least one collection');
  collections.forEach(name => {
    assert(typeof name === 'string', 'collection names should be strings');
  });

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
    assert(collections.includes(name), `listCollections should include ${name}`);
  });

  const again = listCollections('2.3');
  assert(
    collections.length === again.length && collections.every((name, idx) => name === again[idx]),
    'listCollections should return a stable ordering'
  );
}

testListCollections();
