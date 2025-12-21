export function createActions(ctx) {
  const actions = {};

  actions.markDirty = scope => {
    if (ctx?.store?.markDirty) return ctx.store.markDirty(scope);
    if (ctx?.legacy?.markDirty) return ctx.legacy.markDirty(scope);
    console.warn('markDirty is unavailable');
  };

  actions.saveSnapshot = opts => {
    if (ctx?.store?.saveSnapshot) return ctx.store.saveSnapshot(opts);
    if (ctx?.legacy?.saveSnapshot) return ctx.legacy.saveSnapshot(opts);
    console.warn('saveSnapshot is unavailable');
  };

  actions.activateTab = name => {
    ctx?.shell?.activateTab?.(name);
    return ctx?.shell?.renderActiveTab?.();
  };

  actions.jumpToReferencedItem = (collectionName, id) => {
    if (!collectionName || !id) return;
    ctx.store?.setState?.(prev => ({
      ...prev,
      currentCollectionName: collectionName,
      currentItemId: id
    }));
    actions.activateTab?.('collections');
  };

  actions.selectCollection = name => {
    ctx.store?.setState?.(prev => ({
      ...prev,
      currentCollectionName: name || prev.currentCollectionName,
      currentItemId: null
    }));
  };

  return actions;
}
