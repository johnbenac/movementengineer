export function createActions(ctx) {
  const actions = {};

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

  actions.openFacet = (facet, value, scope = null) => {
    if (!facet || value === undefined || value === null) return;
    const normalizedScope = scope === 'all' ? null : scope;
    ctx?.store?.update?.(prev => ({
      ...prev,
      facetExplorer: { facet, value, scope: normalizedScope }
    }));
    actions.activateTab?.('collections');
    const tab = ctx?.tabs?.collections;
    if (tab?.render) tab.render(ctx);
  };

  actions.openChipTarget = target => {
    if (!target || !target.kind) return;
    if (target.kind === 'item') {
      const tab = ctx?.tabs?.[target.collection];
      if (tab?.open) {
        tab.open(ctx, target.id);
        return;
      }
      actions.jumpToReferencedItem?.(target.collection, target.id);
      return;
    }
    if (target.kind === 'facet') {
      actions.openFacet?.(target.facet, target.value, target.scope);
      return;
    }
    console.error('Unknown chip target', target);
  };

  return actions;
}
