import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div id="rules-table-wrapper"></div>
    <select id="rules-kind-filter"></select>
    <input id="rules-domain-filter" />
  `;
}

function createState(overrides = {}) {
  return {
    snapshot: {
      rules: [
        { id: 'r1', movementId: 'm1', kind: 'Safety', domain: ['safety'] },
        { id: 'r2', movementId: 'm1', kind: 'Practice', domain: ['care'] }
      ]
    },
    currentMovementId: 'm1',
    ...overrides
  };
}

function createCtx(stateRef) {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ensureSelectOptions = (select, options, label) => {
    if (!select) return;
    const prev = select.value;
    clearElement(select);
    if (label) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = label;
      select.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      select.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      select.value = prev;
    }
  };

  const baseRules = [
    {
      id: 'r1',
      kind: 'Safety',
      shortText: 'Stay safe',
      domain: ['safety'],
      appliesTo: ['all'],
      tags: [],
      supportingTexts: [],
      supportingClaims: [],
      relatedPractices: [],
      sourcesOfTruth: []
    },
    {
      id: 'r2',
      kind: 'Practice',
      shortText: 'Be kind',
      domain: ['care'],
      appliesTo: ['members'],
      tags: ['kindness'],
      supportingTexts: [],
      supportingClaims: [],
      relatedPractices: [],
      sourcesOfTruth: []
    }
  ];

  const ViewModels = {
    buildRuleExplorerViewModel: vi.fn((data, { kindFilter, domainFilter }) => ({
      rules: baseRules.filter(
        rule =>
          (!kindFilter?.length || kindFilter.includes(rule.kind)) &&
          (!domainFilter?.length || rule.domain.some(d => domainFilter.includes(d))) &&
          data.rules.some(r => r.id === rule.id && r.movementId === data.currentMovementId)
      )
    }))
  };

  return {
    getState: () => stateRef,
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions },
    subscribe: () => () => {}
  };
}

async function setup(stateOverrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const state = createState(stateOverrides);
  state.snapshot.currentMovementId = state.currentMovementId;
  const ctx = createCtx(state);
  const { registerRulesTab } = await import('./rules.js');
  const tab = registerRulesTab(ctx);
  tab.mount(ctx);
  return { tab, ctx, state };
}

describe('rules tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders rules table and responds to kind/domain filters', async () => {
    const { tab, ctx } = await setup();
    tab.render(ctx);

    const rows = document.querySelectorAll('#rules-table-wrapper table tr');
    expect(rows.length).toBe(3);

    const kindSelect = document.getElementById('rules-kind-filter');
    kindSelect.value = 'Safety';
    kindSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const vm = ctx.services.ViewModels.buildRuleExplorerViewModel;
    expect(vm.mock.calls.at(-1)[1].kindFilter).toEqual(['Safety']);

    const domainInput = document.getElementById('rules-domain-filter');
    domainInput.value = 'safety,';
    domainInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(vm.mock.calls.at(-1)[1].domainFilter).toEqual(['safety']);
  });

  it('disables inputs and shows hint when movement is missing', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });
    tab.render(ctx);

    expect(document.getElementById('rules-kind-filter').disabled).toBe(true);
    expect(document.getElementById('rules-domain-filter').disabled).toBe(true);
    expect(document.querySelector('#rules-table-wrapper').textContent).toContain(
      'Create or select a movement on the left'
    );
    expect(ctx.services.ViewModels.buildRuleExplorerViewModel).not.toHaveBeenCalled();
  });
});
