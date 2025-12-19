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
    'notes'
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
    'notes'
  ]);

  function createEmptySnapshot() {
    const base = { version: '3.6' };
    COLLECTION_NAMES.forEach(name => {
      base[name] = [];
    });
    return base;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getDefaultSnapshot() {
    return createEmptySnapshot();
  }

  function ensureAllCollections(data) {
    const obj = data || {};
    delete obj.relations;
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
