import { ensureFlags } from './store.js';

const DEFAULT_SHOW = true;

function normalizeScope(scope) {
  if (scope === 'snapshot') return 'all';
  return scope;
}

function deriveClearDefaults(scope) {
  const normalized = normalizeScope(scope);
  if (normalized === 'item') {
    return { clearItemDirty: true, clearMovementDirty: false };
  }
  if (normalized === 'movement') {
    return { clearItemDirty: false, clearMovementDirty: true };
  }
  if (normalized === 'all') {
    return { clearItemDirty: true, clearMovementDirty: true };
  }
  return { clearItemDirty: false, clearMovementDirty: false };
}

function deepCloneSnapshot(snapshot) {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot || {}));
}

export function createPersistenceFacade({
  getState,
  setState,
  getSnapshot,
  setSnapshot,
  persistSnapshot,
  ensureAllCollections,
  setStatus,
  defaultShow = DEFAULT_SHOW
} = {}) {
  if (typeof getSnapshot !== 'function') {
    throw new Error('createPersistenceFacade: getSnapshot is required');
  }
  if (typeof setSnapshot !== 'function') {
    throw new Error('createPersistenceFacade: setSnapshot is required');
  }
  if (typeof setState !== 'function' || typeof getState !== 'function') {
    throw new Error('createPersistenceFacade: getState/setState are required');
  }

  function updateFlags(updater) {
    setState(prev => {
      const flags = ensureFlags(prev?.flags);
      const nextFlags = updater({ ...flags });
      if (!nextFlags) return prev;
      nextFlags.isDirty =
        nextFlags.snapshotDirty ||
        nextFlags.movementFormDirty ||
        nextFlags.itemEditorDirty;
      return { ...prev, flags: nextFlags };
    });
  }

  function markDirty(scope) {
    const normalized = normalizeScope(scope);
    if (!normalized) return;
    updateFlags(flags => {
      if (normalized === 'item') {
        flags.itemEditorDirty = true;
      } else if (normalized === 'movement') {
        flags.movementFormDirty = true;
      } else if (normalized === 'all') {
        flags.itemEditorDirty = true;
        flags.movementFormDirty = true;
      }
      flags.snapshotDirty = flags.itemEditorDirty || flags.movementFormDirty;
      return flags;
    });
  }

  async function save({
    show = defaultShow,
    clearItemDirty = false,
    clearMovementDirty = false
  } = {}) {
    if (typeof persistSnapshot !== 'function') {
      throw new Error('Persistence unavailable');
    }
    const snapshot = getSnapshot() || {};
    if (ensureAllCollections) {
      ensureAllCollections(snapshot);
    }
    await Promise.resolve(persistSnapshot(snapshot));
    if (clearItemDirty || clearMovementDirty) {
      updateFlags(flags => {
        if (clearItemDirty) flags.itemEditorDirty = false;
        if (clearMovementDirty) flags.movementFormDirty = false;
        flags.snapshotDirty = flags.itemEditorDirty || flags.movementFormDirty;
        return flags;
      });
    }
    if (show) setStatus?.('Saved ✓');
    return snapshot;
  }

  function cloneSnapshot() {
    const snapshot = getSnapshot() || {};
    const cloned = deepCloneSnapshot(snapshot);
    if (ensureAllCollections) {
      return ensureAllCollections(cloned);
    }
    return cloned;
  }

  async function commitSnapshot(nextSnapshot, { dirtyScope, save: saveOpt } = {}) {
    if (!nextSnapshot) return;
    setSnapshot(nextSnapshot);
    if (dirtyScope) {
      markDirty(dirtyScope);
    }
    if (!saveOpt) return;
    const defaults = deriveClearDefaults(dirtyScope);
    if (saveOpt === true) {
      return save({ ...defaults, show: defaultShow });
    }
    return save({ ...defaults, ...saveOpt, show: saveOpt.show ?? defaultShow });
  }

  return {
    markDirty,
    save,
    cloneSnapshot,
    commitSnapshot
  };
}
