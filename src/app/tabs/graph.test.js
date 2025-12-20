import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `<div id="graph-workbench-root"></div>`;
}

function createGraphCtx(overrides = {}) {
  const snapshot = {
    movements: [{ id: 'm1', name: 'One' }],
    entities: [{ id: 'e1', movementId: 'm1', name: 'Alice' }],
    ...overrides.snapshot
  };

  const addNewItem = vi.fn(() => ({ id: 'e2', movementId: 'm1' }));
  const upsertItem = vi.fn();
  const DomainService = { addNewItem, upsertItem, deleteItem: vi.fn() };

  const baseGraph = {
    nodes: [
      { id: 'e1', name: 'Alice', type: 'Entity' },
      { id: 'e2', name: 'Bob', type: 'Entity' }
    ],
    edges: [{ id: 'edge-1', fromId: 'e1', toId: 'e2', relationType: 'knows' }]
  };

  const buildMovementGraphModel = vi.fn(() => baseGraph);
  const filterGraphModel = vi.fn(() => baseGraph);
  const ViewModels = { buildMovementGraphModel, filterGraphModel };

  const renderSpy = vi.fn();
  class FakeGraphView {
    constructor() {
      this.render = renderSpy;
      this.fit = vi.fn();
    }
  }

  const setState = vi.fn();
  const saveSnapshot = vi.fn();

  return {
    getState: () => ({
      snapshot,
      currentMovementId: 'm1',
      graphWorkbenchState: {}
    }),
    legacy: { setState, saveSnapshot },
    services: { DomainService, ViewModels, EntityGraphView: FakeGraphView },
    actions: {},
    dom: { clearElement: el => el && (el.innerHTML = '') },
    setStatus: vi.fn(),
    __renderSpy: renderSpy
  };
}

describe('graph tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('shows hint when no movement is selected', async () => {
    renderDom();
    const ctx = createGraphCtx({ snapshot: { movements: [] } });
    const baseSnapshot = ctx.getState().snapshot;
    ctx.getState = () => ({ snapshot: baseSnapshot, currentMovementId: null, graphWorkbenchState: {} });
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('graph-workbench-root').textContent).toMatch(/Create or select a movement/);
  });

  it('renders graph workbench and calls graph renderer', async () => {
    renderDom();
    const ctx = createGraphCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('graph-workbench')).toBeTruthy();
    expect(ctx.__renderSpy).toHaveBeenCalled();
  });

  it('creates an entity via the add form and saves snapshot', async () => {
    renderDom();
    const ctx = createGraphCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    document.getElementById('gw-add-entity-name').value = 'New entity';
    document.getElementById('gw-add-entity-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(ctx.services.DomainService.addNewItem).toHaveBeenCalled();
    expect(ctx.legacy.saveSnapshot).toHaveBeenCalledWith({ show: false });
  });

  it('clicking a search result updates graph selection state', async () => {
    renderDom();
    const ctx = createGraphCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    const searchItem = document.querySelector('.graph-search-item');
    searchItem.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.legacy.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        graphWorkbenchState: expect.objectContaining({ selection: expect.objectContaining({ id: 'e1' }) })
      })
    );
  });
});
