const { listCollections } = require('../../src/core/modelRegistry');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testModelRegistryCollections() {
  const first = listCollections('2.3');
  assert(Array.isArray(first), 'listCollections should return an array');
  assert(first.length > 0, 'listCollections should return at least one collection');
  assert(first.every(item => typeof item === 'string'), 'Collections should be strings');

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

  const second = listCollections('2.3');
  assert(
    first.join('|') === second.join('|'),
    'listCollections should return collections in a stable order'
  );
}

testModelRegistryCollections();
console.log('modelRegistry tests passed');
