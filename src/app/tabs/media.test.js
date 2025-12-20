import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  const ViewModels = {
    buildMediaGalleryViewModel: vi.fn(() => ({
      items: [
        {
          id: 'm1',
          title: 'Media',
          kind: 'photo',
          uri: 'http://x',
          description: 'desc',
          tags: ['tag'],
          entities: [{ id: 'e1', name: 'Entity' }],
          practices: [],
          events: [],
          texts: []
        }
      ]
    }))
  };
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions }
  };
}

describe('media tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders media cards and passes filters to ViewModels', async () => {
    renderDom();
    const snapshot = {
      entities: [{ id: 'e1', movementId: 'm1', name: 'Entity' }],
      practices: [{ id: 'p1', movementId: 'm1', name: 'Practice' }],
      events: [{ id: 'ev1', movementId: 'm1', name: 'Event' }],
      texts: [{ id: 't1', movementId: 'm1', title: 'Text' }],
      media: []
    };
    const ctx = createCtx(snapshot);
    const { registerMediaTab } = await import('./media.js');
    const tab = registerMediaTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelectorAll('#media-gallery .card')).toHaveLength(1);

    const entitySelect = document.getElementById('media-entity-filter');
    const practiceSelect = document.getElementById('media-practice-filter');
    const eventSelect = document.getElementById('media-event-filter');
    const textSelect = document.getElementById('media-text-filter');

    entitySelect.value = 'e1';
    practiceSelect.value = 'p1';
    eventSelect.value = 'ev1';
    textSelect.value = 't1';

    [entitySelect, practiceSelect, eventSelect, textSelect].forEach(el =>
      el.dispatchEvent(new Event('change', { bubbles: true }))
    );

    const vm = ctx.services.ViewModels.buildMediaGalleryViewModel;
    const lastArgs = vm.mock.calls[vm.mock.calls.length - 1][1];
    expect(lastArgs).toEqual({
      movementId: 'm1',
      entityIdFilter: 'e1',
      practiceIdFilter: 'p1',
      eventIdFilter: 'ev1',
      textIdFilter: 't1'
    });
  });

  it('disables filters and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { media: [], entities: [], practices: [], events: [], texts: [] };
    const ctx = createCtx(snapshot, null);
    const { registerMediaTab } = await import('./media.js');
    const tab = registerMediaTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#media-gallery').textContent).toContain(
      'Create or select a movement'
    );
    expect(document.getElementById('media-entity-filter').disabled).toBe(true);
    expect(document.getElementById('media-practice-filter').disabled).toBe(true);
    expect(document.getElementById('media-event-filter').disabled).toBe(true);
    expect(document.getElementById('media-text-filter').disabled).toBe(true);
  });
});
