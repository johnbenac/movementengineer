/**
 * @typedef {Record<string, any[]>} Snapshot
 */

/**
 * @typedef {{ snapshot: Snapshot, upsertRecord: (collectionName: string, record: any) => void, deleteRecord: (collectionName: string, id: string) => void }} SnapshotOps
 */

function resolveCtx() {
  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  return globalScope?.MovementEngineer?.ctx || null;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function useSnapshotOps() {
  const ctx = resolveCtx();
  const snapshot = ctx?.store?.getState?.()?.snapshot || {};

  function upsertRecord(collectionName, record) {
    if (!collectionName || !record) return;
    const prevSnapshot = ctx?.store?.getState?.()?.snapshot || {};
    const current = ensureArray(prevSnapshot[collectionName]);
    const recordId = record.id;
    const index = current.findIndex(item => item?.id === recordId);
    const nextCollection = index >= 0
      ? current.map((item, idx) => (idx === index ? { ...item, ...record } : item))
      : current.concat({ ...record });
    const nextSnapshot = {
      ...prevSnapshot,
      [collectionName]: nextCollection
    };

    if (ctx?.persistence?.commitSnapshot) {
      ctx.persistence.commitSnapshot(nextSnapshot, {
        dirtyScope: 'all',
        save: { show: false }
      });
      return;
    }

    ctx?.store?.setState?.(prev => ({
      ...prev,
      snapshot: nextSnapshot
    }));
    ctx?.store?.markDirty?.('snapshot');
  }

  function deleteRecord(collectionName, id) {
    if (!collectionName || !id) return;
    const prevSnapshot = ctx?.store?.getState?.()?.snapshot || {};
    const current = ensureArray(prevSnapshot[collectionName]);
    const nextCollection = current.filter(item => item?.id !== id);
    const nextSnapshot = {
      ...prevSnapshot,
      [collectionName]: nextCollection
    };

    if (ctx?.persistence?.commitSnapshot) {
      ctx.persistence.commitSnapshot(nextSnapshot, {
        dirtyScope: 'all',
        save: { show: false }
      });
      return;
    }

    ctx?.store?.setState?.(prev => ({
      ...prev,
      snapshot: nextSnapshot
    }));
    ctx?.store?.markDirty?.('snapshot');
  }

  return {
    snapshot,
    upsertRecord,
    deleteRecord
  };
}
