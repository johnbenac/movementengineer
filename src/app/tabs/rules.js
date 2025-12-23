import {
  HINT_TEXT,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../ui/hints.js';
import { renderTable } from '../ui/table.js';
import { createChipRow } from '../ui/chips.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function getDomainService(ctx) {
  return ctx.services.DomainService;
}

function getStorageService(ctx) {
  return ctx.services.StorageService;
}

function cloneSnapshot(snapshot, storageService) {
  const cloned = snapshot ? JSON.parse(JSON.stringify(snapshot)) : {};
  if (storageService?.ensureAllCollections) {
    return storageService.ensureAllCollections(cloned);
  }
  return cloned;
}

function parseCsv(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function joinCsv(values) {
  return Array.isArray(values) ? values.join(', ') : '';
}

function getSelectedValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || [])
    .map(opt => opt.value)
    .filter(Boolean);
}

function setSelectedValues(selectEl, values = []) {
  if (!selectEl) return;
  const set = new Set(values);
  Array.from(selectEl.options || []).forEach(opt => {
    opt.selected = set.has(opt.value);
  });
}

function getRuleEditorEls() {
  return {
    container: document.getElementById('rules-editor'),
    select: document.getElementById('rules-editor-select'),
    shortText: document.getElementById('rules-editor-shortText'),
    kind: document.getElementById('rules-editor-kind'),
    details: document.getElementById('rules-editor-details'),
    appliesTo: document.getElementById('rules-editor-appliesTo'),
    domain: document.getElementById('rules-editor-domain'),
    tags: document.getElementById('rules-editor-tags'),
    supportingTexts: document.getElementById('rules-editor-supporting-texts'),
    supportingClaims: document.getElementById('rules-editor-supporting-claims'),
    relatedPractices: document.getElementById('rules-editor-related-practices'),
    sourceEntities: document.getElementById('rules-editor-source-entities'),
    sourcesOfTruth: document.getElementById('rules-editor-sourcesOfTruth'),
    addBtn: document.getElementById('rules-add-btn'),
    saveBtn: document.getElementById('rules-save-btn'),
    deleteBtn: document.getElementById('rules-delete-btn'),
    helper: document.getElementById('rules-editor-helper'),
    datalists: {
      appliesTo: document.getElementById('rules-applies-suggestions'),
      domain: document.getElementById('rules-domain-suggestions'),
      tags: document.getElementById('rules-tags-suggestions'),
      sources: document.getElementById('rules-sources-suggestions')
    }
  };
}

