import { CollectionCrudView } from '../../ui/genericCrud/CollectionCrudView.js';
import { getModelForSnapshot } from '../ui/schemaDoc.js';
import { registerClaimsTab } from './claims.js';
import { registerEntitiesTab } from './entities.js';
import { registerMediaTab } from './media.js';
import { registerPracticesTab } from './practices.js';
import { registerRulesTab } from './rules.js';
import { createTab } from './tabKit.js';

const COLLECTION_TAB_OVERRIDES = {
  entities: registerEntitiesTab,
  practices: registerPracticesTab,
  claims: registerClaimsTab,
  rules: registerRulesTab,
  media: registerMediaTab
};

function titleize(value) {
  if (!value) return '';
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, char => char.toUpperCase());
}

function resolveCollectionOrder(model) {
  const registry = globalThis.ModelRegistry || null;
  const ordered = registry?.listCollections?.(model?.specVersion);
  if (Array.isArray(ordered) && ordered.length) {
    return ordered.filter(name => model?.collections?.[name]);
  }
  return Object.keys(model?.collections || {});
}

function buildCollectionKey(model, collectionNames) {
  const version = model?.specVersion || '';
  return `${version}:${collectionNames.join(',')}`;
}

function registerGenericCollectionTab(ctx, collectionName) {
  const state = {
    selectedRecordId: null,
    activeViewId: null,
    mode: 'view',
    search: '',
    sortMode: 'title',
    draft: null
  };
  let rerender = () => {};

  return createTab(ctx, {
    name: collectionName,
    render: context => {
      const container = context.tabManager?.getPanelBodyEl(collectionName);
      if (!container) return;
      CollectionCrudView({
        ctx: context,
        containerEl: container,
        collectionName,
        state,
        rerender: options => rerender(options)
      });
    },
    setup: ({ rerender: rerenderTab }) => {
      rerender = rerenderTab;
    },
    extend: {
      __collectionTab: true,
      __collectionName: collectionName
    }
  });
}

function registerOverrideTab(ctx, collectionName) {
  const override = COLLECTION_TAB_OVERRIDES[collectionName];
  if (!override) return null;
  const tab = override(ctx);
  if (tab) {
    tab.__collectionOverride = true;
    tab.__collectionName = collectionName;
  }
  return tab;
}

function removeCollectionTab(ctx, tabManager, collectionName) {
  if (!collectionName) return;
  tabManager?.removeTab?.(collectionName);
  if (ctx?.tabs?.[collectionName]) {
    delete ctx.tabs[collectionName];
  }
  if (globalThis?.MovementEngineer?.tabs?.[collectionName]) {
    delete globalThis.MovementEngineer.tabs[collectionName];
  }
}

export function registerCollectionTabs(ctx) {
  const tabManager = ctx?.tabManager;
  if (!tabManager) return () => {};
  let currentKey = null;

  function rebuild() {
    const snapshot = ctx?.store?.getState?.()?.snapshot || {};
    const model = getModelForSnapshot(snapshot);
    const collectionNames = resolveCollectionOrder(model);
    const nextKey = buildCollectionKey(model, collectionNames);
    if (nextKey === currentKey) return;
    currentKey = nextKey;

    const existing = new Set(tabManager.getTabsByGroup('collection'));
    const desired = new Set(collectionNames);

    existing.forEach(name => {
      if (!desired.has(name)) {
        removeCollectionTab(ctx, tabManager, name);
      }
    });

    for (const collectionName of collectionNames) {
      const collectionDef = model?.collections?.[collectionName];
      if (!collectionDef) continue;
      const label = collectionDef?.ui?.label || titleize(collectionName);
      tabManager.ensureTab({ id: collectionName, label, group: 'collection' });

      if (COLLECTION_TAB_OVERRIDES[collectionName]) {
        if (!ctx?.tabs?.[collectionName]) {
          registerOverrideTab(ctx, collectionName);
        }
        continue;
      }

      if (!ctx?.tabs?.[collectionName]) {
        registerGenericCollectionTab(ctx, collectionName);
      }
    }

    const active = tabManager.getActiveTabId();
    if (active && !desired.has(active) && tabManager.getDefaultTabId()) {
      tabManager.setActiveTab(tabManager.getDefaultTabId());
    }
  }

  const unsubscribe = ctx?.subscribe?.(() => rebuild()) || (() => {});
  rebuild();

  return () => {
    unsubscribe();
  };
}
