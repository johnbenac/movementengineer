import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerEntitiesTab } from './entities.js';

function renderDom() {
  document.body.innerHTML = `
    <select id="entity-select"></select>
    <div id="entity-detail"></div>
    <select id="entity-graph-depth">
      <option value="1">1</option>
      <option value="2">2</option>
    </select>
    <input id="entity-graph-relation-types" />
    <button id="btn-refresh-entity-graph" type="button"></button>
    <div id="entity-graph"></div>
  `;
}

function createCtx(snapshot, detailVm, graphVm, currentMovementId = 'm1') {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ensureSelectOptions = (selectEl, options = [], includeEmptyLabel) => {
    if (!selectEl) return;
    const prev = selectEl.value;
    clearElement(selectEl);
    if (includeEmptyLabel) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = includeEmptyLabel;
      selectEl.appendChild(opt);
    }
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      selectEl.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      selectEl.value = prev;
    }
  };
  const ViewModels = {
    buildEntityDetailViewModel: vi.fn(() => detailVm),
    buildEntityGraphViewModel: vi.fn(() => graphVm)
  };
  class StubGraphView {
    constructor(options) {
      this.options = options;
      this.render = vi.fn();
      StubGraphView.instance = this;
    }
  }
  const ctx = {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels, EntityGraphView: StubGraphView },
    dom: { clearElement, ensureSelectOptions },
    actions: {
      jumpToPractice: vi.fn(),
      jumpToText: vi.fn(),
      jumpToReferencedItem: vi.fn()
    },
    subscribe: () => () => {}
  };

  ctx.__vm = ViewModels;
  ctx.__graphCtor = StubGraphView;
  return ctx;
}

describe('entities tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {}, services: {} };
  });

  it('disables controls and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { entities: [] };
    const detailVm = { entity: null };
    const graphVm = { centerEntityId: null };
    const ctx = createCtx(snapshot, detailVm, graphVm, null);

    const tab = registerEntitiesTab(ctx);
    tab.mount(ctx);
    tab.render(ctx);

    expect(document.getElementById('entity-select').disabled).toBe(true);
    expect(document.getElementById('entity-graph-depth').disabled).toBe(true);
    expect(document.getElementById('entity-graph-relation-types').disabled).toBe(true);
    expect(document.getElementById('entity-detail').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('renders entity detail, graph, and navigation chips', async () => {
    renderDom();
    const snapshot = {
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Alice' },
        { id: 'e2', movementId: 'm1', name: 'Bob' }
      ]
    };
    const detailVm = {
      entity: { id: 'e1', name: 'Alice', kind: 'person', summary: 'Leader' },
      claims: [{ category: 'role', text: 'Is a leader' }],
      practices: [{ id: 'p1', name: 'Practice', kind: 'ritual' }],
      events: [{ id: 'ev1', name: 'Gathering' }],
      mentioningTexts: [{ id: 't1', title: 'Text', depth: 2 }],
      media: [{ id: 'm1', title: 'Photo', kind: 'image', uri: 'http://example.com' }],
      connections: [
        {
          direction: 'outgoing',
          relationType: 'knows',
          node: { id: 'e2', name: 'Bob', type: 'Entity' },
          source: { collection: 'entities', id: 'e1', field: 'links' }
        }
      ]
    };
    const graphVm = { centerEntityId: 'e1', nodes: [], edges: [] };
    const ctx = createCtx(snapshot, detailVm, graphVm);

    const tab = registerEntitiesTab(ctx);
    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#entity-detail h3').textContent).toContain('Alice');
    expect(document.getElementById('entity-detail').textContent).toContain('Leader');
    expect(document.getElementById('entity-detail').textContent).toContain('Is a leader');

    document.querySelector('#entity-detail .chip.clickable[title="ritual"]').dispatchEvent(
      new Event('click', { bubbles: true })
    );
    document.querySelector('#entity-detail .chip.clickable[title^="Depth"]').dispatchEvent(
      new Event('click', { bubbles: true })
    );
    const connectionLi = Array.from(
      document.querySelectorAll('#entity-detail ul li')
    ).find(li => li.textContent.includes('knows'));
    connectionLi.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.actions.jumpToPractice).toHaveBeenCalledWith('p1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
    expect(ctx.actions.jumpToReferencedItem).toHaveBeenCalledWith('entities', 'e2');

    const graphInstance = ctx.__graphCtor.instance;
    expect(graphInstance.render).toHaveBeenCalledTimes(1);
    expect(graphInstance.render.mock.calls[0][0]).toBe(document.getElementById('entity-graph'));
    expect(graphInstance.render.mock.calls[0][1]).toEqual(graphVm);

    graphInstance.options.onNodeClick('e2');
    expect(document.getElementById('entity-select').value).toBe('e2');
    expect(graphInstance.render).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no entities are available for the movement', async () => {
    renderDom();
    const snapshot = { entities: [] };
    const detailVm = { entity: null };
    const graphVm = { centerEntityId: null };
    const ctx = createCtx(snapshot, detailVm, graphVm);

    const tab = registerEntitiesTab(ctx);
    tab.render(ctx);

    expect(document.getElementById('entity-detail').textContent).toContain(
      'No entities found for this movement.'
    );
  });
});
