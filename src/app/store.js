function cloneState(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export function createStore(initialState = {}) {
  let state = cloneState(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(nextState) {
    state = cloneState(nextState);
    listeners.forEach(listener => listener(state));
  }

  function update(updater) {
    const nextState = updater(state);
    setState(nextState);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    setState,
    update,
    subscribe
  };
}

function readLegacySelection(legacyApp) {
  if (!legacyApp?.getCurrentSelection) {
    return {};
  }
  try {
    return legacyApp.getCurrentSelection() || {};
  } catch {
    return {};
  }
}

function readLegacySnapshot(legacyApp) {
  if (!legacyApp?.loadSnapshot) {
    return null;
  }
  try {
    return legacyApp.loadSnapshot();
  } catch {
    return null;
  }
}

function readLegacyDirtyFlags(legacyApp) {
  if (!legacyApp?.getDirtyFlags) {
    return {};
  }
  try {
    return legacyApp.getDirtyFlags() || {};
  } catch {
    return {};
  }
}

export function createLegacyBackedStore(legacyApp) {
  const selection = readLegacySelection(legacyApp);
  const dirtyFlags = readLegacyDirtyFlags(legacyApp);
  const initialState = {
    snapshot: readLegacySnapshot(legacyApp),
    dirty: {
      snapshotDirty: Boolean(dirtyFlags.snapshotDirty),
      movementFormDirty: Boolean(dirtyFlags.movementFormDirty),
      itemEditorDirty: Boolean(dirtyFlags.itemEditorDirty)
    },
    selection: {
      movementId: selection.movementId ?? null,
      collectionName: selection.collectionName || 'entities',
      itemId: selection.itemId ?? null,
      textId: selection.textId ?? null
    }
  };

  const store = createStore(initialState);

  if (legacyApp) {
    store.subscribe(nextState => {
      if (legacyApp.setSnapshot && nextState.snapshot) {
        legacyApp.setSnapshot(nextState.snapshot);
      }
      if (legacyApp.setCurrentMovementId && nextState.selection) {
        legacyApp.setCurrentMovementId(nextState.selection.movementId ?? null);
      }
      if (legacyApp.setCurrentCollectionName && nextState.selection) {
        legacyApp.setCurrentCollectionName(
          nextState.selection.collectionName || 'entities'
        );
      }
      if (legacyApp.setCurrentItemId && nextState.selection) {
        legacyApp.setCurrentItemId(nextState.selection.itemId ?? null);
      }
      if (legacyApp.setCurrentTextId && nextState.selection) {
        legacyApp.setCurrentTextId(nextState.selection.textId ?? null);
      }
    });
  }

  return store;
}
