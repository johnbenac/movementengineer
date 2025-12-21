import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div class="subtab-toolbar">
      <select id="claims-category-filter"><option value="">All</option></select>
      <select id="claims-entity-filter"><option value="">Any</option></select>
      <button id="claims-add-btn" type="button"></button>
      <button id="claims-delete-btn" type="button"></button>
    </div>
    <div id="claims-table-wrapper"></div>
    <form id="claim-editor-form">
      <input id="claim-id" />
      <input id="claim-category" list="claim-category-options" />
      <datalist id="claim-category-options"></datalist>
      <textarea id="claim-text"></textarea>
      <input id="claim-tags" list="claim-tag-options" />
      <datalist id="claim-tag-options"></datalist>
      <select id="claim-entities" multiple></select>
      <select id="claim-source-texts" multiple></select>
      <select id="claim-source-entities" multiple></select>
      <input id="claim-sources-of-truth" list="claim-source-of-truth-options" />
      <datalist id="claim-source-of-truth-options"></datalist>
      <textarea id="claim-notes"></textarea>
      <button id="claims-save-btn" type="button"></button>
      <button id="claims-reset-btn" type="button"></button>
    </form>
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
          sourceEntities: [{ id: 'e2', name: 'Bob' }],
          sourceTexts: [{ id: 't1', title: 'Text 1' }],
          sourcesOfTruth: ['Source']
        }
      ]
    }))
  };
  const DomainService = {
    addNewItem: vi.fn((snap, coll, movementId) => {
      const obj = { id: 'new-claim', movementId, text: 'New claim', category: null, tags: [] };
      snap[coll].push(obj);
      return obj;
    }),
    upsertItem: vi.fn((snap, coll, item) => {
      const list = snap[coll];
      const idx = list.findIndex(c => c.id === item.id);
      if (idx >= 0) list[idx] = item;
      else list.push(item);
      return item;
    }),
    deleteItem: vi.fn((snap, coll, id) => {
      snap[coll] = snap[coll].filter(c => c.id !== id);
    }),
    generateId: vi.fn(() => 'gen-1')
  };
  const legacy = { markDirty: vi.fn() };
  let state = { snapshot, currentMovementId };
  const setState = next => {
    state = typeof next === 'function' ? next(state) : next || state;
    return state;
  };
  const update = updater => {
    const next = typeof updater === 'function' ? updater(state) : updater;
    return setState(next || state);
  };
  return {
    getState: () => state,
    setState,
    update,
    services: { ViewModels, DomainService },
    dom: { clearElement, ensureSelectOptions },
    legacy,
    setStatus: vi.fn(),
    tabs: {}
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

  it('saves claim edits and marks data dirty', async () => {
    renderDom();
    const snapshot = {
      claims: [
        {
          id: 'c1',
          movementId: 'm1',
          category: 'Old',
          text: 'Old text',
          tags: ['old'],
          aboutEntityIds: ['e1'],
          sourceTextIds: ['t1'],
          sourceEntityIds: ['e2'],
          sourcesOfTruth: ['S1'],
          notes: 'Old'
        }
      ],
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Alice' },
        { id: 'e2', movementId: 'm1', name: 'Bob' }
      ],
      texts: [{ id: 't1', movementId: 'm1', title: 'Text 1' }]
    };
    const ctx = createCtx(snapshot);
    const { registerClaimsTab } = await import('./claims.js');
    const tab = registerClaimsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    document.getElementById('claim-category').value = 'NewCat';
    document.getElementById('claim-text').value = 'Updated text';
    document.getElementById('claim-tags').value = 'a, b';
    const aboutOptions = document.querySelectorAll('#claim-entities option');
    aboutOptions.forEach(opt => (opt.selected = false));
    aboutOptions[1].selected = true;
    const sourceEntityOptions = document.querySelectorAll('#claim-source-entities option');
    sourceEntityOptions.forEach(opt => (opt.selected = false));
    sourceEntityOptions[0].selected = true;
    const sourceTextOptions = document.querySelectorAll('#claim-source-texts option');
    sourceTextOptions.forEach(opt => (opt.selected = false));
    sourceTextOptions[0].selected = true;
    document.getElementById('claim-sources-of-truth').value = 'S2';
    document.getElementById('claim-notes').value = 'New note';

    document.getElementById('claims-save-btn').click();

    const upsert = ctx.services.DomainService.upsertItem;
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      snapshot,
      'claims',
      expect.objectContaining({
        id: 'c1',
        movementId: 'm1',
        category: 'NewCat',
        text: 'Updated text',
        tags: ['a', 'b'],
        aboutEntityIds: ['e2'],
        sourceTextIds: ['t1'],
        sourceEntityIds: ['e1'],
        sourcesOfTruth: ['S2'],
        notes: 'New note'
      })
    );
    expect(ctx.legacy.markDirty).toHaveBeenCalledWith('item');
  });
});
