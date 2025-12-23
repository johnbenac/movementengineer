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

  actions.openFacet = (facet, value, scope) => {
    if (ctx?.tabs?.collections?.openFacet) {
      return ctx.tabs.collections.openFacet(ctx, facet, value, scope);
    }
    ctx?.setStatus?.('Facet explorer unavailable');
    return null;
  };

  actions.openChipTarget = target => {
    if (!target || !target.kind) {
      ctx?.setStatus?.('Chip missing target');
      console.error('Chip activation missing target payload', target);
      return null;
    }

    if (target.kind === 'facet') {
      return actions.openFacet?.(target.facet, target.value, target.scope);
    }

    if (target.kind === 'item') {
      const tabOpeners = {
        claims: ctx?.tabs?.claims?.open,
        rules: ctx?.tabs?.rules?.open,
        entities: ctx?.tabs?.entities?.open,
        practices: ctx?.tabs?.practices?.open
      };
      const open = tabOpeners[target.collection];
      if (typeof open === 'function') {
        const opened = open(ctx, target.id);
        if (opened !== false) return opened;
      }
      return actions.jumpToReferencedItem?.(target.collection, target.id);
    }

    ctx?.setStatus?.('Unknown chip target');
    return null;
  };

  return actions;
}
