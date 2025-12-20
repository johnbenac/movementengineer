const noop = () => {};

export function createStore(options = {}) {
  const {
    initialState = {},
    getLegacyState = null,
    setLegacyState = null
  } = options;

  let state = initialState;
  const subscribers = new Set();

  const read = () =>
    typeof getLegacyState === 'function' ? getLegacyState() : state;

  const notify = nextState => {
    subscribers.forEach(fn => {
      try {
        fn(nextState);
      } catch (error) {
        console.error('Store subscriber threw', error);
      }
    });
  };

  const write = nextState => {
    const appliedState =
      typeof setLegacyState === 'function'
        ? setLegacyState(nextState)
        : nextState;
    state = appliedState;
    notify(read());
    return read();
  };

  const setState = nextState => {
    if (!nextState) return read();
    return write(nextState);
  };

  const update = updater => {
    if (typeof updater !== 'function') return read();
    const result = updater(read());
    return setState(result);
  };

  const subscribe = handler => {
    if (typeof handler !== 'function') return noop;
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  };

  return {
    getState: read,
    setState,
    update,
    subscribe
  };
}
