(function (global) {
  'use strict';

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';

  function createEmptySnapshot(collectionNames) {
    const base = {};
    (collectionNames || []).forEach(name => {
      base[name] = [];
    });
    return base;
  }

  function ensureAllCollections(data, collectionNames) {
    const obj = data || {};
    (collectionNames || []).forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    return obj;
  }

  function loadSnapshot(collectionNames) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptySnapshot(collectionNames);
      const parsed = JSON.parse(raw);
      return ensureAllCollections(parsed, collectionNames);
    } catch (e) {
      console.warn(
        'Failed to load snapshot from localStorage, using empty:',
        e
      );
      return createEmptySnapshot(collectionNames);
    }
  }

  function saveSnapshot(snapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  function clearSnapshot() {
    localStorage.removeItem(STORAGE_KEY);
  }

  global.SnapshotStorage = {
    STORAGE_KEY,
    createEmptySnapshot,
    ensureAllCollections,
    loadSnapshot,
    saveSnapshot,
    clearSnapshot
  };
})(window);
