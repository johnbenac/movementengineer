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
    const obj = data || {};
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    return obj;
  }

  function mergeDatasets(datasets) {
    const baseVersion = datasets.find(d => d && d.version)?.version || '3.4';
    const merged = { version: baseVersion };
    COLLECTION_NAMES.forEach(name => {
      merged[name] = [];
    });

    datasets.forEach(ds => {
      if (!ds) return;
      const normalized = ensureAllCollections(ds);
      COLLECTION_NAMES.forEach(name => {
        merged[name].push(...normalized[name]);
      });
    });

    return merged;
  }

  function loadDatasetsFromNode() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = __dirname;
      const files = fs
        .readdirSync(dir)
        .filter(name => name !== 'index.js' && name.endsWith('.js'));
      return files.map(file => require(path.join(dir, file)));
    } catch (e) {
      return [];
    }
  }

  function loadDatasetsFromBrowser() {
    if (typeof window !== 'undefined' && Array.isArray(window.movementDatasets)) {
      return window.movementDatasets;
    }
    return [];
  }

  function loadDatasets() {
    if (typeof module !== 'undefined' && module.exports) {
      return loadDatasetsFromNode();
    }
    return loadDatasetsFromBrowser();
  }

  const datasets = loadDatasets();
  const defaultData = mergeDatasets(datasets);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = defaultData;
    module.exports.loadDatasets = loadDatasets;
    module.exports.mergeDatasets = mergeDatasets;
  }

  if (typeof window !== 'undefined') {
    window.defaultMovementData = defaultData;
  }
})();
