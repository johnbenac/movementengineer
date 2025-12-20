import { beforeEach, describe, expect, it, vi } from 'vitest';

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
    entities: [{ id: 'e1', movementId: 'm1', name: 'Alice' }],
    practices: [{ id: 'p1', movementId: 'm1', name: 'Practice' }],
    events: [{ id: 'ev1', movementId: 'm1', name: 'Event' }],
    texts: [{ id: 't1', movementId: 'm1', title: 'Text' }],
    media: [
      {
        id: 'm1',
        movementId: 'm1',
        title: 'Media 1',
        kind: 'image',
        uri: 'http://example.com',
        description: 'Desc',
        tags: ['tag'],
        linkedEntityIds: ['e1'],
        linkedPracticeIds: ['p1'],
        linkedEventIds: ['ev1'],
        linkedTextIds: ['t1']
      }
    ]
  };
}

function renderDom() {
  document.body.innerHTML = `
    <select id="media-entity-filter"></select>
    <select id="media-practice-filter"></select>
    <select id="media-event-filter"></select>
    <select id="media-text-filter"></select>
    <div id="media-gallery"></div>
  `;
}

function createCtx(snapshot, stateOverrides = {}) {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ViewModels = {
    buildMediaGalleryViewModel: vi.fn((data, filters) => {
      const matches =
        (!filters.entityIdFilter || filters.entityIdFilter === 'e1') &&
        (!filters.practiceIdFilter || filters.practiceIdFilter === 'p1') &&
        (!filters.eventIdFilter || filters.eventIdFilter === 'ev1') &&
        (!filters.textIdFilter || filters.textIdFilter === 't1');
      return {
        items: matches
          ? [
              {
                id: 'm1',
                title: 'Media 1',
                kind: 'image',
                uri: 'http://example.com',
                description: 'Desc',
                tags: ['tag'],
                entities: [{ id: 'e1', name: 'Alice' }],
                practices: [{ id: 'p1', name: 'Practice' }],
                events: [{ id: 'ev1', name: 'Event' }],
                texts: [{ id: 't1', title: 'Text' }]
              }
            ]
          : []
      };
    })
  };
  const state = {
    snapshot,
    currentMovementId: 'm1',
    ...stateOverrides
  };
  return {
    getState: () => state,
    services: { ViewModels },
    dom: { clearElement }
  };
}

async function setup(stateOverrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const { registerMediaTab } = await import('./media.js');
  const snapshot = createSnapshot();
  const ctx = createCtx(snapshot, stateOverrides);
  const tab = registerMediaTab(ctx);
  return { tab, ctx };
}

describe('media tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disables filters and shows hint without movement', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.getElementById('media-entity-filter').disabled).toBe(true);
    expect(document.getElementById('media-gallery').textContent).toContain(
      'Create or select a movement on the left'
    );
  });

  it('renders media cards with ViewModels output', async () => {
    const { tab, ctx } = await setup();

    tab.render(ctx);

    const cards = document.querySelectorAll('#media-gallery .card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Media 1');
    expect(cards[0].textContent).toContain('Entities:');
  });

  it('passes filter selections to ViewModels', async () => {
    const { tab, ctx } = await setup();
    const entSelect = document.getElementById('media-entity-filter');
    const prSelect = document.getElementById('media-practice-filter');
    const evSelect = document.getElementById('media-event-filter');
    const txSelect = document.getElementById('media-text-filter');

    tab.mount(ctx);
    tab.render(ctx);
    entSelect.value = 'e1';
    prSelect.value = 'p1';
    evSelect.value = 'ev1';
    txSelect.value = 't1';
    entSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const vm = ctx.services.ViewModels.buildMediaGalleryViewModel;
    expect(vm).toHaveBeenLastCalledWith(ctx.getState().snapshot, {
      movementId: 'm1',
      entityIdFilter: 'e1',
      practiceIdFilter: 'p1',
      eventIdFilter: 'ev1',
      textIdFilter: 't1'
    });
  });
});
