import { normaliseArray } from './utils/values.js';

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

  actions.jumpToTextCollection = shelfId => {
    if (!shelfId) return null;
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
    if (!shelf) return null;
    const rootIds = normaliseArray(shelf.rootTextIds);
    const firstRootId = rootIds[0] || null;
    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentShelfId: shelfId,
      currentBookId: firstRootId,
      currentTextId: firstRootId
    }));
    actions.activateTab?.('canon');
    return { shelfId, bookId: firstRootId };
  };

  actions.jumpToText = textId => {
    if (!textId) return null;
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const texts = Array.isArray(snapshot.texts) ? snapshot.texts : [];
    const byId = new Map(texts.map(t => [t?.id, t]).filter(([id]) => id));
    const node = byId.get(textId);
    if (!node) return actions.jumpToReferencedItem?.('texts', textId);

    let root = node;
    while (root?.parentId && byId.get(root.parentId)) {
      root = byId.get(root.parentId);
    }
    const rootId = root?.id || textId;
    const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
    const shelfCandidates = shelves.filter(tc => normaliseArray(tc.rootTextIds).includes(rootId));
    let shelfId = state.currentShelfId;
    if (!shelfId || !shelfCandidates.some(tc => tc.id === shelfId)) {
      shelfId = shelfCandidates[0]?.id || shelfId || null;
    }

    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentShelfId: shelfId ?? prev?.currentShelfId ?? null,
      currentBookId: rootId,
      currentTextId: textId
    }));
    actions.activateTab?.('canon');
    return { shelfId: shelfId ?? null, bookId: rootId, textId };
  };

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
      if (target.collection === 'textCollections') {
        const opened = actions.jumpToTextCollection?.(target.id);
        if (opened !== false) return opened;
      } else if (target.collection === 'texts') {
        const opened = actions.jumpToText?.(target.id);
        if (opened !== false) return opened;
      } else {
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
    }

    ctx?.setStatus?.('Unknown chip target');
    return null;
  };

  return actions;
}
