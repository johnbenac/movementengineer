const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};
let selectedClaimId = null;

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function fallbackEnsureSelectOptions(selectEl, options = [], includeEmptyLabel) {
  if (!selectEl) return;
  const previous = selectEl.value;
  fallbackClear(selectEl);
  if (includeEmptyLabel) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = includeEmptyLabel;
    selectEl.appendChild(opt);
  }
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    selectEl.appendChild(opt);
  });
  if (previous && options.some(option => option.value === previous)) {
    selectEl.value = previous;
  }
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getEnsureSelectOptions(ctx) {
  return ctx?.dom?.ensureSelectOptions || fallbackEnsureSelectOptions;
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function normaliseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseCsvInput(value) {
  return normaliseArray(value);
}

function populateMultiSelect(selectEl, options, selectedValues = []) {
  if (!selectEl) return;
  const selectedSet = new Set(normaliseArray(selectedValues));
  const prevSelection = new Set(
    Array.from(selectEl.selectedOptions || []).map(opt => opt.value)
  );
  fallbackClear(selectEl);
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    opt.selected =
      selectedSet.has(option.value) || (!selectedSet.size && prevSelection.has(option.value));
    selectEl.appendChild(opt);
  });
}

function populateDatalist(listEl, options) {
  if (!listEl) return;
  fallbackClear(listEl);
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    listEl.appendChild(opt);
  });
}

function setSelectedClaimId(claims) {
  if (!claims || !claims.length) {
    selectedClaimId = null;
    return null;
  }
  const exists = claims.find(claim => claim.id === selectedClaimId);
  if (exists) return selectedClaimId;
  selectedClaimId = claims[0].id;
  return selectedClaimId;
}

