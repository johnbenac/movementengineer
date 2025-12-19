/* storage.js
 *
 * Data persistence utilities for Movement Engineer.
 * Handles localStorage plumbing and snapshot structure.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';
  const DEFAULT_VERSION = '3.6';

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
    const base = { version: DEFAULT_VERSION };
    COLLECTION_NAMES.forEach(name => {
      base[name] = [];
    });
    return base;
  }

  function getDefaultSnapshot() {
    return createEmptySnapshot();
  }

  function normaliseTextContentFields(obj) {
    if (!Array.isArray(obj.texts)) return;
    obj.texts = obj.texts.map(text => {
      if (!text || typeof text !== 'object') return text;
      const normalised = { ...text };
      if (normalised.content == null && normalised.body != null) {
        normalised.content = normalised.body;
      }
      if (normalised.contentPath == null && normalised.bodyPath != null) {
        normalised.contentPath = normalised.bodyPath;
      }
      delete normalised.body;
      delete normalised.bodyPath;
      return normalised;
    });
  }

  function ensureAllCollections(data) {
    const obj = data || {};
    delete obj.relations;
    if (!obj.version) obj.version = DEFAULT_VERSION;
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    normaliseTextContentFields(obj);
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