function renderRuleEditor(ctx, tabState, helpers, editorVm, statusMessage = null) {
  const els = getRuleEditorEls();
  if (!els.container || !els.select) return;

  const disableForm = message => {
    setDisabled(
      [
        els.select,
        els.shortText,
        els.kind,
        els.details,
        els.appliesTo,
        els.domain,
        els.tags,
        els.supportingTexts,
        els.supportingClaims,
        els.relatedPractices,
        els.sourceEntities,
        els.sourcesOfTruth,
        els.saveBtn,
        els.deleteBtn
      ],
      true
    );
    if (els.helper) els.helper.textContent = message || '';
  };

  const enableForm = () => {
    setDisabled(
      [
        els.select,
        els.shortText,
        els.kind,
        els.details,
        els.appliesTo,
        els.domain,
        els.tags,
        els.supportingTexts,
        els.supportingClaims,
        els.relatedPractices,
        els.sourceEntities,
        els.sourcesOfTruth,
        els.saveBtn,
        els.deleteBtn
      ],
      false
    );
    if (els.helper) {
      els.helper.textContent = 'Select or add a rule to edit links and details.';
    }
  };

  const { ensureSelectOptions, ensureMultiSelectOptions, ensureDatalistOptions } = helpers;
  const ruleOptions =
    editorVm?.rules?.map(rule => ({
      value: rule.id,
      label: `${rule.shortText || rule.id}${rule.kind ? ` (${rule.kind})` : ''}`
    })) || [];
  ensureSelectOptions(els.select, ruleOptions, ruleOptions.length ? 'Choose rule' : 'No rules yet');

  if (!editorVm) {
    disableForm(statusMessage || 'Rule editor unavailable. Ensure ViewModels are loaded.');
    return;
  }

  const options = editorVm.options || {};
  ensureSelectOptions(
    els.kind,
    (options.ruleKinds || []).map(k => ({ value: k, label: k })),
    'Choose kind'
  );
  ensureMultiSelectOptions(
    els.supportingTexts,
    (options.texts || []).map(opt => ({
      value: opt.value,
      label: opt.depth !== null && opt.depth !== undefined ? `${opt.label || opt.value} (depth ${opt.depth})` : opt.label || opt.value
    }))
  );
  ensureMultiSelectOptions(
    els.supportingClaims,
    (options.claims || []).map(opt => ({ value: opt.value, label: opt.label || opt.value }))
  );
  ensureMultiSelectOptions(
    els.relatedPractices,
    (options.practices || []).map(opt => ({
      value: opt.value,
      label: opt.kind ? `${opt.label || opt.value} (${opt.kind})` : opt.label || opt.value
    }))
  );
  ensureMultiSelectOptions(
    els.sourceEntities,
    (options.entities || []).map(opt => ({
      value: opt.value,
      label: opt.kind ? `${opt.label || opt.value} (${opt.kind})` : opt.label || opt.value
    }))
  );

  ensureDatalistOptions(els.datalists.appliesTo, options.appliesToValues || []);
  ensureDatalistOptions(els.datalists.domain, options.domainValues || []);
  ensureDatalistOptions(els.datalists.tags, options.tagValues || []);
  ensureDatalistOptions(els.datalists.sources, options.sourcesOfTruth || []);

  const availableRuleIds = ruleOptions.map(opt => opt.value);
  if (!tabState.selectedRuleId || !availableRuleIds.includes(tabState.selectedRuleId)) {
    tabState.selectedRuleId = availableRuleIds[0] || null;
  }

  const selectedRule = (editorVm.rules || []).find(r => r.id === tabState.selectedRuleId) || null;
  els.select.value = selectedRule?.id || '';

  setDisabled([els.addBtn], !getState(ctx).currentMovementId);

  if (!selectedRule) {
    disableForm('Add a rule to start editing.');
    [els.shortText, els.details, els.appliesTo, els.domain, els.tags, els.sourcesOfTruth].forEach(el => {
      if (el) el.value = '';
    });
    setSelectedValues(els.supportingTexts, []);
    setSelectedValues(els.supportingClaims, []);
    setSelectedValues(els.relatedPractices, []);
    setSelectedValues(els.sourceEntities, []);
    return;
  }

  enableForm();
  if (els.shortText) els.shortText.value = selectedRule.shortText || '';
  if (els.kind) els.kind.value = selectedRule.kind || '';
  if (els.details) els.details.value = selectedRule.details || '';
  if (els.appliesTo) els.appliesTo.value = joinCsv(selectedRule.appliesTo);
  if (els.domain) els.domain.value = joinCsv(selectedRule.domain);
  if (els.tags) els.tags.value = joinCsv(selectedRule.tags);
  if (els.sourcesOfTruth) els.sourcesOfTruth.value = joinCsv(selectedRule.sourcesOfTruth);

  setSelectedValues(els.supportingTexts, selectedRule.supportingTextIds || []);
  setSelectedValues(els.supportingClaims, selectedRule.supportingClaimIds || []);
  setSelectedValues(els.relatedPractices, selectedRule.relatedPracticeIds || []);
  setSelectedValues(els.sourceEntities, selectedRule.sourceEntityIds || []);
}

function pushState(ctx, nextState) {
  if (typeof ctx?.update === 'function') {
    return ctx.update(() => nextState);
  }
  if (typeof ctx?.setState === 'function') {
    return ctx.setState(nextState);
  }
  return nextState;
}

function renderTab(tab, ctx) {
  if (!tab || typeof tab.render !== 'function') return;
  tab.render.call(tab, ctx);
}

function handleAddRule(ctx, tab) {
  const state = getState(ctx);
  const movementId = state.currentMovementId;
  if (!movementId) return;
  const DomainService = getDomainService(ctx);
  const StorageService = getStorageService(ctx);
  const snapshot = cloneSnapshot(state.snapshot, StorageService);
  let created =
    DomainService && typeof DomainService.addNewItem === 'function'
      ? DomainService.addNewItem(snapshot, 'rules', movementId)
      : null;
  if (!created) {
    created = {
      id: 'rule-' + Math.random().toString(36).substr(2, 9),
      movementId,
      shortText: 'New rule',
      kind: 'must_do'
    };
    snapshot.rules = snapshot.rules || [];
    snapshot.rules.push(created);
  }
  const nextState = { ...state, snapshot };
  pushState(ctx, nextState);
  if (tab?.__state) tab.__state.selectedRuleId = created.id;
  ctx?.store?.markDirty?.('item');
  renderTab(tab, ctx);
}

