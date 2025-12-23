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

function parseCsvList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function joinCsvList(list) {
  return Array.isArray(list) ? list.filter(Boolean).join(', ') : '';
}

function getSelectedValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || [])
    .map(opt => opt.value)
    .filter(Boolean);
}

function getLookups(snapshot, movementId) {
  const claims = (snapshot?.claims || []).filter(c => c.movementId === movementId);
  const categories = Array.from(
    new Set(claims.map(c => c.category).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)));

  const tags = Array.from(
    new Set(
      claims
        .flatMap(c => (Array.isArray(c.tags) ? c.tags : []))
        .filter(Boolean)
    )
  ).sort((a, b) => String(a).localeCompare(String(b)));

  const entityOptions = (snapshot?.entities || [])
    .filter(e => e.movementId === movementId)
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => ({ value: e.id, label: e.name || e.id }));

  const textOptions = (snapshot?.texts || [])
    .filter(t => t.movementId === movementId)
    .slice()
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    .map(t => {
      const suffix = t.label ? ` (${t.label})` : '';
      return { value: t.id, label: (t.title || t.id) + suffix };
    });

  const sourceSets = new Set();
  const collections = [
    { name: 'claims', key: 'sourcesOfTruth' },
    { name: 'rules', key: 'sourcesOfTruth' },
    { name: 'practices', key: 'sourcesOfTruth' },
    { name: 'entities', key: 'sourcesOfTruth' },
    { name: 'media', key: 'sourcesOfTruth' }
  ];
  collections.forEach(({ name, key }) => {
    const items = snapshot?.[name] || [];
    items.forEach(item => {
      if (item.movementId && movementId && item.movementId !== movementId) return;
      const values = Array.isArray(item[key]) ? item[key] : item[key] ? [item[key]] : [];
      values.filter(Boolean).forEach(v => sourceSets.add(v));
    });
  });

  const sourcesOfTruth = Array.from(sourceSets).sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  return {
    categories,
    tags,
    entityOptions,
    textOptions,
    sourcesOfTruth
  };
}

function getClaimFormElements() {
  return {
    idInput: document.getElementById('claim-id'),
    categoryInput: document.getElementById('claim-category'),
    textInput: document.getElementById('claim-text'),
    tagsInput: document.getElementById('claim-tags'),
    aboutEntities: document.getElementById('claim-entities'),
    sourceTexts: document.getElementById('claim-source-texts'),
    sourceEntities: document.getElementById('claim-source-entities'),
    sourcesOfTruthInput: document.getElementById('claim-sources-of-truth'),
    notesInput: document.getElementById('claim-notes'),
    categoryDatalist: document.getElementById('claim-category-options'),
    tagDatalist: document.getElementById('claim-tag-options'),
    sourceOfTruthDatalist: document.getElementById('claim-source-of-truth-options')
  };
}

function setFormDisabled(form, disabled) {
  Object.values(form).forEach(el => {
    if (!el || el.tagName === 'DATALIST') return;
    el.disabled = !!disabled;
  });
}

function populateClaimForm(form, lookups, claim, dom) {
  if (!form.textInput || !form.categoryInput) return;

  form.idInput.value = claim?.id || '';
  form.categoryInput.value = claim?.category || '';
  form.textInput.value = claim?.text || '';
  form.tagsInput.value = joinCsvList(claim?.tags);
  form.sourcesOfTruthInput.value = joinCsvList(claim?.sourcesOfTruth);
  form.notesInput.value = claim?.notes || '';

  dom.ensureMultiSelectOptions(form.aboutEntities, lookups.entityOptions, claim?.aboutEntityIds);
  dom.ensureMultiSelectOptions(form.sourceEntities, lookups.entityOptions, claim?.sourceEntityIds);
  dom.ensureMultiSelectOptions(form.sourceTexts, lookups.textOptions, claim?.sourceTextIds);

  dom.ensureDatalistOptions(form.categoryDatalist, lookups.categories);
  dom.ensureDatalistOptions(form.tagDatalist, lookups.tags);
  dom.ensureDatalistOptions(form.sourceOfTruthDatalist, lookups.sourcesOfTruth);
}

function handleAddClaim(ctx, tab) {
  const ds = getDomainService(ctx);
  const state = getState(ctx);
  const tabState = tab?.__state || {};
  if (!ds || !state.currentMovementId) return;
  ctx.update(prev => {
    const snapshot = prev.snapshot || {};
    const created = ds.addNewItem(snapshot, 'claims', prev.currentMovementId);
    tabState.selectedClaimId = created.id;
    return { ...prev, snapshot };
  });
  ctx.store?.markDirty?.('item');
  ctx.setStatus?.('New claim created');
  tab?.render?.call(tab, ctx);
}

