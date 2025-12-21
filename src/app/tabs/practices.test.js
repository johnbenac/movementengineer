import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="practices"></button>
    <select id="practice-select"></select>
    <div id="practice-detail"></div>
  `;
}

function createCtx(snapshot, vm, currentMovementId = 'm1', overrides = {}) {
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
  const subscriptions = [];
  let unsubscribed = false;
  const subscribe =
    overrides.subscribe ||
    (cb => {
      subscriptions.push(cb);
      return () => {
        unsubscribed = true;
      };
    });
  const ViewModels = {
    buildPracticeDetailViewModel: vi.fn(() => vm)
  };
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions },
    actions: {
      jumpToEntity: vi.fn(),
      jumpToText: vi.fn(),
      jumpToPractice: vi.fn()
    },
    subscribe,
    __subscriptions: subscriptions,
    __wasUnsubscribed: () => unsubscribed
  };
}

describe('practices tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders practice detail and wires navigation chips', async () => {
    renderDom();
    const snapshot = {
      practices: [{ id: 'p1', movementId: 'm1', name: 'Practice One', kind: 'ritual' }]
    };
    const vm = {
      practice: {
        id: 'p1',
        name: 'Practice One',
        kind: 'ritual',
        frequency: 'daily',
        isPublic: true,
        description: 'desc'
      },
      entities: [{ id: 'e1', name: 'Entity', kind: 'person' }],
      instructionsTexts: [{ id: 't1', title: 'Instruction', depth: 2 }],
      supportingClaims: [{ id: 'c1', text: 'Claim', category: 'cat' }],
      attachedRules: [{ id: 'r1', shortText: 'Rule', kind: 'safety' }],
      attachedEvents: [{ id: 'ev1', name: 'Event', recurrence: 'weekly' }],
      media: [{ id: 'm1', title: 'Media', kind: 'photo', uri: 'http://example.com' }]
    };
    const ctx = createCtx(snapshot, vm);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#practice-detail h3').textContent).toContain('Practice One');
    expect(document.querySelector('#practice-detail').textContent).toContain('Frequency: daily');
    expect(document.querySelectorAll('#practice-detail .chip-row .chip').length).toBeGreaterThan(0);

    document.querySelector('.chip-entity.clickable').dispatchEvent(
      new Event('click', { bubbles: true })
    );
    document.querySelector('.chip.clickable[title^=\"Depth\"]').dispatchEvent(
      new Event('click', { bubbles: true })
    );

    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
  });

  it('disables selection and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { practices: [] };
    const vm = { practice: null };
    const ctx = createCtx(snapshot, vm, null);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('practice-select').disabled).toBe(true);
    expect(document.getElementById('practice-detail').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('shows empty state when no practices exist for the movement', async () => {
    renderDom();
    const snapshot = { practices: [] };
    const vm = { practice: null };
    const ctx = createCtx(snapshot, vm);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('practice-detail').textContent).toContain(
      'No practices found for this movement.'
    );
  });

  it('re-renders on store updates while active and cleans up on unmount', async () => {
    renderDom();
    const snapshot = {
      practices: [{ id: 'p1', movementId: 'm1', name: 'Practice One', kind: 'ritual' }]
    };
    const vm = {
      practice: { id: 'p1', name: 'Practice One' },
      entities: [],
      instructionsTexts: [],
      supportingClaims: [],
      attachedRules: [],
      attachedEvents: [],
      media: []
    };
    const ctx = createCtx(snapshot, vm);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);
    const renderSpy = vi.spyOn(tab, 'render');

    tab.mount(ctx);
    expect(ctx.__subscriptions.length).toBe(1);

    ctx.__subscriptions[0]?.();
    expect(renderSpy).toHaveBeenCalledTimes(1);

    renderSpy.mockClear();
    tab.unmount();
    document
      .getElementById('practice-select')
      .dispatchEvent(new Event('change', { bubbles: true }));
    expect(renderSpy).not.toHaveBeenCalled();
    expect(ctx.__wasUnsubscribed()).toBe(true);
  });
});
