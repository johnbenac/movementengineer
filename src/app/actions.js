export function createActions(ctx) {
  const actions = {};

  const getTab = name => ctx?.tabs?.[name] || null;

  actions.markDirty = scope => {
    if (ctx?.store?.markDirty) return ctx.store.markDirty(scope);
  };

  actions.saveSnapshot = opts => {
    if (ctx?.store?.saveSnapshot) return ctx.store.saveSnapshot(opts);
  };

  actions.activateTab = name => {
    ctx?.shell?.activateTab?.(name);
    return ctx?.shell?.renderActiveTab?.();
  };

  actions.selectCollection = name => {
    if (!name) return;
    ctx?.store?.setState?.(prev => ({
      ...prev,
      currentCollectionName: name,
      currentItemId: null
    }));
  };

  actions.setCollectionAndItem = (collectionName, itemId, options) => {
    if (ctx?.tabs?.collections?.setCollectionAndItem) {
      return ctx.tabs.collections.setCollectionAndItem(ctx, collectionName, itemId, options);
    }
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) return null;
    const exists = itemId ? coll.find(it => it.id === itemId) : null;
    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentCollectionName: collectionName || prev?.currentCollectionName,
      currentItemId: exists ? exists.id : null
    }));
    return ctx?.store?.getState?.() || null;
  };

  actions.jumpToReferencedItem = (collectionName, itemId) => {
    if (!collectionName || !itemId) return null;
    if (ctx?.tabs?.collections?.jumpToReferencedItem) {
      return ctx.tabs.collections.jumpToReferencedItem(ctx, collectionName, itemId);
    }

    if (collectionName === 'movements') {
      actions.selectMovement?.(itemId);
      actions.activateTab?.('dashboard');
      return null;
    }

    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) return null;
    const exists = coll.find(it => it.id === itemId);
    if (!exists) return null;

    actions.setCollectionAndItem?.(collectionName, itemId, { addToHistory: true });
    actions.activateTab?.('collections');
    return { collectionName, itemId };
  };

  actions.jumpToPractice = practiceId =>
    actions.jumpToReferencedItem?.('practices', practiceId);
  actions.jumpToEntity = entityId => actions.jumpToReferencedItem?.('entities', entityId);
  actions.jumpToText = textId => actions.jumpToReferencedItem?.('texts', textId);

  actions.openFacet = (facet, value, scope) => {
    if (!facet || value === undefined || value === null) return null;
    const target = { facet, value, scope };
    if (ctx?.tabs?.collections?.openFacet) {
      return ctx.tabs.collections.openFacet(ctx, target);
    }
    return null;
  };

  const dedicatedTabForCollection = {
    claims: 'claims',
    rules: 'rules',
    entities: 'entities',
    practices: 'practices',
    events: 'calendar',
    texts: 'canon',
    textCollections: 'canon',
    media: 'media',
    notes: 'notes'
  };

  actions.openChipTarget = target => {
    if (!target || !target.kind) return null;
    if (target.kind === 'facet') {
      return actions.openFacet?.(target.facet, target.value, target.scope);
    }
    if (target.kind === 'item') {
      const { collection, id } = target;
      const tabName = dedicatedTabForCollection[collection];
      const tab = tabName ? getTab(tabName) : null;
      if (tab && typeof tab.open === 'function') {
        return tab.open(ctx, id, collection);
      }
      return actions.jumpToReferencedItem?.(collection, id);
    }
    ctx.setStatus?.('Unknown chip target');
    return null;
  };

  return actions;
}
