import { getModelForSnapshot } from '../ui/schemaDoc.js';
import { createTab } from './tabKit.js';
import { CollectionCrudView } from '../../ui/genericCrud/CollectionCrudView.js';

function getModelRegistry() {
  return globalThis?.ModelRegistry || null;
}

function titleCase(label) {
  if (!label) return '';
  const normalized = String(label)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  return normalized
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function resolveCollectionLabel(collectionDef, collectionName) {
  return (
    collectionDef?.ui?.label ||
    titleCase(collectionName || '') ||
    collectionDef?.typeName
  );
}

function getCollectionOrder(model) {
  const registry = getModelRegistry();
  if (registry?.listCollections && model?.specVersion) {
    return registry.listCollections(model.specVersion);
  }
  return Object.keys(model?.collections || {});
}

function createCollectionTab(ctx, collectionName) {
  const state = {
    selectedRecordId: null,
    mode: 'view',
    search: '',
    sortMode: 'title',
    draft: null,
    activeViewId: null
  };

  return createTab(ctx, {
    name: collectionName,
    render: () => {
      const container = ctx.tabManager?.getPanelBodyEl(collectionName);
      if (!container) return;
      CollectionCrudView({
        ctx,
        containerEl: container,
        collectionName,
        state,
        setState: patch => {
          Object.assign(state, patch || {});
          state.rerender?.({ immediate: true });
        }
      });
    },
    setup: ({ rerender }) => {
      state.rerender = rerender;
    },
    extend: {
      __state: state,
      open(context, itemId) {
        state.selectedRecordId = itemId || null;
        state.mode = 'view';
        state.draft = null;
        context?.store?.setState?.(prev => ({
          ...(prev || {}),
          currentCollectionName: collectionName,
          currentItemId: itemId || null
        }));
        context?.actions?.activateTab?.(collectionName);
        return { itemId };
      }
    }
  });
}

export function registerCollectionTabs(ctx, overrides = {}) {
  const tabManager = ctx.tabManager;
  if (!tabManager) return { rebuild: () => {} };

  let activeCollections = [];

  function buildTabs() {
    const snapshot = ctx.store.getState().snapshot || {};
    const model = getModelForSnapshot(snapshot);
    if (!model) return;

    const order = getCollectionOrder(model);
    const nextCollections = order.filter(name => model.collections?.[name]);

    const removed = activeCollections.filter(name => !nextCollections.includes(name));
    removed.forEach(name => {
      const tab = ctx.tabs?.[name];
      if (tab?.unmount) tab.unmount(ctx);
      if (ctx.tabs) delete ctx.tabs[name];
      tabManager.removeTab(name);
    });

    nextCollections.forEach(collectionName => {
      const collectionDef = model.collections?.[collectionName] || {};
      const label = resolveCollectionLabel(collectionDef, collectionName);
      tabManager.ensureTab({
        id: collectionName,
        label,
        group: 'collection'
      });

      if (!ctx.tabs?.[collectionName]) {
        const override = overrides[collectionName];
        if (typeof override === 'function') {
          override(ctx);
        }
      }

      if (!ctx.tabs?.[collectionName]) {
        createCollectionTab(ctx, collectionName);
      }
    });

    activeCollections = nextCollections;
  }

  buildTabs();

  const initialSnapshot = ctx.store.getState().snapshot || {};
  const initialModel = getModelForSnapshot(initialSnapshot);
  let lastModelKey = initialModel
    ? `${initialModel.specVersion || 'unknown'}::${Object.keys(initialModel.collections || {}).join(',')}`
    : null;
  ctx.subscribe(() => {
    const snapshot = ctx.store.getState().snapshot || {};
    const model = getModelForSnapshot(snapshot);
    if (!model) return;
    const nextKey = `${model.specVersion || 'unknown'}::${Object.keys(model.collections || {}).join(',')}`;
    if (nextKey !== lastModelKey) {
      lastModelKey = nextKey;
      buildTabs();
    }
  });

  return {
    rebuild: buildTabs
  };
}
