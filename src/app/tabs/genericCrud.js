import { createTab } from './tabKit.js';
import { createGenericCrudTab } from '../../ui/genericCrud/GenericCrudTab.tsx';

const TAB_NAME = 'generic';

function ensureTabDom() {
  const nav = document.querySelector('.tabs');
  const content = document.querySelector('.content');
  if (!nav || !content) return false;

  if (!nav.querySelector('[data-tab="generic"]')) {
    const button = document.createElement('button');
    button.className = 'tab';
    button.dataset.tab = TAB_NAME;
    button.type = 'button';
    button.textContent = 'Generic';
    nav.appendChild(button);
  }

  if (!document.getElementById('tab-generic')) {
    const panel = document.createElement('section');
    panel.id = 'tab-generic';
    panel.className = 'tab-panel';
    const body = document.createElement('div');
    body.className = 'panel-body';
    const root = document.createElement('div');
    root.id = 'generic-crud-root';
    body.appendChild(root);
    panel.appendChild(body);
    content.appendChild(panel);
  }

  return true;
}

export function registerGenericCrudTab(ctx) {
  if (!ensureTabDom()) {
    document.addEventListener('DOMContentLoaded', ensureTabDom, { once: true });
  }

  const view = createGenericCrudTab();
  let tab = null;
  tab = createTab(ctx, {
    name: TAB_NAME,
    render: context => view.render(context, tab),
    setup: ({ rerender }) => {
      view.rerender = rerender;
    }
  });
  return tab;
}
