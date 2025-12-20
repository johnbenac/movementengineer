const legacyStore = () => (globalThis.ME && globalThis.ME.store) || globalThis.__movementLegacyStore || null;

let fallbackState = {};
const fallbackSubscribers = new Set();

function publishFallback() {
  fallbackSubscribers.forEach(cb => {
    try {
      cb(fallbackState);
    } catch (err) {
      console.error('Store subscriber failed', err);
    }
  });
}

export function getState() {
  const adapter = legacyStore();
  if (adapter && typeof adapter.getState === 'function') {
    return adapter.getState();
  }
  return fallbackState;
}

export function setState(next) {
  const adapter = legacyStore();
  if (adapter && typeof adapter.setState === 'function') {
    return adapter.setState(next);
  }
  fallbackState = next;
  publishFallback();
  return fallbackState;
}

export function update(updater) {
  const adapter = legacyStore();
  if (adapter && typeof adapter.update === 'function') {
    return adapter.update(updater);
  }
  if (typeof updater !== 'function') return getState();
  const next = updater(getState());
  if (next && typeof next === 'object') {
    return setState(next);
  }
  return getState();
}

export function subscribe(callback) {
  const adapter = legacyStore();
  if (adapter && typeof adapter.subscribe === 'function') {
    return adapter.subscribe(callback);
  }
  if (typeof callback !== 'function') return () => {};
  fallbackSubscribers.add(callback);
  try {
    callback(getState());
  } catch (err) {
    console.error('Store subscriber failed on attach', err);
  }
  return () => fallbackSubscribers.delete(callback);
}
