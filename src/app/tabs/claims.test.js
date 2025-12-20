import { beforeEach, describe, expect, it, vi } from 'vitest';

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
    entities: [
      { id: 'e1', movementId: 'm1', name: 'Alice' },
      { id: 'e2', movementId: 'm1', name: 'Bob' }
    ],
    claims: [
      {
        id: 'c1',
        movementId: 'm1',
        category: 'Belief',
        text: 'Claim text',
        aboutEntityIds: ['e1'],
        sourceTextIds: ['tx1'],
        sourcesOfTruth: ['Source'],
        tags: ['t1']
      }
    ],
    texts: [{ id: 'tx1', movementId: 'm1', title: 'Text 1' }]
  };
}

function renderDom() {
  document.body.innerHTML = `
    <select id="claims-category-filter"></select>
    <select id="claims-entity-filter"></select>
    <div id="claims-table-wrapper"></div>
  `;
}

function createCtx(snapshot, stateOverrides = {}) {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ViewModels = {
    buildClaimsExplorerViewModel: vi.fn((data, { categoryFilter, entityIdFilter }) => {
      return {
        claims: [
          {
            id: 'c1',
            text: 'Claim text',
            category: categoryFilter?.[0] || 'Cat',
            tags: ['t1'],
            aboutEntities: [{ id: 'e1', name: 'Alice' }],
            sourceTexts: [{ id: 'tx1', title: 'Text 1' }],
            sourcesOfTruth: ['Source']
          }
        ].filter(claim => !entityIdFilter || claim.aboutEntities.some(e => e.id === entityIdFilter))
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
  const { registerClaimsTab } = await import('./claims.js');
  const snapshot = createSnapshot();
  const ctx = createCtx(snapshot, stateOverrides);
  const tab = registerClaimsTab(ctx);
  return { tab, ctx };
}

describe('claims tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disables filters and shows hint when no movement selected', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.getElementById('claims-category-filter').disabled).toBe(true);
    expect(document.getElementById('claims-entity-filter').disabled).toBe(true);
    expect(document.getElementById('claims-table-wrapper').textContent).toContain(
      'Create or select a movement on the left'
    );
  });

  it('renders claims table with data from ViewModels', async () => {
    const { tab, ctx } = await setup();

    tab.render(ctx);

    const rows = document.querySelectorAll('#claims-table-wrapper table tr');
    expect(rows.length).toBe(2);
    const headerCells = Array.from(rows[0].querySelectorAll('th')).map(el => el.textContent);
    expect(headerCells).toEqual([
      'Category',
      'Text',
      'Tags',
      'About entities',
      'Source texts',
      'Sources of truth'
    ]);
    expect(rows[1].textContent).toContain('Claim text');
  });

  it('calls ViewModels with selected filters', async () => {
    const { tab, ctx } = await setup();
    const catSelect = document.getElementById('claims-category-filter');
    const entSelect = document.getElementById('claims-entity-filter');

    tab.mount(ctx);
    tab.render(ctx);
    catSelect.value = 'Belief';
    entSelect.value = 'e1';
    catSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const vm = ctx.services.ViewModels.buildClaimsExplorerViewModel;
    expect(vm).toHaveBeenLastCalledWith(ctx.getState().snapshot, {
      movementId: 'm1',
      categoryFilter: ['Belief'],
      entityIdFilter: 'e1'
    });
  });
});
