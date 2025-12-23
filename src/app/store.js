const DEFAULT_CANON_FILTERS = {
  search: '',
  tag: '',
  mention: '',
  parent: '',
  child: ''
};

export const DEFAULT_GRAPH_WORKBENCH_STATE = {
  leftWidth: 360,
  rightWidth: 420,
  searchKind: 'all',
  searchQuery: '',
  selection: null, // { type: 'entity'|'relation', id }
  focusEntityId: null,
  filterCenterId: null,
  filterDepth: null,
  filterNodeTypes: []
};

function ensureFlags(flags = {}) {
  const next = {
    snapshotDirty: !!flags.snapshotDirty,
    movementFormDirty: !!flags.movementFormDirty,
    itemEditorDirty: !!flags.itemEditorDirty,
    isPopulatingMovementForm: !!flags.isPopulatingMovementForm,
    isPopulatingEditor: !!flags.isPopulatingEditor,
    isPopulatingCanonForms: !!flags.isPopulatingCanonForms,
    isCanonMarkdownInitialized: !!flags.isCanonMarkdownInitialized,
    isCanonCollectionInputsInitialized: !!flags.isCanonCollectionInputsInitialized
  };
  next.isDirty = next.snapshotDirty || next.movementFormDirty || next.itemEditorDirty;
  return next;
}

function computeCurrentMovementId(snapshot) {
  if (!snapshot) return null;
  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
  const persistedId =
    snapshot.currentMovementId ||
    snapshot.selectedMovementId ||
    snapshot.__ui?.currentMovementId ||
    null;
  const hasPersisted = movements.some(
    movement =>
      movement?.id === persistedId || movement?.movementId === persistedId
  );
  if (persistedId && hasPersisted) return persistedId;
  if (!movements.length) return null;
  const first = movements[0];
  return first?.id || first?.movementId || null;
}

export function createStore(options = {}) {
  const services = options.services || {};
  const StorageService = services.StorageService;
  const initialSnapshot = StorageService?.loadSnapshot
    ? StorageService.loadSnapshot()
    : {};
  const snapshot =
    StorageService?.ensureAllCollections?.(initialSnapshot) || initialSnapshot || {};
  let state = {
    snapshot,
    currentMovementId: computeCurrentMovementId(snapshot),
    currentCollectionName: 'entities',
    currentItemId: null,
    currentTextId: null,
    currentShelfId: null,
    currentBookId: null,
    facetExplorer: null,
    canonFilters: { ...DEFAULT_CANON_FILTERS },
    navigation: { stack: [], index: -1 },
    graphWorkbenchState: { ...DEFAULT_GRAPH_WORKBENCH_STATE },
    flags: ensureFlags(),
    statusText: ''
  };

  const subscribers = new Set();

  function notify(nextState = state) {
    subscribers.forEach(callback => {
      try {
        callback(nextState);
      } catch (err) {
        console.error('Movement Engineer store subscriber failed', err);
      }
    });
  }

  function getState() {
    return state;
  }

  function setState(nextState) {
    if (!nextState) return state;
    state = typeof nextState === 'function' ? nextState(state) || state : nextState;
    notify(state);
    return state;
  }

  function update(patchOrUpdater) {
    if (typeof patchOrUpdater === 'function') {
      return setState(prev => patchOrUpdater(prev) || prev);
    }
    if (!patchOrUpdater) return state;
    return setState(prev => ({ ...prev, ...patchOrUpdater }));
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function setStatus(text) {
    if (services?.ui?.setStatus) {
      services.ui.setStatus(text);
      return;
    }
    setState(prev => {
      if (prev.statusText === text) return prev;
      return { ...prev, statusText: text || '' };
    });
  }

  function markDirty(scope) {
    setState(prev => {
      const flags = ensureFlags(prev.flags);
      if (scope === 'movement') {
        flags.movementFormDirty = true;
        flags.snapshotDirty = true;
      } else if (scope === 'item') {
        flags.itemEditorDirty = true;
        flags.snapshotDirty = true;
      } else if (scope === 'snapshot') {
        flags.snapshotDirty = true;
      }
      flags.isDirty = flags.snapshotDirty || flags.movementFormDirty || flags.itemEditorDirty;
      return { ...prev, flags };
    });
  }

  function markSaved({ movement = false, item = false } = {}) {
    setState(prev => {
      const flags = ensureFlags(prev.flags);
      flags.snapshotDirty = false;
      if (movement) flags.movementFormDirty = false;
      if (item) flags.itemEditorDirty = false;
      flags.isDirty = flags.snapshotDirty || flags.movementFormDirty || flags.itemEditorDirty;
      return { ...prev, flags };
    });
  }

  function saveSnapshot({
    show = true,
    clearMovementDirty = true,
    clearItemDirty = true
  } = {}) {
    const currentState = getState();
    const snap = currentState.snapshot || {};
    StorageService?.ensureAllCollections?.(snap);
    StorageService?.saveSnapshot?.(snap);
    setState(prev => {
      const flags = ensureFlags(prev.flags);
      flags.snapshotDirty = false;
      if (clearMovementDirty) flags.movementFormDirty = false;
      if (clearItemDirty) flags.itemEditorDirty = false;
      flags.isDirty = flags.snapshotDirty || flags.movementFormDirty || flags.itemEditorDirty;
      return { ...prev, snapshot: snap, flags };
    });
    if (show) setStatus('Saved ✓');
  }

  function destroy() {
    subscribers.clear();
  }

  return {
    getState,
    setState,
    update,
    subscribe,
    destroy,
    markDirty,
    markSaved,
    saveSnapshot,
    setStatus
  };
}
