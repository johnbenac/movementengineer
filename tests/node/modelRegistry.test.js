const { listCollections } = require('../../src/core/modelRegistry');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

const requiredCollections = [
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

const first = listCollections('2.3');
assert(Array.isArray(first), 'listCollections should return an array');
assert(first.length > 0, 'listCollections should return a non-empty array');
first.forEach(name => {
  assert(typeof name === 'string', 'collection names should be strings');
});

requiredCollections.forEach(name => {
  assert(first.includes(name), `listCollections should include ${name}`);
});

const second = listCollections('2.3');
assert(first !== second, 'listCollections should return a new array');
assert(
  JSON.stringify(first) === JSON.stringify(second),
  'listCollections should return a stable order'
);
