import { featureFlags } from '../../core/featureFlags.ts';
import { createGenericCrudTab } from '../../ui/genericCrud/GenericCrudTab.tsx';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function ensureGenericTabDom() {
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

  let panel = document.getElementById('tab-generic');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'tab-generic';
    panel.className = 'tab-panel';
    const panelBody = document.createElement('div');
    panelBody.className = 'panel-body';
    const root = document.createElement('div');
    root.className = 'generic-crud-root';
    panelBody.appendChild(root);
    panel.appendChild(panelBody);
    content.appendChild(panel);
  }

  return panel;
}

export function registerGenericCrudTab(ctx) {
  if (!featureFlags.genericCrudUi()) return;
  const panel = ensureGenericTabDom();
  if (!panel) return;
  movementEngineerGlobal.tabs.generic = createGenericCrudTab({ ctx, panel });
}
