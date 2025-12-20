import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div id="media-gallery"></div>
    <select id="media-entity-filter"></select>
    <select id="media-practice-filter"></select>
    <select id="media-event-filter"></select>
    <select id="media-text-filter"></select>
  `;
}

function createState(overrides = {}) {
  return {
    snapshot: {
      media: [
        { id: 'm1', movementId: 'm1', linkedEntityIds: ['e1'], linkedPracticeIds: [], linkedEventIds: [], linkedTextIds: [] },
        { id: 'm2', movementId: 'm1', linkedEntityIds: ['e2'], linkedPracticeIds: [], linkedEventIds: [], linkedTextIds: [] }
      ],
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Alpha' },
        { id: 'e2', movementId: 'm1', name: 'Beta' }
      ],
      practices: [],
      events: [],
      texts: []
    },
    currentMovementId: 'm1',
    ...overrides
  };
}

function createCtx(stateRef) {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ensureSelectOptions = (select, options, label) => {
    if (!select) return;
    const prev = select.value;
    clearElement(select);
    if (label) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = label;
      select.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      select.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      select.value = prev;
    }
  };

  const items = [
    { id: 'm1', title: 'Photo', kind: 'image', uri: 'http://example.com', entities: [{ id: 'e1', name: 'Alpha' }], practices: [], events: [], texts: [], tags: [] },
    { id: 'm2', title: 'Clip', kind: 'video', uri: 'http://example.org', entities: [{ id: 'e2', name: 'Beta' }], practices: [], events: [], texts: [], tags: [] }
  ];

  const ViewModels = {
    buildMediaGalleryViewModel: vi.fn((data, filters) => ({
      items: items.filter(
        item =>
          (!filters.entityIdFilter || item.entities.some(e => e.id === filters.entityIdFilter)) &&
          data.media.some(m => m.id === item.id && m.movementId === data.currentMovementId)
      )
    }))
  };

  return {
    getState: () => stateRef,
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions },
    subscribe: () => () => {}
  };
}

async function setup(stateOverrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const state = createState(stateOverrides);
  state.snapshot.currentMovementId = state.currentMovementId;
  const ctx = createCtx(state);
  const { registerMediaTab } = await import('./media.js');
  const tab = registerMediaTab(ctx);
  tab.mount(ctx);
  return { tab, ctx };
}

describe('media tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders media cards and filters by linked entity', async () => {
    const { tab, ctx } = await setup();
    tab.render(ctx);

    expect(document.querySelectorAll('#media-gallery .card').length).toBe(2);

    const entitySelect = document.getElementById('media-entity-filter');
    entitySelect.value = 'e1';
    entitySelect.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelectorAll('#media-gallery .card').length).toBe(1);
    expect(ctx.services.ViewModels.buildMediaGalleryViewModel).toHaveBeenCalledTimes(2);
    expect(ctx.services.ViewModels.buildMediaGalleryViewModel.mock.calls.at(-1)[1]).toMatchObject({
      entityIdFilter: 'e1'
    });
  });

  it('shows hint and disables filters without a movement', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });
    tab.render(ctx);

    expect(
      ['media-entity-filter', 'media-practice-filter', 'media-event-filter', 'media-text-filter'].every(
        id => document.getElementById(id).disabled
      )
    ).toBe(true);
    expect(document.querySelector('#media-gallery').textContent).toContain(
      'Create or select a movement on the left'
    );
    expect(ctx.services.ViewModels.buildMediaGalleryViewModel).not.toHaveBeenCalled();
  });
});
