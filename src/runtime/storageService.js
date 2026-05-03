/* storageService.js
 *
 * Data persistence utilities for Movement Engineer.
 * Handles localStorage plumbing and snapshot structure.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';

  const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
  const ModelRegistry = globalScope.ModelRegistry;
  if (!ModelRegistry?.listCollections) {
    throw new Error('ModelRegistry is not available. Ensure it is loaded before StorageService.');
  }
  const { DEFAULT_SPEC_VERSION, listCollections } = ModelRegistry;

  const COLLECTION_NAMES = listCollections(DEFAULT_SPEC_VERSION);

  function buildCollectionsWithMovementId(specVersion) {
    const model = ModelRegistry.getModel(specVersion || DEFAULT_SPEC_VERSION);
    const collectionNames = listCollections(specVersion || DEFAULT_SPEC_VERSION);
    const withMovement = new Set();
    collectionNames.forEach(name => {
      const fields = model?.collections?.[name]?.fields || {};
      if (fields.movementId) withMovement.add(name);
    });
    return withMovement;
  }

  const COLLECTIONS_WITH_MOVEMENT_ID = buildCollectionsWithMovementId(DEFAULT_SPEC_VERSION);

  function createEmptySnapshot() {
    return getBundledDefaultSnapshot();
  }

  function getBundledDefaultSnapshot() {
    const bundled = globalScope.MovementEngineerBundledDefaultSnapshot;
    if (bundled && typeof bundled === 'object') {
      return ensureAllCollections(clone(bundled));
    }

    const base = { version: DEFAULT_SPEC_VERSION, specVersion: DEFAULT_SPEC_VERSION };
    base.__repoInfo = null;
    base.__repoSource = null;
    base.__repoFileIndex = {};
    base.__repoRawMarkdownByPath = {};
    base.__repoBaselineByMovement = {};
    const snapshot = ensureAllCollections(base);
    snapshot.movements = [
      {
        id: 'mov-catholic',
        movementId: 'mov-catholic',
        name: 'Roman Catholic Church',
        shortName: 'Catholic',
        summary:
          'The Roman Catholic Church is a worldwide Christian church centered on Jesus Christ, the sacraments, and liturgical life.'
      }
    ];
    return snapshot;
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
    const collectionNames = listCollections(obj.specVersion || DEFAULT_SPEC_VERSION);
    collectionNames.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    obj.movements = obj.movements.map(movement => {
      const movementId = movement?.movementId || movement?.id || null;
      return movementId ? { ...movement, movementId } : movement;
    });
    return obj;
  }

  function isOldBundledPlaceholder(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const hasOnlyCatholicMovement =
      movements.length === 1 &&
      (movements[0]?.id === 'mov-catholic' || movements[0]?.movementId === 'mov-catholic');
    if (!hasOnlyCatholicMovement) return false;

    const hasRepoBaseline = Object.keys(snapshot.__repoBaselineByMovement || {}).length > 0;
    const hasRepoRawMarkdown = Object.keys(snapshot.__repoRawMarkdownByPath || {}).length > 0;
    if (hasRepoBaseline || hasRepoRawMarkdown) return false;

    return COLLECTION_NAMES.every(name => name === 'movements' || !snapshot[name]?.length);
  }

  function isEmptyStoredSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    const hasRepoBaseline = Object.keys(snapshot.__repoBaselineByMovement || {}).length > 0;
    const hasRepoRawMarkdown = Object.keys(snapshot.__repoRawMarkdownByPath || {}).length > 0;
    if (hasRepoBaseline || hasRepoRawMarkdown) return false;

    return COLLECTION_NAMES.every(name => !snapshot[name]?.length);
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
      const snapshot = ensureAllCollections(parsed);
      if (isEmptyStoredSnapshot(snapshot) || isOldBundledPlaceholder(snapshot)) {
        const defaults = getDefaultSnapshot();
        saveSnapshot(defaults);
        return defaults;
      }
      return snapshot;
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