function handleSaveRule(ctx, tab) {
  const state = getState(ctx);
  const selectedRuleId = tab?.__state?.selectedRuleId;
  if (!selectedRuleId) return;
  const DomainService = getDomainService(ctx);
  const StorageService = getStorageService(ctx);
  const snapshot = cloneSnapshot(state.snapshot, StorageService);
  snapshot.rules = snapshot.rules || [];

  const els = getRuleEditorEls();
  const values = {
    shortText: els.shortText?.value?.trim() || '',
    kind: els.kind?.value || null,
    details: els.details?.value || null,
    appliesTo: parseCsv(els.appliesTo?.value || ''),
    domain: parseCsv(els.domain?.value || ''),
    tags: parseCsv(els.tags?.value || ''),
    supportingTextIds: getSelectedValues(els.supportingTexts),
    supportingClaimIds: getSelectedValues(els.supportingClaims),
    relatedPracticeIds: getSelectedValues(els.relatedPractices),
    sourceEntityIds: getSelectedValues(els.sourceEntities),
    sourcesOfTruth: parseCsv(els.sourcesOfTruth?.value || '')
  };

  const existing = snapshot.rules.find(r => r.id === selectedRuleId) || {};
  const updated = {
    ...existing,
    id: selectedRuleId,
    movementId: state.currentMovementId || existing.movementId || null,
    shortText: values.shortText || existing.shortText || 'New rule',
    kind: values.kind || null,
    details: values.details || null,
    appliesTo: values.appliesTo,
    domain: values.domain,
    tags: values.tags,
    supportingTextIds: values.supportingTextIds,
    supportingClaimIds: values.supportingClaimIds,
    relatedPracticeIds: values.relatedPracticeIds,
    sourcesOfTruth: values.sourcesOfTruth,
    sourceEntityIds: values.sourceEntityIds
  };

  if (DomainService && typeof DomainService.upsertItem === 'function') {
    DomainService.upsertItem(snapshot, 'rules', updated);
  } else {
    const idx = snapshot.rules.findIndex(r => r.id === selectedRuleId);
    if (idx >= 0) snapshot.rules[idx] = updated;
    else snapshot.rules.push(updated);
  }

  const nextState = { ...state, snapshot };
  pushState(ctx, nextState);
  ctx?.store?.markDirty?.('item');
  renderTab(tab, ctx);
}

function handleDeleteRule(ctx, tab) {
  const state = getState(ctx);
  const selectedRuleId = tab?.__state?.selectedRuleId;
  if (!selectedRuleId) return;

  const DomainService = getDomainService(ctx);
  const StorageService = getStorageService(ctx);
  const snapshot = cloneSnapshot(state.snapshot, StorageService);
  snapshot.rules = snapshot.rules || [];

  if (DomainService && typeof DomainService.deleteItem === 'function') {
    DomainService.deleteItem(snapshot, 'rules', selectedRuleId);
  } else {
    snapshot.rules = snapshot.rules.filter(r => r.id !== selectedRuleId);
  }

  const remaining = (snapshot.rules || []).filter(r => r.movementId === state.currentMovementId);
  if (tab?.__state) tab.__state.selectedRuleId = remaining[0]?.id || null;

  const nextState = { ...state, snapshot };
  pushState(ctx, nextState);
  ctx?.store?.markDirty?.('item');
  renderTab(tab, ctx);
}

