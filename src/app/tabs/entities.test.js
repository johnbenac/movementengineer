import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <select id="entity-select"></select>
    <div id="entity-detail"></div>
    <select id="entity-graph-depth">
      <option value="1">1</option>
      <option value="2">2</option>
    </select>
    <input id="entity-graph-relation-types" />
    <button id="btn-refresh-entity-graph" type="button">Refresh</button>
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

  const buildEntityDetailViewModel = vi.fn((snap, { entityId }) => {
    const entity = (snap?.entities || []).find(e => e.id === entityId);
    if (!entity) return { entity: null };
    return {
      entity,
      claims: [{ id: 'c1', text: 'Claim text', category: 'Cat' }],
      practices: [{ id: 'p1', name: 'Practice 1' }],
      events: [{ id: 'ev1', name: 'Event 1' }],
      mentioningTexts: [{ id: 't1', title: 'Text 1', depth: 1 }],
      media: [{ id: 'm1', title: 'Media', kind: 'image', uri: 'https://example.com' }],
      connections: [
        {
          direction: 'outgoing',
          relationType: 'involves',
          node: { id: 'p1', name: 'Practice 1', type: 'Practice' }
        }
      ]
    };
  });
  const buildEntityGraphViewModel = vi.fn((snap, options) => ({
    ...options,
    nodes: [],
    edges: []
  }));

  const EntityGraphView = vi.fn(function (opts = {}) {
    this.onNodeClick = opts.onNodeClick;
    this.render = vi.fn();
  });

  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels: { buildEntityDetailViewModel, buildEntityGraphViewModel }, EntityGraphView },
    dom: { clearElement, ensureSelectOptions },
    actions: {
      jumpToPractice: vi.fn(),
      jumpToText: vi.fn(),
      jumpToReferencedItem: vi.fn()
    }
  };
}

describe('entities tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders entity detail and graph and re-renders when graph node is clicked', async () => {
    renderDom();
    document.getElementById('entity-graph-depth').value = '2';
    document.getElementById('entity-graph-relation-types').value = 'related_to, part_of';
    const snapshot = {
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Alice', kind: 'Person' },
        { id: 'e2', movementId: 'm1', name: 'Bob', kind: 'Org', summary: 'Summary' }
      ]
    };
    const ctx = createCtx(snapshot);
    const { registerEntitiesTab } = await import('./entities.js');
    const tab = registerEntitiesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#entity-detail h3').textContent).toContain('Alice');

    const vmCall =
      ctx.services.ViewModels.buildEntityGraphViewModel.mock.calls[
        ctx.services.ViewModels.buildEntityGraphViewModel.mock.calls.length - 1
      ][1];
    expect(vmCall).toEqual({
      movementId: 'm1',
      centerEntityId: 'e1',
      depth: 2,
      relationTypeFilter: ['related_to', 'part_of']
    });

    const graphInstance = ctx.services.EntityGraphView.mock.instances[0];
    expect(graphInstance.render).toHaveBeenCalledTimes(1);

    graphInstance.onNodeClick('e2');

    expect(document.getElementById('entity-select').value).toBe('e2');
    const lastDetailCall =
      ctx.services.ViewModels.buildEntityDetailViewModel.mock.calls[
        ctx.services.ViewModels.buildEntityDetailViewModel.mock.calls.length - 1
      ][1];
    expect(lastDetailCall).toEqual({ entityId: 'e2' });
    expect(graphInstance.render).toHaveBeenCalledTimes(2);
    expect(document.querySelector('#entity-detail h3').textContent).toContain('Bob');
  });

  it('disables controls and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { entities: [] };
    const ctx = createCtx(snapshot, null);
    const { registerEntitiesTab } = await import('./entities.js');
    const tab = registerEntitiesTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#entity-detail').textContent).toContain(
      'Create or select a movement'
    );
    expect(document.getElementById('entity-select').disabled).toBe(true);
    expect(document.getElementById('entity-graph-depth').disabled).toBe(true);
    expect(document.getElementById('entity-graph-relation-types').disabled).toBe(true);
    expect(document.getElementById('btn-refresh-entity-graph').disabled).toBe(true);
  });
});
