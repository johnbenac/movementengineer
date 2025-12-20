function defaultLegacy() {
  return {
    getState: () => ({}),
    setState: () => {},
    update: () => {},
    subscribe: () => () => {}
  };
}

export function createStore(options = {}) {
  const legacy = options.legacy || defaultLegacy();
  let state = legacy.getState ? legacy.getState() : {};
  const subscribers = new Set();
  let isSyncingFromLegacy = false;
  let handledByLegacyDispatch = false;

  function notify(nextState = state) {
    subscribers.forEach(callback => {
      try {
        callback(nextState);
      } catch (err) {
        console.error('Movement Engineer store subscriber failed', err);
      }
    });
  }

  const unsubscribeLegacy = legacy.subscribe
    ? legacy.subscribe(next => {
        isSyncingFromLegacy = true;
        handledByLegacyDispatch = true;
        state = next;
        notify(state);
        isSyncingFromLegacy = false;
      })
    : null;

  function getState() {
    return state;
  }

  function setState(nextState) {
    if (!nextState) return state;
    state = nextState;
    if (!isSyncingFromLegacy && legacy.setState) {
      handledByLegacyDispatch = false;
      legacy.setState(nextState);
      if (handledByLegacyDispatch) {
        return state;
      }
    }
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
    if (typeof unsubscribeLegacy === 'function') {
      unsubscribeLegacy();
    }
  }

  return {
    getState,
    setState,
    update,
    subscribe,
    destroy
  };
}
