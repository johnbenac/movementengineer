import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';

function renderDom() {
  document.body.innerHTML = `
    <select id="entity-select"></select>
    <div id="entity-detail"></div>
    <select id="entity-graph-depth"><option value="1">1</option></select>
    <div id="entity-graph"></div>
    <input id="entity-graph-relation-types" />
    <button id="btn-refresh-entity-graph"></button>
  `;
}

let lastGraphInstance = null;

class FakeEntityGraphView {
  constructor(opts = {}) {
    this.opts = opts;
    lastGraphInstance = this;
    this.render = vi.fn(this.render.bind(this));
  }

  render(container, vm, options) {
    this.latestRender = { container, vm, options };
  }
}

function createCtx(snapshot, detailVm, graphVm, currentMovementId = 'm1') {
  const dom = createDomUtils();
  const store = {
    getState: () => ({ snapshot, currentMovementId })
  };
  const ViewModels = {
    buildEntityDetailViewModel: vi.fn(() => detailVm),
    buildEntityGraphViewModel: vi.fn(() => graphVm)
  };
  const actions = {
    jumpToPractice: vi.fn(),
    jumpToText: vi.fn(),
    jumpToReferencedItem: vi.fn()
  };
  return {
    store,
    getState: store.getState,
    services: { ViewModels, EntityGraphView: FakeEntityGraphView },
    dom,
    actions,
    subscribe: () => () => {}
  };
}

describe('entities tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    lastGraphInstance = null;
  });

  it('renders entity detail, graph and navigation chips', async () => {
    renderDom();
    const snapshot = {
      entities: [{ id: 'e1', movementId: 'm1', name: 'Entity One' }]
    };
    const detailVm = {
      entity: { id: 'e1', name: 'Entity One', kind: 'person', summary: 'Summary' },
      claims: [{ id: 'c1', text: 'Claim text', category: 'cat' }],
      practices: [{ id: 'p1', name: 'Practice', kind: 'ritual' }],
      events: [{ id: 'ev1', name: 'Event Name' }],
      mentioningTexts: [{ id: 't1', title: 'Text Title', depth: 2 }],
      media: [{ id: 'm1', title: 'Media One', kind: 'photo', uri: 'http://example.com' }],
      connections: [
        {
          direction: 'incoming',
          relationType: 'related',
          node: { id: 'p1', name: 'Practice', type: 'Practice' },
          source: { collection: 'practices', id: 'p1', field: 'linked' }
        }
      ]
    };
    const graphVm = { centerEntityId: 'e1', nodes: [], links: [] };
    const ctx = createCtx(snapshot, detailVm, graphVm);
    const { registerEntitiesTab } = await import('../../../../src/app/tabs/entities.js');
    const tab = registerEntitiesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#entity-detail h3').textContent).toContain('Entity One');
    expect(document.querySelector('#entity-detail').textContent).toContain('Summary');
    expect(ctx.actions.jumpToPractice).not.toHaveBeenCalled();
    document.querySelector('.chip.clickable').dispatchEvent(new Event('click', { bubbles: true }));
    expect(ctx.actions.jumpToPractice).toHaveBeenCalledWith('p1');
    document.querySelector('.chip.clickable[title^="Depth"]').dispatchEvent(
      new Event('click', { bubbles: true })
    );
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');

    expect(ctx.services.ViewModels.buildEntityGraphViewModel).toHaveBeenCalledWith(snapshot, {
      movementId: 'm1',
      centerEntityId: 'e1',
      depth: 1,
      relationTypeFilter: []
    });
    expect(lastGraphInstance?.render).toHaveBeenCalled();

    lastGraphInstance.opts.onNodeClick('e1');
    expect(lastGraphInstance.render).toHaveBeenCalledTimes(2);
  });

  it('shows hint and disables controls when no movement is selected', async () => {
    renderDom();
    const snapshot = { entities: [] };
    const detailVm = { entity: null };
    const graphVm = { centerEntityId: null };
    const ctx = createCtx(snapshot, detailVm, graphVm, null);
    const { registerEntitiesTab } = await import('../../../../src/app/tabs/entities.js');
    const tab = registerEntitiesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('entity-select').disabled).toBe(true);
    expect(document.getElementById('entity-graph-depth').disabled).toBe(true);
    expect(document.getElementById('entity-detail').textContent).toContain(
      'Create or select a movement'
    );
  });
});
