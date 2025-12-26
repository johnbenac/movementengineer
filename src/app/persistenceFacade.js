export function createPersistenceFacade({
  getSnapshot,
  setSnapshot,
  saveSnapshot,
  markDirty,
  ensureAllCollections,
  defaultShow = true
}) {
  if (typeof getSnapshot !== 'function') {
    throw new Error('createPersistenceFacade requires getSnapshot');
  }
  if (typeof setSnapshot !== 'function') {
    throw new Error('createPersistenceFacade requires setSnapshot');
  }
  if (typeof saveSnapshot !== 'function') {
    throw new Error('createPersistenceFacade requires saveSnapshot');
  }
  if (typeof markDirty !== 'function') {
    throw new Error('createPersistenceFacade requires markDirty');
  }

  const normalizeScope = scope => (scope === 'snapshot' ? 'all' : scope);

  function markDirtyFacade(scope) {
    const normalized = normalizeScope(scope);
    if (normalized === 'item') {
      markDirty('item');
      return;
    }
    if (normalized === 'movement') {
      markDirty('movement');
      return;
    }
    if (normalized === 'all') {
      markDirty('movement');
      markDirty('item');
    }
  }

  function cloneSnapshot() {
    const snapshot = getSnapshot() || {};
    let cloned;
    if (typeof structuredClone === 'function') {
      try {
        cloned = structuredClone(snapshot);
      } catch (err) {
        cloned = JSON.parse(JSON.stringify(snapshot));
      }
    } else {
      cloned = JSON.parse(JSON.stringify(snapshot));
    }

    if (ensureAllCollections) {
      return ensureAllCollections(cloned);
    }
    return cloned;
  }

  function save({ show = defaultShow, clearItemDirty = false, clearMovementDirty = false } = {}) {
    return saveSnapshot({ show, clearItemDirty, clearMovementDirty });
  }

  function commitSnapshot(nextSnapshot, { dirtyScope, save: saveOption } = {}) {
    if (!nextSnapshot) return;
    setSnapshot(nextSnapshot);
    if (dirtyScope) {
      markDirtyFacade(dirtyScope);
    }

    if (!saveOption) return;

    const normalized = normalizeScope(dirtyScope);
    const defaults = {
      show: defaultShow,
      clearItemDirty: normalized === 'item' || normalized === 'all',
      clearMovementDirty: normalized === 'movement' || normalized === 'all'
    };

    if (saveOption === true) {
      return save(defaults);
    }

    if (typeof saveOption === 'object') {
      return save({ ...defaults, ...saveOption });
    }
  }

  return {
    markDirty: markDirtyFacade,
    save,
    cloneSnapshot,
    commitSnapshot
  };
}
