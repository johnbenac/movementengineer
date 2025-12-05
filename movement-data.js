const COLLECTION_NAMES = [
  'movements',
  'textCollections',
  'texts',
  'entities',
  'practices',
  'events',
  'rules',
  'claims',
  'media',
  'notes',
  'relations'
];

function normaliseDataSet(data = {}) {
  const version = data.version || '1.0';
  const normalised = { version };
  COLLECTION_NAMES.forEach(name => {
    normalised[name] = Array.isArray(data[name]) ? data[name] : [];
  });
  return normalised;
}

function mergeDataSets(datasets) {
  const normalised = datasets.filter(Boolean).map(normaliseDataSet);
  const merged = { version: normalised[0]?.version || '1.0' };

  COLLECTION_NAMES.forEach(name => {
    merged[name] = normalised.reduce((acc, current) => acc.concat(current[name]), []);
  });

  return merged;
}

function getMovementDataSets() {
  if (typeof module !== 'undefined') {
    return [
      require('./movement-data-catholic'),
      require('./movement-data-womens-suffrage')
    ];
  }
  if (typeof window !== 'undefined') {
    return window.movementDataSources || [];
  }
  return [];
}

const aggregatedData = mergeDataSets(getMovementDataSets());

if (typeof module !== 'undefined') {
  module.exports = aggregatedData;
} else if (typeof window !== 'undefined') {
  window.sampleData = aggregatedData;
}
