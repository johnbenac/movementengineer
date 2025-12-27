import { registerDashboardTab } from './dashboard.js';
import { registerComparisonTab } from './comparison.js';
import { registerCanonTab } from './canon.js';
import { registerGraphTab } from './graph.js';
import { registerCollectionsTab } from './collections.js';
import { registerAuthorityTab } from './authority.js';
import { registerGenericCrudTab } from './genericCrud.js';

function isToolEnabled(name, enabledTabs) {
  if (!Array.isArray(enabledTabs)) return true;
  if (enabledTabs.includes(name)) return true;
  if (name === 'collections' && enabledTabs.includes('data')) return true;
  return false;
}

export function registerToolTabs(ctx) {
  const movementEngineerGlobal = globalThis.MovementEngineer || (globalThis.MovementEngineer = {});
  const enabledTabs = movementEngineerGlobal.bootstrapOptions?.moduleTabs;
  const tabManager = ctx.tabManager;

  const tools = [
    {
      name: 'dashboard',
      label: 'Dashboard',
      register: registerDashboardTab
    },
    {
      name: 'canon',
      label: 'Library',
      register: registerCanonTab
    },
    {
      name: 'graph',
      label: 'Graph',
      register: registerGraphTab
    },
    {
      name: 'collections',
      label: 'Collections',
      register: registerCollectionsTab
    },
    {
      name: 'comparison',
      label: 'Comparison',
      register: registerComparisonTab
    },
    {
      name: 'authority',
      label: 'Authority',
      register: registerAuthorityTab
    }
  ];

  tools.forEach(tool => {
    if (!isToolEnabled(tool.name, enabledTabs)) return;
    tabManager?.ensureTab({ id: tool.name, label: tool.label, group: 'tool' });
    tool.register(ctx);
  });

  registerGenericCrudTab(ctx);
}
