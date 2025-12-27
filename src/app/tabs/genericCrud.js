import { featureFlags } from '../../core/featureFlags.js';
import { createGenericCrudTab } from '../../ui/genericCrud/GenericCrudTab.js';
import { createTab } from './tabKit.js';

function ensureGenericCrudShell() {
  const tabManager = globalThis?.MovementEngineer?.ctx?.tabManager;
  if (!tabManager) return;

  tabManager.ensureTab({ id: 'generic', label: 'Generic', group: 'tool' });

  const panelBody = tabManager.getPanelBodyEl('generic');
  if (!panelBody) return;

  let root = panelBody.querySelector('#generic-crud-root');
  if (!root) {
    const title = document.createElement('h2');
    title.textContent = 'Generic CRUD';
    panelBody.appendChild(title);

    root = document.createElement('div');
    root.id = 'generic-crud-root';
    root.setAttribute('data-testid', 'generic-crud-root');
    panelBody.appendChild(root);
  }
}

export function registerGenericCrudTab(ctx) {
  if (!featureFlags.genericCrudUi()) return null;
  ensureGenericCrudShell();
  const genericTab = createGenericCrudTab(ctx);
  return createTab(ctx, {
    name: 'generic',
    render: genericTab.render,
    setup: ({ rerender }) => genericTab.setRerender(rerender)
  });
}
