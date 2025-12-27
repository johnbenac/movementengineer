import { featureFlags } from '../../core/featureFlags.js';
import { createGenericCrudTab } from '../../ui/genericCrud/GenericCrudTab.js';
import { createTab } from './tabKit.js';

function ensureGenericCrudShell(ctx) {
  const tabManager = ctx?.tabManager || window.MovementEngineer?.ctx?.tabManager;
  const panelEntry = tabManager?.ensureTab
    ? tabManager.ensureTab({ id: 'generic', label: 'Generic', group: 'tool' })
    : null;
  const panel = panelEntry?.panelEl || document.getElementById('tab-generic');
  if (!panel) return;
  const body = panel.querySelector('.panel-body') || panel;

  let root = body.querySelector('#generic-crud-root');
  if (!root) {
    const title = document.createElement('h2');
    title.textContent = 'Generic CRUD';
    body.appendChild(title);

    root = document.createElement('div');
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
