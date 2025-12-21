import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = '<div id="dashboard-content"></div>';
}

function createCtx(snapshot, currentMovementId = 'm1', vmOverrides = {}) {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const buildMovementDashboardViewModel = vi.fn(() => ({
    movement: { id: 'm1', name: 'Movement', shortName: 'Mv', summary: 'Summary' },
    textStats: { totalTexts: 3, rootCount: 1, maxDepth: 2, byDepth: { 0: 1, 2: 2 } },
    entityStats: { totalEntities: 2, byKind: { person: 1, org: 1 } },
    practiceStats: { totalPractices: 1, byKind: { ritual: 1 } },
    eventStats: { totalEvents: 2, byRecurrence: { once: 2 } },
    ruleCount: 4,
    claimCount: 5,
    mediaCount: 6,
    exampleNodes: {
      keyEntities: [{ id: 'e1', name: 'Entity' }],
      keyPractices: [{ id: 'p1', name: 'Practice' }],
      keyEvents: [{ id: 'ev1', name: 'Event' }]
    },
    ...vmOverrides
  }));
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels: { buildMovementDashboardViewModel } },
    dom: { clearElement }
  };
}

describe('dashboard tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders dashboard content for selected movement', async () => {
    renderDom();
    const snapshot = { movements: [{ id: 'm1', name: 'Movement' }] };
    const ctx = createCtx(snapshot);
    const { registerDashboardTab } = await import('./dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const content = document.getElementById('dashboard-content');
    expect(content.querySelector('h2').textContent).toContain('Movement');
    expect(content.textContent).toContain('Summary');
    expect(content.querySelectorAll('.stat-card')).toHaveLength(5);
    expect(content.textContent).toContain('Depth 0: 1');
    expect(content.textContent).toContain('Key entities');
  });

  it('shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { movements: [] };
    const ctx = createCtx(snapshot, null);
    const { registerDashboardTab } = await import('./dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.render(ctx);

    const content = document.getElementById('dashboard-content');
    expect(content.textContent).toContain('Create a movement on the left to see a dashboard.');
  });
});
