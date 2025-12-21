import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <section id="tab-rules" class="tab-panel active">
      <div class="panel-body">
        <div class="subtab-toolbar">
          <select id="rules-kind-filter"></select>
          <input id="rules-domain-filter" />
        </div>
        <div id="rules-table-wrapper"></div>
      </div>
    </section>
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
    buildRuleExplorerViewModel: vi.fn((snap, { movementId }) => {
      const rules = (snap.rules || []).filter(r => r.movementId === movementId);
      const lookupTexts = (snap.texts || []).filter(t => t.movementId === movementId);
      const lookupClaims = (snap.claims || []).filter(c => c.movementId === movementId);
      const lookupPractices = (snap.practices || []).filter(p => p.movementId === movementId);
      const lookupEntities = (snap.entities || []).filter(e => e.movementId === movementId);
      return {
        rules: rules.map(rule => ({
          ...rule,
          supportingTexts: [],
          supportingClaims: [],
          relatedPractices: []
        })),
        lookups: {
          texts: lookupTexts,
          claims: lookupClaims,
          practices: lookupPractices,
          entities: lookupEntities,
          domains: ['D1'],
          tags: ['Tag'],
          appliesTo: ['All']
        }
      };
    })
  };
  const DomainService = {
    addNewItem: vi.fn((snap, collName, movementIdParam) => {
      const item = {
        id: 'new-rule',
        movementId: movementIdParam,
        shortText: 'New rule',
        kind: 'must_do'
      };
      snap.rules.push(item);
      return item;
    }),
    deleteItem: vi.fn((snap, _coll, id) => {
      snap.rules = snap.rules.filter(r => r.id !== id);
      return true;
    }),
    upsertItem: vi.fn((snap, _coll, item) => {
      const idx = snap.rules.findIndex(r => r.id === item.id);
      if (idx >= 0) {
        snap.rules[idx] = item;
      } else {
        snap.rules.push(item);
      }
      return item;
    })
  };
  const state = { snapshot, currentMovementId };
  return {
    getState: () => state,
    update: updater => {
      const next = typeof updater === 'function' ? updater(state) : updater;
      if (next && typeof next === 'object') {
        Object.assign(state, next);
      }
      return state;
    },
    services: { ViewModels, DomainService },
    dom: { clearElement, ensureSelectOptions }
  };
}

describe('rules tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders rules table and passes filters to ViewModels', async () => {
    renderDom();
    const snapshot = {
      rules: [{ id: 'r1', movementId: 'm1', kind: 'Kind', domain: ['D1'] }]
    };
    const ctx = createCtx(snapshot);
    const { registerRulesTab } = await import('./rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelectorAll('#rules-table-wrapper table tr')).toHaveLength(2);

    const kindSelect = document.getElementById('rules-kind-filter');
    const domainInput = document.getElementById('rules-domain-filter');
    kindSelect.value = 'Kind';
    domainInput.value = 'D1, D2';
    kindSelect.dispatchEvent(new Event('change', { bubbles: true }));
    domainInput.dispatchEvent(new Event('input', { bubbles: true }));

    const vm = ctx.services.ViewModels.buildRuleExplorerViewModel;
    const lastArgs = vm.mock.calls[vm.mock.calls.length - 1][1];
    expect(lastArgs).toEqual({
      movementId: 'm1',
      kindFilter: ['Kind'],
      domainFilter: ['D1', 'D2']
    });
  });

  it('disables inputs and shows hint with no movement selected', async () => {
    renderDom();
    const snapshot = { rules: [] };
    const ctx = createCtx(snapshot, null);
    const { registerRulesTab } = await import('./rules.js');
    const tab = registerRulesTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#rules-table-wrapper').textContent).toContain(
      'Create or select a movement'
    );
    expect(document.getElementById('rules-kind-filter').disabled).toBe(true);
    expect(document.getElementById('rules-domain-filter').disabled).toBe(true);
  });

  it('supports creating, updating, and deleting rules with cross-link lookups', async () => {
    renderDom();
    const snapshot = {
      rules: [
        {
          id: 'r1',
          movementId: 'm1',
          kind: 'Kind',
          shortText: 'Short',
          domain: ['D1'],
          appliesTo: [],
          tags: [],
          supportingTextIds: [],
          supportingClaimIds: [],
          relatedPracticeIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: []
        }
      ],
      texts: [{ id: 't1', movementId: 'm1', title: 'T1' }],
      claims: [{ id: 'c1', movementId: 'm1', text: 'C1' }],
      practices: [{ id: 'p1', movementId: 'm1', name: 'P1' }],
      entities: [{ id: 'e1', movementId: 'm1', name: 'E1' }]
    };
    const ctx = createCtx(snapshot);
    const { registerRulesTab } = await import('./rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    // Create a new rule
    document.getElementById('rules-btn-new').click();
    expect(ctx.services.DomainService.addNewItem).toHaveBeenCalledWith(
      expect.any(Object),
      'rules',
      'm1'
    );
    expect(ctx.getState().snapshot.rules.some(r => r.id === 'new-rule')).toBe(true);

    // Select existing rule and update with cross-links
    document.getElementById('rules-select-rule').value = 'r1';
    document.getElementById('rules-select-rule').dispatchEvent(new Event('change', { bubbles: true }));

    document.getElementById('rules-btn-save').scrollIntoView?.(); // noop for jsdom
    document.querySelector('#rules-editor select[multiple]').value = 't1';

    const textSelect = document.querySelector('#rules-editor select[multiple]');
    if (textSelect && textSelect.options.length) {
      Array.from(textSelect.options).forEach(opt => (opt.selected = opt.value === 't1'));
    }
    const claimSelect = document.querySelectorAll('#rules-editor select[multiple]')[1];
    if (claimSelect && claimSelect.options.length) {
      Array.from(claimSelect.options).forEach(opt => (opt.selected = opt.value === 'c1'));
    }
    const practiceSelect = document.querySelectorAll('#rules-editor select[multiple]')[2];
    if (practiceSelect && practiceSelect.options.length) {
      Array.from(practiceSelect.options).forEach(opt => (opt.selected = opt.value === 'p1'));
    }
    const entitySelect = document.querySelectorAll('#rules-editor select[multiple]')[3];
    if (entitySelect && entitySelect.options.length) {
      Array.from(entitySelect.options).forEach(opt => (opt.selected = opt.value === 'e1'));
    }

    document.getElementById('rules-btn-save').click();

    expect(ctx.services.DomainService.upsertItem).toHaveBeenCalled();
    const updatedRule = ctx.getState().snapshot.rules.find(r => r.id === 'r1');
    expect(updatedRule.supportingTextIds).toContain('t1');
    expect(updatedRule.supportingClaimIds).toContain('c1');
    expect(updatedRule.relatedPracticeIds).toContain('p1');
    expect(updatedRule.sourceEntityIds).toContain('e1');

    // Delete rule
    window.confirm = vi.fn(() => true);
    document.getElementById('rules-btn-delete').click();
    expect(ctx.services.DomainService.deleteItem).toHaveBeenCalledWith(
      expect.any(Object),
      'rules',
      'r1'
    );
    expect(ctx.getState().snapshot.rules.find(r => r.id === 'r1')).toBeUndefined();
  });
});
