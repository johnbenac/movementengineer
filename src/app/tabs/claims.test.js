import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    buildClaimsExplorerViewModel: vi.fn(() => ({
      claims: [
        {
          id: 'c1',
          text: 'Claim',
          category: 'Cat',
          tags: ['t1'],
          aboutEntities: [{ id: 'e1', name: 'Alice' }],
          sourceTexts: [{ id: 't1', title: 'Text 1' }],
          sourcesOfTruth: ['Source']
        }
      ]
    }))
  };
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement, ensureSelectOptions }
  };
}

describe('claims tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders claims table and forwards filters to view model', async () => {
    renderDom();
    const snapshot = {
      claims: [{ id: 'c1', movementId: 'm1', category: 'Cat' }],
      entities: [{ id: 'e1', movementId: 'm1', name: 'Alice' }]
    };
    const ctx = createCtx(snapshot);
    const { registerClaimsTab } = await import('./claims.js');
    const tab = registerClaimsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelectorAll('#claims-table-wrapper table tr')).toHaveLength(2);

    const catSelect = document.getElementById('claims-category-filter');
    const entSelect = document.getElementById('claims-entity-filter');
    catSelect.value = 'Cat';
    entSelect.value = 'e1';
    catSelect.dispatchEvent(new Event('change', { bubbles: true }));
    entSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const vm = ctx.services.ViewModels.buildClaimsExplorerViewModel;
    const lastCall = vm.mock.calls[vm.mock.calls.length - 1][1];
    expect(lastCall).toEqual({
      movementId: 'm1',
      categoryFilter: ['Cat'],
      entityIdFilter: 'e1'
    });
  });

  it('shows hint and disables filters when no movement is selected', async () => {
    renderDom();
    const snapshot = { claims: [], entities: [] };
    const ctx = createCtx(snapshot, null);
    const { registerClaimsTab } = await import('./claims.js');
    const tab = registerClaimsTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#claims-table-wrapper').textContent).toContain(
      'Create or select a movement'
    );
    expect(document.getElementById('claims-category-filter').disabled).toBe(true);
    expect(document.getElementById('claims-entity-filter').disabled).toBe(true);
  });
});
