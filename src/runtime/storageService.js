/* storageService.js
 *
 * Data persistence utilities for Movement Engineer.
 * Handles localStorage plumbing and snapshot structure.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';

  const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function getModelRegistry() {
    if (globalScope.ModelRegistry) {
      return globalScope.ModelRegistry;
    }
    if (typeof module !== 'undefined' && module.exports) {
      return require('../core/modelRegistry');
    }
    throw new Error('ModelRegistry is not available.');
  }

  const { DEFAULT_SPEC_VERSION, listCollections } = getModelRegistry();
  const COLLECTION_NAMES = listCollections(DEFAULT_SPEC_VERSION);

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
    const base = { version: DEFAULT_SPEC_VERSION, specVersion: DEFAULT_SPEC_VERSION };
    listCollections(DEFAULT_SPEC_VERSION).forEach(name => {
      base[name] = [];
    });
    base.__repoInfo = null;
    base.__repoSource = null;
    base.__repoFileIndex = {};
    base.__repoRawMarkdownByPath = {};
    base.__repoBaselineByMovement = {};
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
    if (!obj.version) obj.version = DEFAULT_SPEC_VERSION;
    if (!obj.specVersion) obj.specVersion = DEFAULT_SPEC_VERSION;
    if (!('__repoInfo' in obj)) obj.__repoInfo = null;
    if (!('__repoSource' in obj)) obj.__repoSource = null;
    if (!obj.__repoFileIndex) obj.__repoFileIndex = {};
    if (!obj.__repoRawMarkdownByPath) obj.__repoRawMarkdownByPath = {};
    if (!obj.__repoBaselineByMovement) obj.__repoBaselineByMovement = {};
    listCollections(obj.specVersion || DEFAULT_SPEC_VERSION).forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    obj.movements = obj.movements.map(movement => {
      const movementId = movement?.movementId || movement?.id || null;
      return movementId ? { ...movement, movementId } : movement;
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
