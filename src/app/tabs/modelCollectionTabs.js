import { createGenericCrudCollectionTab } from '../../ui/genericCrud/GenericCrudTab.js';
import { createTab } from './tabKit.js';

function getModelRegistry() {
  return globalThis?.ModelRegistry || null;
}

function ensureCollectionTabShell({ collectionName, label }) {
  const nav = document.querySelector('.tabs');
  const content = document.querySelector('.content');
  if (!nav || !content) return null;

  let tabButton = nav.querySelector(`[data-tab="${collectionName}"]`);
  if (!tabButton) {
    tabButton = document.createElement('button');
    tabButton.className = 'tab';
    tabButton.dataset.tab = collectionName;
    tabButton.textContent = label;
    tabButton.setAttribute('data-testid', `tab-${collectionName}`);
    nav.appendChild(tabButton);
  }

  let panel = content.querySelector(`#tab-${collectionName}`);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = `tab-${collectionName}`;
    panel.className = 'tab-panel';

    const body = document.createElement('div');
    body.className = 'panel-body';

    const title = document.createElement('h2');
    title.textContent = label;
    body.appendChild(title);

    const root = document.createElement('div');
    root.id = `${collectionName}-collection-root`;
    root.setAttribute('data-testid', `collection-tab-${collectionName}`);
    body.appendChild(root);

    panel.appendChild(body);
    content.appendChild(panel);
  }

  return `${collectionName}-collection-root`;
}

function resolveTabLabel(collectionDef, collectionName) {
  return (
    collectionDef?.ui?.tab?.label ||
    collectionDef?.ui?.label ||
    collectionDef?.typeName ||
    collectionName
  );
}

export function registerModelCollectionTabs(ctx, { shouldEnable } = {}) {
  const registry = getModelRegistry();
  const model = registry?.getModel?.() || null;
  if (!model) return [];
  const collections = registry?.listCollections?.(model.specVersion) || Object.keys(model.collections);
  const enabledCollections = collections
    .map(name => model.collections?.[name])
    .filter(def => def?.ui?.tab?.enabled);

  enabledCollections.sort((a, b) => {
    const orderA = a?.ui?.tab?.order ?? Number.POSITIVE_INFINITY;
    const orderB = b?.ui?.tab?.order ?? Number.POSITIVE_INFINITY;
    return orderA - orderB;
  });

  const tabs = [];
  enabledCollections.forEach(def => {
    const collectionName = def.collectionName || def.collection || null;
    if (!collectionName) return;
    if (typeof shouldEnable === 'function' && !shouldEnable(collectionName)) return;
    const label = resolveTabLabel(def, collectionName);
    const rootId = ensureCollectionTabShell({ collectionName, label });
    if (!rootId) return;
    const collectionTab = createGenericCrudCollectionTab(ctx, {
      collectionName,
      rootId
    });
    tabs.push(
      createTab(ctx, {
        name: collectionName,
        render: collectionTab.render,
        setup: ({ rerender }) => collectionTab.setRerender(rerender)
      })
    );
  });

  return tabs;
}
