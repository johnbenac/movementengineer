import { beforeEach, describe, expect, it, vi } from 'vitest';

function createDom() {
  document.body.innerHTML = `<div id="graph-workbench-root"></div>`;
}

function createGraphCtx({ state }) {
  let currentState = state;
  const setState = vi.fn(update => {
    currentState = { ...currentState, ...update };
    return currentState;
  });
  const legacy = {
    setState,
    saveSnapshot: vi.fn()
  };

  const graph = {
    nodes: [
      { id: 'e1', name: 'Entity One', type: 'Entity' },
      { id: 't1', name: 'Text One', type: 'TextNode' }
    ],
    edges: [{ id: 'edge1', fromId: 'e1', toId: 't1', relationType: 'mentions' }]
  };

  let graphViewInstance = null;
  const EntityGraphView = vi.fn(() => {
    graphViewInstance = {
      render: vi.fn(),
      fit: vi.fn()
    };
    return graphViewInstance;
  });

  const ctx = {
    legacy,
    actions: {},
    getState: () => currentState,
    subscribe: vi.fn(() => vi.fn()),
    services: {
      ViewModels: {
        buildMovementGraphModel: vi.fn(() => graph),
        filterGraphModel: vi.fn(() => graph)
      },
      EntityGraphView,
      DomainService: {
        addNewItem: vi.fn((snap, collection, movementId) => ({
          id: `${collection}-new`,
          movementId
        })),
        upsertItem: vi.fn(),
        deleteItem: vi.fn()
      }
    }
  };

  return { ctx, graphViewInstanceRef: () => graphViewInstance };
}

describe('graph tab module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    createDom();
  });

  it('shows a hint when no movement is selected', async () => {
    const state = { snapshot: {}, currentMovementId: null };
    const { ctx } = createGraphCtx({ state });
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#graph-workbench-root')?.textContent).toContain(
      'Create or select a movement'
    );
  });

  it('renders graph view when movement is selected', async () => {
    const state = {
      snapshot: { entities: [{ id: 'e1', movementId: 'm1', name: 'Entity One' }] },
      currentMovementId: 'm1',
      graphWorkbenchState: null
    };
    const { ctx, graphViewInstanceRef } = createGraphCtx({ state });
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    expect(graphViewInstanceRef()).not.toBeNull();
    expect(graphViewInstanceRef()?.render).toHaveBeenCalled();
  });

  it('submitting the create entity form saves via DomainService and saveSnapshot', async () => {
    const state = {
      snapshot: { entities: [], textCollections: [], texts: [] },
      currentMovementId: 'm1'
    };
    const { ctx } = createGraphCtx({ state });
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    document.getElementById('gw-add-entity-name').value = 'New Entity';
    document.getElementById('gw-add-entity-kind').value = 'Being';
    document.getElementById('gw-add-entity-summary').value = 'Summary';
    document.getElementById('gw-add-entity-tags').value = 'a,b';
    document.getElementById('gw-add-entity-sources').value = 'source';
    document.getElementById('gw-add-entity-source-entities').value = 'e2';
    document.getElementById('gw-add-entity-notes').value = 'note';

    const form = document.getElementById('gw-add-entity-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(ctx.services.DomainService.addNewItem).toHaveBeenCalled();
    expect(ctx.legacy.saveSnapshot).toHaveBeenCalled();
  });

  it('clicking a search result updates selection and filter center', async () => {
    const state = {
      snapshot: { entities: [{ id: 'e1', movementId: 'm1', name: 'Entity One' }] },
      currentMovementId: 'm1',
      graphWorkbenchState: {
        leftWidth: 360,
        rightWidth: 420,
        searchKind: 'all',
        searchQuery: '',
        selection: null,
        focusEntityId: null,
        filterCenterId: null,
        filterDepth: null,
        filterNodeTypes: []
      }
    };
    const { ctx } = createGraphCtx({ state });
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    const firstResult = document.querySelector('#gw-search-results li');
    firstResult?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.legacy.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        graphWorkbenchState: expect.objectContaining({
          selection: expect.objectContaining({ id: 'e1' }),
          filterCenterId: 'e1'
        })
      })
    );
  });
});
