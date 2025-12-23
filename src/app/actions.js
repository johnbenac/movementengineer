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
  actions.jumpToText = textId => {
    if (!textId) return null;
    const targetId = String(textId);
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const texts = Array.isArray(snapshot.texts) ? snapshot.texts : [];
    const byId = new Map(texts.filter(t => t && t.id).map(t => [t.id, t]));
    const node = byId.get(targetId);
    if (!node) return null;

    let root = node;
    while (root.parentId && byId.get(root.parentId)) {
      root = byId.get(root.parentId);
    }
    const rootBookId = String(root.id);

    const collections = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
    const containsRoot = shelf =>
      Array.isArray(shelf?.rootTextIds) && shelf.rootTextIds.some(id => String(id) === rootBookId);

    let nextShelfId = null;
    if (state.currentShelfId && collections.some(shelf => String(shelf.id) === String(state.currentShelfId))) {
      nextShelfId = collections.find(
        shelf => String(shelf.id) === String(state.currentShelfId) && containsRoot(shelf)
      )
        ? state.currentShelfId
        : null;
    }
    if (!nextShelfId) {
      const firstContaining = collections.find(containsRoot);
      if (firstContaining) {
        nextShelfId = firstContaining.id;
      } else {
        nextShelfId = state.currentShelfId || null;
      }
    }

    actions.activateTab?.('canon');
    const nextState = {
      currentShelfId: nextShelfId,
      currentBookId: rootBookId,
      currentTextId: targetId
    };
    ctx?.store?.update?.(prev => ({ ...(prev || {}), ...nextState }));
    return nextState;
  };

  actions.openFacet = (facet, value, scope) => {
    if (ctx?.tabs?.collections?.openFacet) {
      return ctx.tabs.collections.openFacet(ctx, facet, value, scope);
    }
    ctx?.setStatus?.('Facet explorer unavailable');
    return null;
  };

  actions.jumpToTextCollection = shelfId => {
    if (!shelfId) return null;
    const targetShelfId = String(shelfId);
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
    const shelf = shelves.find(tc => tc && String(tc.id) === targetShelfId);
    if (!shelf) return null;

    const rootIds = Array.isArray(shelf.rootTextIds)
      ? shelf.rootTextIds.filter(Boolean).map(String)
      : [];
    const nextBookId = rootIds[0] || null;

    actions.activateTab?.('canon');
    const nextState = {
      currentShelfId: targetShelfId,
      currentBookId: nextBookId,
      currentTextId: nextBookId
    };
    ctx?.store?.update?.(prev => ({ ...(prev || {}), ...nextState }));
    return nextState;
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
      if (target.collection === 'textCollections' && typeof actions.jumpToTextCollection === 'function') {
        const opened = actions.jumpToTextCollection(target.id);
        if (opened !== false && opened !== null && opened !== undefined) return opened;
      }
      if (target.collection === 'texts' && typeof actions.jumpToText === 'function') {
        const opened = actions.jumpToText(target.id);
        if (opened !== false && opened !== null && opened !== undefined) return opened;
      }
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