function handleDeleteClaim(ctx, tab) {
  const ds = getDomainService(ctx);
  const state = getState(ctx);
  const tabState = tab?.__state || {};
  if (!ds || !state.currentMovementId || !tabState.selectedClaimId) return;
  const claims = state.snapshot?.claims || [];
  const claim = claims.find(c => c.id === tabState.selectedClaimId);
  const label =
    (claim?.category ? `[${claim.category}] ` : '') + (claim?.text || claim?.id || '');
  const ok = window.confirm(
    `Delete this claim?\n\n${label || tabState.selectedClaimId}\n\nThis cannot be undone.`
  );
  if (!ok) return;
  ctx.update(prev => {
    const snapshot = prev.snapshot || {};
    ds.deleteItem(snapshot, 'claims', tabState.selectedClaimId);
    return { ...prev, snapshot };
  });
  tabState.selectedClaimId = null;
  ctx.store?.markDirty?.('item');
  ctx.setStatus?.('Claim deleted');
  tab?.render?.call(tab, ctx);
}

function handleSaveClaim(ctx, tab) {
  const ds = getDomainService(ctx);
  const state = getState(ctx);
  const tabState = tab?.__state || {};
  if (!ds || !state.currentMovementId) return;
  const form = getClaimFormElements();
  const values = {
    category: form.categoryInput?.value?.trim() || '',
    text: form.textInput?.value?.trim() || '',
    tags: parseCsvList(form.tagsInput?.value || ''),
    aboutEntityIds: getSelectedValues(form.aboutEntities),
    sourceTextIds: getSelectedValues(form.sourceTexts),
    sourceEntityIds: getSelectedValues(form.sourceEntities),
    sourcesOfTruth: parseCsvList(form.sourcesOfTruthInput?.value || ''),
    notes: form.notesInput?.value?.trim() || ''
  };

  const claims = state.snapshot?.claims || [];
  const existing = claims.find(c => c.id === tabState.selectedClaimId) || {
    id: tabState.selectedClaimId || ds.generateId?.('clm-')
  };

  if (!existing.id) {
    ctx.setStatus?.('Unable to determine claim ID');
    return;
  }

  const updated = {
    ...existing,
    movementId: state.currentMovementId,
    category: values.category || null,
    text: values.text || '',
    tags: values.tags,
    aboutEntityIds: values.aboutEntityIds,
    sourceTextIds: values.sourceTextIds,
    sourceEntityIds: values.sourceEntityIds,
    sourcesOfTruth: values.sourcesOfTruth,
    notes: values.notes || null
  };

  ctx.update(prev => {
    const snapshot = prev.snapshot || {};
    ds.upsertItem(snapshot, 'claims', updated);
    return { ...prev, snapshot };
  });
  tabState.selectedClaimId = updated.id;
  ctx.store?.markDirty?.('item');
  ctx.setStatus?.('Claim saved');
}

