import { usePlugins } from '../../core/plugins/PluginProvider.js';
import { useSnapshotOps } from '../../core/useSnapshotOps.js';
import { getModelForSnapshot } from '../../app/ui/schemaDoc.js';
import { RecordDetail } from './RecordDetail.js';
import { RecordEditor } from './RecordEditor.js';
import { RecordList } from './RecordList.js';
import {
  generateId,
  getCollectionSnapshotKey,
  makeDefaultRecord
} from './genericCrudHelpers.js';

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

function cloneRecord(record) {
  return record ? JSON.parse(JSON.stringify(record)) : {};
}

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function isDevEnvironment() {
  return globalScope?.MovementEngineer?.bootstrapOptions?.dev === true;
}

function readStoredViewId(collectionName) {
  if (!collectionName) return null;
  try {
    return globalScope?.localStorage?.getItem(`me.view.${collectionName}`) || null;
  } catch (err) {
    return null;
  }
}

function persistViewId(collectionName, viewId) {
  if (!collectionName || !viewId) return;
  try {
    globalScope?.localStorage?.setItem(`me.view.${collectionName}`, viewId);
  } catch (err) {
    // Ignore storage errors.
  }
}

function resolveDeclaredViews(collectionDef) {
  const declared = collectionDef?.ui?.views;
  if (Array.isArray(declared) && declared.length) return declared;
  return ['detail'];
}

function ensureValidSelection(state, records) {
  if (!state.selectedRecordId) return;
  const exists = records.some(record => record?.id === state.selectedRecordId);
  if (!exists) {
    state.selectedRecordId = null;
    state.mode = 'view';
  }
}

function buildDraft(collectionDef, currentMovementId) {
  const draft = makeDefaultRecord(collectionDef);
  if (collectionDef?.fields?.movementId && currentMovementId && !draft.movementId) {
    draft.movementId = currentMovementId;
  }
  return draft;
}

