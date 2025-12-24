import { renderCollectionList } from './CollectionList.tsx';
import { renderRecordList } from './RecordList.tsx';
import { renderRecordDetail } from './RecordDetail.tsx';
import { renderRecordEditor } from './RecordEditor.tsx';
import {
  getCollectionSnapshotKey,
  getRecordTitle,
  makeDefaultRecord
} from './genericCrudHelpers.ts';
import { useSnapshotOps } from '../../core/useSnapshotOps.ts';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function getValidator() {
  return globalScope?.ModelValidator || null;
}

function generateId() {
  if (globalScope?.crypto?.randomUUID) return globalScope.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function validateRecord(record, collectionDef, model) {
  const validator = getValidator();
  if (!validator?.validateRecord) return { ok: true, errors: [] };
  const errors = validator.validateRecord(record, collectionDef, { model });
  return { ok: errors.length === 0, errors };
}

function buildDefaultDraft(collectionDef, currentMovementId) {
  const draft = makeDefaultRecord(collectionDef);
  if (!draft.id) {
    draft.id = generateId();
  }
  if (draft.movementId === '<id>') {
    draft.movementId = draft.id;
  }
  if (draft.movementId === undefined && collectionDef?.fields?.movementId) {
    draft.movementId = currentMovementId || null;
  }
  return draft;
}

export function createGenericCrudTab() {
  const state = {
    selectedCollectionKey: null,
    selectedRecordId: null,
    mode: 'view',
    searchQuery: '',
    sortMode: 'title',
    draft: null,
    draftMode: null,
    draftRecordId: null,
    validationErrors: []
  };

  function setState(patch) {
    Object.assign(state, patch);
  }

  function ensureDraft(collectionDef, record, currentMovementId) {
    if (state.mode === 'create') {
      if (state.draft && state.draftMode === 'create') return;
      const draft = buildDefaultDraft(collectionDef, currentMovementId);
      const validation = validateRecord(draft, collectionDef, getModelRegistry()?.getModel?.());
      setState({
        draft,
        draftMode: 'create',
        draftRecordId: null,
        validationErrors: validation.errors
      });
      return;
    }

    if (state.mode === 'edit') {
      const recordId = record?.id || null;
      if (state.draft && state.draftMode === 'edit' && state.draftRecordId === recordId) return;
      const draft = record ? { ...record } : null;
      const validation = draft
        ? validateRecord(draft, collectionDef, getModelRegistry()?.getModel?.())
        : { errors: [] };
      setState({
        draft,
        draftMode: 'edit',
        draftRecordId: recordId,
        validationErrors: validation.errors
      });
    }
  }

  return {
    state,
    render(ctx, tab) {
      const root = document.getElementById('generic-crud-root');
      if (!root) return;

      const modelRegistry = getModelRegistry();
      const model = modelRegistry?.getModel ? modelRegistry.getModel() : null;
      if (!model) {
        root.textContent = 'Model registry unavailable.';
        return;
      }

      const snapshotOps = useSnapshotOps();
      const snapshot = snapshotOps.snapshot;

      const collectionKeys = modelRegistry.listCollections
        ? modelRegistry.listCollections()
        : Object.keys(model.collections || {}).sort();
      const collections = collectionKeys
        .map(key => model.collections[key])
        .filter(Boolean)
        .map(def => ({ ...def }));

      if (state.selectedCollectionKey && !model.collections[state.selectedCollectionKey]) {
        setState({ selectedCollectionKey: null, selectedRecordId: null, mode: 'view' });
      }

      const collectionDef = state.selectedCollectionKey
        ? model.collections[state.selectedCollectionKey]
        : null;
      if (!collectionDef && (state.mode === 'create' || state.mode === 'edit')) {
        setState({ mode: 'view' });
      }
      const collectionKey = collectionDef
        ? getCollectionSnapshotKey(collectionDef, model)
        : null;
      const records = collectionKey && Array.isArray(snapshot?.[collectionKey])
        ? snapshot[collectionKey]
        : [];

      if (state.selectedRecordId && !records.find(record => record?.id === state.selectedRecordId)) {
        setState({ selectedRecordId: null, mode: 'view' });
      }

      const searchTerm = (state.searchQuery || '').toLowerCase();
      const filteredRecords = records.filter(record => {
        if (!searchTerm) return true;
        const title = getRecordTitle(record, collectionDef).toLowerCase();
        const id = String(record?.id || '').toLowerCase();
        return title.includes(searchTerm) || id.includes(searchTerm);
      });

      const sortedRecords = filteredRecords.slice().sort((a, b) => {
        if (state.sortMode === 'id') {
          return String(a?.id || '').localeCompare(String(b?.id || ''));
        }
        return getRecordTitle(a, collectionDef).localeCompare(getRecordTitle(b, collectionDef));
      });

      const selectedRecord = records.find(record => record?.id === state.selectedRecordId) || null;

      if (state.mode === 'create' || state.mode === 'edit') {
        ensureDraft(collectionDef, selectedRecord, ctx.getState?.().currentMovementId);
      } else if (state.draft) {
        setState({ draft: null, draftMode: null, draftRecordId: null, validationErrors: [] });
      }

      root.textContent = '';
      const layout = document.createElement('div');
      layout.className = 'graph-workbench generic-crud-workbench';

      const collectionPane = document.createElement('div');
      collectionPane.className = 'graph-pane generic-crud-pane';
      const collectionInner = document.createElement('div');
      collectionInner.className = 'pane-inner';
      collectionPane.appendChild(collectionInner);
      renderCollectionList({
        container: collectionInner,
        collections,
        selectedKey: state.selectedCollectionKey,
        onSelect: key => {
          const targetKey = key || null;
          const nextDef = targetKey ? model.collections[targetKey] : null;
          const nextKey = nextDef ? getCollectionSnapshotKey(nextDef, model) : null;
          const nextRecords = nextKey && Array.isArray(snapshot?.[nextKey]) ? snapshot[nextKey] : [];
          const nextRecordId = nextRecords.length ? nextRecords[0].id : null;
          setState({
            selectedCollectionKey: targetKey,
            selectedRecordId: nextRecordId,
            mode: 'view',
            draft: null,
            validationErrors: []
          });
          tab.rerender?.({ immediate: true });
        }
      });

      const listPane = document.createElement('div');
      listPane.className = 'graph-pane generic-crud-pane';
      const listInner = document.createElement('div');
      listInner.className = 'pane-inner';
      listPane.appendChild(listInner);
      renderRecordList({
        container: listInner,
        collectionDef,
        records: sortedRecords,
        selectedId: state.selectedRecordId,
        searchQuery: state.searchQuery,
        sortMode: state.sortMode,
        onSearch: query => {
          setState({ searchQuery: query });
          tab.rerender?.({ immediate: true });
        },
        onToggleSort: () => {
          setState({ sortMode: state.sortMode === 'id' ? 'title' : 'id' });
          tab.rerender?.({ immediate: true });
        },
        onSelect: id => {
          setState({ selectedRecordId: id || null, mode: 'view' });
          tab.rerender?.({ immediate: true });
        },
        onCreate: () => {
          if (!collectionDef) return;
          setState({ mode: 'create', selectedRecordId: null });
          tab.rerender?.({ immediate: true });
        }
      });

      const detailPane = document.createElement('div');
      detailPane.className = 'graph-pane generic-crud-pane';
      const detailInner = document.createElement('div');
      detailInner.className = 'pane-inner';
      detailPane.appendChild(detailInner);

      if (state.mode === 'create' || state.mode === 'edit') {
        renderRecordEditor({
          container: detailInner,
          collectionDef,
          draft: state.draft,
          mode: state.mode,
          errors: state.validationErrors,
          model,
          snapshot,
          onChange: (fieldName, value) => {
            const nextDraft = { ...(state.draft || {}) };
            if (value === undefined) {
              delete nextDraft[fieldName];
            } else {
              nextDraft[fieldName] = value;
            }
            const validation = validateRecord(nextDraft, collectionDef, model);
            setState({ draft: nextDraft, validationErrors: validation.errors });
            tab.rerender?.({ immediate: true });
          },
          onSave: () => {
            if (!collectionDef || !state.draft) return;
            const validation = validateRecord(state.draft, collectionDef, model);
            if (!validation.ok) {
              setState({ validationErrors: validation.errors });
              tab.rerender?.({ immediate: true });
              return;
            }
            const targetKey = getCollectionSnapshotKey(collectionDef, model);
            snapshotOps.upsertRecord(targetKey, state.draft);
            setState({
              selectedRecordId: state.draft.id,
              mode: 'view',
              draft: null,
              validationErrors: []
            });
            tab.rerender?.({ immediate: true });
          },
          onCancel: () => {
            setState({ mode: 'view', draft: null, validationErrors: [] });
            tab.rerender?.({ immediate: true });
          }
        });
      } else {
        renderRecordDetail({
          container: detailInner,
          collectionDef,
          record: selectedRecord,
          onEdit: () => {
            if (!selectedRecord) return;
            setState({ mode: 'edit' });
            tab.rerender?.({ immediate: true });
          },
          onDelete: () => {
            if (!collectionDef || !selectedRecord) return;
            const confirmed = window.confirm('Delete this record?');
            if (!confirmed) return;
            const targetKey = getCollectionSnapshotKey(collectionDef, model);
            snapshotOps.deleteRecord(targetKey, selectedRecord.id);
            setState({ selectedRecordId: null, mode: 'view' });
            tab.rerender?.({ immediate: true });
          }
        });
      }

      layout.appendChild(collectionPane);
      layout.appendChild(listPane);
      layout.appendChild(detailPane);
      root.appendChild(layout);
    }
  };
}
