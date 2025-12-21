import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <select id="entity-select"></select>
    <div id="entity-detail"></div>
    <select id="entity-graph-depth">
      <option value="1">1</option>
      <option value="2">2</option>
    </select>
    <input id="entity-graph-relation-types" type="text" />
    <button id="btn-refresh-entity-graph" type="button">Refresh graph</button>
    <div id="entity-graph"></div>
  `;
}

function createCtx(snapshot, currentMovementId = 'm1') {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ensureSelectOptions = (el, options = [], includeEmptyLabel) => {
    if (!el) return;
    const prev = el.value;
    clearElement(el);
    if (includeEmptyLabel) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = includeEmptyLabel;
      el.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      el.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      el.value = prev;
    }
  };

  const graphViewInstances = [];
  class GraphStub {
    constructor(options) {
      this.options = options;
      this.render = vi.fn();
      graphViewInstances.push(this);
    }
  }

  const ViewModels = {
    buildEntityDetailViewModel: vi.fn(),
    buildEntityGraphViewModel: vi.fn()
  };

  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels, EntityGraphView: GraphStub },
    dom: { clearElement, ensureSelectOptions },
    actions: {
      jumpToPractice: vi.fn(),
      jumpToText: vi.fn(),
      jumpToReferencedItem: vi.fn()
    },
    subscribe: () => () => {},
    graphViewInstances
  };
}

describe('entities tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders entity detail, graph, and wires navigation actions', async () => {
    renderDom();
    const snapshot = {
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Alpha', kind: 'person', summary: 'Summary' },
        { id: 'e2', movementId: 'm1', name: 'Beta', kind: 'org' }
      ]
    };
    const ctx = createCtx(snapshot);
    ctx.services.ViewModels.buildEntityDetailViewModel.mockReturnValue({
      entity: snapshot.entities[0],
      claims: [{ id: 'c1', text: 'Claim text', category: 'cat' }],
      practices: [{ id: 'p1', name: 'Practice', kind: 'ritual' }],
      events: [{ id: 'ev1', name: 'Event' }],
      mentioningTexts: [{ id: 't1', title: 'Text', depth: 2 }],
      media: [{ id: 'm1', title: 'Media', kind: 'photo', uri: 'https://example.com' }],
      connections: [
        {
          id: 'edge1',
          direction: 'incoming',
          relationType: 'linked_to',
          node: { id: 'p1', name: 'Practice', type: 'Practice' },
          source: { collection: 'practices', id: 'p1', field: 'links' }
        }
      ]
    });
    ctx.services.ViewModels.buildEntityGraphViewModel.mockReturnValue({
      centerEntityId: 'e1',
      nodes: [],
      edges: []
    });

    document.getElementById('entity-graph-depth').value = '2';
    document.getElementById('entity-graph-relation-types').value = 'mother_of, part_of';

    const { registerEntitiesTab } = await import('./entities.js');
    const tab = registerEntitiesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#entity-detail h3').textContent).toContain('Alpha');
    expect(document.querySelector('#entity-detail').textContent).toContain('Summary');
    expect(document.querySelector('#entity-detail').textContent).toContain('Claims about this entity');

    document.querySelector('.chip.clickable').dispatchEvent(new Event('click', { bubbles: true }));
    document
      .querySelector('.chip.clickable[title^=\"Depth\"]')
      .dispatchEvent(new Event('click', { bubbles: true }));
    const connectionLi = Array.from(document.querySelectorAll('#entity-detail li')).pop();
    connectionLi.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.actions.jumpToPractice).toHaveBeenCalledWith('p1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
    expect(ctx.actions.jumpToReferencedItem).toHaveBeenCalledWith('practices', 'p1');

    const graphVmCalls = ctx.services.ViewModels.buildEntityGraphViewModel.mock.calls;
    expect(graphVmCalls[0][1]).toEqual({
      movementId: 'm1',
      centerEntityId: 'e1',
      depth: 2,
      relationTypeFilter: ['mother_of', 'part_of']
    });

    const graphInstance = ctx.graphViewInstances[0];
    expect(graphInstance.render).toHaveBeenCalledTimes(1);

    graphInstance.options.onNodeClick('e2');

    expect(ctx.services.ViewModels.buildEntityGraphViewModel).toHaveBeenCalledTimes(2);
    const lastCall = ctx.services.ViewModels.buildEntityGraphViewModel.mock.calls.at(-1)[1];
    expect(lastCall.centerEntityId).toBe('e2');
    expect(graphInstance.render).toHaveBeenCalledTimes(2);
  });

  it('shows hint and disables controls when no movement is selected', async () => {
    renderDom();
    const snapshot = { entities: [] };
    const ctx = createCtx(snapshot, null);
    ctx.services.ViewModels.buildEntityDetailViewModel.mockReturnValue({ entity: null });

    const { registerEntitiesTab } = await import('./entities.js');
    const tab = registerEntitiesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('entity-select').disabled).toBe(true);
    expect(document.getElementById('entity-graph-depth').disabled).toBe(true);
    expect(document.getElementById('entity-graph-relation-types').disabled).toBe(true);
    expect(document.getElementById('btn-refresh-entity-graph').disabled).toBe(true);
    expect(document.querySelector('#entity-detail').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('shows empty state when movement has no entities', async () => {
    renderDom();
    const snapshot = { entities: [] };
    const ctx = createCtx(snapshot);
    ctx.services.ViewModels.buildEntityDetailViewModel.mockReturnValue({ entity: null });

    const { registerEntitiesTab } = await import('./entities.js');
    const tab = registerEntitiesTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#entity-detail').textContent).toContain(
      'No entities found for this movement.'
    );
  });
});
