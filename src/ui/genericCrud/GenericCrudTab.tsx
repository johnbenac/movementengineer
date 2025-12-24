import { useSnapshotOps } from '../../core/useSnapshotOps.ts';
import {
  applyIdDefaults,
  createRecordId,
  getCollectionSnapshotKey,
  getRecordTitle,
  makeDefaultRecord
} from './genericCrudHelpers.ts';
import { renderCollectionList } from './CollectionList.tsx';
import { renderRecordList } from './RecordList.tsx';
import { renderRecordDetail } from './RecordDetail.tsx';
import { renderRecordEditor } from './RecordEditor.tsx';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function getModelValidator() {
  return globalScope?.ModelValidator || null;
}

function cloneRecord(record) {
  if (typeof structuredClone === 'function') return structuredClone(record);
  return JSON.parse(JSON.stringify(record || {}));
}

export function createGenericCrudTab({ ctx, panel }) {
  const state = {
    selectedCollectionKey: null,
    selectedRecordId: null,
    mode: 'view',
    searchQuery: '',
    sortKey: 'title',
    draft: null,
    errors: []
  };

  const root =
    panel.querySelector('.generic-crud-root') ||
    panel.querySelector('.panel-body') ||
    panel;

  function setState(next) {
    Object.assign(state, next);
    render();
  }

  function getCollections(model, registry) {
    if (!registry?.listCollections) return [];
    const keys = registry.listCollections(model?.specVersion);
    return keys.map(key => model?.collections?.[key]).filter(Boolean);
  }

  function findRecord(records, id) {
    return records.find(record => record?.id === id) || null;
  }

  function validateDraft(collectionDef, model, draft) {
    const validator = getModelValidator();
    if (!validator?.validateRecord) return [];
    const issues = validator.validateRecord(draft, collectionDef, { model }) || [];
    return issues.filter(issue => issue?.severity !== 'warning');
  }

  function selectCollection(collectionName, model, snapshot) {
    if (!collectionName) {
      setState({ selectedCollectionKey: null, selectedRecordId: null, mode: 'view' });
      return;
    }
    const collectionDef = model.collections?.[collectionName];
    const snapshotKey = getCollectionSnapshotKey(collectionDef, model);
    const records = Array.isArray(snapshot?.[snapshotKey]) ? snapshot[snapshotKey] : [];
    setState({
      selectedCollectionKey: collectionName,
      selectedRecordId: records[0]?.id || null,
      mode: 'view',
      draft: null,
      errors: []
    });
  }

  function startCreate(collectionDef, model) {
    const currentMovementId = ctx?.getState?.()?.currentMovementId || null;
    const draft = makeDefaultRecord(collectionDef, { currentMovementId });
    if (!draft.id) draft.id = createRecordId();
    applyIdDefaults(draft, collectionDef);
    const nextErrors = validateDraft(collectionDef, model, draft);
    setState({ mode: 'create', draft, selectedRecordId: null, errors: nextErrors });
  }

  function startEdit(record, collectionDef, model) {
    const draft = cloneRecord(record);
    const nextErrors = validateDraft(collectionDef, model, draft);
    setState({ mode: 'edit', draft, errors: nextErrors });
  }

  function cancelEdit() {
    setState({ mode: 'view', draft: null, errors: [] });
  }

  function saveDraft(collectionDef, model, snapshotOps) {
    if (!state.draft) return;
    const nextErrors = validateDraft(collectionDef, model, state.draft);
    if (nextErrors.length) {
      setState({ errors: nextErrors });
      return;
    }
    const snapshotKey = getCollectionSnapshotKey(collectionDef, model);
    snapshotOps.upsertRecord(snapshotKey, state.draft);
    setState({
      mode: 'view',
      selectedRecordId: state.draft.id,
      draft: null,
      errors: []
    });
  }

  function deleteRecord(collectionDef, model, snapshotOps, recordId) {
    const snapshotKey = getCollectionSnapshotKey(collectionDef, model);
    snapshotOps.deleteRecord(snapshotKey, recordId);
    setState({ selectedRecordId: null, mode: 'view', draft: null, errors: [] });
  }

  function render() {
    if (!root) return;
    const registry = getModelRegistry();
    if (!registry?.getModel) {
      root.textContent = 'Model registry unavailable.';
      return;
    }

    const model = registry.getModel();
    const collections = getCollections(model, registry);
    const snapshotOps = useSnapshotOps();
    const snapshot = snapshotOps.snapshot || {};

    const selectedCollection = state.selectedCollectionKey
      ? model.collections?.[state.selectedCollectionKey]
      : null;
    const snapshotKey = selectedCollection
      ? getCollectionSnapshotKey(selectedCollection, model)
      : null;
    const records = snapshotKey && Array.isArray(snapshot[snapshotKey]) ? snapshot[snapshotKey] : [];

    const currentRecord = state.selectedRecordId
      ? findRecord(records, state.selectedRecordId)
      : null;
    if (state.selectedRecordId && !currentRecord && state.mode === 'view') {
      state.selectedRecordId = null;
    }

    const layout = document.createElement('div');
    layout.className = 'generic-crud-layout';

    const leftPane = document.createElement('div');
    leftPane.className = 'generic-crud-pane';
    leftPane.appendChild(
      renderCollectionList({
        collections,
        selectedKey: state.selectedCollectionKey,
        onSelect: key => selectCollection(key, model, snapshot)
      })
    );

    const middlePane = document.createElement('div');
    middlePane.className = 'generic-crud-pane';
    middlePane.appendChild(
      renderRecordList({
        collectionDef: selectedCollection,
        records,
        selectedId: state.selectedRecordId,
        searchQuery: state.searchQuery,
        sortKey: state.sortKey,
        onSearchChange: query => setState({ searchQuery: query }),
        onSortToggle: () =>
          setState({ sortKey: state.sortKey === 'id' ? 'title' : 'id' }),
        onSelect: id => setState({ selectedRecordId: id, mode: 'view', draft: null, errors: [] }),
        onCreate: () => {
          if (selectedCollection) startCreate(selectedCollection, model);
        }
      })
    );

    const rightPane = document.createElement('div');
    rightPane.className = 'generic-crud-pane';

    if (!selectedCollection) {
      const empty = document.createElement('div');
      empty.className = 'generic-crud-empty';
      empty.textContent = 'Select a collection';
      rightPane.appendChild(empty);
    } else if (state.mode === 'edit' || state.mode === 'create') {
      if (state.draft) {
        const nextErrors = validateDraft(selectedCollection, model, state.draft);
        if (state.errors !== nextErrors) {
          state.errors = nextErrors;
        }
      }
      rightPane.appendChild(
        renderRecordEditor({
          collectionDef: selectedCollection,
          draft: state.draft,
          mode: state.mode,
          model,
          snapshot,
          errors: state.errors,
          onDraftChange: nextDraft => {
            const nextErrors = validateDraft(selectedCollection, model, nextDraft);
            setState({ draft: nextDraft, errors: nextErrors });
          },
          onSave: () => saveDraft(selectedCollection, model, snapshotOps),
          onCancel: () => cancelEdit()
        })
      );
    } else {
      rightPane.appendChild(
        renderRecordDetail({
          collectionDef: selectedCollection,
          record: currentRecord,
          model,
          snapshot,
          onEdit: () => {
            if (currentRecord) startEdit(currentRecord, selectedCollection, model);
          },
          onDelete: () => {
            if (!currentRecord) return;
            const title = getRecordTitle(currentRecord, selectedCollection) || currentRecord.id;
            const ok = window.confirm(`Delete "${title}"?`);
            if (ok) deleteRecord(selectedCollection, model, snapshotOps, currentRecord.id);
          }
        })
      );
    }

    layout.append(leftPane, middlePane, rightPane);
    root.innerHTML = '';
    root.appendChild(layout);
  }

  return {
    render
  };
}
