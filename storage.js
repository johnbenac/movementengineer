(function () {
  'use strict';

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';

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

  function createEmptySnapshot() {
    const base = {};
    COLLECTION_NAMES.forEach(name => {
      base[name] = [];
    });
    return base;
  }

  function ensureAllCollections(data) {
    const obj = data || {};
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    return obj;
  }

  function loadSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptySnapshot();
      const parsed = JSON.parse(raw);
      return ensureAllCollections(parsed);
    } catch (e) {
      console.warn('Failed to load snapshot from localStorage, using empty:', e);
      return createEmptySnapshot();
    }
  }

  function saveSnapshot(snapshot) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      return { ok: true };
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      return { ok: false, error };
    }
  }

  window.StorageService = {
    STORAGE_KEY,
    getCollectionNames: () => [...COLLECTION_NAMES],
    createEmptySnapshot,
    ensureAllCollections,
    loadSnapshot,
    saveSnapshot
  };
})();
