import { beforeEach, describe, expect, it, vi } from 'vitest';

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
    rules: [
      { id: 'r1', movementId: 'm1', kind: 'A', shortText: 'Rule A', domain: ['x'] },
      { id: 'r2', movementId: 'm1', kind: 'B', shortText: 'Rule B', domain: ['y'] }
    ],
    texts: [],
    claims: [],
    practices: []
  };
}

function renderDom() {
  document.body.innerHTML = `
    <select id="rules-kind-filter"></select>
    <input id="rules-domain-filter" />
    <div id="rules-table-wrapper"></div>
  `;
}

function createCtx(snapshot, currentMovementId = 'm1') {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ensureSelectOptions = (selectEl, options = [], includeEmptyLabel) => {
    if (!selectEl) return;
    const prev = selectEl.value;
    selectEl.innerHTML = '';
    if (includeEmptyLabel) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = includeEmptyLabel;
      selectEl.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      selectEl.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      selectEl.value = prev;
    }
  };
  const ViewModels = {
    buildRuleExplorerViewModel: vi.fn(() => ({
      rules: [
        {
          id: 'r1',
          kind: 'A',
          shortText: 'Rule A',
          domain: ['x'],
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
  return {
    getState: () => ({ snapshot, currentMovementId }),
    dom: { clearElement, ensureSelectOptions },
    services: { ViewModels }
  };
}

async function setup(overrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const { registerRulesTab } = await import('./rules.js');
  const snapshot = createSnapshot();
  const ctx = createCtx(snapshot, overrides.currentMovementId);
  const tab = registerRulesTab(ctx);
  return { tab, ctx };
}

describe('rules tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders rules table headers', async () => {
    const { tab, ctx } = await setup();

    tab.mount(ctx);
    tab.render(ctx);

    const headers = Array.from(
      document.querySelectorAll('#rules-table-wrapper table tr:first-child th')
    ).map(th => th.textContent);
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
  });

  it('disables filters when no movement is selected', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#rules-kind-filter').disabled).toBe(true);
    expect(document.querySelector('#rules-domain-filter').disabled).toBe(true);
    expect(document.querySelector('#rules-table-wrapper').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('passes parsed filters to view model on input', async () => {
    const { tab, ctx } = await setup();
    const vmSpy = ctx.services.ViewModels.buildRuleExplorerViewModel;

    tab.mount(ctx);
    tab.render(ctx);

    vmSpy.mockClear();
    document.querySelector('#rules-kind-filter').value = 'A';
    document.querySelector('#rules-domain-filter').value = 'x, y';
    document
      .querySelector('#rules-domain-filter')
      .dispatchEvent(new Event('input', { bubbles: true }));

    const lastCall = vmSpy.mock.calls.at(-1);
    expect(lastCall[1]).toMatchObject({
      kindFilter: ['A'],
      domainFilter: ['x', 'y']
    });
  });
});
