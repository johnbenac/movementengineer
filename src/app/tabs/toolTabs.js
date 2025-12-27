import { registerAuthorityTab } from './authority.js';
import { registerCanonTab } from './canon.js';
import { registerCollectionsTab } from './collections.js';
import { registerComparisonTab } from './comparison.js';
import { registerDashboardTab } from './dashboard.js';
import { registerGraphTab } from './graph.js';
import { registerGenericCrudTab } from './genericCrud.js';

const TOOL_TABS = [
  { name: 'dashboard', label: 'Dashboard', register: registerDashboardTab },
  { name: 'canon', label: 'Library', register: registerCanonTab },
  { name: 'authority', label: 'Authority', register: registerAuthorityTab },
  { name: 'graph', label: 'Graph', register: registerGraphTab },
  { name: 'collections', label: 'Collections', register: registerCollectionsTab },
  { name: 'comparison', label: 'Comparison', register: registerComparisonTab }
];

export function registerToolTabs(ctx) {
  const tabManager = ctx?.tabManager;
  const enabledTabs = globalThis?.MovementEngineer?.bootstrapOptions?.moduleTabs;
  const shouldEnable = name =>
    !Array.isArray(enabledTabs) || enabledTabs.includes(name);

  const registered = [];

  TOOL_TABS.forEach(tab => {
    if (!shouldEnable(tab.name)) return;
    tabManager?.ensureTab?.({ id: tab.name, label: tab.label, group: 'tool' });
    tab.register(ctx);
    registered.push(tab.name);
  });

  if (shouldEnable('generic')) {
    const genericTab = registerGenericCrudTab(ctx);
    if (genericTab) registered.push('generic');
  }

  return registered;
}