function getClaimById(claims, id) {
  return claims.find(claim => claim.id === id) || null;
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function renderClaimsTable(wrapper, claims, clear) {
  clear(wrapper);

  if (!claims || claims.length === 0) {
    wrapper.appendChild(hint('No claims match this filter.'));
    return;
  }

  const table = document.createElement('table');

  const headerRow = document.createElement('tr');
  ['Category', 'Text', 'Tags', 'About entities', 'Source texts', 'Sources of truth'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  claims.forEach(c => {
    const tr = document.createElement('tr');

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

function renderClaimsTab(ctx) {
  const legacy = ctx?.legacy || movementEngineerGlobal.legacy;
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('claims-table-wrapper');
  const catSelect = document.getElementById('claims-category-filter');
  const entSelect = document.getElementById('claims-entity-filter');
  const claimSelect = document.getElementById('claims-claim-select');
  const claimTextInput = document.getElementById('claims-text');
  const claimCategoryInput = document.getElementById('claims-category');
  const claimTagsInput = document.getElementById('claims-tags');
  const claimSourcesInput = document.getElementById('claims-sources-of-truth');
  const claimNotesInput = document.getElementById('claims-notes');
  const aboutEntitiesSelect = document.getElementById('claims-about-entities');
  const sourceTextsSelect = document.getElementById('claims-source-texts');
  const sourceEntitiesSelect = document.getElementById('claims-source-entities');
  const saveBtn = document.getElementById('claims-save-btn');
  const deleteBtn = document.getElementById('claims-delete-btn');
  const newBtn = document.getElementById('claims-new-btn');
  const catDatalist = document.getElementById('claims-category-options');
  const tagDatalist = document.getElementById('claims-tag-options');
  const sourcesDatalist = document.getElementById('claims-sources-options');
  if (!wrapper || !catSelect || !entSelect) return;

  if (!currentMovementId) {
    catSelect.disabled = true;
    entSelect.disabled = true;
    if (claimSelect) claimSelect.disabled = true;
    [claimTextInput, claimCategoryInput, claimTagsInput, claimSourcesInput, claimNotesInput].forEach(
      el => el && (el.disabled = true)
    );
    [aboutEntitiesSelect, sourceTextsSelect, sourceEntitiesSelect].forEach(
      el => el && (el.disabled = true)
    );
    [saveBtn, deleteBtn, newBtn].forEach(el => el && (el.disabled = true));
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(catSelect, [], 'All');
    ensureSelectOptions(entSelect, [], 'Any');
    if (claimSelect) ensureSelectOptions(claimSelect, [], 'Choose a claim');
    populateDatalist(catDatalist, []);
    populateDatalist(tagDatalist, []);
    populateDatalist(sourcesDatalist, []);
    return;
  }

  catSelect.disabled = false;
  entSelect.disabled = false;
  [claimSelect, claimTextInput, claimCategoryInput, claimTagsInput, claimSourcesInput, claimNotesInput].forEach(
    el => el && (el.disabled = false)
  );
  [aboutEntitiesSelect, sourceTextsSelect, sourceEntitiesSelect].forEach(
    el => el && (el.disabled = false)
  );
  [saveBtn, deleteBtn, newBtn].forEach(el => el && (el.disabled = false));

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildClaimsExplorerViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const claimsForMovement = (snapshot?.claims || []).filter(
    c => c.movementId === currentMovementId
  );
  const categories = Array.from(
    new Set(claimsForMovement.map(c => c.category).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)));

  const entities = (snapshot?.entities || []).filter(e => e.movementId === currentMovementId);

  ensureSelectOptions(
    catSelect,
    categories.map(c => ({ value: c, label: c })),
    'All'
  );
  ensureSelectOptions(
    entSelect,
    entities
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(e => ({ value: e.id, label: e.name || e.id })),
    'Any'
  );

  const categoryVal = catSelect.value || '';
  const entityVal = entSelect.value || '';

  const vm = ViewModels.buildClaimsExplorerViewModel(snapshot, {
    movementId: currentMovementId,
    categoryFilter: categoryVal ? [categoryVal] : [],
    entityIdFilter: entityVal || null
  });

  renderClaimsTable(wrapper, vm?.claims || [], clear);

  if (claimSelect) {
    const claimOptions = claimsForMovement
      .slice()
      .sort((a, b) => (a.text || a.id).localeCompare(b.text || b.id))
      .map(claim => ({
        value: claim.id,
        label: `${claim.text || claim.id} (${claim.id})`
      }));
    ensureSelectOptions(claimSelect, claimOptions, 'Choose a claim');
    setSelectedClaimId(claimsForMovement);
    if (selectedClaimId && claimOptions.some(opt => opt.value === selectedClaimId)) {
      claimSelect.value = selectedClaimId;
    } else if (claimOptions.length) {
      selectedClaimId = claimOptions[0].value;
      claimSelect.value = selectedClaimId;
    } else {
      claimSelect.value = '';
    }
  }

  const lookups = vm?.lookups || {};
  populateDatalist(catDatalist, lookups.categories || []);
  populateDatalist(tagDatalist, lookups.tags || []);
  populateDatalist(sourcesDatalist, lookups.sourcesOfTruth || []);

  const selectedClaim = getClaimById(claimsForMovement, claimSelect?.value || selectedClaimId);

  const entityOptions = (lookups.entities || []).map(e => ({
    value: e.id,
    label: e.name ? `${e.name}${e.kind ? ` (${e.kind})` : ''}` : e.id
  }));
  const textOptions = (lookups.texts || []).map(t => ({
    value: t.id,
    label: t.title
      ? `${t.title}${Number.isFinite(t.depth) ? ` (depth ${t.depth})` : ''}`
      : t.id
  }));

  populateMultiSelect(aboutEntitiesSelect, entityOptions, selectedClaim?.aboutEntityIds);
  populateMultiSelect(sourceEntitiesSelect, entityOptions, selectedClaim?.sourceEntityIds);
  populateMultiSelect(sourceTextsSelect, textOptions, selectedClaim?.sourceTextIds);

  if (claimTextInput) claimTextInput.value = selectedClaim?.text || '';
  if (claimCategoryInput) claimCategoryInput.value = selectedClaim?.category || '';
  if (claimTagsInput) claimTagsInput.value = (selectedClaim?.tags || []).join(', ');
  if (claimSourcesInput)
    claimSourcesInput.value = (selectedClaim?.sourcesOfTruth || []).join(', ');
  if (claimNotesInput) claimNotesInput.value = selectedClaim?.notes || '';
  selectedClaimId = selectedClaim ? selectedClaim.id : selectedClaimId;

  const hasSelection = Boolean(selectedClaim);
  if (saveBtn) saveBtn.disabled = !hasSelection;
  if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

export function registerClaimsTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const catSelect = document.getElementById('claims-category-filter');
      const entSelect = document.getElementById('claims-entity-filter');
      const claimSelect = document.getElementById('claims-claim-select');
      const claimTextInput = document.getElementById('claims-text');
      const claimCategoryInput = document.getElementById('claims-category');
      const claimTagsInput = document.getElementById('claims-tags');
      const claimSourcesInput = document.getElementById('claims-sources-of-truth');
      const claimNotesInput = document.getElementById('claims-notes');
      const aboutEntitiesSelect = document.getElementById('claims-about-entities');
      const sourceTextsSelect = document.getElementById('claims-source-texts');
      const sourceEntitiesSelect = document.getElementById('claims-source-entities');
      const saveBtn = document.getElementById('claims-save-btn');
      const deleteBtn = document.getElementById('claims-delete-btn');
      const newBtn = document.getElementById('claims-new-btn');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'claims') return;
        rerender();
      };

      if (catSelect) catSelect.addEventListener('change', rerender);
      if (entSelect) entSelect.addEventListener('change', rerender);
      const handleClaimSelect = e => {
        selectedClaimId = e.target.value || null;
        rerender();
      };
      if (claimSelect) claimSelect.addEventListener('change', handleClaimSelect);

      const ensureLegacy = () => context?.legacy || movementEngineerGlobal.legacy;
      const getSnapshot = () => context?.getState?.()?.snapshot;
      const getMovementId = () => context?.getState?.()?.currentMovementId;
      const DomainService = context?.services?.DomainService || window.DomainService;

      const handleNew = () => {
        const movementId = getMovementId();
        if (!movementId || !DomainService) return;
        try {
          const snapshot = getSnapshot();
          const claim = DomainService.addNewItem(snapshot, 'claims', movementId);
          selectedClaimId = claim.id;
          ensureLegacy()?.saveSnapshot?.({ show: false, clearMovementDirty: true });
          ensureLegacy()?.setStatus?.('Claim created');
          rerender();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to create claim');
        }
      };

      const handleDelete = () => {
        const movementId = getMovementId();
        const snapshot = getSnapshot();
        if (!movementId || !DomainService || !snapshot || !selectedClaimId) return;
        const claimsForMovement = (snapshot.claims || []).filter(
          c => c.movementId === movementId
        );
        const selectedClaim = claimsForMovement.find(c => c.id === selectedClaimId);
        if (!selectedClaim) return;
        const ok = window.confirm(
          `Delete claim?\n\n${selectedClaim.text || selectedClaim.id}\n\nThis cannot be undone.`
        );
        if (!ok) return;
        try {
          DomainService.deleteItem(snapshot, 'claims', selectedClaimId);
          selectedClaimId = null;
          ensureLegacy()?.saveSnapshot?.({ show: false, clearMovementDirty: true });
          ensureLegacy()?.setStatus?.('Claim deleted');
          rerender();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete claim');
        }
      };

      const handleSave = () => {
        const movementId = getMovementId();
        const snapshot = getSnapshot();
        if (!movementId || !DomainService || !snapshot) return;
        const claimsForMovement = (snapshot.claims || []).filter(
          c => c.movementId === movementId
        );
        const existing = getClaimById(claimsForMovement, selectedClaimId);
        if (!existing) return;
        const next = { ...existing };
        next.text = claimTextInput?.value || '';
        next.category = claimCategoryInput?.value?.trim() || null;
        next.tags = parseCsvInput(claimTagsInput?.value);
        next.aboutEntityIds = Array.from(aboutEntitiesSelect?.selectedOptions || []).map(
          o => o.value
        );
        next.sourceTextIds = Array.from(sourceTextsSelect?.selectedOptions || []).map(
          o => o.value
        );
        next.sourcesOfTruth = parseCsvInput(claimSourcesInput?.value);
        next.sourceEntityIds = Array.from(sourceEntitiesSelect?.selectedOptions || []).map(
          o => o.value
        );
        next.notes = claimNotesInput?.value?.trim() || null;

        try {
          DomainService.upsertItem(snapshot, 'claims', next);
          selectedClaimId = next.id;
          ensureLegacy()?.saveSnapshot?.({ show: false, clearMovementDirty: true });
          ensureLegacy()?.setStatus?.('Claim saved');
          rerender();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to save claim');
        }
      };

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      if (newBtn) newBtn.addEventListener('click', handleNew);
      if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
      if (saveBtn) saveBtn.addEventListener('click', handleSave);

      this.__handlers = {
        catSelect,
        entSelect,
        claimSelect,
        handleClaimSelect,
        rerender,
        unsubscribe,
        newBtn,
        deleteBtn,
        saveBtn,
        handleNew,
        handleDelete,
        handleSave
      };
    },
    render: renderClaimsTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.catSelect) h.catSelect.removeEventListener('change', h.rerender);
      if (h.entSelect) h.entSelect.removeEventListener('change', h.rerender);
      if (h.claimSelect) h.claimSelect.removeEventListener('change', h.handleClaimSelect);
      if (h.newBtn) h.newBtn.removeEventListener('click', h.handleNew);
      if (h.deleteBtn) h.deleteBtn.removeEventListener('click', h.handleDelete);
      if (h.saveBtn) h.saveBtn.removeEventListener('click', h.handleSave);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.claims = tab;
  if (ctx?.tabs) {
    ctx.tabs.claims = tab;
  }
  return tab;
}
