export function createPluginRegistry() {
  const collectionViews = new Map();
  const fieldWidgets = new Map();
  let finalized = false;

  function ensureNotFinalized() {
    if (finalized) {
      throw new Error('Plugin registry has been finalized; registration is closed.');
    }
  }

  function ensurePresent(value, label) {
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required plugin parameter: ${label}`);
    }
  }

  function normalizeOptions(options) {
    return options && typeof options === 'object' ? { ...options } : {};
  }

  function viewKey(collectionName, viewId) {
    return `${collectionName}::${viewId}`;
  }

  function widgetKey(collectionName, fieldName, widgetId) {
    return `${collectionName}::${fieldName}::${widgetId}`;
  }

  function registerCollectionView(collectionName, viewId, component, options) {
    ensureNotFinalized();
    ensurePresent(collectionName, 'collectionName');
    ensurePresent(viewId, 'viewId');
    ensurePresent(component, 'component');
    const key = viewKey(collectionName, viewId);
    if (collectionViews.has(key)) {
      throw new Error(`Collection view plugin already registered: ${collectionName}/${viewId}`);
    }
    collectionViews.set(key, {
      collectionName,
      viewId,
      component,
      options: normalizeOptions(options)
    });
  }

  function getCollectionView(collectionName, viewId) {
    if (!collectionName || !viewId) return null;
    return (
      collectionViews.get(viewKey(collectionName, viewId)) ||
      collectionViews.get(viewKey('*', viewId)) ||
      null
    );
  }

  function listCollectionViews(collectionName) {
    if (!collectionName) return [];
    return Array.from(collectionViews.values())
      .filter(view => view.collectionName === collectionName)
      .map(view => ({ viewId: view.viewId, options: view.options }));
  }

  function hasCollectionView(collectionName, viewId) {
    return collectionViews.has(viewKey(collectionName, viewId));
  }

  function registerFieldWidget({ collectionName, fieldName, widgetId, component, options }) {
    ensureNotFinalized();
    ensurePresent(collectionName, 'collectionName');
    ensurePresent(fieldName, 'fieldName');
    ensurePresent(widgetId, 'widgetId');
    ensurePresent(component, 'component');
    const key = widgetKey(collectionName, fieldName, widgetId);
    if (fieldWidgets.has(key)) {
      throw new Error(
        `Field widget plugin already registered: ${collectionName}/${fieldName}/${widgetId}`
      );
    }
    fieldWidgets.set(key, {
      collectionName,
      fieldName,
      widgetId,
      component,
      options: normalizeOptions(options)
    });
  }

  function getFieldWidget({ collectionName, fieldName, widgetId }) {
    if (!collectionName || !fieldName || !widgetId) return null;
    return (
      fieldWidgets.get(widgetKey(collectionName, fieldName, widgetId)) ||
      fieldWidgets.get(widgetKey(collectionName, '*', widgetId)) ||
      fieldWidgets.get(widgetKey('*', '*', widgetId)) ||
      null
    );
  }

  function hasFieldWidget({ collectionName, fieldName, widgetId }) {
    return fieldWidgets.has(widgetKey(collectionName, fieldName, widgetId));
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
