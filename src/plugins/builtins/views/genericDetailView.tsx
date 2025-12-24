import { RecordDetail } from '../../../ui/genericCrud/RecordDetail.tsx';
import { useSnapshotOps } from '../../../core/useSnapshotOps.ts';

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

export function GenericDetailView({
  collectionName,
  collectionDef,
  modelRegistry,
  snapshot,
  selectedId,
  setSelectedId,
  openEditor
}) {
  const wrapper = document.createElement('div');
  const { deleteRecord } = useSnapshotOps();
  const records = normalizeRecords(snapshot?.[collectionName]);
  const model =
    modelRegistry?.getModel?.(snapshot?.specVersion || modelRegistry?.DEFAULT_SPEC_VERSION) || null;
  const selectedRecord = records.find(record => record?.id === selectedId) || null;

  if (!selectedRecord) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = records.length ? 'Select a record' : 'No records yet';
    wrapper.appendChild(placeholder);
    return wrapper;
  }

  wrapper.appendChild(
    RecordDetail({
      record: selectedRecord,
      collectionDef,
      model,
      snapshot,
      onEdit: () => openEditor({ mode: 'edit', id: selectedRecord.id }),
      onDelete: () => {
        const ok = window.confirm('Delete this record?');
        if (!ok) return;
        deleteRecord(collectionName, selectedRecord.id);
        setSelectedId(null);
      }
    })
  );

  return wrapper;
}
