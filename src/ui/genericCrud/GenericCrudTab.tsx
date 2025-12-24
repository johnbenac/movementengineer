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
import { usePlugins } from '../../core/plugins/PluginProvider.tsx';

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
    draft: null,
    activeViewByCollection: {}
  };

  let rerender = () => {};
  const warnedViews = new Set();

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

    const plugins = ctx.plugins || usePlugins();
    const modelRegistry = ctx.modelRegistry || null;

    const { snapshot, upsertRecord } = useSnapshotOps();
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

    let activeViewId = 'detail';
    let effectiveViews = ['detail'];
    let viewLabels = {};

    if (collectionDef && state.selectedCollectionKey) {
      const viewIds =
        collectionDef.ui?.views?.length ? collectionDef.ui.views : ['detail'];
      const defaultViewId =
        collectionDef.ui?.defaultView || viewIds[0] || 'detail';

      viewLabels = collectionDef.ui?.viewLabels || {};

      const supportedViews = viewIds.filter(viewId => {
        const available = !!plugins.getCollectionView(state.selectedCollectionKey, viewId);
        if (!available && isDevMode()) {
          const key = `${state.selectedCollectionKey}:${viewId}`;
          if (!warnedViews.has(key)) {
            warnedViews.add(key);
            console.warn(
              `[plugins] Missing view plugin: collection="${state.selectedCollectionKey}" view="${viewId}"`
            );
          }
        }
        return available;
      });

      effectiveViews = supportedViews.length ? supportedViews : ['detail'];

      const storageKey = getViewStorageKey(state.selectedCollectionKey);
      const storedView = getStoredView(storageKey);
      const currentView = state.activeViewByCollection[state.selectedCollectionKey];
      if (currentView && effectiveViews.includes(currentView)) {
        activeViewId = currentView;
      } else if (storedView && effectiveViews.includes(storedView)) {
        activeViewId = storedView;
      } else {
        activeViewId = effectiveViews.includes(defaultViewId)
          ? defaultViewId
          : effectiveViews[0];
      }

      state.activeViewByCollection[state.selectedCollectionKey] = activeViewId;

      if (effectiveViews.length >= 2) {
        const viewSwitcher = document.createElement('div');
        viewSwitcher.className = 'generic-crud-view-switcher';
        const viewLabel = document.createElement('label');
        viewLabel.textContent = 'View:';
        const viewSelect = document.createElement('select');
        effectiveViews.forEach(viewId => {
          const option = document.createElement('option');
          option.value = viewId;
          option.textContent =
            viewLabels?.[viewId] ||
            plugins.getCollectionView(state.selectedCollectionKey, viewId)?.options?.label ||
            viewId;
          viewSelect.appendChild(option);
        });
        viewSelect.value = activeViewId;
        viewSelect.addEventListener('change', event => {
          const nextViewId = event.target.value;
          state.activeViewByCollection[state.selectedCollectionKey] = nextViewId;
          setStoredView(storageKey, nextViewId);
          rerender();
        });
        viewLabel.appendChild(viewSelect);
        viewSwitcher.appendChild(viewLabel);
        rightHeader.appendChild(viewSwitcher);
      }
    }

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
          collectionName: state.selectedCollectionKey,
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
          collectionName: state.selectedCollectionKey,
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
    } else {
      const viewDef = plugins.getCollectionView(state.selectedCollectionKey, activeViewId);
      const fallbackView = plugins.getCollectionView('*', 'detail');
      const View =
        viewDef?.component ||
        fallbackView?.component ||
        function DefaultDetailFallback() {
          const fallback = document.createElement('div');
          fallback.className = 'generic-crud-empty';
          fallback.textContent = 'No detail view available.';
          return fallback;
        };

      const openEditor = ({ mode, id } = {}) => {
        if (mode === 'create') {
          startCreate(collectionDef);
          return;
        }
        const nextId = id || state.selectedRecordId;
        const record = records.find(item => item?.id === nextId);
        if (record) {
          state.selectedRecordId = record.id;
          startEdit(record);
        }
      };

      const viewProps = {
        modelRegistry,
        plugins,
        collectionName: state.selectedCollectionKey,
        collectionDef,
        snapshot,
        selectedId: state.selectedRecordId,
        setSelectedId: id => {
          state.selectedRecordId = id || null;
          state.mode = 'view';
          rerender();
        },
        openEditor
      };

      const viewEl = View(viewProps);
      if (viewEl) rightPane.appendChild(viewEl);
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

function getViewStorageKey(collectionName) {
  return `me.view.${collectionName}`;
}

function getStoredView(storageKey) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch (error) {
    return null;
  }
}

function setStoredView(storageKey, viewId) {
  try {
    window.localStorage.setItem(storageKey, viewId);
  } catch (error) {
    // ignore storage errors
  }
}

function isDevMode() {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return true;
}
