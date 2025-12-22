import { guardMissingViewModels, guardNoMovement, renderHint, setDisabled } from '../ui/hints.js';
const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

let selectedClaimId = null;
let lastMovementId = null;

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

function isInteractiveTarget(target) {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(
    target.closest(
      'a[href], button, input, select, textarea, option, label, [role="button"], [data-row-select="ignore"]'
    )
  );
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

function renderClaimsTable(wrapper, claims, clear, selectedId) {
  clear(wrapper);

  if (!claims || claims.length === 0) {
    renderHint(wrapper, 'No claims match this filter.');
    return;
  }

  const table = document.createElement('table');

  const headerRow = document.createElement('tr');
  [
    'Category',
    'Text',
    'Tags',
    'About entities',
    'Source entities',
    'Source texts',
    'Sources of truth'
  ].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  claims.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.claimId = c.id;
    tr.className = 'clickable-row';
    if (selectedId && selectedId === c.id) {
      tr.classList.add('selected');
    }

    const tdCat = document.createElement('td');
    tdCat.textContent = c.category || '';
    tr.appendChild(tdCat);

    const tdText = document.createElement('td');
    tdText.textContent = c.text;
    tr.appendChild(tdText);

    const tdTags = document.createElement('td');
    tdTags.textContent = (c.tags || []).join(', ');
    tr.appendChild(tdTags);

    const tdEnts = document.createElement('td');
    if (c.aboutEntities && c.aboutEntities.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      c.aboutEntities.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-entity';
        chip.textContent = e.name || e.id;
        row.appendChild(chip);
      });
      tdEnts.appendChild(row);
    }
    tr.appendChild(tdEnts);

    const tdSourceEnts = document.createElement('td');
    if (c.sourceEntities && c.sourceEntities.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      c.sourceEntities.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-entity';
        chip.textContent = e.name || e.id;
        row.appendChild(chip);
      });
      tdSourceEnts.appendChild(row);
    }
    tr.appendChild(tdSourceEnts);

    const tdTexts = document.createElement('td');
    if (c.sourceTexts && c.sourceTexts.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      c.sourceTexts.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = t.title || t.id;
        row.appendChild(chip);
      });
      tdTexts.appendChild(row);
    }
    tr.appendChild(tdTexts);

    const tdSources = document.createElement('td');
    tdSources.textContent = (c.sourcesOfTruth || []).join(', ');
    tr.appendChild(tdSources);

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
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

function handleAddClaim(ctx) {
  const ds = getDomainService(ctx);
  const state = getState(ctx);
  if (!ds || !state.currentMovementId) return;
  ctx.update(prev => {
    const snapshot = prev.snapshot || {};
    const created = ds.addNewItem(snapshot, 'claims', prev.currentMovementId);
    selectedClaimId = created.id;
    return { ...prev, snapshot };
  });
  ctx.store?.markDirty?.('item');
  ctx.setStatus?.('New claim created');
  const tab = ctx.tabs?.claims;
  tab?.render?.call(tab, ctx);
}

function handleDeleteClaim(ctx) {
  const ds = getDomainService(ctx);
  const state = getState(ctx);
  if (!ds || !state.currentMovementId || !selectedClaimId) return;
  const claims = state.snapshot?.claims || [];
  const claim = claims.find(c => c.id === selectedClaimId);
  const label =
    (claim?.category ? `[${claim.category}] ` : '') + (claim?.text || claim?.id || '');
  const ok = window.confirm(
    `Delete this claim?\n\n${label || selectedClaimId}\n\nThis cannot be undone.`
  );
  if (!ok) return;
  ctx.update(prev => {
    const snapshot = prev.snapshot || {};
    ds.deleteItem(snapshot, 'claims', selectedClaimId);
    return { ...prev, snapshot };
  });
  selectedClaimId = null;
  ctx.store?.markDirty?.('item');
  ctx.setStatus?.('Claim deleted');
  const tab = ctx.tabs?.claims;
  tab?.render?.call(tab, ctx);
}

function handleSaveClaim(ctx) {
  const ds = getDomainService(ctx);
  const state = getState(ctx);
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
  const existing = claims.find(c => c.id === selectedClaimId) || {
    id: selectedClaimId || ds.generateId?.('clm-')
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
  selectedClaimId = updated.id;
  ctx.store?.markDirty?.('item');
  ctx.setStatus?.('Claim saved');
}

function renderClaimsTab(ctx) {
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

  const disableAll = () => {
    setDisabled(controls, true);
    setFormDisabled(form, true);
  };

  const enableAll = () => {
    setDisabled(controls, false);
    setFormDisabled(form, false);
  };

  clear(wrapper);

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [wrapper],
      controls,
      dom
    })
  ) {
    selectedClaimId = null;
    lastMovementId = null;
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

  if (lastMovementId !== currentMovementId) {
    selectedClaimId = null;
    lastMovementId = currentMovementId;
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
  if (!selectedClaimId || !visibleIds.has(selectedClaimId)) {
    selectedClaimId = visibleClaims[0]?.id || null;
  }

  renderClaimsTable(wrapper, visibleClaims, clear, selectedClaimId);

  const selectedClaim = claimsForMovement.find(c => c.id === selectedClaimId) || null;
  populateClaimForm(form, lookups, selectedClaim, dom);

  if (deleteBtn) deleteBtn.disabled = !selectedClaimId;
  if (saveBtn) saveBtn.disabled = !selectedClaimId;
}

export function registerClaimsTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const catSelect = document.getElementById('claims-category-filter');
      const entSelect = document.getElementById('claims-entity-filter');
      const addBtn = document.getElementById('claims-add-btn');
      const deleteBtn = document.getElementById('claims-delete-btn');
      const saveBtn = document.getElementById('claims-save-btn');
      const resetBtn = document.getElementById('claims-reset-btn');
      const tableWrapper = document.getElementById('claims-table-wrapper');

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
      addListener(addBtn, 'click', () => handleAddClaim(context));
      addListener(deleteBtn, 'click', () => handleDeleteClaim(context));
      addListener(saveBtn, 'click', () => handleSaveClaim(context));
      addListener(resetBtn, 'click', rerender);
      addListener(tableWrapper, 'click', event => {
        if (isInteractiveTarget(event.target)) return;
        const row = event.target.closest('tr[data-claim-id]');
        if (!row) return;
        selectedClaimId = row.dataset.claimId;
        rerender();
      });

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
      selectedClaimId = null;
      lastMovementId = null;
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.claims = tab;
  if (ctx?.tabs) {
    ctx.tabs.claims = tab;
  }
  return tab;
}
