const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getStore() {
  const movementEngineer = globalScope?.MovementEngineer || {};
  return movementEngineer.store || movementEngineer.ctx?.store || null;
}

function updateSnapshot(store, updater) {
  if (!store) return;
  if (typeof store.setState === 'function') {
    store.setState(prev => {
      const nextSnapshot = updater(prev?.snapshot || {});
      return { ...prev, snapshot: nextSnapshot };
    });
  } else if (typeof store.update === 'function') {
    store.update(prev => {
      const nextSnapshot = updater(prev?.snapshot || {});
      return { ...prev, snapshot: nextSnapshot };
    });
  }
  store?.markDirty?.('snapshot');
}

export function useSnapshotOps() {
  const store = getStore();
  const state = store?.getState?.() || {};
  const snapshot = state.snapshot || {};

  function upsertRecord(collectionName, record) {
    if (!collectionName || !record?.id) return;
    updateSnapshot(store, currentSnapshot => {
      const records = Array.isArray(currentSnapshot[collectionName])
        ? currentSnapshot[collectionName]
        : [];
      const index = records.findIndex(item => item?.id === record.id);
      const nextRecords =
        index >= 0
          ? records.map((item, idx) => (idx === index ? { ...item, ...record } : item))
          : [...records, record];
      return { ...currentSnapshot, [collectionName]: nextRecords };
    });
  }

  function deleteRecord(collectionName, id) {
    if (!collectionName || !id) return;
    updateSnapshot(store, currentSnapshot => {
      const records = Array.isArray(currentSnapshot[collectionName])
        ? currentSnapshot[collectionName]
        : [];
      const nextRecords = records.filter(item => item?.id !== id);
      return { ...currentSnapshot, [collectionName]: nextRecords };
    });
  }

  return { snapshot, upsertRecord, deleteRecord };
}
