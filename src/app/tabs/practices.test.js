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
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
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
    buildPracticeDetailViewModel: vi.fn((snap, { practiceId }) => {
      const practice = (snap.practices || []).find(p => p.id === practiceId);
      if (!practice) return { practice: null };
      return {
        practice: {
          ...practice,
          frequency: practice.frequency || 'weekly',
          isPublic: practice.isPublic ?? true
        },
        entities: [{ id: 'e1', name: 'Entity', kind: 'Person' }],
        instructionsTexts: [{ id: 't1', title: 'Instruction', depth: 1 }],
        supportingClaims: [{ category: 'A', text: 'Claim text' }],
        attachedRules: [{ kind: 'rule', shortText: 'Rule text' }],
        attachedEvents: [{ name: 'Event', recurrence: 'weekly' }],
        media: [{ title: 'Media', kind: 'photo', uri: 'http://example.com' }]
      };
    })
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
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {}, actions: {} };
  });

  it('renders practice detail and wires actions', async () => {
    renderDom();
    const snapshot = {
      practices: [
        { id: 'p2', movementId: 'm1', name: 'Zeta Practice', description: 'desc' },
        { id: 'p1', movementId: 'm1', name: 'Alpha Practice' }
      ]
    };
    const ctx = createCtx(snapshot);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const select = document.getElementById('practice-select');
    expect(select.disabled).toBe(false);
    expect(select.querySelectorAll('option')).toHaveLength(3);

    const detail = document.getElementById('practice-detail');
    expect(detail.textContent).toContain('Alpha Practice');
    expect(detail.textContent).toContain('Frequency: weekly');
    expect(detail.textContent).toContain('Claim text');
    expect(detail.textContent).toContain('Rule text');
    expect(detail.textContent).toContain('Media (photo)');

    const entityChip = detail.querySelector('.chip-entity');
    entityChip.click();
    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');

    const instructionChip = [...detail.querySelectorAll('.chip.clickable')].find(chip =>
      chip.textContent.includes('Instruction')
    );
    instructionChip.click();
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');

    select.value = 'p2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const lastArgs =
      ctx.services.ViewModels.buildPracticeDetailViewModel.mock.calls.slice(-1)[0][1];
    expect(lastArgs).toEqual({ practiceId: 'p2' });
  });

  it('disables inputs when no movement is selected', async () => {
    renderDom();
    const snapshot = { practices: [] };
    const ctx = createCtx(snapshot, null);
    const { registerPracticesTab } = await import('./practices.js');
    const tab = registerPracticesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('practice-select').disabled).toBe(true);
    expect(document.getElementById('practice-detail').textContent).toContain(
      'Create or select a movement'
    );
  });
});
