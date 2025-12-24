export function useSnapshotOps() {
  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  const movementEngineer = globalScope?.MovementEngineer || {};
  const store = movementEngineer.store || movementEngineer.ctx?.store || null;
  const snapshot = store?.getState?.()?.snapshot || {};

  function upsertRecord(collectionName, record) {
    if (!store || !collectionName || !record) return;

    store.update(prev => {
      const prevSnapshot = prev?.snapshot || {};
      const existing = Array.isArray(prevSnapshot[collectionName])
        ? prevSnapshot[collectionName]
        : [];
      const nextRecords = existing.slice();
      const index = nextRecords.findIndex(item => item?.id === record.id);

      if (index >= 0) {
        nextRecords[index] = record;
      } else {
        nextRecords.push(record);
      }

      return {
        ...prev,
        snapshot: {
          ...prevSnapshot,
          [collectionName]: nextRecords
        }
      };
    });

    store.markDirty?.('snapshot');
  }

  function deleteRecord(collectionName, id) {
    if (!store || !collectionName || !id) return;

    store.update(prev => {
      const prevSnapshot = prev?.snapshot || {};
      const existing = Array.isArray(prevSnapshot[collectionName])
        ? prevSnapshot[collectionName]
        : [];
      const nextRecords = existing.filter(item => item?.id !== id);

      return {
        ...prev,
        snapshot: {
          ...prevSnapshot,
          [collectionName]: nextRecords
        }
      };
    });

    store.markDirty?.('snapshot');
  }

  return {
    snapshot,
    upsertRecord,
    deleteRecord
  };
}
