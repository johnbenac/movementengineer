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
    try {
      const files = fs
        .readdirSync(movementsDir)
        .filter(file => file.endsWith('-data.js'))
        .map(file => path.join(movementsDir, file));
      return files.map(file => require(file));
    } catch (e) {
      return [];
    }
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
