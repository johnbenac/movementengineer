import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <select id="rules-kind-filter"></select>
    <input id="rules-domain-filter" />
    <div id="rules-editor">
      <div id="rule-editor-status"></div>
      <select id="rules-select"></select>
      <input id="rule-short-text" />
      <select id="rule-kind"></select>
      <textarea id="rule-details"></textarea>
      <input id="rule-domain" />
      <datalist id="rule-domain-options"></datalist>
      <input id="rule-applies-to" />
      <input id="rule-tags" />
      <select id="rule-supporting-texts" multiple></select>
      <select id="rule-supporting-claims" multiple></select>
      <select id="rule-related-practices" multiple></select>
      <select id="rule-source-entities" multiple></select>
      <input id="rule-sources-of-truth" />
      <button id="btn-add-rule" type="button"></button>
      <button id="btn-save-rule" type="button"></button>
      <button id="btn-delete-rule" type="button"></button>
    </div>
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
    })),
    buildRuleEditorViewModel: vi.fn(() => ({
      rules: [{ id: 'r1', label: 'Short', kind: 'Kind', domain: ['D1'] }],
      domainOptions: ['D1', 'D2'],
      referenceOptions: {
        texts: [],
        claims: [],
        practices: [],
        entities: []
      }
    }))
  };
  const createRule = vi.fn(() => ({ id: 'r-new' }));
  const saveRule = vi.fn((id, updates) => ({ id, ...updates }));
  const deleteRule = vi.fn(() => true);
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions },
    actions: { createRule, saveRule, deleteRule },
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
    expect(document.getElementById('rule-short-text').disabled).toBe(true);
    expect(document.getElementById('btn-add-rule').disabled).toBe(true);
  });

  it('creates and saves rules through exposed actions', async () => {
    renderDom();
    const snapshot = {
      rules: [
        {
          id: 'r1',
          movementId: 'm1',
          kind: 'Kind',
          shortText: 'Short',
          domain: ['D1'],
          appliesTo: ['pilgrims'],
          tags: ['tag1'],
          supportingTextIds: [],
          supportingClaimIds: [],
          relatedPracticeIds: [],
          sourceEntityIds: [],
          sourcesOfTruth: ['tradition']
        }
      ]
    };
    const ctx = createCtx(snapshot, 'm1');
    const { registerRulesTab } = await import('./rules.js');
    const tab = registerRulesTab(ctx);

    tab.render(ctx);

    document.getElementById('btn-add-rule').click();
    expect(ctx.actions.createRule).toHaveBeenCalledWith('m1');

    document.getElementById('rule-short-text').value = 'Updated rule';
    document.getElementById('rule-domain').value = 'D1, D2';
    document.getElementById('rule-sources-of-truth').value = 'tradition, archive';
    document.getElementById('btn-save-rule').click();

    expect(ctx.actions.saveRule).toHaveBeenCalled();
    const [, payload] = ctx.actions.saveRule.mock.calls.pop();
    expect(payload.domain).toEqual(['D1', 'D2']);
    expect(payload.sourcesOfTruth).toEqual(['tradition', 'archive']);
  });
});
