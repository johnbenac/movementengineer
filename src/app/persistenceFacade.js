export function createPersistenceFacade({
  getSnapshot,
  setSnapshot,
  getState,
  setState,
  saveSnapshot,
  ensureAllCollections,
  setStatus,
  defaultShow = true
} = {}) {
  const normalizeScope = scope => (scope === 'snapshot' ? 'all' : scope);

  const updateFlags = updater => {
    if (typeof setState !== 'function') return;
    setState(prev => {
      const existing = prev?.flags || {};
      const flags = {
        ...existing,
        snapshotDirty: !!existing.snapshotDirty,
        movementFormDirty: !!existing.movementFormDirty,
        itemEditorDirty: !!existing.itemEditorDirty
      };
      updater(flags);
      flags.isDirty =
        !!flags.snapshotDirty || !!flags.movementFormDirty || !!flags.itemEditorDirty;
      return { ...prev, flags };
    });
  };

  const markDirty = scope => {
    if (!scope) return;
    const normalized = normalizeScope(scope);
    updateFlags(flags => {
      if (normalized === 'movement') {
        flags.movementFormDirty = true;
        flags.snapshotDirty = true;
        return;
      }
      if (normalized === 'item') {
        flags.itemEditorDirty = true;
        flags.snapshotDirty = true;
        return;
      }
      flags.movementFormDirty = true;
      flags.itemEditorDirty = true;
      flags.snapshotDirty = true;
    });
  };

  const save = async ({
    show = defaultShow,
    clearItemDirty = false,
    clearMovementDirty = false
  } = {}) => {
    if (typeof saveSnapshot !== 'function') {
      throw new Error('Snapshot persistence unavailable');
    }
    const snapshot =
      (typeof getSnapshot === 'function' ? getSnapshot() : getState?.()?.snapshot) || {};
    ensureAllCollections?.(snapshot);
    await Promise.resolve(saveSnapshot(snapshot));
    updateFlags(flags => {
      flags.snapshotDirty = false;
      if (clearItemDirty) flags.itemEditorDirty = false;
      if (clearMovementDirty) flags.movementFormDirty = false;
    });
    if (show) setStatus?.('Saved ✓');
  };

  const cloneSnapshot = () => {
    const snapshot =
      (typeof getSnapshot === 'function' ? getSnapshot() : getState?.()?.snapshot) || {};
    const cloned =
      typeof structuredClone === 'function'
        ? structuredClone(snapshot)
        : JSON.parse(JSON.stringify(snapshot));
    return ensureAllCollections?.(cloned) || cloned;
  };

  const commitSnapshot = async (nextSnapshot, { dirtyScope, save: saveOption } = {}) => {
    if (typeof setSnapshot === 'function') {
      setSnapshot(nextSnapshot);
    } else if (typeof setState === 'function') {
      setState(prev => ({ ...prev, snapshot: nextSnapshot }));
    }

    if (dirtyScope) {
      markDirty(dirtyScope);
    }

    if (saveOption) {
      const normalized = normalizeScope(dirtyScope);
      const defaults =
        normalized === 'movement'
          ? { clearItemDirty: false, clearMovementDirty: true }
          : normalized === 'item'
            ? { clearItemDirty: true, clearMovementDirty: false }
            : { clearItemDirty: true, clearMovementDirty: true };
      const saveOptions =
        saveOption === true
          ? defaults
          : {
              ...defaults,
              ...saveOption
            };
      await save(saveOptions);
    }

    return nextSnapshot;
  };

  return {
    markDirty,
    save,
    cloneSnapshot,
    commitSnapshot
  };
}