export function CollectionCrudView({
  ctx,
  containerEl,
  collectionName,
  state,
  rerender
}) {
  if (!containerEl) return;
  ctx?.dom?.clearElement?.(containerEl);

  const { snapshot, upsertRecord, deleteRecord } = useSnapshotOps();
  const model = getModelForSnapshot(snapshot);
  const collectionDef = model?.collections?.[collectionName] || null;
  if (!collectionDef) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = 'Collection unavailable.';
    containerEl.appendChild(placeholder);
    return;
  }

  const snapshotKey = getCollectionSnapshotKey(collectionDef, model) || collectionName;
  const records = normalizeRecords(snapshot?.[snapshotKey]);
  const plugins = usePlugins();
  const modelRegistry = getModelRegistry();
  const nodeIndex = ctx?.store?.getState?.()?.nodeIndex;
  const currentMovementId = ctx?.store?.getState?.()?.currentMovementId || null;
  const requiresMovement = !!collectionDef?.fields?.movementId;
  const movementRestricted = requiresMovement && !currentMovementId;
  const filteredRecords =
    requiresMovement && currentMovementId
      ? records.filter(record => record?.movementId === currentMovementId)
      : movementRestricted
        ? []
        : records;

  const storeState = ctx?.store?.getState?.() || {};
  if (
    storeState.currentCollectionName === collectionName &&
    storeState.currentItemId &&
    storeState.currentItemId !== state.selectedRecordId
  ) {
    state.selectedRecordId = storeState.currentItemId;
  }

  ensureValidSelection(state, filteredRecords);
  const selectedRecord =
    filteredRecords.find(record => record?.id === state.selectedRecordId) || null;

  const layout = document.createElement('div');
  layout.className = 'generic-crud-layout collection-crud-layout';

  const listPane = document.createElement('div');
  listPane.className = 'card generic-crud-pane';
  const listHeader = document.createElement('div');
  listHeader.className = 'pane-header';
  const listTitle = document.createElement('h3');
  listTitle.textContent = collectionDef?.ui?.label || collectionDef?.typeName || collectionName;
  listHeader.appendChild(listTitle);
  listPane.appendChild(listHeader);

  if (movementRestricted) {
    const banner = document.createElement('div');
    banner.className = 'generic-crud-empty';
    banner.textContent = 'Select a movement to edit; browsing disabled.';
    listPane.appendChild(banner);
  }

  listPane.appendChild(
    RecordList({
      collectionDef,
      records: filteredRecords,
      selectedId: state.selectedRecordId,
      search: state.search,
      sortMode: state.sortMode,
      onSearchChange: value => {
        state.search = value;
        rerender?.();
      },
      onSortChange: value => {
        state.sortMode = value;
        rerender?.();
      },
      onSelect: id => {
        state.selectedRecordId = id;
        state.mode = 'view';
        state.draft = null;
        ctx?.store?.setState?.(prev => ({
          ...(prev || {}),
          currentCollectionName: collectionName,
          currentItemId: id || null
        }));
        rerender?.();
      },
      onCreate: () => {
        state.mode = 'create';
        state.selectedRecordId = null;
        state.draft = buildDraft(collectionDef, currentMovementId);
        rerender?.();
      },
      emptyMessage: movementRestricted ? 'Select a movement to browse this collection.' : 'No records yet',
      disableCreate: movementRestricted
    })
  );

  const detailPane = document.createElement('div');
  detailPane.className = 'card generic-crud-pane';

  if (movementRestricted) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'Pick a movement to view details.';
    detailPane.appendChild(empty);
  } else if (state.mode === 'create' || state.mode === 'edit') {
    const isCreate = state.mode === 'create';
    detailPane.appendChild(
      RecordEditor({
        record: state.draft || (isCreate ? buildDraft(collectionDef, currentMovementId) : selectedRecord),
        collectionName,
        collectionDef,
        model,
        snapshot,
        nodeIndex,
        mode: state.mode,
        onSave: draft => {
          if (!draft.id) draft.id = generateId(collectionDef?.fields?.id || null);
          if (collectionDef?.fields?.movementId && currentMovementId && !draft.movementId) {
            draft.movementId = currentMovementId;
          }
          upsertRecord(snapshotKey, draft);
          ctx.persistence?.save?.({ show: false, clearItemDirty: true });
          state.selectedRecordId = draft.id;
          state.mode = 'view';
          state.draft = null;
          ctx?.store?.setState?.(prev => ({
            ...(prev || {}),
            currentCollectionName: collectionName,
            currentItemId: draft.id
          }));
          rerender?.();
        },
        onCancel: () => {
          state.mode = 'view';
          state.draft = null;
          rerender?.();
        }
      })
    );
  } else if (!selectedRecord) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'Select a record to view details.';
    detailPane.appendChild(empty);
  } else {
    const declaredViews = resolveDeclaredViews(collectionDef);
    const supportedViews = declaredViews.filter(viewId => {
      const supported = !!plugins.getCollectionView(collectionName, viewId);
      if (!supported && isDevEnvironment()) {
        console.warn(
          `[plugins] Missing view plugin: collection="${collectionName}" view="${viewId}"`
        );
      }
      return supported;
    });
    const effectiveViews = supportedViews.length ? supportedViews : ['detail'];
    const defaultViewId =
      collectionDef?.ui?.defaultView || effectiveViews[0] || 'detail';

    if (!state.activeViewId) {
      const stored = readStoredViewId(collectionName);
      state.activeViewId = effectiveViews.includes(stored) ? stored : defaultViewId;
    } else if (!effectiveViews.includes(state.activeViewId)) {
      state.activeViewId = defaultViewId;
    }

    if (effectiveViews.length >= 2) {
      const switcher = document.createElement('div');
      switcher.className = 'generic-crud-view-switcher';
      effectiveViews.forEach(viewId => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tab';
        if (viewId === state.activeViewId) button.classList.add('active');
        const customLabel = collectionDef?.ui?.viewLabels?.[viewId];
        const pluginLabel = plugins.getCollectionView(collectionName, viewId)?.options?.label;
        button.textContent = customLabel || pluginLabel || viewId;
        button.addEventListener('click', () => {
          if (state.activeViewId === viewId) return;
          state.activeViewId = viewId;
          persistViewId(collectionName, viewId);
          rerender?.();
        });
        switcher.appendChild(button);
      });
      detailPane.appendChild(switcher);
    }

    const header = document.createElement('div');
    header.className = 'pane-header';
    const title = document.createElement('h3');
    title.textContent = 'Details';
    header.appendChild(title);
    detailPane.appendChild(header);

    const viewDef = plugins.getCollectionView(collectionName, state.activeViewId || defaultViewId);
    const fallbackView = () =>
      RecordDetail({
        record: selectedRecord,
        collectionDef,
        model,
        snapshot,
        nodeIndex,
        onEdit: () => {
          state.mode = 'edit';
          state.draft = cloneRecord(selectedRecord);
          rerender?.();
        },
        onDelete: () => {
          if (!selectedRecord?.id) return;
          deleteRecord(snapshotKey, selectedRecord.id);
          ctx.persistence?.save?.({ show: false, clearItemDirty: true });
          state.selectedRecordId = null;
          state.mode = 'view';
          rerender?.();
        }
      });
    const View = viewDef?.component || fallbackView;

    detailPane.appendChild(
      View({
        modelRegistry,
        plugins,
        collectionName,
        collectionDef,
        snapshot,
        nodeIndex,
        selectedId: state.selectedRecordId,
        setSelectedId: id => {
          state.selectedRecordId = id;
          state.mode = 'view';
          ctx?.store?.setState?.(prev => ({
            ...(prev || {}),
            currentCollectionName: collectionName,
            currentItemId: id || null
          }));
          rerender?.();
        },
        openEditor: ({ mode, id }) => {
          if (mode === 'create') {
            state.mode = 'create';
            state.selectedRecordId = null;
            state.draft = buildDraft(collectionDef, currentMovementId);
            rerender?.();
            return;
          }
          if (mode === 'edit') {
            const target =
              filteredRecords.find(record => record?.id === id) || selectedRecord;
            if (target) {
              state.selectedRecordId = target.id;
              state.mode = 'edit';
              state.draft = cloneRecord(target);
              rerender?.();
            }
          }
        }
      })
    );
  }

  layout.appendChild(listPane);
  layout.appendChild(detailPane);
  containerEl.appendChild(layout);
}
