import { beforeEach, describe, expect, it, vi } from 'vitest';

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
    entities: [{ id: 'e1', movementId: 'm1', name: 'Entity 1' }],
    practices: [{ id: 'p1', movementId: 'm1', name: 'Practice 1' }],
    events: [{ id: 'ev1', movementId: 'm1', name: 'Event 1' }],
    texts: [{ id: 't1', movementId: 'm1', title: 'Text 1' }],
    media: [{ id: 'mda1', movementId: 'm1', linkedEntityIds: ['e1'] }]
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

function createCtx(snapshot, currentMovementId = 'm1') {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ensureSelectOptions = (selectEl, options = [], includeEmptyLabel) => {
    if (!selectEl) return;
    const prev = selectEl.value;
    selectEl.innerHTML = '';
    if (includeEmptyLabel) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = includeEmptyLabel;
      selectEl.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      selectEl.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      selectEl.value = prev;
    }
  };
  const ViewModels = {
    buildMediaGalleryViewModel: vi.fn(() => ({
      items: [
        {
          id: 'mda1',
          title: 'Media One',
          uri: 'https://example.com',
          description: 'Desc',
          kind: 'video',
          tags: ['tag'],
          entities: [{ id: 'e1', name: 'Entity 1' }],
          practices: [],
          events: [],
          texts: []
        }
      ]
    }))
  };
  return {
    getState: () => ({ snapshot, currentMovementId }),
    dom: { clearElement, ensureSelectOptions },
    services: { ViewModels }
  };
}

async function setup(overrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const { registerMediaTab } = await import('./media.js');
  const snapshot = createSnapshot();
  const ctx = createCtx(snapshot, overrides.currentMovementId);
  const tab = registerMediaTab(ctx);
  return { tab, ctx };
}

describe('media tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders media cards with linked entity section', async () => {
    const { tab, ctx } = await setup();

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelectorAll('#media-gallery .card').length).toBe(1);
    expect(document.querySelector('#media-gallery').textContent).toContain('Media One');
    expect(document.querySelector('#media-gallery').textContent).toContain('Entities:');
  });

  it('disables filters when no movement is selected', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.mount(ctx);
    tab.render(ctx);

    document
      .querySelectorAll('#media-entity-filter, #media-practice-filter, #media-event-filter, #media-text-filter')
      .forEach(select => {
        expect(select.disabled).toBe(true);
      });
    expect(document.querySelector('#media-gallery').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('passes selected filters to view model on change', async () => {
    const { tab, ctx } = await setup();
    const vmSpy = ctx.services.ViewModels.buildMediaGalleryViewModel;

    tab.mount(ctx);
    tab.render(ctx);

    vmSpy.mockClear();
    document.querySelector('#media-entity-filter').value = 'e1';
    document
      .querySelector('#media-entity-filter')
      .dispatchEvent(new Event('change', { bubbles: true }));

    const lastCall = vmSpy.mock.calls.at(-1);
    expect(lastCall[1]).toMatchObject({
      entityIdFilter: 'e1'
    });
  });
});
