export function createActions(ctx) {
  const actions = {};

  actions.markDirty = scope => {
    if (ctx?.store?.markDirty) return ctx.store.markDirty(scope);
    // Temporary bridge while legacy store is still present elsewhere.
    if (ctx?.legacy?.markDirty) return ctx.legacy.markDirty(scope);
  };

  actions.saveSnapshot = opts => {
    if (ctx?.store?.saveSnapshot) return ctx.store.saveSnapshot(opts);
    // Temporary bridge while legacy store is still present elsewhere.
    if (ctx?.legacy?.saveSnapshot) return ctx.legacy.saveSnapshot(opts);
  };

  actions.activateTab = name => {
    ctx?.shell?.activateTab?.(name);
    return ctx?.shell?.renderActiveTab?.();
  };

  actions.setCollectionAndItem = (collectionName, itemId, options) =>
    ctx?.tabs?.collections?.setCollectionAndItem?.(ctx, collectionName, itemId, options);

  actions.jumpToReferencedItem = (collectionName, itemId) =>
    ctx?.tabs?.collections?.jumpToReferencedItem?.(ctx, collectionName, itemId);

  actions.navigateCollectionHistory = direction =>
    ctx?.tabs?.collections?.navigateHistory?.(ctx, direction);

  actions.selectCollection = name => {
    if (!name) return;
    ctx?.store?.setState?.(prev => ({
      ...prev,
      currentCollectionName: name,
      currentItemId: null
    }));
  };

  actions.jumpToMovement = movementId => {
    if (!movementId) return;
    ctx?.store?.setState?.(prev => ({
      ...prev,
      currentMovementId: movementId
    }));
    actions.activateTab?.('dashboard');
  };

  return actions;
}
