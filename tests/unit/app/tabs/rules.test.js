import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';

function renderDom() {
  document.body.innerHTML = `
    <select id="rules-kind-filter"></select>
    <input id="rules-domain-filter" />
    <div id="rules-editor">
      <select id="rules-editor-select"></select>
      <button id="rules-add-btn"></button>
      <button id="rules-delete-btn"></button>
      <input id="rules-editor-shortText" />
      <select id="rules-editor-kind"></select>
      <textarea id="rules-editor-details"></textarea>
      <input id="rules-editor-appliesTo" list="rules-applies-suggestions" />
      <datalist id="rules-applies-suggestions"></datalist>
      <input id="rules-editor-domain" list="rules-domain-suggestions" />
      <datalist id="rules-domain-suggestions"></datalist>
      <input id="rules-editor-tags" list="rules-tags-suggestions" />
      <datalist id="rules-tags-suggestions"></datalist>
      <select id="rules-editor-supporting-texts" multiple></select>
      <select id="rules-editor-supporting-claims" multiple></select>
      <select id="rules-editor-related-practices" multiple></select>
      <select id="rules-editor-source-entities" multiple></select>
      <input id="rules-editor-sourcesOfTruth" list="rules-sources-suggestions" />
      <datalist id="rules-sources-suggestions"></datalist>
      <button id="rules-save-btn"></button>
      <span id="rules-editor-helper"></span>
    </div>
    <div id="rules-table-wrapper"></div>
  `;
}

function createCtx(snapshot, currentMovementId = 'm1', overrides = {}) {
  let state = { snapshot, currentMovementId };
  const dom = createDomUtils();
  const ViewModels =
    overrides.ViewModels ||
    {
      buildRuleExplorerViewModel: vi.fn(() => ({
        rules: [
          {
            id: 'r1',
            kind: 'Kind',
            shortText: 'Short',
            domain: ['D1'],
            appliesTo: [],
            tags: [],
            supportingTexts: [],
            supportingClaims: [],
            relatedPractices: [],
            sourcesOfTruth: []
          }
        ]
      })),
      buildRuleEditorViewModel: vi.fn(() => ({
        rules: [
          {
            id: 'r1',
            movementId: 'm1',
            shortText: 'Short',
            kind: 'Kind',
            details: null,
            appliesTo: [],
            domain: [],
            tags: [],
            supportingTextIds: [],
            supportingClaimIds: [],
            relatedPracticeIds: [],
            sourcesOfTruth: [],
            sourceEntityIds: []
          }
        ],
        options: {
          ruleKinds: ['Kind'],
          appliesToValues: [],
          domainValues: ['D1'],
          tagValues: [],
          sourcesOfTruth: [],
          texts: [],
          claims: [],
          practices: [],
          entities: []
        }
      }))
    };
  const DomainService =
    overrides.DomainService ||
    {
      addNewItem: vi.fn(),
      upsertItem: vi.fn((snap, _collection, item) => {
        const idx = snap.rules.findIndex(r => r.id === item.id);
        if (idx >= 0) snap.rules[idx] = item;
        else snap.rules.push(item);
        return item;
      }),
      deleteItem: vi.fn()
    };
  const update = vi.fn(next => {
    state = typeof next === 'function' ? next(state) : next;
    return state;
  });
  const store = {
    markDirty: vi.fn(),
    getState: () => state,
    update
  };
  return {
    getState: () => state,
    update,
    store,
    services: { ViewModels, DomainService },
    dom
  };
}

