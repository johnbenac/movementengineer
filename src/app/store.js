const DEFAULT_CANON_FILTERS = {
  search: '',
  tag: '',
  mention: '',
  parent: '',
  child: ''
};

const DEFAULT_GRAPH_WORKBENCH_STATE = {
  leftWidth: 360,
  rightWidth: 420,
  searchKind: 'all',
  searchQuery: '',
  selection: null,
  focusEntityId: null,
  filterCenterId: null,
  filterDepth: null,
  filterNodeTypes: []
};

const DEFAULT_FLAGS = {
  snapshotDirty: false,
  movementFormDirty: false,
  itemEditorDirty: false,
  isDirty: false,
  isPopulatingMovementForm: false,
  isPopulatingEditor: false,
  isPopulatingCanonForms: false,
  isCanonMarkdownInitialized: false,
  isCanonCollectionInputsInitialized: false
};

function computeCurrentMovementId(snapshot = {}) {
  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
  const persistedSelection =
    snapshot.currentMovementId ||
    snapshot?.navigation?.currentMovementId ||
    snapshot?.ui?.currentMovementId;

  if (persistedSelection) {
    const match = movements.find(
      movement =>
        movement?.id === persistedSelection || movement?.movementId === persistedSelection
    );
    if (match) {
      return match.id || match.movementId || persistedSelection;
    }
  }

  const first = movements[0];
  if (first) {
    // Mirrors legacy init in app.js: default to the first movement when available.
    return first.id || first.movementId || null;
  }

  return null;
}

function buildInitialState(snapshot, currentMovementId) {
  return {
    snapshot,
    currentMovementId,
    currentCollectionName: 'entities',
    currentItemId: null,
    navigation: { stack: [], index: -1 },
    flags: { ...DEFAULT_FLAGS },
    currentTextId: null,
    currentShelfId: null,
    currentBookId: null,
    canonFilters: { ...DEFAULT_CANON_FILTERS },
    graphWorkbenchState: { ...DEFAULT_GRAPH_WORKBENCH_STATE },
    statusText: ''
  };
}

function recomputeDirtyFlags(flags) {
  const nextFlags = { ...DEFAULT_FLAGS, ...flags };
  nextFlags.isDirty =
    !!nextFlags.snapshotDirty || !!nextFlags.movementFormDirty || !!nextFlags.itemEditorDirty;
  return nextFlags;
}

export function createStore(options = {}) {
  const services = options.services || {};
  const storage = services.StorageService || {};
  const loadedSnapshot = storage.loadSnapshot ? storage.loadSnapshot() : {};
  const snapshot = storage.ensureAllCollections
    ? storage.ensureAllCollections(loadedSnapshot)
    : loadedSnapshot || {};
  const currentMovementId = computeCurrentMovementId(snapshot);

  let state = buildInitialState(snapshot, currentMovementId);
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
    state = nextState;
    notify(state);
    return state;
  }

  function update(updater) {
    if (typeof updater !== 'function') {
      return setState(updater);
    }
    const updated = updater(getState());
    return setState(updated);
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function setStatus(text) {
    if (services.ui && typeof services.ui.setStatus === 'function') {
      services.ui.setStatus(text);
      return text;
    }
    state = { ...state, statusText: text || '' };
    notify(state);
    return text;
  }

  function markDirty(scope) {
    const flags = { ...(state.flags || {}) };
    if (scope === 'movement') {
      flags.movementFormDirty = true;
      flags.snapshotDirty = true;
    } else if (scope === 'item') {
      flags.itemEditorDirty = true;
    } else if (scope === 'snapshot') {
      flags.snapshotDirty = true;
    }
    const nextFlags = recomputeDirtyFlags(flags);
    setState({ ...state, flags: nextFlags });
    return nextFlags;
  }

  function markSaved({ movement = false, item = false } = {}) {
    const flags = { ...(state.flags || {}) };
    flags.snapshotDirty = false;
    if (movement) flags.movementFormDirty = false;
    if (item) flags.itemEditorDirty = false;
    const nextFlags = recomputeDirtyFlags(flags);
    setState({ ...state, flags: nextFlags });
    return nextFlags;
  }

  function saveSnapshot(options = {}) {
    const {
      show = true,
      clearMovementDirty = true,
      clearItemDirty = true
    } = options;
    const current = getState();
    const ensuredSnapshot = storage.ensureAllCollections
      ? storage.ensureAllCollections(current.snapshot || storage.createEmptySnapshot?.())
      : current.snapshot;

    if (storage.saveSnapshot) {
      try {
        storage.saveSnapshot(ensuredSnapshot);
      } catch (err) {
        setStatus('Save failed');
        throw err;
      }
    }

    const flags = { ...(current.flags || {}) };
    flags.snapshotDirty = false;
    if (clearMovementDirty) flags.movementFormDirty = false;
    if (clearItemDirty) flags.itemEditorDirty = false;
    const nextFlags = recomputeDirtyFlags(flags);

    setState({ ...current, snapshot: ensuredSnapshot, flags: nextFlags });
    if (show) {
      setStatus('Saved ✓');
    }
    return ensuredSnapshot;
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
