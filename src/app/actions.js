export function createActions(ctx) {
  const actions = {};
  const { normaliseArray } = ctx?.utils?.values || {};
  const normalizeIds = value => {
    if (typeof normaliseArray === 'function') return normaliseArray(value);
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value === undefined || value === null) return [];
    return [value];
  };

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
    const bookIds = normalizeIds(shelf.rootTextIds);
    const nextBookId = bookIds[0] || null;
    const nextTextId = nextBookId;
    actions.activateTab?.('canon');
    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentShelfId: shelfId,
      currentBookId: nextBookId,
      currentTextId: nextTextId
    }));
    return { shelfId, bookId: nextBookId, textId: nextTextId };
  };
  actions.jumpToText = textId => {
    if (!textId) return null;
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const texts = Array.isArray(snapshot.texts) ? snapshot.texts : [];
    const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
    const nodeById = new Map(texts.map(t => [t?.id, t]));
    let node = nodeById.get(textId);
    if (!node) return null;
    let root = node;
    while (root?.parentId) {
      const parent = nodeById.get(root.parentId);
      if (!parent) break;
      root = parent;
    }
    const rootBookId = root?.id || null;

    const shelvesWithRoot = shelves.filter(shelf =>
      normalizeIds(shelf.rootTextIds).includes(rootBookId)
    );
    const currentShelfId = state.currentShelfId;
    let shelfId = currentShelfId;
    if (!shelfId || !shelvesWithRoot.some(shelf => shelf.id === shelfId)) {
      shelfId = shelvesWithRoot[0]?.id || currentShelfId || null;
    }

    actions.activateTab?.('canon');
    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentShelfId: shelfId,
      currentBookId: rootBookId || null,
      currentTextId: textId
    }));
    return { shelfId, bookId: rootBookId, textId };
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
        if (opened !== null) return opened;
      }
      if (target.collection === 'texts') {
        const opened = actions.jumpToText?.(target.id);
        if (opened !== null) return opened;
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
