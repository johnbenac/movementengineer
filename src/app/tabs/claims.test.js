import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div id="claims-table-wrapper"></div>
    <select id="claims-category-filter"></select>
    <select id="claims-entity-filter"></select>
  `;
}

function createState(overrides = {}) {
  return {
    snapshot: {
      claims: [
        { id: 'c1', movementId: 'm1', category: 'Safety', aboutEntityIds: ['e1'] },
        { id: 'c2', movementId: 'm1', category: 'Impact', aboutEntityIds: ['e2'] }
      ],
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Alice' },
        { id: 'e2', movementId: 'm1', name: 'Bob' }
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

  const baseClaims = [
    {
      id: 'c1',
      text: 'Stay safe',
      category: 'Safety',
      tags: ['t1'],
      aboutEntities: [{ id: 'e1', name: 'Alice' }],
      sourceTexts: [{ id: 'tx1', title: 'Doc' }],
      sourcesOfTruth: ['Manual']
    },
    {
      id: 'c2',
      text: 'Do good',
      category: 'Impact',
      tags: [],
      aboutEntities: [{ id: 'e2', name: 'Bob' }],
      sourceTexts: [],
      sourcesOfTruth: []
    }
  ];

  const ViewModels = {
    buildClaimsExplorerViewModel: vi.fn((data, { categoryFilter, entityIdFilter }) => ({
      claims: baseClaims.filter(
        claim =>
          (!categoryFilter?.length || categoryFilter.includes(claim.category)) &&
          (!entityIdFilter || claim.aboutEntities.some(e => e.id === entityIdFilter)) &&
          data.claims.some(c => c.id === claim.id && c.movementId === data.currentMovementId)
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
  const { registerClaimsTab } = await import('./claims.js');
  const tab = registerClaimsTab(ctx);
  tab.mount(ctx);
  return { tab, ctx, state };
}

describe('claims tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders claims table and re-renders on filter change', async () => {
    const { tab, ctx, state } = await setup();

    tab.render(ctx);

    const rows = document.querySelectorAll('#claims-table-wrapper table tr');
    expect(rows.length).toBe(3);

    const categorySelect = document.getElementById('claims-category-filter');
    categorySelect.value = 'Safety';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));

    const updatedRows = document.querySelectorAll('#claims-table-wrapper table tr');
    expect(updatedRows.length).toBe(2);

    const vm = ctx.services.ViewModels.buildClaimsExplorerViewModel;
    const lastCall = vm.mock.calls.at(-1)[1];
    expect(lastCall.categoryFilter).toEqual(['Safety']);
    expect(lastCall.entityIdFilter).toBe(null);

    categorySelect.value = '';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));

    const entitySelect = document.getElementById('claims-entity-filter');
    entitySelect.value = 'e2';
    entitySelect.dispatchEvent(new Event('change', { bubbles: true }));

    const finalRows = document.querySelectorAll('#claims-table-wrapper table tr');
    expect(finalRows.length).toBe(2);
    expect(vm).toHaveBeenCalledTimes(4);
    expect(vm.mock.calls.at(-1)[1]).toMatchObject({ entityIdFilter: 'e2' });
    expect(state.currentMovementId).toBe('m1');
  });

  it('disables controls and shows hint when no movement is selected', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.render(ctx);

    expect(document.getElementById('claims-category-filter').disabled).toBe(true);
    expect(document.getElementById('claims-entity-filter').disabled).toBe(true);
    expect(document.querySelector('#claims-table-wrapper').textContent).toContain(
      'Create or select a movement on the left'
    );
    expect(ctx.services.ViewModels.buildClaimsExplorerViewModel).not.toHaveBeenCalled();
  });
});
