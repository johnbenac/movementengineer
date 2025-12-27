import { registerDashboardTab } from './dashboard.js';
import { registerComparisonTab } from './comparison.js';
import { registerCanonTab } from './canon.js';
import { registerGraphTab } from './graph.js';
import { registerAuthorityTab } from './authority.js';
import { registerCollectionsTab } from './collections.js';
import { registerGenericCrudTab } from './genericCrud.js';

const TOOL_TABS = [
  { id: 'dashboard', label: 'Dashboard', register: registerDashboardTab },
  { id: 'canon', label: 'Library', register: registerCanonTab },
  { id: 'authority', label: 'Authority', register: registerAuthorityTab },
  { id: 'graph', label: 'Graph', register: registerGraphTab },
  { id: 'collections', label: 'Collections', register: registerCollectionsTab },
  { id: 'comparison', label: 'Comparison', register: registerComparisonTab }
];

export function registerToolTabs(ctx, { enabledTabs } = {}) {
  const toolTabs = [];
  const enabled = Array.isArray(enabledTabs) ? enabledTabs : null;

  TOOL_TABS.forEach(tool => {
    if (enabled && !enabled.includes(tool.id)) return;
    const tab = tool.register(ctx);
    if (tab) {
      toolTabs.push({ id: tool.id, label: tool.label });
    }
  });

  const genericTab = registerGenericCrudTab(ctx);
  if (genericTab) {
    toolTabs.push({ id: 'generic', label: 'Generic' });
  }

  return toolTabs;
}
