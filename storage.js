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
    const base = { version: '2.3', specVersion: '2.3' };
    COLLECTION_NAMES.forEach(name => {
      base[name] = [];
    });
    base.__repoInfo = null;
    base.__repoSource = null;
    base.__repoFileIndex = null;
    base.__repoRawMarkdownByPath = null;
    base.__repoBaselineByMovement = null;
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
    if (!obj.version) obj.version = '2.3';
    if (!obj.specVersion) obj.specVersion = '2.3';
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    obj.movements = obj.movements.map(movement => {
      const movementId = movement?.movementId || movement?.id || null;
      return movementId ? { ...movement, movementId } : movement;
    });
    if (!('__repoInfo' in obj)) obj.__repoInfo = null;
    if (!('__repoSource' in obj)) obj.__repoSource = null;
    if (!('__repoFileIndex' in obj)) obj.__repoFileIndex = null;
    if (!('__repoRawMarkdownByPath' in obj)) obj.__repoRawMarkdownByPath = null;
    if (!('__repoBaselineByMovement' in obj)) obj.__repoBaselineByMovement = null;
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
