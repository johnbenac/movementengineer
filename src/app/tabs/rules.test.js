import { beforeEach, describe, expect, it, vi } from 'vitest';

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
    rules: [
      {
        id: 'r1',
        movementId: 'm1',
        kind: 'Guideline',
        domain: ['safety'],
        shortText: 'Rule 1',
        appliesTo: ['all'],
        tags: ['t'],
        supportingTextIds: ['t1'],
        supportingClaimIds: ['c1'],
        relatedPracticeIds: ['p1'],
        sourcesOfTruth: ['Source']
      }
    ],
    texts: [{ id: 't1', movementId: 'm1', title: 'Text' }]
  };
}

function renderDom() {
  document.body.innerHTML = `
    <select id="rules-kind-filter"></select>
    <input id="rules-domain-filter" />
    <div id="rules-table-wrapper"></div>
  `;
}

function createCtx(snapshot, stateOverrides = {}) {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ViewModels = {
    buildRuleExplorerViewModel: vi.fn((data, { kindFilter, domainFilter }) => {
      const matchesKind = !kindFilter?.length || kindFilter.includes('Guideline');
      const matchesDomain = !domainFilter?.length || domainFilter.includes('safety');
      return {
        rules: matchesKind && matchesDomain
          ? [
              {
                id: 'r1',
                shortText: 'Rule 1',
                kind: 'Guideline',
                domain: ['safety'],
                appliesTo: ['all'],
                tags: ['t'],
                supportingTexts: [{ id: 't1', title: 'Text' }],
                supportingClaims: [{ id: 'c1', text: 'Claim', category: 'Cat' }],
                relatedPractices: [{ id: 'p1', name: 'Practice' }],
                sourcesOfTruth: ['Source']
              }
            ]
          : []
      };
    })
  };
  const state = {
    snapshot,
    currentMovementId: 'm1',
    ...stateOverrides
  };
  return {
    getState: () => state,
    services: { ViewModels },
    dom: { clearElement }
  };
}

async function setup(stateOverrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const { registerRulesTab } = await import('./rules.js');
  const snapshot = createSnapshot();
  const ctx = createCtx(snapshot, stateOverrides);
  const tab = registerRulesTab(ctx);
  return { tab, ctx };
}

describe('rules tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows hint and disables filters when no movement', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.getElementById('rules-kind-filter').disabled).toBe(true);
    expect(document.getElementById('rules-domain-filter').disabled).toBe(true);
    expect(document.getElementById('rules-table-wrapper').textContent).toContain(
      'Create or select a movement on the left'
    );
  });

  it('renders rules table with headers', async () => {
    const { tab, ctx } = await setup();

    tab.render(ctx);

    const rows = document.querySelectorAll('#rules-table-wrapper table tr');
    expect(rows.length).toBe(2);
    const headers = Array.from(rows[0].querySelectorAll('th')).map(el => el.textContent);
    expect(headers).toEqual([
      'Kind',
      'Short text',
      'Domain',
      'Applies to',
      'Tags',
      'Supporting texts',
      'Supporting claims',
      'Related practices',
      'Sources of truth'
    ]);
    expect(rows[1].textContent).toContain('Rule 1');
  });

  it('passes selected filters to ViewModels', async () => {
    const { tab, ctx } = await setup();
    const kindSelect = document.getElementById('rules-kind-filter');
    const domainInput = document.getElementById('rules-domain-filter');

    tab.mount(ctx);
    tab.render(ctx);
    kindSelect.value = 'Guideline';
    domainInput.value = 'safety';
    kindSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const vm = ctx.services.ViewModels.buildRuleExplorerViewModel;
    expect(vm).toHaveBeenLastCalledWith(ctx.getState().snapshot, {
      movementId: 'm1',
      kindFilter: ['Guideline'],
      domainFilter: ['safety']
    });
  });
});
