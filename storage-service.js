/* storage-service.js
 *
 * Local storage handling for Movement Engineer v3 snapshots.
 * Encapsulates serialization and collection normalization separate from the UI.
 */

/* global DataService */

const StorageService = (function (DataService) {
  'use strict';

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';
  const { COLLECTION_NAMES } = DataService;

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
      if (!raw) return { snapshot: createEmptySnapshot() };
      const parsed = JSON.parse(raw);
      return { snapshot: ensureAllCollections(parsed) };
    } catch (error) {
      console.warn('Failed to load snapshot from localStorage, using empty:', error);
      return { snapshot: createEmptySnapshot(), error };
    }
  }

  function saveSnapshot(snapshot) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      return { success: true };
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      return { success: false, error };
    }
  }

  return {
    STORAGE_KEY,
    createEmptySnapshot,
    ensureAllCollections,
    loadSnapshot,
    saveSnapshot
  };
})(DataService);
