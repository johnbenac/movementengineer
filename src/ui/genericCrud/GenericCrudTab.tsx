import { getModelForSnapshot } from '../../app/ui/schemaDoc.js';
import { useSnapshotOps } from '../../core/useSnapshotOps.ts';
import { CollectionList } from './CollectionList.tsx';
import { RecordList } from './RecordList.tsx';
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

function isDevMode() {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
  return true;
}

function resolveViewIds(collectionDef) {
  const viewIds = collectionDef?.ui?.views;
  if (Array.isArray(viewIds) && viewIds.length) return viewIds.slice();
  return ['detail'];
}

function resolveDefaultViewId(collectionDef, viewIds) {
  return collectionDef?.ui?.defaultView || viewIds[0] || 'detail';
}

function resolveEffectiveViews(collectionName, collectionDef, plugins) {
  const viewIds = resolveViewIds(collectionDef);
  const effective = viewIds.filter(viewId => {
    const exists = plugins?.getCollectionView?.(collectionName, viewId);
    if (!exists && isDevMode()) {
      console.warn(
        `[plugins] Missing view plugin: collection="${collectionName}" view="${viewId}"`
      );
    }
    return Boolean(exists);
  });
  return effective.length ? effective : ['detail'];
}

function resolveViewLabel(collectionDef, viewId, viewDef) {
  if (collectionDef?.ui?.viewLabels?.[viewId]) return collectionDef.ui.viewLabels[viewId];
  if (viewDef?.options?.label) return viewDef.options.label;
  return viewId;
}

function readStoredViewId(collectionName) {
  if (typeof window === 'undefined' || !collectionName) return null;
  try {
    return window.localStorage?.getItem(`me.view.${collectionName}`) || null;
  } catch (err) {
    return null;
  }
}

function storeViewId(collectionName, viewId) {
  if (typeof window === 'undefined' || !collectionName) return;
  try {
    window.localStorage?.setItem(`me.view.${collectionName}`, viewId);
  } catch (err) {
    return;
  }
}

function DefaultDetailFallback() {
  const placeholder = document.createElement('div');
  placeholder.className = 'generic-crud-empty';
  placeholder.textContent = 'Detail view unavailable.';
  return placeholder;
}

export function createGenericCrudTab(ctx) {
  const state = {
    selectedCollectionKey: null,
    selectedRecordId: null,
    activeViewId: null,
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
    const plugins = ctx.plugins;
    const effectiveViews = resolveEffectiveViews(collectionKey, collectionDef, plugins);
    const defaultViewId = resolveDefaultViewId(collectionDef, effectiveViews);
    const storedViewId = readStoredViewId(collectionKey);
    state.activeViewId = effectiveViews.includes(storedViewId) ? storedViewId : defaultViewId;
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
    const modelRegistry = globalThis.ModelRegistry || null;
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

    const plugins = ctx.plugins;
    const collectionName = collectionDef?.collectionName || state.selectedCollectionKey;
    const viewIds = collectionDef
      ? resolveEffectiveViews(collectionName, collectionDef, plugins)
      : [];
    const defaultViewId = resolveDefaultViewId(collectionDef, viewIds);
    const storedViewId = readStoredViewId(collectionName);
    if (collectionDef && (!state.activeViewId || !viewIds.includes(state.activeViewId))) {
      state.activeViewId = viewIds.includes(storedViewId) ? storedViewId : defaultViewId;
    }

    const resolvedViewId = state.activeViewId || defaultViewId;

    const rightPane = document.createElement('div');
    rightPane.className = 'card generic-crud-pane';
    const rightHeader = document.createElement('div');
    rightHeader.className = 'pane-header';
    const rightTitle = document.createElement('h3');
    const activeViewDef = collectionDef && resolvedViewId
      ? plugins?.getCollectionView?.(collectionName, resolvedViewId)
      : null;
    rightTitle.textContent = collectionDef
      ? resolveViewLabel(collectionDef, resolvedViewId, activeViewDef)
      : 'Details';
    rightHeader.appendChild(rightTitle);

    if (collectionDef && viewIds.length > 1) {
      const switcher = document.createElement('div');
      switcher.className = 'generic-crud-view-switcher';
      viewIds.forEach(viewId => {
        const viewDef = plugins?.getCollectionView?.(collectionName, viewId);
        const label = resolveViewLabel(collectionDef, viewId, viewDef);
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        if (viewId === resolvedViewId) {
          button.classList.add('active');
        }
        button.addEventListener('click', () => {
          state.activeViewId = viewId;
          storeViewId(collectionName, viewId);
          rerender();
        });
        switcher.appendChild(button);
      });
      rightHeader.appendChild(switcher);
    }

    rightPane.appendChild(rightHeader);

    const openEditor = ({ mode, id } = {}) => {
      if (!collectionDef) return;
      if (mode === 'create') {
        startCreate(collectionDef);
        return;
      }
      if (mode === 'edit') {
        const record = id
          ? records.find(item => item?.id === id)
          : records.find(item => item?.id === state.selectedRecordId);
        if (record) {
          state.selectedRecordId = record.id;
          startEdit(record);
        }
      }
    };
    openEditor.delete = id => {
      const recordId = id || state.selectedRecordId;
      if (!recordId || !snapshotKey) return;
      const ok = window.confirm('Delete this record?');
      if (!ok) return;
      deleteRecord(snapshotKey, recordId);
      state.selectedRecordId = null;
      state.mode = 'view';
      state.draft = null;
      rerender();
    };

    if (!collectionDef) {
      const placeholder = document.createElement('div');
      placeholder.className = 'generic-crud-empty';
      placeholder.textContent = 'Select a collection';
      rightPane.appendChild(placeholder);
    } else if (state.mode === 'create') {
      rightPane.appendChild(
        RecordEditor({
          record: state.draft || makeDefaultRecord(collectionDef),
          collectionName,
          collectionDef,
          modelRegistry,
          plugins,
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
          collectionName,
          collectionDef,
          modelRegistry,
          plugins,
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
    } else if (collectionDef) {
      const viewDef = plugins?.getCollectionView?.(collectionName, resolvedViewId);
      const detailDef = plugins?.getCollectionView?.('*', 'detail');
      const ViewComponent = viewDef?.component || detailDef?.component || DefaultDetailFallback;
      const viewNode = ViewComponent({
        modelRegistry,
        plugins,
        collectionName,
        collectionDef,
        snapshot,
        selectedId: state.selectedRecordId,
        setSelectedId: id => selectRecord(id),
        openEditor
      });
      rightPane.appendChild(viewNode);
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
