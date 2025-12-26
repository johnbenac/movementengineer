const DEFAULT_SHOW = true;

const SCOPE_ALIASES = new Map([['snapshot', 'all']]);

function normalizeScope(scope) {
  if (!scope) return null;
  return SCOPE_ALIASES.get(scope) || scope;
}

function cloneSnapshotValue(snapshot, ensureAllCollections) {
  const base = snapshot || {};
  const cloned =
    typeof structuredClone === 'function'
      ? structuredClone(base)
      : JSON.parse(JSON.stringify(base));
  return typeof ensureAllCollections === 'function' ? ensureAllCollections(cloned) : cloned;
}

function clearDefaultsForScope(scope) {
  if (scope === 'movement') {
    return { clearItemDirty: false, clearMovementDirty: true };
  }
  if (scope === 'item') {
    return { clearItemDirty: true, clearMovementDirty: false };
  }
  return { clearItemDirty: true, clearMovementDirty: true };
}

export function createPersistenceFacade({
  getSnapshot,
  setSnapshot,
  saveSnapshot,
  markDirty,
  ensureAllCollections,
  showDefault = DEFAULT_SHOW
} = {}) {
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

  const api = {};

  api.markDirty = scope => {
    const normalized = normalizeScope(scope);
    if (!normalized) return;
    markDirty(normalized);
  };

  api.save = ({
    show = showDefault,
    clearItemDirty = false,
    clearMovementDirty = false
  } = {}) => saveSnapshot({ show, clearItemDirty, clearMovementDirty });

  api.cloneSnapshot = () => cloneSnapshotValue(getSnapshot(), ensureAllCollections);

  api.commitSnapshot = (nextSnapshot, { dirtyScope, save } = {}) => {
    if (!dirtyScope) {
      throw new Error('commitSnapshot requires dirtyScope');
    }
    const normalized = normalizeScope(dirtyScope);
    setSnapshot(nextSnapshot);
    api.markDirty(normalized);

    if (!save) return;

    const defaults = clearDefaultsForScope(normalized);
    const baseOptions = { show: showDefault, ...defaults };
    const saveOptions = save === true ? baseOptions : { ...baseOptions, ...(save || {}) };
    return api.save(saveOptions);
  };

  return api;
}