function renderClaimsTab(ctx) {
  const tab = this || ctx?.tabs?.claims;
  const tabState = tab?.__state || {};
  const dom = ctx.dom;
  const { clearElement: clear, ensureSelectOptions } = dom;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('claims-table-wrapper');
  const catSelect = document.getElementById('claims-category-filter');
  const entSelect = document.getElementById('claims-entity-filter');
  const addBtn = document.getElementById('claims-add-btn');
  const deleteBtn = document.getElementById('claims-delete-btn');
  const saveBtn = document.getElementById('claims-save-btn');
  const resetBtn = document.getElementById('claims-reset-btn');
  const form = getClaimFormElements();
  if (!wrapper || !catSelect || !entSelect || !form.textInput) return;

  const controls = [catSelect, entSelect, addBtn, deleteBtn, saveBtn, resetBtn];

  const enableAll = () => {
    setDisabled([catSelect, entSelect, addBtn, resetBtn], false);
    setFormDisabled(form, false);
  };

  setDisabled(controls, false);
  clear(wrapper);

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [wrapper],
      controls,
      dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  ) {
    tabState.selectedClaimId = null;
    tabState.lastMovementId = null;
    setFormDisabled(form, true);
    ensureSelectOptions(catSelect, [], 'All');
    ensureSelectOptions(entSelect, [], 'Any');
    populateClaimForm(
      form,
      { entityOptions: [], textOptions: [], categories: [], tags: [], sourcesOfTruth: [] },
      null,
      dom
    );
    return;
  }

  if (tabState.lastMovementId !== currentMovementId) {
    tabState.selectedClaimId = null;
    tabState.lastMovementId = currentMovementId;
  }

  const ViewModels = getViewModels(ctx);
  if (
    guardMissingViewModels({
      ok: ViewModels && typeof ViewModels.buildClaimsExplorerViewModel === 'function',
      wrappers: [wrapper],
      controls,
      dom
    })
  ) {
    setFormDisabled(form, true);
    return;
  }

  enableAll();

  const claimsForMovement = (snapshot?.claims || []).filter(
    c => c.movementId === currentMovementId
  );
  const lookups = getLookups(snapshot, currentMovementId);

  ensureSelectOptions(
    catSelect,
    lookups.categories.map(c => ({ value: c, label: c })),
    'All'
  );
  ensureSelectOptions(entSelect, lookups.entityOptions, 'Any');

  const categoryVal = catSelect.value || '';
  const entityVal = entSelect.value || '';

  const vm = ViewModels.buildClaimsExplorerViewModel(snapshot, {
    movementId: currentMovementId,
    categoryFilter: categoryVal ? [categoryVal] : [],
    entityIdFilter: entityVal || null
  });

  const visibleClaims = vm?.claims || [];
  const visibleIds = new Set(visibleClaims.map(c => c.id));
  if (!tabState.selectedClaimId || !visibleIds.has(tabState.selectedClaimId)) {
    tabState.selectedClaimId = visibleClaims[0]?.id || null;
  }

  renderTable(wrapper, {
    clear,
    rows: visibleClaims,
    getRowId: c => c.id,
    selectedId: tabState.selectedClaimId,
    rowIdDataKey: 'claimId',
    renderEmpty: w => renderHint(w, 'No claims match this filter.'),
    onRowSelect: id => {
      tabState.selectedClaimId = id;
      renderClaimsTab.call(tab, ctx);
    },
    columns: [
      { header: 'Category', render: c => c.category || '' },
      { header: 'Text', render: c => c.text || '' },
      { header: 'Tags', render: c => (c.tags || []).join(', ') },
      {
        header: 'About entities',
        render: c =>
          c.aboutEntities?.length
            ? createChipRow(c.aboutEntities, {
                variant: 'entity',
                getLabel: e => e.name || e.id,
                getTarget: e => ({ kind: 'item', collection: 'entities', id: e.id })
              })
            : ''
      },
      {
        header: 'Source entities',
        render: c =>
          c.sourceEntities?.length
            ? createChipRow(c.sourceEntities, {
                variant: 'entity',
                getLabel: e => e.name || e.id,
                getTarget: e => ({ kind: 'item', collection: 'entities', id: e.id })
              })
            : ''
      },
      {
        header: 'Source texts',
        render: c =>
          c.sourceTexts?.length
            ? createChipRow(c.sourceTexts, {
                getLabel: t => t.title || t.id,
                getTarget: t => ({ kind: 'item', collection: 'texts', id: t.id })
              })
            : ''
      },
      {
        header: 'Sources of truth',
        render: c => (c.sourcesOfTruth || []).join(', ')
      }
    ]
  });

  const selectedClaim = claimsForMovement.find(c => c.id === tabState.selectedClaimId) || null;
  populateClaimForm(form, lookups, selectedClaim, dom);

  setDisabled([deleteBtn, saveBtn], !tabState.selectedClaimId);
}

export function registerClaimsTab(ctx) {
  const tab = {
    __handlers: null,
    __state: { selectedClaimId: null, lastMovementId: null },
    mount(context) {
      const catSelect = document.getElementById('claims-category-filter');
      const entSelect = document.getElementById('claims-entity-filter');
      const addBtn = document.getElementById('claims-add-btn');
      const deleteBtn = document.getElementById('claims-delete-btn');
      const saveBtn = document.getElementById('claims-save-btn');
      const resetBtn = document.getElementById('claims-reset-btn');
      const listeners = [];
      const addListener = (el, event, handler) => {
        if (!el || typeof el.addEventListener !== 'function') return;
        el.addEventListener(event, handler);
        listeners.push({ el, event, handler });
      };

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'claims') return;
        rerender();
      };

      addListener(catSelect, 'change', rerender);
      addListener(entSelect, 'change', rerender);
      addListener(addBtn, 'click', () => handleAddClaim(context, tab));
      addListener(deleteBtn, 'click', () => handleDeleteClaim(context, tab));
      addListener(saveBtn, 'click', () => handleSaveClaim(context, tab));
      addListener(resetBtn, 'click', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { listeners, rerender, unsubscribe };
    },
    render: renderClaimsTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      (h.listeners || []).forEach(({ el, event, handler }) => {
        if (el && typeof el.removeEventListener === 'function') {
          el.removeEventListener(event, handler);
        }
      });
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__state.selectedClaimId = null;
      this.__state.lastMovementId = null;
      this.__handlers = null;
    },
    open(context, claimId) {
      this.__state.selectedClaimId = claimId || null;
      context.actions.activateTab?.('claims');
      this.render?.(context);
    }
  };

  movementEngineerGlobal.tabs.claims = tab;
  if (ctx?.tabs) {
    ctx.tabs.claims = tab;
  }
  return tab;
}
