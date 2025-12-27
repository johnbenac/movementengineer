import { getModelForSnapshot } from '../ui/schemaDoc.js';
import { createTab } from './tabKit.js';
import { CollectionCrudView } from '../../ui/genericCrud/CollectionCrudView.js';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function titleCase(value) {
  if (!value) return '';
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function resolveCollectionOrder(model) {
  const registry = getModelRegistry();
  if (registry?.listCollections) {
    return registry.listCollections(model?.specVersion);
  }
  if (Array.isArray(model?.collectionsOrder)) {
    return model.collectionsOrder;
  }
  return Object.keys(model?.collections || {});
}

function getCollectionLabel(collectionName, collectionDef) {
  return (
    collectionDef?.ui?.label ||
    titleCase(collectionName) ||
    collectionDef?.typeName
  );
}

export function registerCollectionTabs(ctx) {
  if (!ctx?.tabManager) {
    throw new Error('registerCollectionTabs: ctx.tabManager is required');
  }

  const stateByCollection = new Map();
  let lastSignature = null;

  function ensureState(collectionName) {
    if (!stateByCollection.has(collectionName)) {
      stateByCollection.set(collectionName, {
        selectedRecordId: null,
        activeViewId: null,
        mode: 'view',
        search: '',
        sortMode: 'title',
        draft: null
      });
    }
    return stateByCollection.get(collectionName);
  }

  function renderCollectionTab(collectionName, label) {
    const state = ensureState(collectionName);
    return createTab(ctx, {
      name: collectionName,
      render: context => {
        const panelBody = context?.tabManager?.getPanelBodyEl?.(collectionName);
        CollectionCrudView({
          ctx: context,
          containerEl: panelBody,
          collectionName,
          state,
          rerender: () => ctx?.tabs?.[collectionName]?.rerender?.(),
          label
        });
      },
      setup: ({ rerender }) => {
        const tab = ctx?.tabs?.[collectionName];
        if (tab) {
          tab.rerender = rerender;
        }
      }
    });
  }

  function buildTabsFromModel(model) {
    const order = resolveCollectionOrder(model);
    const tabs = [];

    order.forEach(collectionName => {
      const collectionDef = model?.collections?.[collectionName];
      if (!collectionDef) return;
      const label = getCollectionLabel(collectionName, collectionDef);
      tabs.push({ id: collectionName, label, group: 'collection' });
    });

    return { order, tabs };
  }

  function syncTabs() {
    const snapshot = ctx?.store?.getState?.()?.snapshot || {};
    const model = getModelForSnapshot(snapshot);
    if (!model?.collections) return;

    const { order, tabs } = buildTabsFromModel(model);
    const signature = JSON.stringify(order);
    if (signature === lastSignature) return;
    lastSignature = signature;

    ctx.tabManager.rebuildGroup('collection', tabs);

    order.forEach(collectionName => {
      const collectionDef = model.collections[collectionName];
      if (!collectionDef) return;
      const label = getCollectionLabel(collectionName, collectionDef);
      renderCollectionTab(collectionName, label);
    });
  }

  syncTabs();

  if (typeof ctx?.subscribe === 'function') {
    ctx.subscribe(() => syncTabs());
  }
}
