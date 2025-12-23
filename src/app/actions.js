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
    const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
    const shelf = shelves.find(tc => tc?.id === shelfId);
    actions.activateTab?.('canon');
    if (!shelf) return null;
    const rootTextIds = normaliseArray(shelf.rootTextIds);
    const nextBookId = rootTextIds[0] || null;
    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentShelfId: shelfId,
      currentBookId: nextBookId,
      currentTextId: nextBookId
    }));
    return { shelfId, bookId: nextBookId, textId: nextBookId };
  };

  actions.jumpToText = textId => {
    if (!textId) return null;
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const texts = Array.isArray(snapshot.texts) ? snapshot.texts : [];
    const textsById = new Map(texts.filter(t => t?.id).map(t => [String(t.id), t]));
    const startId = String(textId);
    let rootBookId = startId;
    const visited = new Set();
    while (textsById.has(rootBookId)) {
      if (visited.has(rootBookId)) break;
      visited.add(rootBookId);
      const node = textsById.get(rootBookId);
      if (!node?.parentId) break;
      rootBookId = String(node.parentId);
    }

    const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
    const currentShelfHasBook = shelves.some(
      tc => tc?.id === state.currentShelfId && normaliseArray(tc.rootTextIds).includes(rootBookId)
    );
    let nextShelfId = currentShelfHasBook ? state.currentShelfId : null;
    if (!nextShelfId) {
      const shelfWithBook = shelves.find(tc =>
        normaliseArray(tc.rootTextIds).includes(rootBookId)
      );
      nextShelfId = shelfWithBook?.id || null;
    }
    if (!nextShelfId) nextShelfId = state.currentShelfId || null;

    const nextBookId = rootBookId || state.currentBookId;
    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentShelfId: nextShelfId ?? prev?.currentShelfId ?? null,
      currentBookId: nextBookId || prev?.currentBookId || null,
      currentTextId: startId || prev?.currentTextId || null
    }));
    actions.activateTab?.('canon');
    return { shelfId: nextShelfId, bookId: nextBookId, textId: startId };
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
      if (target.collection === 'textCollections' && typeof actions.jumpToTextCollection === 'function') {
        const opened = actions.jumpToTextCollection(target.id);
        if (opened !== false) return opened;
      }
      if (target.collection === 'texts' && typeof actions.jumpToText === 'function') {
        const opened = actions.jumpToText(target.id);
        if (opened !== false) return opened;
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