function renderRulesTab(ctx) {
  const tab = this;
  const tabState = tab?.__state || {};
  const { clearElement: clear, ensureSelectOptions, ensureMultiSelectOptions, ensureDatalistOptions } =
    ctx.dom;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('rules-table-wrapper');
  const kindSelect = document.getElementById('rules-kind-filter');
  const domainInput = document.getElementById('rules-domain-filter');
  if (!wrapper || !kindSelect || !domainInput) return;
  const controls = [kindSelect, domainInput];

  const editorHelpers = { ensureSelectOptions, ensureMultiSelectOptions, ensureDatalistOptions };

  clear(wrapper);
  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [wrapper],
      controls,
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  ) {
    ensureSelectOptions(kindSelect, [], 'All');
    domainInput.value = '';
    renderRuleEditor(ctx, tabState, editorHelpers, null, 'Select a movement to add rules.');
    return;
  }

  setDisabled(controls, false);

  const ViewModels = getViewModels(ctx);
  if (
    guardMissingViewModels({
      ok:
        ViewModels &&
        typeof ViewModels.buildRuleExplorerViewModel === 'function' &&
        typeof ViewModels.buildRuleEditorViewModel === 'function',
      wrappers: [wrapper],
      controls,
      dom: ctx.dom
    })
  ) {
    renderRuleEditor(ctx, tabState, editorHelpers, null, HINT_TEXT.VIEWMODELS_MISSING);
    return;
  }

  const rulesForMovement = (snapshot?.rules || []).filter(r => r.movementId === currentMovementId);
  const kinds = Array.from(new Set(rulesForMovement.map(r => r.kind).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  ensureSelectOptions(
    kindSelect,
    kinds.map(k => ({ value: k, label: k })),
    'All'
  );

  const kindVal = kindSelect.value || '';
  const rawDomain = domainInput.value || '';
  const domainFilter = rawDomain
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const editorVm =
    typeof ViewModels.buildRuleEditorViewModel === 'function'
      ? ViewModels.buildRuleEditorViewModel(snapshot, { movementId: currentMovementId })
      : null;

  const explorerVm = ViewModels.buildRuleExplorerViewModel(snapshot, {
    movementId: currentMovementId,
    kindFilter: kindVal ? [kindVal] : [],
    domainFilter
  });

  renderRuleEditor(ctx, tabState, editorHelpers, editorVm);

  renderTable(wrapper, {
    clear,
    rows: explorerVm?.rules || [],
    getRowId: r => r.id,
    selectedId: tabState.selectedRuleId,
    renderEmpty: w => renderHint(w, 'No rules match this filter.'),
    onRowSelect: id => {
      tabState.selectedRuleId = id;
      renderRuleEditor(ctx, tabState, editorHelpers, editorVm);
    },
    columns: [
      { header: 'Kind', render: r => r.kind || '' },
      { header: 'Short text', render: r => r.shortText || '' },
      { header: 'Domain', render: r => (r.domain || []).join(', ') },
      { header: 'Applies to', render: r => (r.appliesTo || []).join(', ') },
      { header: 'Tags', render: r => (r.tags || []).join(', ') },
      {
        header: 'Supporting texts',
        render: r =>
          r.supportingTexts?.length
            ? createChipRow(r.supportingTexts, {
                getLabel: t => t.title || t.id,
                getTarget: t => ({ kind: 'item', collection: 'texts', id: t.id })
              })
            : ''
      },
      {
        header: 'Supporting claims',
        render: r =>
          r.supportingClaims?.length
            ? createChipRow(r.supportingClaims, {
                getLabel: c => (c.category ? `[${c.category}] ` : '') + (c.text || c.id),
                getTarget: c => ({ kind: 'item', collection: 'claims', id: c.id })
              })
            : ''
      },
      {
        header: 'Related practices',
        render: r =>
          r.relatedPractices?.length
            ? createChipRow(r.relatedPractices, {
                getLabel: p => p.name || p.id,
                getTarget: p => ({ kind: 'item', collection: 'practices', id: p.id })
              })
            : ''
      },
      { header: 'Sources of truth', render: r => (r.sourcesOfTruth || []).join(', ') }
    ]
  });
}

export function registerRulesTab(ctx) {
  const tab = {
    __handlers: null,
    __state: { selectedRuleId: null },
    open(context, ruleId) {
      this.__state.selectedRuleId = ruleId;
      context.actions.activateTab?.('rules');
      this.render(context);
    },
    mount(context) {
      const kindSelect = document.getElementById('rules-kind-filter');
      const domainInput = document.getElementById('rules-domain-filter');
      const ruleSelect = document.getElementById('rules-editor-select');
      const addBtn = document.getElementById('rules-add-btn');
      const saveBtn = document.getElementById('rules-save-btn');
      const deleteBtn = document.getElementById('rules-delete-btn');

      const rerender = () => tab.render(context);
      const ruleSelectChange = () => {
        tab.__state.selectedRuleId = ruleSelect.value || null;
        rerender();
      };
      const handleAdd = () => handleAddRule(context, tab);
      const handleSave = () => handleSaveRule(context, tab);
      const handleDelete = () => handleDeleteRule(context, tab);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'rules') return;
        rerender();
      };

      if (kindSelect) kindSelect.addEventListener('change', rerender);
      if (domainInput) domainInput.addEventListener('input', rerender);
      if (ruleSelect) {
        ruleSelect.addEventListener('change', ruleSelectChange);
      }
      if (addBtn) addBtn.addEventListener('click', handleAdd);
      if (saveBtn) saveBtn.addEventListener('click', handleSave);
      if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        kindSelect,
        domainInput,
        ruleSelect,
        ruleSelectChange,
        addBtn,
        addHandler: handleAdd,
        saveBtn,
        saveHandler: handleSave,
        deleteBtn,
        deleteHandler: handleDelete,
        rerender,
        unsubscribe
      };
    },
    render: renderRulesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.kindSelect) h.kindSelect.removeEventListener('change', h.rerender);
      if (h.domainInput) h.domainInput.removeEventListener('input', h.rerender);
      if (h.ruleSelect) h.ruleSelect.removeEventListener('change', h.ruleSelectChange);
      if (h.addBtn && h.addHandler) h.addBtn.removeEventListener('click', h.addHandler);
      if (h.saveBtn && h.saveHandler) h.saveBtn.removeEventListener('click', h.saveHandler);
      if (h.deleteBtn && h.deleteHandler)
        h.deleteBtn.removeEventListener('click', h.deleteHandler);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.rules = tab;
  if (ctx?.tabs) {
    ctx.tabs.rules = tab;
  }
  return tab;
}
