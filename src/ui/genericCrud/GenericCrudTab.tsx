import { useSnapshotOps } from '../../core/useSnapshotOps.ts';
import {
  listCollections,
  getCollectionSnapshotKey,
  makeDefaultRecord,
  getRequiredFieldIssues
} from './genericCrudHelpers.ts';
import { createCollectionList } from './CollectionList.tsx';
import { createRecordList } from './RecordList.tsx';
import { createRecordDetail } from './RecordDetail.tsx';
import { createRecordEditor } from './RecordEditor.tsx';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelForSnapshot(snapshot) {
  const registry = globalScope?.ModelRegistry;
  const specVersion = snapshot?.specVersion || registry?.DEFAULT_SPEC_VERSION || '2.3';
  if (registry?.getModel) {
    return registry.getModel(specVersion);
  }
  return globalScope?.DATA_MODEL_V2_3 || null;
}

function getValidator() {
  return globalScope?.ModelValidator || null;
}

function buildCollectionEntries(model) {
  const names = listCollections(model);
  return names
    .map(key => {
      const def = model?.collections?.[key];
      return {
        key,
        label: def?.label || def?.ui?.label || def?.typeName || key,
        def
      };
    })
    .filter(entry => entry.def);
}

export function createGenericCrudTab({ ctx, container }) {
  const root = container;
  root.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = 'Generic CRUD';
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Model-driven editor for any collection.';

  const layout = document.createElement('div');
  layout.className = 'library-layout generic-crud-layout';

  const collectionPane = document.createElement('div');
  collectionPane.className = 'library-pane';
  const recordPane = document.createElement('div');
  recordPane.className = 'library-pane';
  const detailPane = document.createElement('div');
  detailPane.className = 'library-pane';

  layout.appendChild(collectionPane);
  layout.appendChild(recordPane);
  layout.appendChild(detailPane);

  root.appendChild(heading);
  root.appendChild(hint);
  root.appendChild(layout);

  const collectionHeader = document.createElement('div');
  collectionHeader.className = 'pane-header';
  const collectionTitle = document.createElement('div');
  collectionTitle.textContent = 'Collections';
  collectionHeader.appendChild(collectionTitle);
  collectionPane.appendChild(collectionHeader);

  const collectionList = createCollectionList(collectionPane);
  const recordList = createRecordList(recordPane);

  const detailContainer = document.createElement('div');
  const editorContainer = document.createElement('div');
  detailPane.appendChild(detailContainer);
  detailPane.appendChild(editorContainer);

  const recordDetail = createRecordDetail(detailContainer);
  const recordEditor = createRecordEditor(editorContainer);

  const state = {
    selectedCollectionKey: null,
    selectedRecordId: null,
    mode: 'view',
    draft: null
  };

  function selectCollection(key, snapshot, model) {
    state.selectedCollectionKey = key;
    state.mode = 'view';
    const collectionDef = model?.collections?.[key];
    const collectionKey = getCollectionSnapshotKey(collectionDef, model);
    const records = Array.isArray(snapshot?.[collectionKey]) ? snapshot[collectionKey] : [];
    state.selectedRecordId = records.length ? records[0]?.id || null : null;
  }

  function selectRecord(id) {
    state.selectedRecordId = id;
    state.mode = 'view';
  }

  function startCreate(collectionDef) {
    state.mode = 'create';
    state.selectedRecordId = null;
    state.draft = makeDefaultRecord(collectionDef);
  }

  function startEdit(record) {
    state.mode = 'edit';
    state.draft = { ...record };
  }

  function clearSelection() {
    state.selectedRecordId = null;
    state.mode = 'view';
    state.draft = null;
  }

  function validateRecord(model, record, collectionDef) {
    const validator = getValidator();
    if (!validator?.validateRecord) return [];
    return validator.validateRecord(record, collectionDef, { model }) || [];
  }

  function render(ctx) {
    const { snapshot, upsertRecord, deleteRecord } = useSnapshotOps();
    const model = getModelForSnapshot(snapshot);
    if (!model) return;

    const collections = buildCollectionEntries(model);

    if (state.selectedCollectionKey && !model.collections?.[state.selectedCollectionKey]) {
      state.selectedCollectionKey = null;
      state.selectedRecordId = null;
      state.mode = 'view';
    }

    collectionList.render({
      collections,
      selectedKey: state.selectedCollectionKey,
      onSelect: key => {
        selectCollection(key, snapshot, model);
        render(ctx);
      }
    });

    const currentCollectionDef = state.selectedCollectionKey
      ? model.collections[state.selectedCollectionKey]
      : null;
    const snapshotKey = getCollectionSnapshotKey(currentCollectionDef, model);
    const records = snapshotKey && Array.isArray(snapshot?.[snapshotKey])
      ? snapshot[snapshotKey]
      : [];

    if (state.selectedRecordId) {
      const stillExists = records.some(record => record?.id === state.selectedRecordId);
      if (!stillExists) {
        clearSelection();
      }
    }

    recordList.render({
      collectionKey: state.selectedCollectionKey,
      collectionDef: currentCollectionDef,
      records,
      selectedId: state.selectedRecordId,
      snapshot,
      model,
      onSelect: id => {
        selectRecord(id);
        render(ctx);
      },
      onNew: () => {
        if (!currentCollectionDef) return;
        startCreate(currentCollectionDef);
        render(ctx);
      }
    });

    const currentRecord = state.selectedRecordId
      ? records.find(record => record?.id === state.selectedRecordId)
      : null;

    if (state.mode === 'edit' || state.mode === 'create') {
      detailContainer.style.display = 'none';
      editorContainer.style.display = 'block';
      const draft = state.draft || currentRecord || {};
      recordEditor.render({
        collectionDef: currentCollectionDef,
        record: draft,
        model,
        snapshot,
        mode: state.mode,
        validateRecord: (record, def) => validateRecord(model, record, def),
        onSave: (nextDraft, errors) => {
          const validationErrors = [
            ...validateRecord(model, nextDraft, currentCollectionDef),
            ...getRequiredFieldIssues(nextDraft, currentCollectionDef)
          ];
          if (validationErrors.length) {
            recordEditor.setErrors(validationErrors);
            return;
          }
          if (!currentCollectionDef) return;
          if (!nextDraft?.id) return;
          upsertRecord(snapshotKey, nextDraft);
          state.selectedRecordId = nextDraft.id;
          state.mode = 'view';
          state.draft = null;
          render(ctx);
        },
        onCancel: () => {
          state.mode = 'view';
          state.draft = null;
          render(ctx);
        },
        onDraftChange: nextDraft => {
          state.draft = nextDraft;
        }
      });
      return;
    }

    detailContainer.style.display = 'block';
    editorContainer.style.display = 'none';
    recordDetail.render({
      collectionDef: currentCollectionDef,
      record: currentRecord,
      model,
      snapshot,
      onEdit: () => {
        if (!currentRecord) return;
        startEdit(currentRecord);
        render(ctx);
      },
      onDelete: () => {
        if (!currentRecord || !currentRecord.id) return;
        if (!window.confirm('Delete this record?')) return;
        deleteRecord(snapshotKey, currentRecord.id);
        clearSelection();
        render(ctx);
      }
    });
  }

  return { render };
}
