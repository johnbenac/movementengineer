import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="graph"></button>
    <div id="graph-workbench-root"></div>
  `;
}

function createSnapshot() {
  return {
    movements: [{ id: 'm1', name: 'Movement One' }],
    entities: [
      { id: 'e1', movementId: 'm1', name: 'Entity One' },
      { id: 'e2', movementId: 'm1', name: 'Entity Two' }
    ]
  };
}

async function setup(stateOverrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  let state = {
    snapshot: createSnapshot(),
    currentMovementId: 'm1',
    graphWorkbenchState: {
      leftWidth: 360,
      rightWidth: 420,
      searchKind: 'all',
      searchQuery: '',
      selection: null,
      filterCenterId: null,
      filterDepth: null,
      filterNodeTypes: []
    },
    ...stateOverrides
  };

  const ViewModels = {
    buildMovementGraphModel: vi.fn(() => ({
      nodes: [
        { id: 'e1', name: 'Entity One', type: 'Entity' },
        { id: 'e2', name: 'Entity Two', type: 'Entity' }
      ],
      edges: [{ id: 'edge1', source: 'e1', target: 'e2', type: 'edge' }]
    }))
  };

  class FakeEntityGraphView {
    constructor() {
      this.render = vi.fn();
      this.fit = vi.fn();
    }
  }

  const DomainService = {
    addNewItem: vi.fn((snap, collection, movementId) => ({ id: 'new', movementId })),
    upsertItem: vi.fn()
  };

  const legacy = {
    setState: vi.fn(patch => {
      state = { ...state, ...patch };
      return state;
    }),
    saveSnapshot: vi.fn(),
    subscribe: () => () => {}
  };

  const ctx = {
    getState: () => state,
    subscribe: () => () => {},
    services: { ViewModels, EntityGraphView: FakeEntityGraphView, DomainService },
    legacy,
    ui: { setStatus: vi.fn() },
    tabs: {}
  };

  const { registerGraphTab } = await import('./graph.js');
  const tab = registerGraphTab(ctx);
  return { tab, ctx, legacy, DomainService, ViewModels, state: () => state };
}

describe('graph tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows hint when no movement selected', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.render(ctx);

    expect(document.querySelector('#gw-canvas').textContent).toContain('Create or select');
  });

  it('renders graph when movement selected', async () => {
    const { tab, ctx } = await setup();

    tab.render(ctx);

    const domCanvas = document.querySelector('#gw-canvas');
    expect(domCanvas).toBeTruthy();
    expect(ctx.__workbenchGraphView?.render).toBeDefined();
  });

  it('creates entity and saves snapshot', async () => {
    const { tab, ctx, DomainService, legacy } = await setup();
    tab.render(ctx);

    document.getElementById('gw-add-entity-name').value = 'New Entity';
    const form = document.getElementById('gw-add-entity-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(DomainService.addNewItem).toHaveBeenCalled();
    expect(DomainService.upsertItem).toHaveBeenCalled();
    expect(legacy.saveSnapshot).toHaveBeenCalled();
  });

  it('clicking search result updates selection and filter', async () => {
    const { tab, ctx, legacy } = await setup();

    tab.render(ctx);
    const searchResult = document.querySelector('#gw-search-results li');
    expect(searchResult).toBeTruthy();
    searchResult.click();

    const call = legacy.setState.mock.calls.at(-1)[0];
    expect(call.graphWorkbenchState.selection).toBeDefined();
    expect(call.graphWorkbenchState.filterCenterId).toBeDefined();
  });
});
