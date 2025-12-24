import { getModelForSnapshot } from '../../app/ui/schemaDoc.js';
import { useSnapshotOps } from '../../core/useSnapshotOps.ts';
import { CollectionList } from './CollectionList.tsx';
import { RecordList } from './RecordList.tsx';
import { RecordDetail } from './RecordDetail.tsx';
import { RecordEditor } from './RecordEditor.tsx';
import {
  generateId,
  getCollectionSnapshotKey,
  makeDefaultRecord
} from './genericCrudHelpers.ts';

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

function cloneRecord(record) {
  return record ? JSON.parse(JSON.stringify(record)) : {};
}

export function createGenericCrudTab(ctx) {
  const state = {
    selectedCollectionKey: null,
    selectedRecordId: null,
    mode: 'view',
    search: '',
    sortMode: 'title',
    draft: null
  };

  let rerender = () => {};

  function setRerender(fn) {
    rerender = typeof fn === 'function' ? fn : rerender;
  }

  function selectCollection(collectionKey, snapshot, model) {
    state.selectedCollectionKey = collectionKey;
    const collectionDef = model?.collections?.[collectionKey] || null;
    const snapshotKey = getCollectionSnapshotKey(collectionDef, model);
    const records = normalizeRecords(snapshot?.[snapshotKey]);
    state.selectedRecordId = records[0]?.id || null;
    state.mode = 'view';
    state.draft = null;
    rerender();
  }

  function selectRecord(recordId) {
    state.selectedRecordId = recordId || null;
    state.mode = 'view';
    state.draft = null;
    rerender();
  }

  function startCreate(collectionDef) {
    state.mode = 'create';
    state.selectedRecordId = null;
    state.draft = makeDefaultRecord(collectionDef);
    rerender();
  }

  function startEdit(record) {
    state.mode = 'edit';
    state.draft = cloneRecord(record);
    rerender();
  }

  function cancelEdit() {
    state.mode = 'view';
    state.draft = null;
    rerender();
  }

  function ensureValidSelection(records) {
    if (!state.selectedRecordId) return;
    const exists = records.some(record => record?.id === state.selectedRecordId);
    if (!exists) {
      state.selectedRecordId = null;
      state.mode = 'view';
    }
  }

  function renderTab() {
    const container = document.getElementById('generic-crud-root');
    if (!container) return;
    ctx.dom.clearElement(container);

    const { snapshot, upsertRecord, deleteRecord } = useSnapshotOps();
    const model = getModelForSnapshot(snapshot);
    const collectionDef = state.selectedCollectionKey
      ? model?.collections?.[state.selectedCollectionKey]
      : null;
    const snapshotKey = collectionDef ? getCollectionSnapshotKey(collectionDef, model) : null;
    const records = normalizeRecords(snapshot?.[snapshotKey]);
    ensureValidSelection(records);
    const selectedRecord = records.find(record => record?.id === state.selectedRecordId) || null;

    const layout = document.createElement('div');
    layout.className = 'generic-crud-layout';

    const leftPane = document.createElement('div');
    leftPane.className = 'card generic-crud-pane';
    const leftHeader = document.createElement('div');
    leftHeader.className = 'pane-header';
    const leftTitle = document.createElement('h3');
    leftTitle.textContent = 'Collections';
    leftHeader.appendChild(leftTitle);
    leftPane.appendChild(leftHeader);
    if (model) {
      leftPane.appendChild(
        CollectionList({
          model,
          selectedKey: state.selectedCollectionKey,
          onSelect: key => selectCollection(key, snapshot, model)
        })
      );
    }

    const middlePane = document.createElement('div');
    middlePane.className = 'card generic-crud-pane';
    const middleHeader = document.createElement('div');
    middleHeader.className = 'pane-header';
    const middleTitle = document.createElement('h3');
    middleTitle.textContent = 'Records';
    middleHeader.appendChild(middleTitle);
    middlePane.appendChild(middleHeader);

    if (!collectionDef) {
      const placeholder = document.createElement('div');
      placeholder.className = 'generic-crud-empty';
      placeholder.textContent = 'Select a collection';
      middlePane.appendChild(placeholder);
    } else {
      middlePane.appendChild(
        RecordList({
          collectionDef,
          records,
          selectedId: state.selectedRecordId,
          search: state.search,
          sortMode: state.sortMode,
          onSearchChange: value => {
            state.search = value;
            rerender();
          },
          onSortChange: value => {
            state.sortMode = value;
            rerender();
          },
          onSelect: id => selectRecord(id),
          onCreate: () => startCreate(collectionDef),
          emptyMessage: 'No records yet'
        })
      );
    }

    const rightPane = document.createElement('div');
    rightPane.className = 'card generic-crud-pane';
    const rightHeader = document.createElement('div');
    rightHeader.className = 'pane-header';
    const rightTitle = document.createElement('h3');
    rightTitle.textContent = 'Details';
    rightHeader.appendChild(rightTitle);
    rightPane.appendChild(rightHeader);

    if (!collectionDef) {
      const placeholder = document.createElement('div');
      placeholder.className = 'generic-crud-empty';
      placeholder.textContent = 'Select a collection';
      rightPane.appendChild(placeholder);
    } else if (state.mode === 'create') {
      rightPane.appendChild(
        RecordEditor({
          record: state.draft || makeDefaultRecord(collectionDef),
          collectionDef,
          model,
          snapshot,
          mode: 'create',
          onSave: draft => {
            if (!draft.id) draft.id = generateId(collectionDef?.fields?.id || null);
            upsertRecord(snapshotKey, draft);
            state.selectedRecordId = draft.id;
            state.mode = 'view';
            state.draft = null;
            rerender();
          },
          onCancel: () => cancelEdit()
        })
      );
    } else if (state.mode === 'edit') {
      rightPane.appendChild(
        RecordEditor({
          record: state.draft || selectedRecord,
          collectionDef,
          model,
          snapshot,
          mode: 'edit',
          onSave: draft => {
            upsertRecord(snapshotKey, draft);
            state.selectedRecordId = draft.id;
            state.mode = 'view';
            state.draft = null;
            rerender();
          },
          onCancel: () => cancelEdit()
        })
      );
    } else if (selectedRecord) {
      rightPane.appendChild(
        RecordDetail({
          record: selectedRecord,
          collectionDef,
          model,
          snapshot,
          onEdit: () => startEdit(selectedRecord),
          onDelete: () => {
            const ok = window.confirm('Delete this record?');
            if (!ok) return;
            deleteRecord(snapshotKey, selectedRecord.id);
            state.selectedRecordId = null;
            state.mode = 'view';
            rerender();
          }
        })
      );
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'generic-crud-empty';
      placeholder.textContent = 'No records yet';
      rightPane.appendChild(placeholder);
    }

    layout.appendChild(leftPane);
    layout.appendChild(middlePane);
    layout.appendChild(rightPane);
    container.appendChild(layout);
  }

  return {
    render: renderTab,
    setRerender
  };
}
