function assertNotFinalized(state) {
  if (state.finalized) {
    throw new Error('Plugin registry has been finalized.');
  }
}

function assertRequired(value, label) {
  if (!value) {
    throw new Error(`Missing required plugin registration field: ${label}`);
  }
}

function makeViewKey(collectionName, viewId) {
  return `${collectionName}::${viewId}`;
}

function makeWidgetKey(collectionName, fieldName, widgetId) {
  return `${collectionName}::${fieldName}::${widgetId}`;
}

export function createPluginRegistry() {
  const state = {
    finalized: false,
    collectionViews: new Map(),
    fieldWidgets: new Map()
  };

  function registerCollectionView(collectionName, viewId, component, options = {}) {
    assertNotFinalized(state);
    assertRequired(collectionName, 'collectionName');
    assertRequired(viewId, 'viewId');
    assertRequired(component, 'component');

    const key = makeViewKey(collectionName, viewId);
    if (state.collectionViews.has(key)) {
      throw new Error(`Duplicate collection view registration: ${collectionName}:${viewId}`);
    }

    state.collectionViews.set(key, {
      collectionName,
      viewId,
      component,
      options: options || {}
    });
  }

  function getCollectionView(collectionName, viewId) {
    if (!collectionName || !viewId) return null;
    const exact = state.collectionViews.get(makeViewKey(collectionName, viewId));
    if (exact) return exact;
    const wildcard = state.collectionViews.get(makeViewKey('*', viewId));
    if (wildcard) return wildcard;
    return null;
  }

  function listCollectionViews(collectionName) {
    if (!collectionName) return [];
    const results = [];
    state.collectionViews.forEach(entry => {
      if (entry.collectionName === collectionName) {
        results.push({ viewId: entry.viewId, options: entry.options });
      }
    });
    return results;
  }

  function hasCollectionView(collectionName, viewId) {
    return Boolean(getCollectionView(collectionName, viewId));
  }

  function registerFieldWidget({ collectionName, fieldName, widgetId, component, options = {} }) {
    assertNotFinalized(state);
    assertRequired(collectionName, 'collectionName');
    assertRequired(fieldName, 'fieldName');
    assertRequired(widgetId, 'widgetId');
    assertRequired(component, 'component');

    const key = makeWidgetKey(collectionName, fieldName, widgetId);
    if (state.fieldWidgets.has(key)) {
      throw new Error(
        `Duplicate field widget registration: ${collectionName}:${fieldName}:${widgetId}`
      );
    }

    state.fieldWidgets.set(key, {
      collectionName,
      fieldName,
      widgetId,
      component,
      options: options || {}
    });
  }

  function getFieldWidget({ collectionName, fieldName, widgetId }) {
    if (!collectionName || !fieldName || !widgetId) return null;
    const exact = state.fieldWidgets.get(makeWidgetKey(collectionName, fieldName, widgetId));
    if (exact) return exact;
    const collectionWide = state.fieldWidgets.get(makeWidgetKey(collectionName, '*', widgetId));
    if (collectionWide) return collectionWide;
    const global = state.fieldWidgets.get(makeWidgetKey('*', '*', widgetId));
    if (global) return global;
    return null;
  }

  function hasFieldWidget({ collectionName, fieldName, widgetId }) {
    return Boolean(getFieldWidget({ collectionName, fieldName, widgetId }));
  }

  function finalize() {
    state.finalized = true;
  }

  function isFinalized() {
    return state.finalized;
  }

  return {
    registerCollectionView,
    getCollectionView,
    listCollectionViews,
    hasCollectionView,
    registerFieldWidget,
    getFieldWidget,
    hasFieldWidget,
    finalize,
    isFinalized
  };
}
