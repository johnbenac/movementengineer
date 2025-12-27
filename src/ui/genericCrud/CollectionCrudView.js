import { getModelForSnapshot } from '../../app/ui/schemaDoc.js';
import { usePlugins } from '../../core/plugins/PluginProvider.js';
import { useSnapshotOps } from '../../core/useSnapshotOps.js';
import { RecordList } from './RecordList.js';
import { RecordEditor } from './RecordEditor.js';
import { RecordDetail } from './RecordDetail.js';
import {
  generateId,
  getCollectionSnapshotKey,
  makeDefaultRecord
} from './genericCrudHelpers.js';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function isDevEnvironment() {
  return globalScope?.MovementEngineer?.bootstrapOptions?.dev === true;
}

function cloneRecord(record) {
  return record ? JSON.parse(JSON.stringify(record)) : {};
}

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

function resolveDeclaredViews(collectionDef) {
  const declared = collectionDef?.ui?.views;
  if (Array.isArray(declared) && declared.length) return declared;
  return ['detail'];
}

function ensureMovementId(draft, collectionDef, currentMovementId) {
  if (!draft || !collectionDef?.fields?.movementId || !currentMovementId) return draft;
  if (!draft.movementId) {
    draft.movementId = currentMovementId;
  }
  return draft;
}

export function CollectionCrudView({ ctx, containerEl, collectionName, state, rerender }) {
  if (!containerEl || !collectionName) return;
  ctx.dom.clearElement(containerEl);

  const { snapshot, upsertRecord, deleteRecord } = useSnapshotOps();
  const nodeIndex = ctx?.store?.getState?.()?.nodeIndex;
  const model = getModelForSnapshot(snapshot);
  const modelRegistry = getModelRegistry();
  const plugins = usePlugins();
  const collectionDef = model?.collections?.[collectionName] || null;

  if (!collectionDef) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'Collection not found in model.';
    containerEl.appendChild(empty);
    return;
  }

  const snapshotKey = getCollectionSnapshotKey(collectionDef, model);
  const allRecords = normalizeRecords(snapshot?.[snapshotKey]);
  const currentMovementId = ctx?.store?.getState?.()?.currentMovementId || null;
  const hasMovementId = !!collectionDef?.fields?.movementId;
  const requiresMovement = hasMovementId && collectionName !== 'movements';
  const movementGate = requiresMovement && !currentMovementId;
  const records = movementGate
    ? []
    : requiresMovement
      ? allRecords.filter(record => record?.movementId === currentMovementId)
      : allRecords;

  const currentItemId = ctx?.store?.getState?.()?.currentItemId || null;
  const currentCollectionName = ctx?.store?.getState?.()?.currentCollectionName || null;

  if (currentCollectionName === collectionName && currentItemId && state.mode === 'view') {
    if (state.selectedRecordId !== currentItemId) {
      state.selectedRecordId = currentItemId;
    }
  }

  if (state.selectedRecordId) {
    const exists = records.some(record => record?.id === state.selectedRecordId);
    if (!exists) {
      state.selectedRecordId = records[0]?.id || null;
      if (state.mode === 'edit') state.mode = 'view';
      state.draft = null;
    }
  } else if (records.length && !movementGate) {
    state.selectedRecordId = records[0]?.id || null;
  }

  const layout = document.createElement('div');
  layout.className = 'generic-crud-layout';

  if (movementGate) {
    const banner = document.createElement('div');
    banner.className = 'generic-crud-empty';
    banner.textContent = 'Select a movement to edit; browsing disabled.';
    layout.appendChild(banner);
    containerEl.appendChild(layout);
    return;
  }

  const middlePane = document.createElement('div');
  middlePane.className = 'card generic-crud-pane';
  const middleHeader = document.createElement('div');
  middleHeader.className = 'pane-header';
  const middleTitle = document.createElement('h3');
  middleTitle.textContent = 'Records';
  middleHeader.appendChild(middleTitle);
  middlePane.appendChild(middleHeader);

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
      onSelect: id => {
        state.selectedRecordId = id || null;
        state.mode = 'view';
        state.draft = null;
        ctx.store.setState(prev => ({
          ...prev,
          currentCollectionName: collectionName,
          currentItemId: id || null
        }));
        rerender();
      },
      onCreate: () => {
        state.mode = 'create';
        state.selectedRecordId = null;
        state.draft = ensureMovementId(
          makeDefaultRecord(collectionDef),
          collectionDef,
          currentMovementId
        );
        rerender();
      },
      emptyMessage: 'No records yet'
    })
  );

  const rightPane = document.createElement('div');
  rightPane.className = 'card generic-crud-pane';
  const selectedRecord =
    records.find(record => record?.id === state.selectedRecordId) || null;

  if (state.mode === 'create' || state.mode === 'edit') {
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
          ensureMovementId(draft, collectionDef, currentMovementId);
          upsertRecord(snapshotKey, draft);
          ctx.persistence?.save?.({ show: false, clearItemDirty: true });
          state.selectedRecordId = draft.id;
          state.mode = 'view';
          state.draft = null;
          ctx.store.setState(prev => ({
            ...prev,
            currentCollectionName: collectionName,
            currentItemId: draft.id || null
          }));
          rerender();
        },
        onCancel: () => {
          state.mode = 'view';
          state.draft = null;
          rerender();
        }
      })
    );
  } else if (!selectedRecord) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = records.length ? 'Select a record' : 'No records yet';
    rightPane.appendChild(empty);
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
    const defaultViewId = collectionDef?.ui?.defaultView || effectiveViews[0] || 'detail';

    if (!state.activeViewId) {
      state.activeViewId = defaultViewId;
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
    const fallbackView = plugins.getCollectionView('*', 'detail')?.component;
    const View = viewDef?.component || fallbackView || null;

    if (View) {
      rightPane.appendChild(
        View({
          modelRegistry,
          plugins,
          collectionName,
          collectionDef,
          snapshot,
          nodeIndex,
          selectedId: selectedRecord?.id || null,
          setSelectedId: id => {
            state.selectedRecordId = id || null;
            rerender();
          },
          openEditor: ({ mode, id }) => {
            if (mode === 'create') {
              state.mode = 'create';
              state.selectedRecordId = null;
              state.draft = ensureMovementId(
                makeDefaultRecord(collectionDef),
                collectionDef,
                currentMovementId
              );
              rerender();
              return;
            }
            if (mode === 'edit') {
              const target = records.find(record => record?.id === id) || null;
              if (target) {
                state.selectedRecordId = target.id;
                state.mode = 'edit';
                state.draft = cloneRecord(target);
                rerender();
              }
            }
          }
        })
      );
    } else {
      rightPane.appendChild(
        RecordDetail({
          record: selectedRecord,
          collectionDef,
          model,
          snapshot,
          nodeIndex,
          onEdit: () => {
            state.mode = 'edit';
            state.draft = cloneRecord(selectedRecord);
            rerender();
          },
          onDelete: () => {
            if (!selectedRecord?.id) return;
            deleteRecord(snapshotKey, selectedRecord.id);
            state.selectedRecordId = null;
            state.mode = 'view';
            state.draft = null;
            rerender();
          }
        })
      );
    }
  }

  layout.appendChild(middlePane);
  layout.appendChild(rightPane);
  containerEl.appendChild(layout);
}
