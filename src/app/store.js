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

function ensureSnapshot(services) {
  const storage = services?.StorageService;
  if (!storage) return {};
  const loaded =
    typeof storage.loadSnapshot === 'function'
      ? storage.loadSnapshot()
      : storage.getDefaultSnapshot?.() || {};
  return typeof storage.ensureAllCollections === 'function'
    ? storage.ensureAllCollections(loaded)
    : loaded || {};
}

function movementExists(snapshot, movementId) {
  if (!movementId || !Array.isArray(snapshot?.movements)) return false;
  return snapshot.movements.some(
    movement => movement?.id === movementId || movement?.movementId === movementId
  );
}

// Mirrors legacy init logic from app.js: prefer a previously selected movement when valid,
// otherwise default to the first available movement in the snapshot.
function computeCurrentMovementId(snapshot) {
  if (!snapshot) return null;

  const persistedSelection =
    snapshot.currentMovementId ||
    snapshot.__currentMovementId ||
    snapshot?.navigation?.currentMovementId;
  if (movementExists(snapshot, persistedSelection)) {
    return persistedSelection;
  }

  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
  if (movements.length) {
    const first = movements[0];
    return first?.id || first?.movementId || null;
  }

  return null;
}

function buildInitialState(snapshot) {
  return {
    snapshot,
    currentMovementId: computeCurrentMovementId(snapshot),
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

function computeDirty(flags) {
  const next = { ...DEFAULT_FLAGS, ...(flags || {}) };
  next.isDirty = next.snapshotDirty || next.movementFormDirty || next.itemEditorDirty;
  return next;
}

export function createStore({ services = {} } = {}) {
  const snapshot = ensureSnapshot(services);
  let state = buildInitialState(snapshot);
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

  function update(patchOrUpdater) {
    if (typeof patchOrUpdater === 'function') {
      const updated = patchOrUpdater(getState());
      return updated ? setState(updated) : state;
    }
    return setState(patchOrUpdater);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  function setStatus(text) {
    if (services?.ui?.setStatus) {
      services.ui.setStatus(text);
    }
    state = { ...state, statusText: text || '' };
    notify(state);
  }

  function markDirty(scope) {
    const flags = computeDirty(state.flags);
    if (scope === 'movement') {
      flags.movementFormDirty = true;
    }
    if (scope === 'item') {
      flags.itemEditorDirty = true;
    }
    flags.snapshotDirty = true;
    const nextState = { ...state, flags: computeDirty(flags) };
    return setState(nextState);
  }

  function markSaved({ movement = false, item = false } = {}) {
    const flags = computeDirty(state.flags);
    flags.snapshotDirty = false;
    if (movement) flags.movementFormDirty = false;
    if (item) flags.itemEditorDirty = false;
    const nextState = { ...state, flags: computeDirty(flags) };
    return setState(nextState);
  }

  function saveSnapshot({ show = true, clearMovementDirty = true, clearItemDirty = true } = {}) {
    const snapshotToSave = state.snapshot || {};
    if (services?.StorageService?.ensureAllCollections) {
      services.StorageService.ensureAllCollections(snapshotToSave);
    }
    if (services?.StorageService?.saveSnapshot) {
      try {
        services.StorageService.saveSnapshot(snapshotToSave);
      } catch (err) {
        console.error(err);
        setStatus('Save failed');
        return state;
      }
    }
    const flags = computeDirty(state.flags);
    flags.snapshotDirty = false;
    if (clearMovementDirty) flags.movementFormDirty = false;
    if (clearItemDirty) flags.itemEditorDirty = false;
    state = { ...state, snapshot: snapshotToSave, flags: computeDirty(flags) };
    notify(state);
    if (show) setStatus('Saved ✓');
    return state;
  }

  function destroy() {
    subscribers.clear();
  }

  return {
    getState,
    setState,
    update,
    subscribe,
    markDirty,
    markSaved,
    saveSnapshot,
    setStatus,
    destroy
  };
}
