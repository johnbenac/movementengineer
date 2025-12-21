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
  const actions = {
    jumpToEntity: vi.fn(),
    jumpToText: vi.fn()
  };
  const ViewModels = {
    buildPracticeDetailViewModel: vi.fn(() => ({
      practice: {
        id: 'p1',
        name: 'Practice',
        kind: 'ritual',
        description: 'desc',
        frequency: 'weekly',
        isPublic: true
      },
      entities: [{ id: 'e1', name: 'Entity', kind: 'type' }],
      instructionsTexts: [{ id: 't1', title: 'Text', depth: 1 }],
      supportingClaims: [{ id: 'c1', category: 'cat', text: 'Claim' }],
      attachedRules: [{ id: 'r1', kind: 'rule', shortText: 'Rule text' }],
      attachedEvents: [{ id: 'ev1', name: 'Event', recurrence: 'weekly' }],
      media: [{ id: 'm1', title: 'Media', kind: 'photo', uri: 'http://x' }]
    }))
  };
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions },
    actions
  };
}

describe('practices tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders practice details and wires navigation chips', async () => {
    renderDom();
    const snapshot = { practices: [{ id: 'p1', movementId: 'm1', name: 'Practice' }] };
    const ctx = createCtx(snapshot);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#practice-detail h3').textContent).toContain('Practice');

    document.querySelector('.chip-entity').dispatchEvent(new Event('click', { bubbles: true }));
    const clickableChips = document.querySelectorAll('.chip.clickable');
    clickableChips[clickableChips.length - 1].dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
  });

  it('disables controls and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { practices: [] };
    const ctx = createCtx(snapshot, null);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('practice-select').disabled).toBe(true);
    expect(document.querySelector('#practice-detail').textContent).toContain(
      'Create or select a movement'
    );
  });
});
