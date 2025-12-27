import { getModelForSnapshot } from '../../app/ui/schemaDoc.js';
import { usePlugins } from '../../core/plugins/PluginProvider.js';
import { useSnapshotOps } from '../../core/useSnapshotOps.js';
import { RecordEditor } from './RecordEditor.js';
import { RecordList } from './RecordList.js';
import { generateId, getCollectionSnapshotKey, makeDefaultRecord } from './genericCrudHelpers.js';

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

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

function cloneRecord(record) {
  return record ? JSON.parse(JSON.stringify(record)) : {};
}

function isMovementScoped(collectionDef, collectionName) {
  if (collectionName === 'movements') return false;
  return Boolean(collectionDef?.fields?.movementId);
}

export function CollectionCrudView({
  ctx,
  containerEl,
  collectionName,
  state,
  rerender,
  label
}) {
  if (!containerEl) return;
  ctx.dom.clearElement(containerEl);

  const { snapshot, upsertRecord, deleteRecord } = useSnapshotOps();
  const nodeIndex = ctx?.store?.getState?.()?.nodeIndex;
  const model = getModelForSnapshot(snapshot);
  const plugins = usePlugins();
  const modelRegistry = getModelRegistry();

  const collectionDef = model?.collections?.[collectionName] || null;
  const snapshotKey = collectionDef ? getCollectionSnapshotKey(collectionDef, model) : null;
  const records = normalizeRecords(snapshot?.[snapshotKey]);
  const currentMovementId = ctx?.store?.getState?.()?.currentMovementId || null;
  const movementScoped = isMovementScoped(collectionDef, collectionName);
  const movementGate = movementScoped && !currentMovementId;
  const filteredRecords = movementScoped && currentMovementId
    ? records.filter(record => record?.movementId === currentMovementId)
    : movementScoped
      ? []
      : records;

  const layout = document.createElement('div');
  layout.className = 'generic-crud-layout two-pane';

  const header = document.createElement('div');
  header.className = 'pane-header';
  const title = document.createElement('h2');
  title.textContent = label || collectionDef?.ui?.label || collectionDef?.typeName || collectionName;
  header.appendChild(title);
  containerEl.appendChild(header);

  if (!collectionDef) {
    const missing = document.createElement('p');
    missing.className = 'hint';
    missing.textContent = 'No collection schema available.';
    containerEl.appendChild(missing);
    return;
  }

  if (movementGate) {
    const banner = document.createElement('p');
    banner.className = 'hint';
    banner.textContent = 'Select a movement to edit; browsing disabled.';
    containerEl.appendChild(banner);
  }

  function ensureValidSelection(recordsToCheck) {
    if (!state.selectedRecordId) return;
    const exists = recordsToCheck.some(record => record?.id === state.selectedRecordId);
    if (!exists) {
      state.selectedRecordId = null;
      state.mode = 'view';
    }
  }

  function selectRecord(recordId) {
    state.selectedRecordId = recordId || null;
    state.mode = 'view';
    state.draft = null;
    rerender();
  }

  function startCreate() {
    state.mode = 'create';
    state.selectedRecordId = null;
    const draft = makeDefaultRecord(collectionDef);
    if (movementScoped && currentMovementId) {
      draft.movementId = currentMovementId;
    }
    state.draft = draft;
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

  ensureValidSelection(filteredRecords);

  const leftPane = document.createElement('div');
  leftPane.className = 'card generic-crud-pane';
  const leftHeader = document.createElement('div');
  leftHeader.className = 'pane-header';
  const leftTitle = document.createElement('h3');
  leftTitle.textContent = 'Records';
  leftHeader.appendChild(leftTitle);
  leftPane.appendChild(leftHeader);

  if (movementGate) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = 'Select a movement to browse records.';
    leftPane.appendChild(placeholder);
  } else {
    leftPane.appendChild(
      RecordList({
        collectionDef,
        records: filteredRecords,
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
        onCreate: () => startCreate(),
        emptyMessage: 'No records yet'
      })
    );
  }

  const rightPane = document.createElement('div');
  rightPane.className = 'card generic-crud-pane';

  const selectedRecord =
    filteredRecords.find(record => record?.id === state.selectedRecordId) || null;

  if (movementGate) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = 'Select a movement to view details.';
    rightPane.appendChild(placeholder);
  } else if (state.mode === 'create' || state.mode === 'edit') {
    const isCreate = state.mode === 'create';
    rightPane.appendChild(
      RecordEditor({
        record: state.draft || (isCreate ? makeDefaultRecord(collectionDef) : selectedRecord),
        collectionName,
        collectionDef,
        model,
        snapshot,
        nodeIndex,
        mode: state.mode,
        onSave: draft => {
          if (!draft.id) draft.id = generateId(collectionDef?.fields?.id || null);
          upsertRecord(snapshotKey, draft);
          ctx.persistence?.save?.({ show: false, clearItemDirty: true });
          state.selectedRecordId = draft.id;
          state.mode = 'view';
          state.draft = null;
          rerender();
        },
        onCancel: () => cancelEdit()
      })
    );
  } else {
    const declaredViews = resolveDeclaredViews(collectionDef);
    const supportedViews = declaredViews.filter(viewId => {
      const supported = !!plugins.getCollectionView(collectionName, viewId);
      if (!supported && isDevEnvironment()) {
        console.warn(`[plugins] Missing view plugin: collection="${collectionName}" view="${viewId}"`);
      }
      return supported;
    });
    const effectiveViews = supportedViews.length ? supportedViews : ['detail'];
    const defaultViewId = collectionDef?.ui?.defaultView || effectiveViews[0] || 'detail';

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
          rerender();
        });
        switcher.appendChild(button);
      });
      rightPane.appendChild(switcher);
    }

    const rightHeader = document.createElement('div');
    rightHeader.className = 'pane-header';
    const rightTitle = document.createElement('h3');
    rightTitle.textContent = 'Details';
    rightHeader.appendChild(rightTitle);
    rightPane.appendChild(rightHeader);

    const viewDef = plugins.getCollectionView(collectionName, state.activeViewId || defaultViewId);
    const fallbackView =
      plugins.getCollectionView('*', 'detail')?.component || (() => document.createElement('div'));
    const View = viewDef?.component || fallbackView;

    rightPane.appendChild(
      View({
        modelRegistry,
        plugins,
        collectionName,
        collectionDef,
        snapshot,
        nodeIndex,
        selectedId: state.selectedRecordId,
        setSelectedId: id => selectRecord(id),
        openEditor: ({ mode, id }) => {
          if (mode === 'create') {
            startCreate();
            return;
          }
          if (mode === 'edit') {
            const target = filteredRecords.find(record => record?.id === id) || null;
            if (target) {
              state.selectedRecordId = target.id;
              startEdit(target);
            }
          }
        },
        onDelete: id => {
          if (id) {
            deleteRecord(snapshotKey, id);
            state.selectedRecordId = null;
            rerender();
          }
        }
      })
    );
  }

  layout.appendChild(leftPane);
  layout.appendChild(rightPane);
  containerEl.appendChild(layout);
}
