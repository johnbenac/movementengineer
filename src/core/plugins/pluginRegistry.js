export function createPluginRegistry() {
  const collectionViews = new Map();
  const fieldWidgets = new Map();
  let finalized = false;

  function assertNotFinalized() {
    if (finalized) {
      throw new Error('Plugin registry has been finalized.');
    }
  }

  function assertRequired(value, name) {
    if (!value) {
      throw new Error(`Missing required parameter: ${name}`);
    }
  }

  function assertComponent(component) {
    if (typeof component !== 'function') {
      throw new Error('Plugin component must be a function.');
    }
  }

  function viewKey(collectionName, viewId) {
    return `${collectionName}::${viewId}`;
  }

  function widgetKey(collectionName, fieldName, widgetId) {
    return `${collectionName}::${fieldName}::${widgetId}`;
  }

  function registerCollectionView(collectionName, viewId, component, options = {}) {
    assertNotFinalized();
    assertRequired(collectionName, 'collectionName');
    assertRequired(viewId, 'viewId');
    assertComponent(component);
    const key = viewKey(collectionName, viewId);
    if (collectionViews.has(key)) {
      throw new Error(`Collection view already registered: ${collectionName}/${viewId}`);
    }
    collectionViews.set(key, {
      component,
      options: options || {},
      collectionName,
      viewId
    });
  }

  function getCollectionView(collectionName, viewId) {
    if (!collectionName || !viewId) return null;
    const exact = collectionViews.get(viewKey(collectionName, viewId));
    if (exact) return exact;
    const wildcard = collectionViews.get(viewKey('*', viewId));
    if (wildcard) return wildcard;
    return null;
  }

  function listCollectionViews(collectionName) {
    const list = [];
    collectionViews.forEach(value => {
      if (value.collectionName !== collectionName) return;
      list.push({ viewId: value.viewId, options: value.options || {} });
    });
    return list;
  }

  function hasCollectionView(collectionName, viewId) {
    return Boolean(getCollectionView(collectionName, viewId));
  }

  function registerFieldWidget({
    collectionName,
    fieldName,
    widgetId,
    component,
    options = {}
  }) {
    assertNotFinalized();
    assertRequired(collectionName, 'collectionName');
    assertRequired(fieldName, 'fieldName');
    assertRequired(widgetId, 'widgetId');
    assertComponent(component);
    const key = widgetKey(collectionName, fieldName, widgetId);
    if (fieldWidgets.has(key)) {
      throw new Error(
        `Field widget already registered: ${collectionName}/${fieldName}/${widgetId}`
      );
    }
    fieldWidgets.set(key, {
      component,
      options: options || {},
      collectionName,
      fieldName,
      widgetId
    });
  }

  function getFieldWidget({ collectionName, fieldName, widgetId }) {
    if (!collectionName || !fieldName || !widgetId) return null;
    const exact = fieldWidgets.get(widgetKey(collectionName, fieldName, widgetId));
    if (exact) return { component: exact.component, options: exact.options || {} };
    const collectionWide = fieldWidgets.get(widgetKey(collectionName, '*', widgetId));
    if (collectionWide) {
      return { component: collectionWide.component, options: collectionWide.options || {} };
    }
    const global = fieldWidgets.get(widgetKey('*', '*', widgetId));
    if (global) return { component: global.component, options: global.options || {} };
    return null;
  }

  function hasFieldWidget({ collectionName, fieldName, widgetId }) {
    return Boolean(getFieldWidget({ collectionName, fieldName, widgetId }));
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
