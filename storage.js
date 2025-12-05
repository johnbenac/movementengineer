/* storage.js
 *
 * Data persistence utilities for Movement Engineer.
 * Handles localStorage plumbing and snapshot structure.
 */

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
    const base = {};
    COLLECTION_NAMES.forEach(name => {
      base[name] = [];
    });
    return base;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getBundledSample() {
    if (typeof window !== 'undefined' && window.defaultMovementData) {
      return window.defaultMovementData;
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
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    return obj;
  }

  function loadSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.error('Failed to save snapshot:', e);
      throw e;
    }
  }

  window.StorageService = {
    STORAGE_KEY,
    COLLECTION_NAMES,
    COLLECTIONS_WITH_MOVEMENT_ID,
    createEmptySnapshot,
    getDefaultSnapshot,
    ensureAllCollections,
    loadSnapshot,
    saveSnapshot
  };
})();
