import { RecordDetail } from '../../../ui/genericCrud/RecordDetail.tsx';
import { getCollectionSnapshotKey } from '../../../ui/genericCrud/genericCrudHelpers.ts';
import { getModelForSnapshot } from '../../../app/ui/schemaDoc.js';

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

function renderPlaceholder(message) {
  const placeholder = document.createElement('div');
  placeholder.className = 'generic-crud-empty';
  placeholder.textContent = message;
  return placeholder;
}

export function GenericDetailView({
  collectionName,
  collectionDef,
  snapshot,
  selectedId,
  openEditor
}) {
  const model = getModelForSnapshot(snapshot);
  const snapshotKey = getCollectionSnapshotKey(collectionDef, model) || collectionName;
  const records = normalizeRecords(snapshot?.[snapshotKey]);
  const selectedRecord = records.find(record => record?.id === selectedId) || null;

  if (!selectedRecord) {
    return renderPlaceholder('No records yet');
  }

  return RecordDetail({
    record: selectedRecord,
    collectionDef,
    model,
    snapshot,
    onEdit: () => openEditor({ mode: 'edit', id: selectedRecord.id }),
    onDelete: () => openEditor.delete?.(selectedRecord.id)
  });
}
