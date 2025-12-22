import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';

function renderDom(withTab = false) {
  document.body.innerHTML = `
    ${withTab ? '<button class="tab active" data-tab="dashboard"></button>' : ''}
    <div id="dashboard-content"></div>
  `;
}

function createCtx(state, vm) {
  const ViewModels = vm
    ? {
        buildMovementDashboardViewModel: vi.fn(() => vm)
      }
    : null;
  const subscribers = new Set();
  const store = {
    getState: () => state
  };
  return {
    store,
    getState: store.getState,
    ViewModels,
    services: ViewModels ? { ViewModels } : {},
    dom: createDomUtils(),
    subscribe: fn => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    __subscribers: subscribers
  };
}

describe('dashboard tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders dashboard details and stats from the view model', async () => {
    renderDom();
    const state = { snapshot: { movements: [{ id: 'm1' }] }, currentMovementId: 'm1' };
    const vm = {
      movement: { id: 'm1', name: 'Movement One', shortName: 'M1', summary: 'Summary here' },
      textStats: { totalTexts: 4, rootCount: 2, maxDepth: 3, byDepth: { 0: 2, 1: 2 } },
      entityStats: { totalEntities: 5, byKind: { person: 3, org: 2 } },
      practiceStats: { totalPractices: 2, byKind: { ritual: 1, tactic: 1 } },
      eventStats: { totalEvents: 6, byRecurrence: { weekly: 4, monthly: 2 } },
      ruleCount: 7,
      claimCount: 8,
      mediaCount: 9,
      exampleNodes: {
        keyEntities: [{ id: 'e1', name: 'Entity One' }],
        keyPractices: [{ id: 'p1', name: 'Practice One' }],
        keyEvents: [{ id: 'ev1', name: 'Event One' }]
      }
    };
    const ctx = createCtx(state, vm);

    const { registerDashboardTab } = await import('../../../../src/app/tabs/dashboard.js');
    const tab = registerDashboardTab(ctx);
    tab.render(ctx);

    const content = document.getElementById('dashboard-content');
    expect(content.textContent).toContain('Movement One (M1)');
    expect(content.textContent).toContain('Summary here');
    expect(content.textContent).toContain('Total: 4');
    expect(content.textContent).toContain('Rules: 7');
    expect(content.querySelectorAll('.chip-row .chip').length).toBe(3);
  });

  it('shows empty state when no movement is selected', async () => {
    renderDom();
    const ctx = createCtx({ snapshot: {}, currentMovementId: null }, null);
    const { registerDashboardTab } = await import('../../../../src/app/tabs/dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('dashboard-content').textContent).toContain(
      'Create a movement on the left'
    );
  });

  it('shows message when ViewModels are missing', async () => {
    renderDom();
    const state = { snapshot: {}, currentMovementId: 'm1' };
    const ctx = createCtx(state, null);
    const { registerDashboardTab } = await import('../../../../src/app/tabs/dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('dashboard-content').textContent).toContain(
      'ViewModels module not loaded'
    );
  });

  it('shows message when movement is missing in dataset', async () => {
    renderDom();
    const state = { snapshot: {}, currentMovementId: 'm2' };
    const vm = { movement: null };
    const ctx = createCtx(state, vm);
    const { registerDashboardTab } = await import('../../../../src/app/tabs/dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('dashboard-content').textContent).toContain(
      'Selected movement not found'
    );
  });

  it('re-renders when subscribed store emits for active dashboard tab', async () => {
    renderDom(true);
    const state = { snapshot: {}, currentMovementId: 'm1' };
    const vm = {
      movement: { id: 'm1', name: 'Movement One' },
      textStats: {},
      entityStats: {},
      practiceStats: {},
      eventStats: {},
      ruleCount: 0,
      claimCount: 0,
      mediaCount: 0,
      exampleNodes: {}
    };
    const ctx = createCtx(state, vm);
    const { registerDashboardTab } = await import('../../../../src/app/tabs/dashboard.js');
    const tab = registerDashboardTab(ctx);
    const renderSpy = vi.spyOn(tab, 'render');

    tab.mount(ctx);

    ctx.__subscribers.forEach(listener => listener());

    expect(renderSpy).toHaveBeenCalled();
  });
});
