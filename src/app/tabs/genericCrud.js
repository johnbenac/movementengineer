import { featureFlags } from '../../core/featureFlags.ts';
import { createGenericCrudTab } from '../../ui/genericCrud/GenericCrudTab.tsx';
import { createTab } from './tabKit.js';

function ensureGenericCrudShell() {
  const nav = document.querySelector('.tabs');
  const content = document.querySelector('.content');
  if (!nav || !content) return;

  let tabButton = nav.querySelector('[data-tab="generic"]');
  if (!tabButton) {
    tabButton = document.createElement('button');
    tabButton.className = 'tab';
    tabButton.dataset.tab = 'generic';
    tabButton.textContent = 'Generic';
    nav.appendChild(tabButton);
  }

  let panel = content.querySelector('#tab-generic');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'tab-generic';
    panel.className = 'tab-panel';

    const body = document.createElement('div');
    body.className = 'panel-body';

    const title = document.createElement('h2');
    title.textContent = 'Generic CRUD';
    body.appendChild(title);

    const root = document.createElement('div');
    root.id = 'generic-crud-root';
    body.appendChild(root);

    panel.appendChild(body);
    content.appendChild(panel);
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