describe('rules tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders rules table and passes filters to ViewModels', async () => {
    renderDom();
    const snapshot = {
      rules: [{ id: 'r1', movementId: 'm1', kind: 'Kind', domain: ['D1'] }]
    };
    const ctx = createCtx(snapshot);
    const { registerRulesTab } = await import('../../../../src/app/tabs/rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelectorAll('#rules-table-wrapper table tr')).toHaveLength(2);

    const kindSelect = document.getElementById('rules-kind-filter');
    const domainInput = document.getElementById('rules-domain-filter');
    kindSelect.value = 'Kind';
    domainInput.value = 'D1, D2';
    kindSelect.dispatchEvent(new Event('change', { bubbles: true }));
    domainInput.dispatchEvent(new Event('input', { bubbles: true }));

    const vm = ctx.services.ViewModels.buildRuleExplorerViewModel;
    const lastArgs = vm.mock.calls[vm.mock.calls.length - 1][1];
    expect(lastArgs).toEqual({
      movementId: 'm1',
      kindFilter: ['Kind'],
      domainFilter: ['D1', 'D2']
    });
  });

  it('disables inputs and shows hint with no movement selected', async () => {
    renderDom();
    const snapshot = { rules: [] };
    const ctx = createCtx(snapshot, null);
    const { registerRulesTab } = await import('../../../../src/app/tabs/rules.js');
    const tab = registerRulesTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#rules-table-wrapper').textContent).toContain(
      'Create or select a movement'
    );
    expect(document.getElementById('rules-kind-filter').disabled).toBe(true);
    expect(document.getElementById('rules-domain-filter').disabled).toBe(true);
  });

  it('saves rule edits through DomainService and marks dirty', async () => {
    renderDom();
    const snapshot = {
      rules: [{ id: 'r1', movementId: 'm1', shortText: 'Old rule', kind: 'must_do' }]
    };
    const DomainService = {
      addNewItem: vi.fn(),
      upsertItem: vi.fn((snap, _collection, item) => {
        snap.rules = snap.rules.map(r => (r.id === item.id ? item : r));
        return item;
      }),
      deleteItem: vi.fn()
    };
    const ViewModels = {
      buildRuleExplorerViewModel: vi.fn(() => ({
        rules: [
          {
            id: 'r1',
            kind: 'must_do',
            shortText: 'Old rule',
            domain: [],
            appliesTo: [],
            tags: [],
            supportingTexts: [],
            supportingClaims: [],
            relatedPractices: [],
            sourcesOfTruth: []
          }
        ]
      })),
      buildRuleEditorViewModel: vi.fn(() => ({
        rules: [
          {
            id: 'r1',
            movementId: 'm1',
            shortText: 'Old rule',
            kind: 'must_do',
            details: null,
            appliesTo: [],
            domain: [],
            tags: [],
            supportingTextIds: [],
            supportingClaimIds: [],
            relatedPracticeIds: [],
            sourcesOfTruth: [],
            sourceEntityIds: []
          }
        ],
        options: {
          ruleKinds: ['must_do', 'should_do'],
          appliesToValues: ['everyone'],
          domainValues: ['ethics'],
          tagValues: ['core'],
          sourcesOfTruth: ['Scripture'],
          texts: [{ value: 't1', label: 'Text 1' }],
          claims: [{ value: 'c1', label: 'Claim 1' }],
          practices: [{ value: 'p1', label: 'Practice 1' }],
          entities: [{ value: 'e1', label: 'Entity 1' }]
        }
      }))
    };
    const ctx = createCtx(snapshot, 'm1', { DomainService, ViewModels });
    const { registerRulesTab } = await import('../../../../src/app/tabs/rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const shortText = document.getElementById('rules-editor-shortText');
    const kindSelect = document.getElementById('rules-editor-kind');
    const domainInput = document.getElementById('rules-editor-domain');
    const supportingTexts = document.getElementById('rules-editor-supporting-texts');
    shortText.value = 'Updated rule';
    kindSelect.value = 'should_do';
    domainInput.value = 'ethics';
    supportingTexts.options[0].selected = true;

    document.getElementById('rules-save-btn').dispatchEvent(new Event('click', { bubbles: true }));

    expect(DomainService.upsertItem).toHaveBeenCalledTimes(1);
    const savedRule = DomainService.upsertItem.mock.calls[0][2];
    expect(savedRule.shortText).toBe('Updated rule');
    expect(savedRule.supportingTextIds).toEqual(['t1']);
    expect(ctx.update).toHaveBeenCalled();
    expect(ctx.store.markDirty).toHaveBeenCalledWith('item');
  });

  it('adds a new rule for the current movement', async () => {
    renderDom();
    const snapshot = {
      rules: [{ id: 'r1', movementId: 'm1', shortText: 'Existing', kind: 'must_do' }]
    };
    const DomainService = {
      addNewItem: vi.fn((snap, _collection, movementId) => {
        const created = { id: 'r2', movementId, shortText: 'New rule', kind: 'must_do' };
        snap.rules.push(created);
        return created;
      }),
      upsertItem: vi.fn(),
      deleteItem: vi.fn()
    };
    const ViewModels = {
      buildRuleExplorerViewModel: vi.fn((snap, input) => ({
        rules: (snap.rules || []).filter(r => r.movementId === input.movementId)
      })),
      buildRuleEditorViewModel: vi.fn((snap, input) => ({
        rules: (snap.rules || []).filter(r => r.movementId === input.movementId).map(r => ({
          ...r,
          supportingTextIds: r.supportingTextIds || [],
          supportingClaimIds: r.supportingClaimIds || [],
          relatedPracticeIds: r.relatedPracticeIds || [],
          sourcesOfTruth: r.sourcesOfTruth || [],
          sourceEntityIds: r.sourceEntityIds || [],
          appliesTo: r.appliesTo || [],
          domain: r.domain || [],
          tags: r.tags || []
        })),
        options: {
          ruleKinds: ['must_do'],
          appliesToValues: [],
          domainValues: [],
          tagValues: [],
          sourcesOfTruth: [],
          texts: [],
          claims: [],
          practices: [],
          entities: []
        }
      }))
    };
    const ctx = createCtx(snapshot, 'm1', { DomainService, ViewModels });
    const { registerRulesTab } = await import('../../../../src/app/tabs/rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    document.getElementById('rules-add-btn').dispatchEvent(new Event('click', { bubbles: true }));

    expect(DomainService.addNewItem).toHaveBeenCalledWith(expect.any(Object), 'rules', 'm1');
    expect(ctx.update).toHaveBeenCalled();
    expect(document.getElementById('rules-editor-select').value).toBe('r2');
  });

  it('re-renders with the tab instance as this when handling rule actions', async () => {
    renderDom();
    const snapshot = {
      rules: [{ id: 'r1', movementId: 'm1', shortText: 'Existing', kind: 'must_do' }]
    };
    const DomainService = {
      addNewItem: vi.fn((snap, _collection, movementId) => {
        const created = { id: 'r2', movementId, shortText: 'New rule', kind: 'must_do' };
        snap.rules.push(created);
        return created;
      }),
      upsertItem: vi.fn((snap, _collection, item) => {
        const idx = snap.rules.findIndex(r => r.id === item.id);
        if (idx >= 0) snap.rules[idx] = item;
        else snap.rules.push(item);
        return item;
      }),
      deleteItem: vi.fn((snap, _collection, id) => {
        snap.rules = (snap.rules || []).filter(r => r.id !== id);
      })
    };
    const ctx = createCtx(snapshot, 'm1', { DomainService });
    const { registerRulesTab } = await import('../../../../src/app/tabs/rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    const originalRender = tab.render;
    tab.render = vi.fn(function (...args) {
      return originalRender.apply(this, args);
    });

    tab.render(ctx);
    tab.render.mockClear();

    document.getElementById('rules-add-btn').dispatchEvent(new Event('click', { bubbles: true }));
    document.getElementById('rules-save-btn').dispatchEvent(new Event('click', { bubbles: true }));
    document.getElementById('rules-delete-btn').dispatchEvent(new Event('click', { bubbles: true }));

    expect(tab.render).toHaveBeenCalled();
    tab.render.mock.instances.forEach(instance => {
      expect(instance).toBe(tab);
    });
  });

  it('keeps current rule selection when clicking a link inside a row', async () => {
    renderDom();
    const snapshot = {
      rules: [
        { id: 'r1', movementId: 'm1', shortText: 'First', kind: 'must_do' },
        { id: 'r2', movementId: 'm1', shortText: 'Second', kind: 'must_do' }
      ]
    };
    const ViewModels = {
      buildRuleExplorerViewModel: vi.fn(() => ({
        rules: [
          {
            id: 'r1',
            kind: 'must_do',
            shortText: 'First',
            domain: [],
            appliesTo: [],
            tags: [],
            supportingTexts: [],
            supportingClaims: [],
            relatedPractices: [],
            sourcesOfTruth: []
          },
          {
            id: 'r2',
            kind: 'must_do',
            shortText: 'Second',
            domain: [],
            appliesTo: [],
            tags: [],
            supportingTexts: [],
            supportingClaims: [],
            relatedPractices: [],
            sourcesOfTruth: []
          }
        ]
      })),
      buildRuleEditorViewModel: vi.fn(() => ({
        rules: [
          {
            id: 'r1',
            movementId: 'm1',
            shortText: 'First',
            kind: 'must_do',
            details: null,
            appliesTo: [],
            domain: [],
            tags: [],
            supportingTextIds: [],
            supportingClaimIds: [],
            relatedPracticeIds: [],
            sourcesOfTruth: [],
            sourceEntityIds: []
          },
          {
            id: 'r2',
            movementId: 'm1',
            shortText: 'Second',
            kind: 'must_do',
            details: null,
            appliesTo: [],
            domain: [],
            tags: [],
            supportingTextIds: [],
            supportingClaimIds: [],
            relatedPracticeIds: [],
            sourcesOfTruth: [],
            sourceEntityIds: []
          }
        ],
        options: {
          ruleKinds: ['must_do'],
          appliesToValues: [],
          domainValues: [],
          tagValues: [],
          sourcesOfTruth: [],
          texts: [],
          claims: [],
          practices: [],
          entities: []
        }
      }))
    };
    const ctx = createCtx(snapshot, 'm1', { ViewModels });
    const { registerRulesTab } = await import('../../../../src/app/tabs/rules.js');
    const tab = registerRulesTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const dataRows = Array.from(
      document.querySelectorAll('#rules-table-wrapper table tr')
    ).slice(1);
    const secondRow = dataRows[1];
    const firstCell = secondRow?.querySelector('td');
    const link = document.createElement('a');
    link.href = '#r2';
    link.textContent = 'Open';
    firstCell?.appendChild(link);

    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const selectedRow = document.querySelector('#rules-table-wrapper tr.selected');
    expect(selectedRow?.textContent).toContain('First');
  });
});
