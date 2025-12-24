const { listCollections, getModel } = require('../../src/core/modelRegistry');

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

function testExportSchemas() {
  const model = getModel('2.3');
  const expected = {
    movements: {
      collectionName: 'movements',
      frontMatterFields: ['id', 'movementId', 'name', 'shortName', 'tags', 'status', 'order'],
      bodyField: 'summary'
    },
    texts: {
      collectionName: 'texts',
      frontMatterFields: [
        'id',
        'movementId',
        'title',
        'label',
        'parentId',
        'mainFunction',
        'tags',
        'mentionsEntityIds',
        'order'
      ],
      bodyField: 'content'
    },
    entities: {
      collectionName: 'entities',
      frontMatterFields: ['id', 'movementId', 'name', 'kind', 'tags', 'sourceEntityIds', 'sourcesOfTruth', 'order'],
      bodyField: 'summary'
    }
  };

  Object.entries(expected).forEach(([collectionName, schema]) => {
    const actual = model.getExportSchema(collectionName);
    assert(
      JSON.stringify(actual) === JSON.stringify(schema),
      `getExportSchema should match expected schema for ${collectionName}`
    );
  });
}

testExportSchemas();
