export function createActions(ctx) {
  const actions = {};
  const { normaliseArray } = ctx?.utils?.values || {};
  const cleanId =
    globalThis?.MovementEngineer?.cleanId ||
    (value => (value === undefined || value === null ? null : String(value).trim()));
  const normalizeIds = value => {
    if (typeof normaliseArray === 'function') return normaliseArray(value);
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value === undefined || value === null) return [];
    return [value];
  };

  function normaliseTarget(input) {
    if (!input || typeof input !== 'object') return null;
    const kind = input.kind || input.type || input.targetKind || null;

    if (kind === 'item') {
      if (!input.id) return null;
      return {
        kind: 'item',
        collection: input.collection ? String(input.collection) : null,
        id: String(input.id)
      };
    }

    if (kind === 'facet') {
      if (!input.facet || input.value === undefined || input.value === null) return null;
      return {
        kind: 'facet',
        facet: String(input.facet),
        value: String(input.value),
        scope: input.scope ? String(input.scope) : undefined
      };
    }

    return null;
  }

  function getNavigation(nav) {
    const base = nav || {};
    const stack = Array.isArray(base.stack) ? [...base.stack] : [];
    if (!stack.length) return { stack: [], index: -1 };
    const idx = typeof base.index === 'number' ? base.index : stack.length - 1;
    const index = Math.max(Math.min(idx, stack.length - 1), 0);
    return { stack, index };
  }

  function pushNavigation(nav, collectionName, itemId) {
    if (!collectionName || !itemId) return getNavigation(nav);
    const base = getNavigation(nav);
    const current = base.stack[base.index];
    if (current && current.collectionName === collectionName && current.itemId === itemId) {
      return base;
    }
    const stack = base.stack.slice(0, base.index + 1);
    stack.push({ collectionName, itemId });
    return { stack, index: stack.length - 1 };
  }

  actions.markDirty = scope => {
    if (ctx?.persistence?.markDirty) return ctx.persistence.markDirty(scope);
    if (ctx?.store?.markDirty) return ctx.store.markDirty(scope);
  };

  actions.saveSnapshot = opts => {
    if (ctx?.persistence?.save) return ctx.persistence.save(opts);
    if (ctx?.store?.saveSnapshot) return ctx.store.saveSnapshot(opts);
  };

  actions.activateTab = name => {
    ctx?.shell?.activateTab?.(name);
    return ctx?.shell?.renderActiveTab?.();
  };

  actions.openTarget = (target, options = {}) => {
    const t = normaliseTarget(target);
    if (!t) {
      ctx?.setStatus?.('Invalid navigation target');
      console.warn('openTarget: invalid target', target);
      return false;
    }
    if (t.kind === 'facet') return actions.openFacet(t.facet, t.value, t.scope, options);
    if (!t.collection || t.collection === '*') {
      const node = ctx?.store?.getState?.()?.nodeIndex?.get?.(cleanId(t.id));
      if (!node?.collectionName) {
        ctx?.setStatus?.('Item not found');
        return false;
      }
      return actions.openItem(node.collectionName, t.id, options);
    }
    return actions.openItem(t.collection, t.id, options);
  };

  actions.openFacet = (facet, value, scope, options = {}) => {
    const facetKey = facet ? String(facet).trim() : '';
    const facetValue = value !== undefined && value !== null ? String(value).trim() : '';

    if (!facetKey || !facetValue) {
      ctx?.setStatus?.('Facet target missing');
      return false;
    }

    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      facetExplorer: { facet: facetKey, value: facetValue, scope: scope || null }
    }));

    return actions.activateTab?.('collections');
  };

  actions.openMovement = (movementId, options = {}) => {
    if (!movementId) return false;
    if (typeof ctx?.actions?.selectMovement === 'function') {
      ctx.actions.selectMovement(movementId);
    } else {
      ctx?.setStatus?.('Movement selector unavailable');
      return false;
    }
    return actions.activateTab?.('dashboard');
  };

  actions.openTextCollection = shelfId => {
    if (!shelfId) return false;
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
    if (!shelf) return false;

    const bookIds = normalizeIds(shelf.rootTextIds);
    const nextBookId = bookIds[0] || null;

    actions.activateTab?.('canon');
    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentShelfId: shelfId,
      currentBookId: nextBookId,
      currentTextId: nextBookId
    }));
    return true;
  };

  actions.openText = textId => {
    if (!textId) return false;
    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const texts = Array.isArray(snapshot.texts) ? snapshot.texts : [];
    const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
    const nodeById = new Map(texts.map(t => [t?.id, t]));
    let node = nodeById.get(textId);
    if (!node) return false;

    const seen = new Set();
    let root = node;
    while (root?.parentId && !seen.has(root.parentId)) {
      seen.add(root.parentId);
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
      currentBookId: rootBookId,
      currentTextId: textId
    }));
    return true;
  };

  actions.openInCollections = (collectionName, itemId, options = {}) => {
    const collection = collectionName ? String(collectionName) : '';
    const id = itemId ? String(itemId) : '';
    if (!collection || !id) return false;

    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const coll = snapshot?.[collection];
    const exists = Array.isArray(coll) ? coll.find(it => it.id === id) : null;

    if (!exists) {
      ctx?.setStatus?.('Item not found');
      return false;
    }

    const addToHistory = options.addToHistory !== false;
    const nextNav = addToHistory
      ? pushNavigation(state.navigation, collection, id)
      : state.navigation;

    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentCollectionName: collection,
      currentItemId: id,
      navigation: nextNav
    }));

    return actions.activateTab?.('collections');
  };

  actions.openItem = (collectionName, id, options = {}) => {
    let collection = collectionName ? String(collectionName) : '';
    const itemId = id ? String(id) : '';

    if (!collection && itemId) {
      const node = ctx?.store?.getState?.()?.nodeIndex?.get?.(cleanId(itemId));
      if (node?.collectionName) {
        collection = node.collectionName;
      }
    }

    if (!collection || !itemId) return false;

    if (collection === 'movements') {
      return actions.openMovement?.(itemId, options);
    }

    if (collection === 'textCollections') {
      return actions.openTextCollection?.(itemId, options);
    }

    if (collection === 'texts') {
      return actions.openText?.(itemId, options);
    }

    if (options.mode === 'collections') {
      return actions.openInCollections?.(collection, itemId, options);
    }

    const addToHistory = options.addToHistory !== false;
    const state = ctx?.store?.getState?.() || {};
    const nextNav = addToHistory
      ? pushNavigation(state.navigation, collection, itemId)
      : state.navigation;

    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      currentCollectionName: collection,
      currentItemId: itemId,
      navigation: nextNav
    }));

    const tab = ctx?.tabs?.[collection];
    if (typeof tab?.open === 'function') {
      tab.open(ctx, itemId, options);
      return true;
    }

    return actions.activateTab?.(collection);
  };

  return actions;
}
