import { getModelForSnapshot } from '../ui/schemaDoc.js';
import { CollectionCrudView } from '../../ui/genericCrud/CollectionCrudView.js';
import { createTab } from './tabKit.js';
import { registerEntitiesTab } from './entities.js';
import { registerPracticesTab } from './practices.js';
import { registerClaimsTab } from './claims.js';
import { registerRulesTab } from './rules.js';
import { registerMediaTab } from './media.js';

const COLLECTION_TAB_OVERRIDES = {
  entities: registerEntitiesTab,
  practices: registerPracticesTab,
  claims: registerClaimsTab,
  rules: registerRulesTab,
  media: registerMediaTab
};

function titleCase(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getCollectionOrder(model) {
  const registry = globalThis.ModelRegistry || null;
  if (registry?.listCollections && model?.specVersion) {
    return registry.listCollections(model.specVersion) || [];
  }
  if (Array.isArray(model?.collectionsOrder)) return model.collectionsOrder;
  return Object.keys(model?.collections || {});
}

function buildCollectionTabs(ctx) {
  const snapshot = ctx?.store?.getState?.()?.snapshot || null;
  const model = getModelForSnapshot(snapshot);
  const collectionNames = getCollectionOrder(model);

  const tabs = collectionNames.map(collectionName => {
    const collectionDef = model?.collections?.[collectionName] || null;
    const label =
      collectionDef?.ui?.label ||
      titleCase(collectionName) ||
      collectionDef?.typeName;
    return {
      id: collectionName,
      label
    };
  });

  tabs.forEach(tab => {
    if (ctx.tabs?.[tab.id]) return;
    const override = COLLECTION_TAB_OVERRIDES[tab.id];
    if (override) {
      override(ctx);
      return;
    }

    const tabState = {
      selectedRecordId: null,
      activeViewId: null,
      mode: 'view',
      search: '',
      sortMode: 'title',
      draft: null
    };

    createTab(ctx, {
      name: tab.id,
      extend: { __state: tabState },
      render: context => {
        const containerEl = context.tabManager?.getPanelBodyEl?.(tab.id);
        CollectionCrudView({
          ctx: context,
          containerEl,
          collectionName: tab.id,
          state: tabState,
          rerender: () => context.tabs?.[tab.id]?.rerender?.()
        });
      }
    });
  });

  return tabs;
}

export function registerCollectionTabs(ctx) {
  if (!ctx?.tabManager) throw new Error('registerCollectionTabs: ctx.tabManager missing');

  let lastModelKey = null;

  function computeModelKey(snapshot) {
    const model = getModelForSnapshot(snapshot || {});
    const collections = Object.keys(model?.collections || {}).sort();
    return `${model?.specVersion || ''}:${collections.join(',')}`;
  }

  function rebuildCollectionTabs() {
    const snapshot = ctx?.store?.getState?.()?.snapshot || null;
    const modelKey = computeModelKey(snapshot);
    if (modelKey === lastModelKey) return;
    lastModelKey = modelKey;
    const tabs = buildCollectionTabs(ctx);
    ctx.tabManager.rebuild({ collectionTabs: tabs });
  }

  rebuildCollectionTabs();

  if (typeof ctx?.subscribe === 'function') {
    ctx.subscribe(() => {
      rebuildCollectionTabs();
    });
  }

  return {
    rebuild: rebuildCollectionTabs
  };
}
