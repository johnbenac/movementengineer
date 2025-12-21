import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div id="dashboard-content"></div>
  `;
}

function createCtx(snapshot, vm, currentMovementId = 'm1') {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };

  const ViewModels = {
    buildMovementDashboardViewModel: vi.fn(() => vm)
  };

  const legacy = {
    renderMovementForm: vi.fn()
  };

  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement },
    legacy,
    subscribe: () => () => {}
  };
}

describe('dashboard tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders dashboard stats and example chips', async () => {
    renderDom();
    const snapshot = { movements: [{ id: 'm1', name: 'Movement 1' }] };
    const vm = {
      movement: { id: 'm1', name: 'Movement 1', shortName: 'M1', summary: 'hello' },
      textStats: { totalTexts: 3, rootCount: 1, maxDepth: 2, byDepth: { 0: 1, 1: 1, 2: 1 } },
      entityStats: { totalEntities: 2, byKind: { person: 1, place: 1 } },
      practiceStats: { totalPractices: 1, byKind: { ritual: 1 } },
      eventStats: { totalEvents: 1, byRecurrence: { daily: 1 } },
      ruleCount: 4,
      claimCount: 5,
      mediaCount: 6,
      exampleNodes: {
        keyEntities: [{ id: 'e1', name: 'Entity' }],
        keyPractices: [{ id: 'p1', name: 'Practice' }],
        keyEvents: [{ id: 'ev1', name: 'Event' }]
      }
    };
    const ctx = createCtx(snapshot, vm);
    const { registerDashboardTab } = await import('./dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const container = document.getElementById('dashboard-content');
    expect(container.textContent).toContain('Movement 1 (M1)');
    expect(container.textContent).toContain('Total: 3');
    expect(container.textContent).toContain('Rules: 4');
    expect(container.querySelectorAll('.chip').length).toBe(3);
    expect(ctx.legacy.renderMovementForm).toHaveBeenCalled();
  });

  it('shows empty state when no movement selected', async () => {
    renderDom();
    const snapshot = { movements: [] };
    const vm = {};
    const ctx = createCtx(snapshot, vm, null);
    const { registerDashboardTab } = await import('./dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.render(ctx);

    const container = document.getElementById('dashboard-content');
    expect(container.textContent).toContain('Create a movement on the left');
    expect(ctx.services.ViewModels.buildMovementDashboardViewModel).not.toHaveBeenCalled();
    expect(ctx.legacy.renderMovementForm).toHaveBeenCalled();
  });
});
