import { createTab } from './tabKit.js';
import { createGenericCrudTab } from '../../ui/genericCrud/GenericCrudTab.tsx';

function ensureGenericCrudDom() {
  const tabsNav = document.querySelector('.tabs');
  const content = document.querySelector('.content');
  if (!tabsNav || !content) return null;

  let tabButton = tabsNav.querySelector('[data-tab="generic"]');
  if (!tabButton) {
    tabButton = document.createElement('button');
    tabButton.className = 'tab';
    tabButton.dataset.tab = 'generic';
    tabButton.type = 'button';
    tabButton.textContent = 'Generic';
    tabsNav.appendChild(tabButton);
  }

  let panel = content.querySelector('#tab-generic');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'tab-generic';
    panel.className = 'tab-panel';
    const panelBody = document.createElement('div');
    panelBody.className = 'panel-body';
    panel.appendChild(panelBody);
    content.appendChild(panel);
  }

  const panelBody = panel.querySelector('.panel-body') || panel;

  return { tabButton, panel, panelBody };
}

export function registerGenericCrudTab(ctx) {
  const dom = ensureGenericCrudDom();
  if (!dom) return null;

  const instance = createGenericCrudTab({ ctx, container: dom.panelBody });

  return createTab(ctx, {
    name: 'generic',
    render: () => instance.render(ctx)
  });
}
