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

function isDevEnv() {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  if (typeof window !== 'undefined') {
    const host = window.location?.hostname || '';
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (window.location?.protocol === 'file:') return true;
  }
  return true;
}

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

  function selectView(collectionName, viewId) {
    if (!collectionName || !viewId) return;
    state.activeViewByCollection[collectionName] = viewId;
    try {
      window.localStorage?.setItem(`me.view.${collectionName}`, viewId);
    } catch {
      // ignore storage issues
    }
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

    const { snapshot, upsertRecord } = useSnapshotOps();
    const model = getModelForSnapshot(snapshot);
    const collectionDef = state.selectedCollectionKey
      ? model?.collections?.[state.selectedCollectionKey]
      : null;
    const collectionName = collectionDef?.collectionName || state.selectedCollectionKey || null;
    const snapshotKey = collectionDef ? getCollectionSnapshotKey(collectionDef, model) : null;
    const records = normalizeRecords(snapshot?.[snapshotKey]);
    ensureValidSelection(records);
    const selectedRecord = records.find(record => record?.id === state.selectedRecordId) || null;
    const plugins = ctx?.plugins || null;
    const modelRegistry = typeof globalThis !== 'undefined' ? globalThis.ModelRegistry || null : null;

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
          collectionName,
          model,
          modelRegistry,
          plugins,
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
          collectionName,
          model,
          modelRegistry,
          plugins,
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
      const viewIds = collectionDef?.ui?.views?.length ? collectionDef.ui.views : ['detail'];
      const defaultViewId = collectionDef?.ui?.defaultView || viewIds[0] || 'detail';
      const supportedViews = viewIds.filter(viewId => {
        const view = plugins?.getCollectionView?.(collectionName, viewId) || null;
        if (!view && isDevEnv()) {
          console.warn(
            `[plugins] Missing view plugin: collection=\"${collectionName}\" view=\"${viewId}\"`
          );
        }
        return Boolean(view);
      });

      const effectiveViews = supportedViews.length ? supportedViews : ['detail'];
      let viewSelect = null;
      if (effectiveViews.length >= 2) {
        viewSelect = document.createElement('select');
        viewSelect.className = 'generic-crud-view-switcher';
        effectiveViews.forEach(viewId => {
          const option = document.createElement('option');
          const viewDef = plugins?.getCollectionView?.(collectionName, viewId);
          const label =
            collectionDef?.ui?.viewLabels?.[viewId] || viewDef?.options?.label || viewId;
          option.value = viewId;
          option.textContent = label;
          viewSelect.appendChild(option);
        });
        viewSelect.addEventListener('change', event => {
          selectView(collectionName, event.target.value);
        });
        rightHeader.appendChild(viewSelect);
      }

      const storedView = (() => {
        if (state.activeViewByCollection[collectionName]) {
          return state.activeViewByCollection[collectionName];
        }
        try {
          return window.localStorage?.getItem(`me.view.${collectionName}`) || null;
        } catch {
          return null;
        }
      })();

      let activeViewId = effectiveViews.includes(storedView) ? storedView : null;
      if (!activeViewId) {
        activeViewId = effectiveViews.includes(defaultViewId)
          ? defaultViewId
          : effectiveViews[0] || 'detail';
      }
      if (activeViewId && state.activeViewByCollection[collectionName] !== activeViewId) {
        state.activeViewByCollection[collectionName] = activeViewId;
        try {
          window.localStorage?.setItem(`me.view.${collectionName}`, activeViewId);
        } catch {
          // ignore storage issues
        }
      }
      if (viewSelect) {
        viewSelect.value = activeViewId;
      }

      const viewDef =
        plugins?.getCollectionView?.(collectionName, activeViewId) ||
        plugins?.getCollectionView?.('*', 'detail');
      const View = viewDef?.component;
      const fallback = document.createElement('div');
      fallback.className = 'generic-crud-empty';
      fallback.textContent = 'No view available.';

      if (typeof View === 'function') {
        const viewNode = View({
          modelRegistry,
          plugins,
          collectionName,
          collectionDef,
          snapshot,
          selectedId: state.selectedRecordId,
          setSelectedId: selectRecord,
          openEditor: ({ mode, id }) => {
            if (mode === 'create') {
              startCreate(collectionDef);
              return;
            }
            if (mode === 'edit') {
              const targetId = id || state.selectedRecordId;
              const record = records.find(item => item?.id === targetId);
              if (!record) return;
              state.selectedRecordId = record.id;
              startEdit(record);
            }
          }
        });
        rightPane.appendChild(viewNode || fallback);
      } else {
        rightPane.appendChild(fallback);
      }
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
