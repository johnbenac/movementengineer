export function createStore(initialState = {}) {
  let state = initialState;
  const subscribers = new Set();

  function getState() {
    return state;
  }

  function notify() {
    subscribers.forEach(fn => fn(state));
  }

  function setState(nextState) {
    state = nextState;
    notify();
  }

  function update(updater) {
    if (typeof updater === 'function') {
      setState(updater(state));
      return;
    }
    setState(updater);
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }

  return { getState, setState, update, subscribe };
}

export function syncStoreFromLegacy(store, legacyApp) {
  if (!store || !legacyApp || typeof legacyApp.getState !== 'function') return store;
  store.setState(legacyApp.getState());
  return store;
}
