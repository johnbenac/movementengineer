import { CHIP_KINDS } from './ui/chips.js';

function openViaTab(ctx, collectionName, itemId) {
  const tabNameByCollection = {
    entities: 'entities',
    practices: 'practices',
    rules: 'rules',
    claims: 'claims',
    texts: 'canon',
    notes: 'notes',
    media: 'media',
    events: 'calendar'
  };
  const tabName = tabNameByCollection[collectionName] || null;
  const tab = tabName ? ctx?.tabs?.[tabName] : null;
  if (tab?.open) {
    tab.open(ctx, itemId);
    return true;
  }
  return false;
}

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
    if (!facet || value === undefined || value === null) {
      ctx?.setStatus?.('Invalid facet target');
      return null;
    }

    const state = ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const ViewModels = ctx?.services?.ViewModels;
    let nextCollection = null;
    let nextId = null;
    if (typeof ViewModels?.buildFacetExplorerViewModel === 'function') {
      const vm = ViewModels.buildFacetExplorerViewModel(snapshot, {
        movementId: state.currentMovementId,
        facet,
        value,
        scope: scope || null
      });
      if (vm?.results?.length) {
        nextCollection = vm.results[0].collectionName;
        nextId = vm.results[0].id;
      }
    }

    ctx?.store?.setState?.(prev => ({
      ...(prev || {}),
      facetExplorer: { facet, value, scope: scope || null },
      currentCollectionName: nextCollection || prev.currentCollectionName,
      currentItemId: nextId || null
    }));
    actions.activateTab?.('collections');
    return { facet, value, scope };
  };

  actions.clearFacetExplorer = () => {
    ctx?.store?.setState?.(prev => ({ ...(prev || {}), facetExplorer: null }));
  };

  actions.openChipTarget = target => {
    if (!target || !target.kind) {
      ctx?.setStatus?.('Unknown chip target');
      return null;
    }
    if (target.kind === CHIP_KINDS.ITEM) {
      const { collection, id } = target;
      if (!collection || !id) {
        ctx?.setStatus?.('Missing chip target metadata');
        return null;
      }
      if (collection === 'movements') {
        actions.selectMovement?.(id);
        actions.activateTab?.('dashboard');
        return { collection, id };
      }
      if (openViaTab(ctx, collection, id)) return { collection, id };
      return actions.jumpToReferencedItem?.(collection, id);
    }
    if (target.kind === CHIP_KINDS.FACET) {
      const { facet, value, scope } = target;
      return actions.openFacet?.(facet, value, scope);
    }
    ctx?.setStatus?.('Unsupported chip target');
    return null;
  };

  return actions;
}
