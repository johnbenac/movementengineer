function requireParam(name, value) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`[plugins] Missing required parameter: ${name}`);
  }
}

function createViewKey(collectionName, viewId) {
  return `${collectionName}::${viewId}`;
}

function createWidgetKey(collectionName, fieldName, widgetId) {
  return `${collectionName}::${fieldName}::${widgetId}`;
}

export function createPluginRegistry() {
  const viewRegistry = new Map();
  const widgetRegistry = new Map();
  let finalized = false;

  function ensureNotFinalized() {
    if (finalized) {
      throw new Error('[plugins] Registry is finalized; no further registrations allowed.');
    }
  }

  function registerCollectionView(collectionName, viewId, component, options = {}) {
    ensureNotFinalized();
    requireParam('collectionName', collectionName);
    requireParam('viewId', viewId);
    requireParam('component', component);

    const key = createViewKey(collectionName, viewId);
    if (viewRegistry.has(key)) {
      throw new Error(`[plugins] Duplicate collection view registration: ${key}`);
    }

    viewRegistry.set(key, {
      collectionName,
      viewId,
      component,
      options: options || {}
    });
  }

  function getCollectionView(collectionName, viewId) {
    requireParam('collectionName', collectionName);
    requireParam('viewId', viewId);

    const exactKey = createViewKey(collectionName, viewId);
    if (viewRegistry.has(exactKey)) {
      return viewRegistry.get(exactKey);
    }

    const wildcardKey = createViewKey('*', viewId);
    return viewRegistry.get(wildcardKey) || null;
  }

  function listCollectionViews(collectionName) {
    requireParam('collectionName', collectionName);
    const entries = [];
    viewRegistry.forEach(value => {
      if (value.collectionName === collectionName) {
        entries.push({ viewId: value.viewId, options: value.options || {} });
      }
    });
    return entries;
  }

  function hasCollectionView(collectionName, viewId) {
    requireParam('collectionName', collectionName);
    requireParam('viewId', viewId);
    return viewRegistry.has(createViewKey(collectionName, viewId));
  }

  function registerFieldWidget({ collectionName, fieldName, widgetId, component, options = {} }) {
    ensureNotFinalized();
    requireParam('collectionName', collectionName);
    requireParam('fieldName', fieldName);
    requireParam('widgetId', widgetId);
    requireParam('component', component);

    const key = createWidgetKey(collectionName, fieldName, widgetId);
    if (widgetRegistry.has(key)) {
      throw new Error(`[plugins] Duplicate field widget registration: ${key}`);
    }

    widgetRegistry.set(key, {
      collectionName,
      fieldName,
      widgetId,
      component,
      options: options || {}
    });
  }

  function getFieldWidget({ collectionName, fieldName, widgetId }) {
    requireParam('collectionName', collectionName);
    requireParam('fieldName', fieldName);
    requireParam('widgetId', widgetId);

    const exactKey = createWidgetKey(collectionName, fieldName, widgetId);
    if (widgetRegistry.has(exactKey)) {
      return widgetRegistry.get(exactKey);
    }

    const collectionWideKey = createWidgetKey(collectionName, '*', widgetId);
    if (widgetRegistry.has(collectionWideKey)) {
      return widgetRegistry.get(collectionWideKey);
    }

    const globalKey = createWidgetKey('*', '*', widgetId);
    return widgetRegistry.get(globalKey) || null;
  }

  function hasFieldWidget({ collectionName, fieldName, widgetId }) {
    requireParam('collectionName', collectionName);
    requireParam('fieldName', fieldName);
    requireParam('widgetId', widgetId);
    return widgetRegistry.has(createWidgetKey(collectionName, fieldName, widgetId));
  }

  function finalize() {
    finalized = true;
  }

  function isFinalized() {
    return finalized;
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
