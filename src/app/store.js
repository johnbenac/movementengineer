function buildDefaultState(snapshot, currentMovementId) {
  return {
    snapshot,
    currentMovementId,
    currentCollectionName: 'entities',
    currentItemId: null,
    navigation: { stack: [], index: -1 },
    flags: {
      snapshotDirty: false,
      movementFormDirty: false,
      itemEditorDirty: false,
      isDirty: false,
      isPopulatingMovementForm: false,
      isPopulatingEditor: false,
      isPopulatingCanonForms: false,
      isCanonMarkdownInitialized: false,
      isCanonCollectionInputsInitialized: false
    },
    currentTextId: null,
    currentShelfId: null,
    currentBookId: null,
    canonFilters: { search: '', tag: '', mention: '', parent: '', child: '' },
    graphWorkbenchState: {
      leftWidth: 360,
      rightWidth: 420,
      searchKind: 'all',
      searchQuery: '',
      selection: null,
      focusEntityId: null,
      filterCenterId: null,
      filterDepth: null,
      filterNodeTypes: []
    }
  };
}

function computeCurrentMovementId(snapshot) {
  if (!snapshot) return null;
  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
  const hasMovement = id => movements.some(m => m?.id === id);

  // Mirror legacy: use any persisted selection first, then fall back to the first movement.
  const persistedId =
    snapshot.currentMovementId ||
    snapshot.selectedMovementId ||
    snapshot.currentMovement ||
    null;
  if (persistedId && hasMovement(persistedId)) {
    return persistedId;
  }

  const firstMovementId = movements[0]?.id || null;
  return firstMovementId || null;
}

function ensureStateShape(nextState, fallbackSnapshot) {
  const snapshot = nextState?.snapshot || fallbackSnapshot || {};
  const currentMovementId =
    typeof nextState?.currentMovementId !== 'undefined'
      ? nextState.currentMovementId
      : computeCurrentMovementId(snapshot);
  const defaults = buildDefaultState(snapshot, currentMovementId);
  return {
    ...defaults,
    ...(nextState || {}),
    flags: { ...defaults.flags, ...(nextState?.flags || {}) },
    navigation: { ...defaults.navigation, ...(nextState?.navigation || {}) },
    canonFilters: { ...defaults.canonFilters, ...(nextState?.canonFilters || {}) },
    graphWorkbenchState: {
      ...defaults.graphWorkbenchState,
      ...(nextState?.graphWorkbenchState || {})
    }
  };
}

export function createStore(options = {}) {
  const services = options.services || {};
  const { StorageService, DomainService, ui } = services;
  const snapshotLoader = StorageService?.loadSnapshot || StorageService?.getDefaultSnapshot;
  const rawSnapshot = snapshotLoader ? snapshotLoader() : {};
  const snapshot = StorageService?.ensureAllCollections
    ? StorageService.ensureAllCollections(rawSnapshot)
    : rawSnapshot || {};
  const initialMovementId = computeCurrentMovementId(snapshot);
  let state = ensureStateShape({ snapshot, currentMovementId: initialMovementId }, snapshot);
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
    state = ensureStateShape(nextState, state.snapshot);
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

  function destroy() {
    subscribers.clear();
  }

  function recomputeIsDirty(flags) {
    return Boolean(flags.snapshotDirty || flags.movementFormDirty || flags.itemEditorDirty);
  }

  function markDirty(scope) {
    const current = getState();
    const flags = { ...(current.flags || {}) };
    if (scope === 'movement') {
      flags.movementFormDirty = true;
      flags.snapshotDirty = true;
    } else if (scope === 'item') {
      flags.itemEditorDirty = true;
      flags.snapshotDirty = true;
    } else {
      flags.snapshotDirty = true;
    }
    flags.isDirty = recomputeIsDirty(flags);
    setState({ ...current, flags });
  }

  function markSaved({ movement = false, item = false } = {}) {
    const current = getState();
    const flags = { ...(current.flags || {}), snapshotDirty: false };
    if (movement) flags.movementFormDirty = false;
    if (item) flags.itemEditorDirty = false;
    flags.isDirty = recomputeIsDirty(flags);
    setState({ ...current, flags });
  }

  function setStatus(text) {
    if (ui?.setStatus) {
      return ui.setStatus(text);
    }
    state = { ...state, statusText: text };
    notify(state);
    return text;
  }

  function saveSnapshot(options = {}) {
    const {
      show = true,
      clearMovementDirty = true,
      clearItemDirty = true
    } = options;
    const current = getState();
    const snapshotToSave = current.snapshot || {};
    if (StorageService?.ensureAllCollections) {
      StorageService.ensureAllCollections(snapshotToSave);
    }
    if (StorageService?.saveSnapshot) {
      StorageService.saveSnapshot(snapshotToSave);
    }
    const flags = { ...(current.flags || {}), snapshotDirty: false };
    if (clearMovementDirty) flags.movementFormDirty = false;
    if (clearItemDirty) flags.itemEditorDirty = false;
    flags.isDirty = recomputeIsDirty(flags);
    const nextState = { ...current, flags };
    setState(nextState);
    if (show) setStatus('Saved ✓');
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
    setStatus,
    services: { StorageService, DomainService, ui }
  };
}
