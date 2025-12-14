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
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return findDatasetFiles(fullPath);
        }
        return entry.isFile() && entry.name.endsWith('-data.js') ? [fullPath] : [];
      });
    }

    const files = findDatasetFiles(movementsDir).sort();

    if (files.length === 0) {
      throw new Error(`No movement dataset files found under: ${movementsDir}`);
    }

    return files.map(file => {
      try {
        const snapshot = require(file);
        if (!snapshot || typeof snapshot !== 'object') {
          throw new Error(`Dataset did not export an object (got ${typeof snapshot})`);
        }
        return snapshot;
      } catch (e) {
        e.message = `Failed to load movement dataset file:\n  ${file}\n\n${e.message}`;
        throw e;
      }
    });
  }

  function loadBrowserSnapshots() {
    if (typeof window === 'undefined') return [];

    if (!Array.isArray(window.movementDatasets)) {
      throw new Error(
        'window.movementDatasets is missing. Did you include movements/manifest.js before movement-data.js?'
      );
    }

    const state = window.__movementDataLoadState;
    if (state && (state.errors?.length || Object.keys(state.pushedBySrc || {}).length === 0)) {
      throw new Error(
        'Movement dataset loading did not complete cleanly. Check the fatal banner / console.'
      );
    }

    return window.movementDatasets;
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
