import { usePlugins } from '../../core/plugins/PluginProvider.js';
import { useSnapshotOps } from '../../core/useSnapshotOps.js';
import { RecordDetail } from './RecordDetail.js';
import { RecordEditor } from './RecordEditor.js';
import { RecordList } from './RecordList.js';
import {
  generateId,
  getCollectionSnapshotKey,
  makeDefaultRecord
} from './genericCrudHelpers.js';
import { getModelForSnapshot } from '../../app/ui/schemaDoc.js';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function titleCase(label) {
  if (!label) return '';
  return String(label)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function isDevEnvironment() {
  return globalScope?.MovementEngineer?.bootstrapOptions?.dev === true;
}

function readStoredViewId(collectionName) {
  if (!collectionName) return null;
  try {
    return globalScope?.localStorage?.getItem(`me.collection.view.${collectionName}`) || null;
  } catch (err) {
    return null;
  }
}

function persistViewId(collectionName, viewId) {
  if (!collectionName || !viewId) return;
  try {
    globalScope?.localStorage?.setItem(`me.collection.view.${collectionName}`, viewId);
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

function getDefaultMovementId(ctx) {
  return ctx?.store?.getState?.()?.currentMovementId || null;
}

export function CollectionCrudView({ ctx, containerEl, collectionName, state, setState }) {
  if (!containerEl) return;
  ctx.dom.clearElement(containerEl);

  const { snapshot, upsertRecord, deleteRecord } = useSnapshotOps();
  const nodeIndex = ctx?.store?.getState?.()?.nodeIndex;
  const model = getModelForSnapshot(snapshot);
  const modelRegistry = getModelRegistry();
  const plugins = usePlugins();
  const collectionDef = model?.collections?.[collectionName] || null;

  if (!collectionDef) {
    const missing = document.createElement('p');
    missing.className = 'hint';
    missing.textContent = `Collection "${collectionName}" is not defined in the model.`;
    containerEl.appendChild(missing);
    return;
  }

  const snapshotKey = getCollectionSnapshotKey(collectionDef, model);
  const requiresMovement = Boolean(collectionDef?.fields?.movementId);
  const currentMovementId = getDefaultMovementId(ctx);
  const allRecords = normalizeRecords(snapshot?.[snapshotKey]);
  const records = requiresMovement && currentMovementId
    ? allRecords.filter(record => record?.movementId === currentMovementId)
    : allRecords;

  const header = document.createElement('div');
  header.className = 'generic-crud-collection-header';

  const title = document.createElement('h2');
  const label = collectionDef?.ui?.label || titleCase(collectionName);
  title.textContent = label;
  header.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'generic-crud-collection-meta';

  const totalCount = allRecords.length;
  const filteredCount = records.length;

  let movementLabel = null;
  if (currentMovementId) {
    const movements = Array.isArray(snapshot?.movements) ? snapshot.movements : [];
    const match =
      movements.find(m => m?.id === currentMovementId) ||
      movements.find(m => m?.movementId === currentMovementId) ||
      null;
    movementLabel = match?.name || match?.shortName || currentMovementId;
  }

  if (requiresMovement && !currentMovementId) {
    meta.textContent = `${totalCount} total • Select a movement to view`;
  } else if (requiresMovement && currentMovementId) {
    meta.textContent =
      totalCount === filteredCount
        ? `${filteredCount} record${filteredCount === 1 ? '' : 's'} • Movement: ${movementLabel}`
        : `${filteredCount} record${filteredCount === 1 ? '' : 's'} • Movement: ${movementLabel} • ${totalCount} total`;
  } else {
    meta.textContent = `${filteredCount} record${filteredCount === 1 ? '' : 's'}`;
  }

  header.appendChild(meta);
  containerEl.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'generic-crud-layout generic-crud-layout--collection';

  if (requiresMovement && !currentMovementId) {
    const banner = document.createElement('p');
    banner.className = 'hint';
    banner.textContent = 'Select a movement to browse or edit these records.';
    containerEl.appendChild(banner);
  }

  const leftPane = document.createElement('div');
  leftPane.className = 'card generic-crud-pane';
  const leftHeader = document.createElement('div');
  leftHeader.className = 'pane-header';
  const leftTitle = document.createElement('h3');
  leftTitle.textContent = 'Records';
  leftHeader.appendChild(leftTitle);
  leftPane.appendChild(leftHeader);

  const canBrowse = !requiresMovement || Boolean(currentMovementId);
  if (!canBrowse) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = 'Choose a movement to view records.';
    leftPane.appendChild(placeholder);
  } else {
    const selectedRecordId = state.selectedRecordId;
    const selectedRecordExists = records.some(record => record?.id === selectedRecordId);
    let nextSelectedId = selectedRecordExists ? selectedRecordId : records[0]?.id || null;
    if (nextSelectedId !== selectedRecordId) {
      setState({ selectedRecordId: nextSelectedId, mode: 'view', draft: null });
    }

    leftPane.appendChild(
      RecordList({
        collectionDef,
        records,
        selectedId: nextSelectedId,
        search: state.search,
        sortMode: state.sortMode,
        onSearchChange: value => setState({ search: value }),
        onSortChange: value => setState({ sortMode: value }),
        onSelect: id => setState({ selectedRecordId: id, mode: 'view', draft: null }),
        onCreate: () => {
          const draft = makeDefaultRecord(collectionDef);
          if (collectionDef?.fields?.movementId && currentMovementId) {
            draft.movementId = draft.movementId || currentMovementId;
          }
          setState({ mode: 'create', draft, selectedRecordId: null });
        },
        emptyMessage: 'No records yet'
      })
    );
  }

  const rightPane = document.createElement('div');
  rightPane.className = 'card generic-crud-pane';

  if (!canBrowse) {
    const placeholder = document.createElement('div');
    placeholder.className = 'generic-crud-empty';
    placeholder.textContent = 'Select a movement to continue.';
    rightPane.appendChild(placeholder);
  } else if (state.mode === 'create' || state.mode === 'edit') {
    const isCreate = state.mode === 'create';
    rightPane.appendChild(
      RecordEditor({
        record: state.draft || (isCreate ? makeDefaultRecord(collectionDef) : null),
        collectionName,
        collectionDef,
        model,
        snapshot,
        nodeIndex,
        mode: state.mode,
        onSave: draft => {
          const nextDraft = { ...draft };
          if (!nextDraft.id) nextDraft.id = generateId(collectionDef?.fields?.id || null);
          if (collectionDef?.fields?.movementId && currentMovementId) {
            nextDraft.movementId = nextDraft.movementId || currentMovementId;
          }
          upsertRecord(snapshotKey, nextDraft);
          ctx.persistence?.save?.({ show: false, clearItemDirty: true });
          setState({ selectedRecordId: nextDraft.id, mode: 'view', draft: null });
        },
        onCancel: () => setState({ mode: 'view', draft: null })
      })
    );
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
    const activeViewId = effectiveViews.includes(state.activeViewId)
      ? state.activeViewId
      : effectiveViews.includes(readStoredViewId(collectionName))
        ? readStoredViewId(collectionName)
        : defaultViewId;

    if (activeViewId !== state.activeViewId) {
      setState({ activeViewId });
    }

    if (effectiveViews.length >= 2) {
      const switcher = document.createElement('div');
      switcher.className = 'generic-crud-view-switcher';
      effectiveViews.forEach(viewId => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tab';
        if (viewId === activeViewId) button.classList.add('active');
        const customLabel = collectionDef?.ui?.viewLabels?.[viewId];
        const pluginLabel = plugins.getCollectionView(collectionName, viewId)?.options?.label;
        button.textContent = customLabel || pluginLabel || viewId;
        button.addEventListener('click', () => {
          if (activeViewId === viewId) return;
          persistViewId(collectionName, viewId);
          setState({ activeViewId: viewId });
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

    const viewDef = plugins.getCollectionView(collectionName, activeViewId || defaultViewId);
    const fallbackView =
      plugins.getCollectionView('*', 'detail')?.component ||
      ((props) =>
        RecordDetail({
          ...props,
          onEdit: props.onEdit || (() => {}),
          onDelete: props.onDelete || (() => {})
        }));
    const View = viewDef?.component || fallbackView;

    const selectedRecord = records.find(record => record?.id === state.selectedRecordId) || null;

    rightPane.appendChild(
      View({
        modelRegistry,
        plugins,
        collectionName,
        collectionDef,
        snapshot,
        nodeIndex,
        selectedId: state.selectedRecordId,
        record: selectedRecord,
        setSelectedId: id => setState({ selectedRecordId: id, mode: 'view', draft: null }),
        openEditor: ({ mode, id }) => {
          if (mode === 'create') {
            const draft = makeDefaultRecord(collectionDef);
            if (collectionDef?.fields?.movementId && currentMovementId) {
              draft.movementId = draft.movementId || currentMovementId;
            }
            setState({ mode: 'create', draft, selectedRecordId: null });
            return;
          }
          if (mode === 'edit') {
            const target = records.find(record => record?.id === id) || null;
            if (target) {
              setState({ selectedRecordId: target.id, mode: 'edit', draft: cloneRecord(target) });
            }
          }
        },
        onEdit: () => {
          const target = records.find(record => record?.id === state.selectedRecordId) || null;
          if (target) {
            setState({ mode: 'edit', draft: cloneRecord(target) });
          }
        },
        onDelete: () => {
          const target = records.find(record => record?.id === state.selectedRecordId) || null;
          if (!target?.id) return;
          if (!globalThis.confirm?.(`Delete ${target.id}? This cannot be undone.`)) return;
          deleteRecord(snapshotKey, target.id);
          ctx.persistence?.save?.({ show: false, clearItemDirty: true });
          setState({ selectedRecordId: null, mode: 'view', draft: null });
        }
      })
    );
  }

  layout.appendChild(leftPane);
  layout.appendChild(rightPane);
  containerEl.appendChild(layout);
}
