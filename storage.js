/* storage.js
 *
 * Data persistence utilities for Movement Engineer.
 * Handles localStorage plumbing and snapshot structure.
 */

(function (rootFactory) {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
          ? global
          : {};

  const StorageService = rootFactory(globalScope);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
  }
  if (globalScope) {
    globalScope.StorageService = StorageService;
  }
})(function (globalScope) {
  'use strict';

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';

  const inMemoryStore = (() => {
    let store = {};
    return {
      getItem: key => store[key] || null,
      setItem: (key, value) => {
        store[key] = String(value);
      },
      removeItem: key => {
        delete store[key];
      }
    };
  })();

  const localStore =
    globalScope && globalScope.localStorage ? globalScope.localStorage : inMemoryStore;

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

  const COLLECTIONS_WITH_MOVEMENT_ID = new Set([
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
  ]);

  function createEmptySnapshot() {
    const base = { version: '3.4' };
    COLLECTION_NAMES.forEach(name => {
      base[name] = [];
    });
    return base;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getBundledSample() {
    if (globalScope && globalScope.movementData) {
      return globalScope.movementData;
    }
    if (typeof module !== 'undefined') {
      try {
        // eslint-disable-next-line global-require
        return require('./movement-data');
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function getDefaultSnapshot() {
    const sample = getBundledSample();
    if (sample) return ensureAllCollections(clone(sample));
    return createEmptySnapshot();
  }

  function ensureAllCollections(data) {
    const obj = data || {};
    if (!obj.version) obj.version = '3.4';
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    return obj;
  }

  function loadSnapshot() {
    try {
      const raw = localStore.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = getDefaultSnapshot();
        saveSnapshot(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw);
      return ensureAllCollections(parsed);
    } catch (e) {
      console.warn('Failed to load snapshot from localStorage, using empty:', e);
      return getDefaultSnapshot();
    }
  }

  function saveSnapshot(snapshot) {
    try {
      localStore.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.error('Failed to save snapshot:', e);
      throw e;
    }
  }

  return {
    STORAGE_KEY,
    COLLECTION_NAMES,
    COLLECTIONS_WITH_MOVEMENT_ID,
    createEmptySnapshot,
    getDefaultSnapshot,
    ensureAllCollections,
    loadSnapshot,
    saveSnapshot
  };
});
