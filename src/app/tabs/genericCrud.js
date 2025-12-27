import { featureFlags } from '../../core/featureFlags.js';
import { createGenericCrudTab } from '../../ui/genericCrud/GenericCrudTab.js';
import { createTab } from './tabKit.js';

function ensureGenericCrudShell(ctx) {
  const tabManager = ctx?.tabManager;
  if (!tabManager) return;
  const entry = tabManager.ensureTab({ id: 'generic', label: 'Generic', group: 'tool' });
  const body = entry?.bodyEl || tabManager.getPanelBodyEl?.('generic');
  if (!body) return;

  if (!body.querySelector('[data-testid="generic-crud-root"]')) {
    const title = document.createElement('h2');
    title.textContent = 'Generic CRUD';
    body.appendChild(title);

    const root = document.createElement('div');
    root.id = 'generic-crud-root';
    root.setAttribute('data-testid', 'generic-crud-root');
    body.appendChild(root);
  }
}

export function registerGenericCrudTab(ctx) {
  if (!featureFlags.genericCrudUi()) return null;
  ensureGenericCrudShell(ctx);
  const genericTab = createGenericCrudTab(ctx);
  return createTab(ctx, {
    name: 'generic',
    render: genericTab.render,
    setup: ({ rerender }) => genericTab.setRerender(rerender)
  });
}
