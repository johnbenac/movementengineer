import { useSnapshotOps } from '../../../core/useSnapshotOps.ts';
import { RecordDetail } from '../../../ui/genericCrud/RecordDetail.tsx';
import { getCollectionSnapshotKey } from '../../../ui/genericCrud/genericCrudHelpers.ts';

function getRecords(snapshot, collectionDef, modelRegistry) {
  if (!snapshot || !collectionDef) return [];
  const model = modelRegistry?.getModel?.(snapshot?.specVersion) || null;
  const snapshotKey = getCollectionSnapshotKey(collectionDef, model);
  const records = snapshotKey && Array.isArray(snapshot?.[snapshotKey])
    ? snapshot[snapshotKey]
    : [];
  return records;
}

export function GenericDetailView({
  modelRegistry,
  collectionDef,
  collectionName,
  snapshot,
  selectedId,
  setSelectedId,
  openEditor
}) {
  const wrapper = document.createElement('div');
  const records = getRecords(snapshot, collectionDef, modelRegistry);
  const selected = records.find(record => record?.id === selectedId) || null;
  const { deleteRecord } = useSnapshotOps();

  if (!selected) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = records.length ? 'Select a record' : 'No records yet';
    wrapper.appendChild(placeholder);
    return wrapper;
  }

  wrapper.appendChild(
    RecordDetail({
      record: selected,
      collectionDef,
      model: modelRegistry?.getModel?.(snapshot?.specVersion) || null,
      snapshot,
      onEdit: () => {
        setSelectedId?.(selected.id);
        openEditor?.({ mode: 'edit', id: selected.id });
      },
      onDelete: () => {
        const ok = window.confirm('Delete this record?');
        if (!ok) return;
        deleteRecord(collectionName, selected.id);
        setSelectedId?.(null);
      }
    })
  );

  return wrapper;
}
