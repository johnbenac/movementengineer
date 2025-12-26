const { listCollections, getCollectionNameByTypeName } = require('../../src/core/modelRegistry');

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

function testGetCollectionNameByTypeName() {
  assert(
    getCollectionNameByTypeName('TextNode', '2.3') === 'texts',
    'TextNode should map to texts collection'
  );
  assert(
    getCollectionNameByTypeName('MediaAsset', '2.3') === 'media',
    'MediaAsset should map to media collection'
  );
  assert(
    getCollectionNameByTypeName('DoesNotExist', '2.3') === null,
    'Unknown typeName should return null'
  );
}

testGetCollectionNameByTypeName();
