import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <select id="practice-select"></select>
    <div id="practice-detail"></div>
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

  let stateSubscriber;
  const subscribe = fn => {
    stateSubscriber = fn;
    return () => {
      stateSubscriber = null;
    };
  };
  const triggerSubscription = () => stateSubscriber && stateSubscriber();

  const ViewModels = {
    buildPracticeDetailViewModel: vi.fn(() => ({
      practice: {
        id: 'p1',
        name: 'Meditation',
        kind: 'spiritual',
        frequency: 'weekly',
        isPublic: true,
        description: 'A grounding practice'
      },
      entities: [{ id: 'e1', name: 'Alice', kind: 'person' }],
      instructionsTexts: [{ id: 't1', title: 'Guide', depth: 2 }],
      supportingClaims: [{ id: 'c1', text: 'It helps focus', category: 'benefit' }],
      attachedRules: [{ id: 'r1', shortText: 'Rule', kind: 'guideline' }],
      attachedEvents: [{ id: 'ev1', name: 'Retreat', recurrence: 'annual' }],
      media: [{ id: 'm1', title: 'Photo', kind: 'image', uri: 'http://example.com' }]
    }))
  };
  const actions = {
    jumpToEntity: vi.fn(),
    jumpToText: vi.fn()
  };

  const ctx = {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions },
    actions,
    subscribe
  };

  return { ctx, triggerSubscription };
}

describe('practices tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {}, actions: {} };
  });

  it('renders practice detail and wires chips to navigation actions', async () => {
    renderDom();
    const snapshot = {
      practices: [{ id: 'p1', movementId: 'm1', name: 'Meditation' }]
    };
    const { ctx } = createCtx(snapshot);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#practice-detail h3').textContent).toContain('Meditation');
    expect(document.querySelectorAll('#practice-select option')).toHaveLength(2); // empty + option

    const entityChip = document.querySelector('#practice-detail .chip-entity.clickable');
    const textChip = Array.from(
      document.querySelectorAll('#practice-detail .chip.clickable')
    ).find(el => !el.classList.contains('chip-entity'));

    entityChip?.dispatchEvent(new Event('click', { bubbles: true }));
    textChip?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
  });

  it('disables controls and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { practices: [] };
    const { ctx } = createCtx(snapshot, null);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('practice-select').disabled).toBe(true);
    expect(document.querySelector('#practice-detail').textContent).toContain(
      'Create or select a movement'
    );
  });
});
