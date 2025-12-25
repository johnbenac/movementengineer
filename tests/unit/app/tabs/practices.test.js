import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';

function renderDom() {
  document.body.innerHTML = `
    <select id="practice-select"></select>
    <div id="practice-detail"></div>
  `;
}

function createCtx(snapshot, vm, currentMovementId = 'm1', options = {}) {
  const state = { snapshot, currentMovementId };
  const store = {
    getState: () => state
  };
  const dom = createDomUtils();
  const buildPracticeDetailViewModel =
    options.vmBuilder || (() => vm);
  const subscriptions = [];
  const subscribe =
    options.subscribe ||
    (fn => {
      subscriptions.push(fn);
      return () => {};
    });
  const ViewModels = {
    buildPracticeDetailViewModel: vi.fn((...args) => buildPracticeDetailViewModel(...args))
  };
  return {
    store,
    getState: store.getState,
    services: { ViewModels },
    dom,
    actions: {
      openTarget: vi.fn()
    },
    subscribe,
    __subscriptions: subscriptions
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
    const { registerPracticesTab } = await import('../../../../src/app/tabs/practices.js');
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

    expect(ctx.actions.openTarget).toHaveBeenCalledWith({
      kind: 'item',
      collection: 'entities',
      id: 'e1'
    });
    expect(ctx.actions.openTarget).toHaveBeenCalledWith({
      kind: 'item',
      collection: 'texts',
      id: 't1'
    });
  });

  it('disables selection and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { practices: [] };
    const vm = { practice: null };
    const ctx = createCtx(snapshot, vm, null);
    const { registerPracticesTab } = await import('../../../../src/app/tabs/practices.js');
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
    const { registerPracticesTab } = await import('../../../../src/app/tabs/practices.js');
    const tab = registerPracticesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('practice-detail').textContent).toContain(
      'No practices found for this movement.'
    );
  });

  it('selects the first available practice when the previous selection is invalid', async () => {
    renderDom();
    const select = document.getElementById('practice-select');
    select.value = 'stale';
    const snapshot = {
      practices: [
        { id: 'p1', movementId: 'm1', name: 'Z Practice' },
        { id: 'p2', movementId: 'm1', name: 'A Practice' }
      ]
    };
    const vmBuilder = vi.fn((snap, { practiceId }) => ({
      practice: { id: practiceId, name: practiceId }
    }));
    const ctx = createCtx(snapshot, null, 'm1', { vmBuilder });
    const { registerPracticesTab } = await import('../../../../src/app/tabs/practices.js');
    const tab = registerPracticesTab(ctx);

    tab.render(ctx);

    expect(select.value).toBe('p2');
    expect(vmBuilder).toHaveBeenCalledWith(snapshot, { practiceId: 'p2' });
  });

  it('re-renders when the store notifies while the practices tab is active', async () => {
    renderDom();
    document.body.insertAdjacentHTML(
      'beforeend',
      '<button class="tab active" data-tab="practices"></button>'
    );
    const snapshot = {
      practices: [{ id: 'p1', movementId: 'm1', name: 'Practice One' }]
    };
    const vm = { practice: { id: 'p1', name: 'Practice One' } };
    const ctx = createCtx(snapshot, vm, 'm1');
    const { registerPracticesTab } = await import('../../../../src/app/tabs/practices.js');
    const tab = registerPracticesTab(ctx);

    const renderSpy = vi.spyOn(tab, 'render');

    tab.mount(ctx);
    tab.render(ctx);
    renderSpy.mockClear();

    ctx.__subscriptions.forEach(fn => fn());
    expect(renderSpy).toHaveBeenCalledTimes(1);

    document.querySelector('.tab').dataset.tab = 'other';
    renderSpy.mockClear();
    ctx.__subscriptions.forEach(fn => fn());
    expect(renderSpy).not.toHaveBeenCalled();
  });
});
