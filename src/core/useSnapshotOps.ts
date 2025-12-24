const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

export function useSnapshotOps() {
  const ctx = globalScope?.MovementEngineer?.ctx || null;
  if (!ctx?.store?.getState) {
    throw new Error('useSnapshotOps: MovementEngineer ctx.store not available');
  }

  const state = ctx.store.getState() || {};
  const snapshot = state.snapshot || {};

  function upsertRecord(collectionName, record) {
    if (!collectionName || !record?.id) return;

    ctx.store.setState(prev => {
      const prevSnapshot = prev.snapshot || {};
      const prevCollection = Array.isArray(prevSnapshot[collectionName])
        ? prevSnapshot[collectionName]
        : [];
      const index = prevCollection.findIndex(item => item?.id === record.id);
      const nextCollection =
        index >= 0
          ? [...prevCollection.slice(0, index), record, ...prevCollection.slice(index + 1)]
          : [...prevCollection, record];
      const nextSnapshot = { ...prevSnapshot, [collectionName]: nextCollection };
      return { ...prev, snapshot: nextSnapshot };
    });

    ctx.store.markDirty?.('snapshot');
  }

  function deleteRecord(collectionName, id) {
    if (!collectionName || !id) return;

    ctx.store.setState(prev => {
      const prevSnapshot = prev.snapshot || {};
      const prevCollection = Array.isArray(prevSnapshot[collectionName])
        ? prevSnapshot[collectionName]
        : [];
      const nextCollection = prevCollection.filter(item => item?.id !== id);
      const nextSnapshot = { ...prevSnapshot, [collectionName]: nextCollection };
      return { ...prev, snapshot: nextSnapshot };
    });

    ctx.store.markDirty?.('snapshot');
  }

  return {
    snapshot,
    upsertRecord,
    deleteRecord
  };
}
