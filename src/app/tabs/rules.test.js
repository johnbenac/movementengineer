import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <select id="rules-kind-filter"></select>
    <input id="rules-domain-filter" />
    <select id="rules-rule-select"></select>
    <button id="rules-add-btn"></button>
    <button id="rules-save-btn"></button>
    <button id="rules-delete-btn"></button>
    <input id="rule-short-text" />
    <select id="rule-kind-input"></select>
    <textarea id="rule-details-input"></textarea>
    <input id="rule-applies-to" />
    <input id="rule-domain-input" />
    <input id="rule-tags-input" />
    <select id="rule-supporting-texts" multiple></select>
    <select id="rule-supporting-claims" multiple></select>
    <select id="rule-related-practices" multiple></select>
    <select id="rule-source-entities" multiple></select>
    <input id="rule-sources-of-truth" />
    <div id="rules-editor-hint"></div>
    <div id="rules-table-wrapper"></div>
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
    buildRuleExplorerViewModel: vi.fn(() => ({
      rules: [
        {
          id: 'r1',
          kind: 'Kind',
          shortText: 'Short',
          domain: ['D1'],
          appliesTo: [],
          tags: [],
          supportingTexts: [],
          supportingClaims: [],
          relatedPractices: [],
          sourcesOfTruth: []
        }
      ]
    }))
  };
  let state = { snapshot, currentMovementId, flags: {} };
  const DomainService = {
    createSkeletonItem: (_name, movementId) => ({
      id: 'r-new',
      movementId,
      shortText: 'New rule',
      kind: 'must_do',
      appliesTo: [],
      domain: [],
      tags: [],
      supportingTextIds: [],
      supportingClaimIds: [],
      relatedPracticeIds: [],
      sourcesOfTruth: [],
      sourceEntityIds: []
    }),
    upsertItem: (snap, _collection, item) => {
      const idx = (snap.rules || []).findIndex(r => r.id === item.id);
      if (idx >= 0) {
        snap.rules[idx] = item;
      } else {
        snap.rules.push(item);
      }
      return item;
    },
    deleteItem: (snap, _collection, id) => {
      const before = snap.rules.length;
      snap.rules = snap.rules.filter(r => r.id !== id);
      return before !== snap.rules.length;
    }
  };
  return {
    getState: () => state,
    setState: next => {
      state = next;
    },
    services: { ViewModels, DomainService },
    dom: { clearElement, ensureSelectOptions },
    setStatus: vi.fn()
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

  it('adds a new rule via the editor controls', async () => {
    renderDom();
    const snapshot = {
      rules: [{ id: 'r1', movementId: 'm1', shortText: 'Existing', kind: 'Kind' }],
      texts: [],
      claims: [],
      practices: [],
      entities: []
    };
    const ctx = createCtx(snapshot);
    const { registerRulesTab } = await import('./rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    document.getElementById('rules-add-btn').click();

    // New rule should be selected and present in the options
    expect(document.getElementById('rules-rule-select').value).toBe('r-new');
    expect(ctx.getState().snapshot.rules).toHaveLength(2);
  });
});
