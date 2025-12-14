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

  function ensureCollections(snapshot) {
    const normalized = { version: snapshot.version || '3.4' };
    COLLECTION_NAMES.forEach(name => {
      const value = snapshot[name];
      normalized[name] = Array.isArray(value) ? value : [];
    });
    return normalized;
  }

  function mergeSnapshots(snapshots) {
    const merged = { version: '3.4' };
    COLLECTION_NAMES.forEach(name => {
      merged[name] = [];
    });

    snapshots.forEach(snapshot => {
      const normalized = ensureCollections(snapshot || {});
      merged.version = snapshot.version || merged.version;
      COLLECTION_NAMES.forEach(name => {
        merged[name] = merged[name].concat(normalized[name]);
      });
    });

    return merged;
  }

  function loadNodeSnapshots() {
    const path = require('path');
    const fs = require('fs');
    const movementsDir = path.join(__dirname, 'movements');

    function findDatasetFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        return entries.flatMap(entry => {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            return findDatasetFiles(fullPath);
          }
          return entry.isFile() && entry.name.endsWith('-data.js') ? [fullPath] : [];
        });
      } catch (e) {
        return [];
      }
    }

    const files = findDatasetFiles(movementsDir).sort();
    return files.map(file => require(file));
  }

  function loadBrowserSnapshots() {
    if (typeof window === 'undefined') return [];
    return Array.isArray(window.movementDatasets) ? window.movementDatasets : [];
  }

  const snapshots =
    typeof module !== 'undefined' && module.exports
      ? loadNodeSnapshots()
      : loadBrowserSnapshots();

  const movementData = mergeSnapshots(snapshots);

  if (typeof module !== 'undefined') {
    module.exports = movementData;
  }
  if (typeof window !== 'undefined') {
    window.movementData = movementData;
  }
})();
