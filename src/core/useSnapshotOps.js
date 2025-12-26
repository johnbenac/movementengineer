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
    const baseSnapshot = ctx?.store?.getState?.()?.snapshot || snapshot;
    const nextSnapshot = ctx?.persistence?.cloneSnapshot?.() || baseSnapshot;
    const current = ensureArray(nextSnapshot[collectionName]);
    const recordId = record.id;
    const index = current.findIndex(item => item?.id === recordId);
    const nextCollection =
      index >= 0
        ? current.map((item, idx) => (idx === index ? { ...item, ...record } : item))
        : current.concat({ ...record });
    const scope = collectionName === 'movements' ? 'movement' : 'item';
    ctx?.persistence?.commitSnapshot?.(
      {
        ...nextSnapshot,
        [collectionName]: nextCollection
      },
      { dirtyScope: scope }
    );
  }

  function deleteRecord(collectionName, id) {
    if (!collectionName || !id) return;
    const baseSnapshot = ctx?.store?.getState?.()?.snapshot || snapshot;
    const nextSnapshot = ctx?.persistence?.cloneSnapshot?.() || baseSnapshot;
    const current = ensureArray(nextSnapshot[collectionName]);
    const nextCollection = current.filter(item => item?.id !== id);
    const scope = collectionName === 'movements' ? 'movement' : 'item';
    ctx?.persistence?.commitSnapshot?.(
      {
        ...nextSnapshot,
        [collectionName]: nextCollection
      },
      { dirtyScope: scope }
    );
  }

  return {
    snapshot,
    upsertRecord,
    deleteRecord
  };
}
