import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="dashboard"></button>
    <div id="dashboard-content"></div>
    <label id="movement-id-label"></label>
    <input id="movement-name" />
    <input id="movement-shortName" />
    <textarea id="movement-summary"></textarea>
    <input id="movement-tags" />
    <button id="btn-delete-movement"></button>
    <button id="btn-save-movement"></button>
  `;
}

function createCtx(state, viewModels) {
  let subscriber = null;
  return {
    getState: () => state,
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    get subscriber() {
      return subscriber;
    },
    services: { ViewModels: viewModels },
    dom: {
      clearElement(el) {
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
      }
    }
  };
}

describe('dashboard tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders placeholder state when no movement is selected', async () => {
    const ctx = createCtx({ snapshot: { movements: [] }, currentMovementId: null });
    const { registerDashboardTab } = await import('./dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('dashboard-content').textContent).toContain(
      'Create a movement on the left'
    );
    expect(document.getElementById('movement-id-label').textContent).toBe('—');
    expect(document.getElementById('movement-name').disabled).toBe(true);
    expect(document.getElementById('movement-shortName').disabled).toBe(true);
    expect(document.getElementById('movement-summary').disabled).toBe(true);
    expect(document.getElementById('movement-tags').disabled).toBe(true);
  });

  it('renders dashboard stats and movement form values', async () => {
    const vm = {
      buildMovementDashboardViewModel: vi.fn(() => ({
        movement: { id: 'm1', name: 'Movement', shortName: 'MV', summary: 'Summary' },
        textStats: { totalTexts: 5, rootCount: 2, maxDepth: 3, byDepth: { 0: 2, 1: 3 } },
        entityStats: { totalEntities: 4, byKind: { org: 2, person: 2 } },
        practiceStats: { totalPractices: 1, byKind: { ritual: 1 } },
        eventStats: { totalEvents: 2, byRecurrence: { yearly: 2 } },
        ruleCount: 6,
        claimCount: 7,
        mediaCount: 8,
        exampleNodes: {
          keyEntities: [{ id: 'e1', name: 'Entity A' }],
          keyPractices: [{ id: 'p1', name: 'Practice A' }],
          keyEvents: [{ id: 'ev1', name: 'Event A' }]
        }
      }))
    };
    const ctx = createCtx(
      {
        snapshot: {
          movements: [
            { id: 'm1', name: 'Movement', shortName: 'MV', summary: 'Summary', tags: ['a', 'b'] }
          ]
        },
        currentMovementId: 'm1'
      },
      vm
    );
    const { registerDashboardTab } = await import('./dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.render(ctx);

    expect(vm.buildMovementDashboardViewModel).toHaveBeenCalledWith(ctx.getState().snapshot, {
      movementId: 'm1'
    });
    const content = document.getElementById('dashboard-content').textContent;
    expect(content).toContain('Movement (MV)');
    expect(content).toContain('Total: 5');
    expect(content).toContain('Roots: 2 · Max depth: 3');
    expect(content).toContain('Entities');
    expect(content).toContain('Key entities');
    expect(document.querySelector('#movement-name').value).toBe('Movement');
    expect(document.querySelector('#movement-shortName').value).toBe('MV');
    expect(document.querySelector('#movement-summary').value).toBe('Summary');
    expect(document.querySelector('#movement-tags').value).toBe('a, b');
  });

  it('re-renders when dashboard tab is active and state changes', async () => {
    const vm = {
      buildMovementDashboardViewModel: vi.fn(() => ({
        movement: { id: 'm1', name: 'Movement' },
        textStats: {},
        entityStats: {},
        practiceStats: {},
        eventStats: {},
        ruleCount: 0,
        claimCount: 0,
        mediaCount: 0,
        exampleNodes: {}
      }))
    };
    const ctx = createCtx(
      { snapshot: { movements: [{ id: 'm1', name: 'Movement' }] }, currentMovementId: 'm1' },
      vm
    );
    const { registerDashboardTab } = await import('./dashboard.js');
    const tab = registerDashboardTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);
    ctx.subscriber?.();

    expect(vm.buildMovementDashboardViewModel).toHaveBeenCalledTimes(2);
  });
});
