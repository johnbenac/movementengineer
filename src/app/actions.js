export function createActions(ctx) {
  const actions = {};

  actions.markDirty = scope => {
    if (ctx?.store?.markDirty) return ctx.store.markDirty(scope);
    if (ctx?.legacy?.markDirty) return ctx.legacy.markDirty(scope);
  };

  actions.saveSnapshot = opts => {
    if (ctx?.store?.saveSnapshot) return ctx.store.saveSnapshot(opts);
    if (ctx?.legacy?.saveSnapshot) return ctx.legacy.saveSnapshot(opts);
  };

  actions.activateTab = name => {
    ctx?.shell?.activateTab?.(name);
    return ctx?.shell?.renderActiveTab?.();
  };

  const selectCollectionAndItem = (collectionName, itemId = null) => {
    if (!collectionName) return;
    if (ctx?.tabs?.collections?.setCollectionAndItem) {
      return ctx.tabs.collections.setCollectionAndItem(ctx, collectionName, itemId);
    }
    if (ctx?.store?.setState) {
      ctx.store.setState(prev => ({
        ...(prev || {}),
        currentCollectionName: collectionName,
        currentItemId: itemId
      }));
    }
  };

  actions.selectCollection = name => {
    selectCollectionAndItem(name);
    actions.activateTab?.('collections');
  };

  actions.jumpToReferencedItem = (collectionName, id) => {
    if (!collectionName || !id) return;
    if (collectionName === 'movements') {
      actions.selectMovement?.(id);
      actions.activateTab?.('dashboard');
      return;
    }
    selectCollectionAndItem(collectionName, id);
    actions.activateTab?.('collections');
  };

  actions.jumpToEntity = id => actions.jumpToReferencedItem?.('entities', id);
  actions.jumpToPractice = id => actions.jumpToReferencedItem?.('practices', id);
  actions.jumpToText = id => actions.jumpToReferencedItem?.('texts', id);

  return actions;
}
