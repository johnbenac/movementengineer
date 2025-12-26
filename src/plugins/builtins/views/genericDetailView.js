import { useSnapshotOps } from '../../../core/useSnapshotOps.js';
import { getModelForSnapshot } from '../../../app/ui/schemaDoc.js';
import { RecordDetail } from '../../../ui/genericCrud/RecordDetail.js';
import { getCollectionSnapshotKey } from '../../../ui/genericCrud/genericCrudHelpers.js';

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

export function GenericDetailView({
  modelRegistry,
  plugins,
  collectionName,
  collectionDef,
  snapshot,
  nodeIndex,
  selectedId,
  setSelectedId,
  openEditor
}) {
  const wrapper = document.createElement('div');
  const { deleteRecord } = useSnapshotOps();
  const model = getModelForSnapshot(snapshot);

  const snapshotKey = collectionDef ? getCollectionSnapshotKey(collectionDef, model) : collectionName;
  const records = normalizeRecords(snapshot?.[snapshotKey]);
  const record = records.find(item => item?.id === selectedId) || null;

  if (!record) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = 'No records yet';
    wrapper.appendChild(placeholder);
    return wrapper;
  }

  wrapper.appendChild(
    RecordDetail({
      record,
      collectionDef,
      model,
      snapshot,
      nodeIndex,
      onEdit: () => openEditor({ mode: 'edit', id: record.id }),
      onDelete: () => {
        const ok = window.confirm('Delete this record?');
        if (!ok) return;
        deleteRecord(snapshotKey, record.id);
        setSelectedId(null);
      }
    })
  );

  return wrapper;
}
