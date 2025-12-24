import { getModelForSnapshot } from '../../app/ui/schemaDoc.js';
import { usePlugins } from '../../core/plugins/PluginProvider.tsx';
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
    state.activeViewId = null;
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

    const { snapshot, upsertRecord } = useSnapshotOps();
    const model = getModelForSnapshot(snapshot);
    const modelRegistry = getModelRegistry();
    const plugins = usePlugins();
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
    if (!collectionDef) {
      const placeholder = document.createElement('div');
      placeholder.className = 'generic-crud-empty';
      placeholder.textContent = 'Select a collection';
      rightPane.appendChild(placeholder);
    } else if (state.mode === 'create' || state.mode === 'edit') {
      const isCreate = state.mode === 'create';
      rightPane.appendChild(
        RecordEditor({
          record: state.draft || (isCreate ? makeDefaultRecord(collectionDef) : selectedRecord),
          collectionName: state.selectedCollectionKey || collectionDef.collectionName,
          collectionDef,
          model,
          snapshot,
          mode: state.mode,
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
    } else {
      const collectionName = state.selectedCollectionKey || collectionDef.collectionName;
      const declaredViews = resolveDeclaredViews(collectionDef);
      const supportedViews = declaredViews.filter(viewId => {
        const supported = !!plugins.getCollectionView(collectionName, viewId);
        if (!supported && isDevEnvironment()) {
          console.warn(`[plugins] Missing view plugin: collection="${collectionName}" view="${viewId}"`);
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
          selectedId: state.selectedRecordId,
          setSelectedId: id => selectRecord(id),
          openEditor: ({ mode, id }) => {
            if (mode === 'create') {
              startCreate(collectionDef);
              return;
            }
            if (mode === 'edit') {
              const target = records.find(record => record?.id === id) || null;
              if (target) {
                state.selectedRecordId = target.id;
                startEdit(target);
              }
            }
          }
        })
      );
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
