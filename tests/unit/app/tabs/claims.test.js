import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';
import { createPersistenceFacade } from '../../../../src/app/persistenceFacade.js';

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

function createCtx(snapshot, currentMovementId = 'm1', overrides = {}) {
  const dom = createDomUtils();
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
        })),
    ...overrides.ViewModels
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
    generateId: vi.fn(() => 'gen-1'),
    ...overrides.DomainService
  };
  let state = { snapshot, currentMovementId };
  const setState = next => {
    state = typeof next === 'function' ? next(state) : next || state;
    return state;
  };
  const update = updater => {
    const next = typeof updater === 'function' ? updater(state) : updater;
    return setState(next || state);
  };
  const store = {
    markDirty: vi.fn(),
    saveSnapshot: vi.fn(),
    getState: () => state,
    setState,
    update
  };
  const ctx = {
    getState: () => state,
    setState,
    update,
    store,
    services: { ViewModels, DomainService },
    dom,
    setStatus: vi.fn(),
    tabs: {}
  };
  ctx.persistence = createPersistenceFacade({
    getSnapshot: () => store.getState().snapshot || {},
    setSnapshot: nextSnapshot => store.setState(prev => ({ ...prev, snapshot: nextSnapshot })),
    saveSnapshot: opts => store.saveSnapshot(opts),
    markDirty: scope => store.markDirty(scope),
    defaultShow: false
  });
  return ctx;
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
    const { registerClaimsTab } = await import('../../../../src/app/tabs/claims.js');
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
    const { registerClaimsTab } = await import('../../../../src/app/tabs/claims.js');
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
    const { registerClaimsTab } = await import('../../../../src/app/tabs/claims.js');
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
      expect.any(Object),
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
    expect(ctx.store.markDirty).toHaveBeenCalledWith('item');
  });

  it('keeps claim selection when clicking a link inside a row', async () => {
    renderDom();
    const snapshot = {
      claims: [
        { id: 'c1', movementId: 'm1', text: 'One', category: null },
        { id: 'c2', movementId: 'm1', text: 'Two', category: null }
      ],
      entities: [],
      texts: []
    };
    const ViewModels = {
      buildClaimsExplorerViewModel: vi.fn(() => ({
        claims: [
          {
            id: 'c1',
            text: 'One',
            category: null,
            tags: [],
            aboutEntities: [],
            sourceEntities: [],
            sourceTexts: [],
            sourcesOfTruth: []
          },
          {
            id: 'c2',
            text: 'Two',
            category: null,
            tags: [],
            aboutEntities: [],
            sourceEntities: [],
            sourceTexts: [],
            sourcesOfTruth: []
          }
        ]
      }))
    };
    const ctx = createCtx(snapshot, 'm1', { ViewModels });
    const { registerClaimsTab } = await import('../../../../src/app/tabs/claims.js');
    const tab = registerClaimsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const secondRow = document.querySelector('tr[data-claim-id="c2"]');
    const firstDataCell = secondRow?.querySelector('td');
    const link = document.createElement('a');
    link.href = '#claim-two';
    link.textContent = 'Open';
    firstDataCell?.appendChild(link);

    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const selectedRow = document.querySelector('tr.selected');
    expect(selectedRow?.dataset.claimId).toBe('c1');
  });

  it('clears module selection state on unmount', async () => {
    renderDom();
    const snapshot = {
      claims: [
        { id: 'c1', movementId: 'm1', text: 'One', category: null },
        { id: 'c2', movementId: 'm1', text: 'Two', category: null }
      ],
      entities: [],
      texts: []
    };
    const ViewModels = {
      buildClaimsExplorerViewModel: vi.fn((snap, { movementId }) => ({
        claims: (snap.claims || [])
          .filter(c => c.movementId === movementId)
          .map(c => ({
            ...c,
            tags: c.tags || [],
            aboutEntities: [],
            sourceEntities: [],
            sourceTexts: [],
            sourcesOfTruth: c.sourcesOfTruth || []
          }))
      }))
    };
    const ctx = createCtx(snapshot, 'm1', { ViewModels });
    const { registerClaimsTab } = await import('../../../../src/app/tabs/claims.js');
    const tab = registerClaimsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const secondRow = document.querySelector('tr[data-claim-id="c2"]');
    secondRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.querySelector('tr.selected')?.dataset.claimId).toBe('c2');

    tab.unmount();
    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('tr.selected')?.dataset.claimId).toBe('c1');
  });
});
