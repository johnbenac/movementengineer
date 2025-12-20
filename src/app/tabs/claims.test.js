import { beforeEach, describe, expect, it, vi } from 'vitest';

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
    claims: [
      { id: 'c1', movementId: 'm1', category: 'A', text: 'Claim A', aboutEntityIds: ['e1'] }
    ],
    entities: [{ id: 'e1', movementId: 'm1', name: 'Entity 1' }]
  };
}

function renderDom() {
  document.body.innerHTML = `
    <select id="claims-category-filter"></select>
    <select id="claims-entity-filter"></select>
    <div id="claims-table-wrapper"></div>
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
    buildClaimsExplorerViewModel: vi.fn(() => ({
      claims: [
        {
          id: 'c1',
          category: 'A',
          text: 'Claim A',
          tags: ['x'],
          aboutEntities: [{ id: 'e1', name: 'Entity 1' }],
          sourceTexts: [],
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
  const { registerClaimsTab } = await import('./claims.js');
  const snapshot = createSnapshot();
  const ctx = createCtx(snapshot, overrides.currentMovementId);
  const tab = registerClaimsTab(ctx);
  return { tab, ctx, snapshot };
}

describe('claims tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders claims table with headers', async () => {
    const { tab, ctx } = await setup();

    tab.mount(ctx);
    tab.render(ctx);

    const headers = Array.from(
      document.querySelectorAll('#claims-table-wrapper table tr:first-child th')
    ).map(th => th.textContent);
    expect(headers).toEqual([
      'Category',
      'Text',
      'Tags',
      'About entities',
      'Source texts',
      'Sources of truth'
    ]);
  });

  it('disables filters and shows hint when no movement is selected', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#claims-category-filter').disabled).toBe(true);
    expect(document.querySelector('#claims-entity-filter').disabled).toBe(true);
    expect(document.querySelector('#claims-table-wrapper').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('passes selected filters to view model on change', async () => {
    const { tab, ctx } = await setup();
    const vmSpy = ctx.services.ViewModels.buildClaimsExplorerViewModel;

    tab.mount(ctx);
    tab.render(ctx);

    vmSpy.mockClear();
    document.querySelector('#claims-category-filter').value = 'A';
    document
      .querySelector('#claims-category-filter')
      .dispatchEvent(new Event('change', { bubbles: true }));

    const lastCall = vmSpy.mock.calls.at(-1);
    expect(lastCall[1]).toMatchObject({
      categoryFilter: ['A'],
      entityIdFilter: null
    });
  });
});
