import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <select id="claims-category-filter"></select>
    <select id="claims-entity-filter"></select>
    <div id="claims-table-wrapper"></div>
    <p id="claim-editor-hint"></p>
    <select id="claims-editor-claim-select"></select>
    <input id="claims-editor-category" />
    <textarea id="claims-editor-text"></textarea>
    <input id="claims-editor-tags" />
    <select id="claims-editor-about-entities" multiple></select>
    <select id="claims-editor-source-texts" multiple></select>
    <select id="claims-editor-source-entities" multiple></select>
    <input id="claims-editor-sources" />
    <textarea id="claims-editor-notes"></textarea>
    <button id="btn-claims-new" type="button"></button>
    <button id="btn-claims-save" type="button"></button>
    <button id="btn-claims-delete" type="button"></button>
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
    buildClaimsExplorerViewModel: vi.fn((data, input) => {
      const claims = (data.claims || []).filter(
        c =>
          c.movementId === input.movementId &&
          (!input.categoryFilter?.length || input.categoryFilter.includes(c.category)) &&
          (!input.entityIdFilter || (c.aboutEntityIds || []).includes(input.entityIdFilter))
      );
      return {
        claims: claims.map(c => ({
          ...c,
          tags: c.tags || [],
          aboutEntities: (c.aboutEntityIds || []).map(id =>
            (data.entities || []).find(e => e.id === id)
          ),
          sourceTexts: (c.sourceTextIds || []).map(id =>
            (data.texts || []).find(t => t.id === id)
          ),
          sourceEntities: (c.sourceEntityIds || []).map(id =>
            (data.entities || []).find(e => e.id === id)
          ),
          sourcesOfTruth: c.sourcesOfTruth || []
        }))
      };
    })
  };

  const DomainService = {
    addNewItem: vi.fn((snap, collectionName, movementId) => {
      const newClaim = { id: 'new-claim', movementId, text: 'New claim' };
      snap[collectionName].push(newClaim);
      return newClaim;
    }),
    upsertItem: vi.fn((snap, collectionName, item) => {
      const idx = snap[collectionName].findIndex(c => c.id === item.id);
      if (idx >= 0) snap[collectionName][idx] = item;
      else snap[collectionName].push(item);
      return item;
    }),
    deleteItem: vi.fn((snap, collectionName, itemId) => {
      snap[collectionName] = snap[collectionName].filter(c => c.id !== itemId);
      return true;
    })
  };

  let currentState = { snapshot, currentMovementId, flags: {} };
  const setState = vi.fn(next => {
    currentState = typeof next === 'function' ? next(currentState) : next;
    return currentState;
  });

  return {
    getState: () => currentState,
    setState,
    setStatus: vi.fn(),
    showFatalImportError: vi.fn(),
    services: { ViewModels, DomainService },
    dom: { clearElement, ensureSelectOptions }
  };
}

describe('claims tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders claims table and forwards filters to view model', async () => {
    const snapshot = {
      claims: [{ id: 'c1', movementId: 'm1', category: 'Cat', text: 'Claim', aboutEntityIds: ['e1'] }],
      entities: [{ id: 'e1', movementId: 'm1', name: 'Alice' }],
      texts: [{ id: 't1', movementId: 'm1', title: 'Text 1' }]
    };
    const ctx = createCtx(snapshot);
    const { registerClaimsTab } = await import('./claims.js');
    const tab = registerClaimsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelectorAll('#claims-table-wrapper table tr')).toHaveLength(2);
    expect(document.getElementById('claims-editor-claim-select').children.length).toBeGreaterThan(0);

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

    expect(document.getElementById('claims-editor-text').value).toBe('Claim');
  });

  it('supports creating, saving, and deleting claims', async () => {
    const snapshot = {
      claims: [{ id: 'c1', movementId: 'm1', category: 'Cat', text: 'Claim', aboutEntityIds: [] }],
      entities: [{ id: 'e1', movementId: 'm1', name: 'Alice' }],
      texts: [{ id: 't1', movementId: 'm1', title: 'Text 1' }]
    };
    const ctx = createCtx(snapshot);
    const { registerClaimsTab } = await import('./claims.js');
    const tab = registerClaimsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    document.getElementById('btn-claims-new').click();
    expect(ctx.services.DomainService.addNewItem).toHaveBeenCalledWith(snapshot, 'claims', 'm1');
    expect(ctx.setState).toHaveBeenCalled();

    // Fill fields for the new claim
    document.getElementById('claims-editor-claim-select').value = 'new-claim';
    document.getElementById('claims-editor-claim-select').dispatchEvent(new Event('change'));
    document.getElementById('claims-editor-category').value = 'NewCat';
    document.getElementById('claims-editor-text').value = 'New text';
    document.getElementById('claims-editor-tags').value = 't1, t2';
    document.getElementById('claims-editor-sources').value = 'S1, S2';
    document.getElementById('claims-editor-notes').value = 'Note';
    const aboutSelect = document.getElementById('claims-editor-about-entities');
    const sourceEntitySelect = document.getElementById('claims-editor-source-entities');
    const sourceTextSelect = document.getElementById('claims-editor-source-texts');
    [aboutSelect, sourceEntitySelect, sourceTextSelect].forEach(select => {
      select.querySelectorAll('option').forEach(opt => {
        if (opt.value === 'e1' || opt.value === 't1') opt.selected = true;
      });
    });

    document.getElementById('btn-claims-save').click();
    const upsertCall = ctx.services.DomainService.upsertItem.mock.calls.at(-1);
    expect(upsertCall[2]).toMatchObject({
      category: 'NewCat',
      text: 'New text',
      tags: ['t1', 't2'],
      aboutEntityIds: ['e1'],
      sourceEntityIds: ['e1'],
      sourceTextIds: ['t1'],
      sourcesOfTruth: ['S1', 'S2'],
      notes: 'Note'
    });

    document.getElementById('btn-claims-delete').click();
    expect(ctx.services.DomainService.deleteItem).toHaveBeenCalledWith(snapshot, 'claims', 'new-claim');
  });

  it('disables controls when no movement is selected', async () => {
    const snapshot = { claims: [], entities: [], texts: [] };
    const ctx = createCtx(snapshot, null);
    const { registerClaimsTab } = await import('./claims.js');
    const tab = registerClaimsTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('claims-category-filter').disabled).toBe(true);
    expect(document.getElementById('claims-editor-claim-select').disabled).toBe(true);
    expect(document.getElementById('claim-editor-hint').textContent).toContain('Create or select a movement');
  });
});
