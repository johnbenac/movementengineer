(function () {
  'use strict';

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

  function ensureAllCollections(data) {
    const base = Object.assign({ version: '3.4' }, data || {});
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(base[name])) base[name] = [];
    });
    return base;
  }

  function mergeDataSets(sources) {
    const normalized = sources.filter(Boolean).map(ensureAllCollections);
    if (normalized.length === 0) {
      return ensureAllCollections({});
    }
    const merged = { version: normalized[0].version || '3.4' };
    COLLECTION_NAMES.forEach(name => {
      merged[name] = [];
    });

    normalized.forEach(entry => {
      merged.version = merged.version || entry.version;
      COLLECTION_NAMES.forEach(name => {
        merged[name] = merged[name].concat(entry[name]);
      });
    });

    return merged;
  }

  function loadModuleData() {
    try {
      // eslint-disable-next-line global-require
      const catholic = require('./catholic-church-data');
      // eslint-disable-next-line global-require
      const suffrage = require('./womens-suffrage-data');
      return mergeDataSets([catholic, suffrage]);
    } catch (err) {
      return ensureAllCollections({});
    }
  }

  let mergedData = null;

  if (typeof module !== 'undefined') {
    mergedData = loadModuleData();
    module.exports = mergedData;
  } else if (typeof window !== 'undefined') {
    const sources = window.movementDataSources || [];
    mergedData = mergeDataSets(sources);
    window.standardData = mergedData;
  }
})();
