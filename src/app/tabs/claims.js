const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

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

function ensureMultiSelectOptions(selectEl, options = [], selectedValues = []) {
  if (!selectEl) return;
  const prevSelected = Array.from(selectEl.selectedOptions || []).map(opt => opt.value);
  const desired = selectedValues.length ? selectedValues : prevSelected;
  selectEl.innerHTML = '';
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    opt.selected = desired.includes(option.value);
    selectEl.appendChild(opt);
  });
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function setState(ctx, next) {
  if (typeof ctx?.setState === 'function') return ctx.setState(next);
  if (ctx?.store && typeof ctx.store.setState === 'function') return ctx.store.setState(next);
  if (typeof ctx?.update === 'function') return ctx.update(() => next);
  return null;
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || window.DomainService;
}

function parseCsvInput(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getSelectedValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || []).map(opt => opt.value).filter(Boolean);
}

function flagSnapshotDirty(state) {
  const flags = state.flags || {};
  return {
    ...state,
    flags: {
      ...flags,
      snapshotDirty: true,
      isDirty: true
    }
  };
}

function buildClaimLabel(claim) {
  const prefix = claim.category ? `[${claim.category}] ` : '';
  return `${prefix}${claim.text || claim.id}`;
}

function renderClaimsTable(wrapper, claims, clear) {
  clear(wrapper);

  if (!claims || claims.length === 0) {
    wrapper.appendChild(hint('No claims match this filter.'));
    return;
  }

  const table = document.createElement('table');

  const headerRow = document.createElement('tr');
  [
    'Category',
    'Text',
    'Tags',
    'About entities',
    'Source texts',
    'Source entities',
    'Sources of truth'
  ].forEach(h => {
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

    const tdSourceEntities = document.createElement('td');
    if (c.sourceEntities && c.sourceEntities.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      c.sourceEntities.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-entity';
        chip.textContent = e.name || e.id;
        row.appendChild(chip);
      });
      tdSourceEntities.appendChild(row);
    }
    tr.appendChild(tdSourceEntities);

    const tdSources = document.createElement('td');
    tdSources.textContent = (c.sourcesOfTruth || []).join(', ');
    tr.appendChild(tdSources);

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
}

function renderClaimsTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const claimSelect = document.getElementById('claims-editor-claim-select');
  const catInput = document.getElementById('claims-editor-category');
  const textInput = document.getElementById('claims-editor-text');
  const tagsInput = document.getElementById('claims-editor-tags');
  const aboutSelect = document.getElementById('claims-editor-about-entities');
  const sourceTextSelect = document.getElementById('claims-editor-source-texts');
  const sourceEntitiesSelect = document.getElementById('claims-editor-source-entities');
  const sourcesInput = document.getElementById('claims-editor-sources');
  const notesInput = document.getElementById('claims-editor-notes');
  const newBtn = document.getElementById('btn-claims-new');
  const saveBtn = document.getElementById('btn-claims-save');
  const deleteBtn = document.getElementById('btn-claims-delete');
  const editorHint = document.getElementById('claim-editor-hint');

  const wrapper = document.getElementById('claims-table-wrapper');
  const catSelect = document.getElementById('claims-category-filter');
  const entSelect = document.getElementById('claims-entity-filter');
  if (!wrapper || !catSelect || !entSelect) return;

  if (!currentMovementId) {
    catSelect.disabled = true;
    entSelect.disabled = true;
    [
      claimSelect,
      catInput,
      textInput,
      tagsInput,
      aboutSelect,
      sourceTextSelect,
      sourceEntitiesSelect,
      sourcesInput,
      notesInput,
      newBtn,
      saveBtn,
      deleteBtn
    ].forEach(el => {
      if (!el) return;
      el.disabled = true;
      if ('value' in el) el.value = '';
      if (el.tagName === 'SELECT') el.innerHTML = '';
    });
    if (editorHint) {
      editorHint.textContent = 'Create or select a movement on the left to manage claims.';
    }
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(catSelect, [], 'All');
    ensureSelectOptions(entSelect, [], 'Any');
    if (claimSelect) ensureSelectOptions(claimSelect, [], 'Select a claim');
    return;
  }

  catSelect.disabled = false;
  entSelect.disabled = false;
  if (editorHint) {
    editorHint.textContent =
      'Select a claim to edit or create a new one for the active movement.';
  }
  [
    claimSelect,
    catInput,
    textInput,
    tagsInput,
    aboutSelect,
    sourceTextSelect,
    sourceEntitiesSelect,
    sourcesInput,
    notesInput,
    newBtn,
    saveBtn,
    deleteBtn
  ].forEach(el => {
    if (!el) return;
    el.disabled = false;
  });

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

  const claimOptions = claimsForMovement
    .slice()
    .sort((a, b) => buildClaimLabel(a).localeCompare(buildClaimLabel(b)))
    .map(c => ({ value: c.id, label: buildClaimLabel(c) }));
  ensureSelectOptions(claimSelect, claimOptions, 'Select a claim');

  const selectedIdFromDom = claimSelect?.value || null;
  const activeClaimId = selectedIdFromDom || ctx?.tabs?.claims?.__state?.activeClaimId || null;
  let selectedClaim = claimsForMovement.find(c => c.id === activeClaimId) || null;
  if (!selectedClaim && claimsForMovement.length) {
    selectedClaim = claimsForMovement[0];
  }
  if (ctx?.tabs?.claims?.__state) {
    ctx.tabs.claims.__state.activeClaimId = selectedClaim ? selectedClaim.id : null;
  }
  if (claimSelect) {
    claimSelect.value = selectedClaim ? selectedClaim.id : '';
  }

  const applyOptions = () => {
    if (!snapshot || !currentMovementId) return;
    ensureMultiSelectOptions(
      aboutSelect,
      entities
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      selectedClaim ? selectedClaim.aboutEntityIds || [] : []
    );
    ensureMultiSelectOptions(
      sourceEntitiesSelect,
      entities
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      selectedClaim ? selectedClaim.sourceEntityIds || [] : []
    );
    const texts = (snapshot?.texts || []).filter(t => t.movementId === currentMovementId);
    ensureMultiSelectOptions(
      sourceTextSelect,
      texts
        .slice()
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        .map(t => ({ value: t.id, label: t.title || t.id })),
      selectedClaim ? selectedClaim.sourceTextIds || [] : []
    );
  };

  if (selectedClaim) {
    if (catInput) catInput.value = selectedClaim.category || '';
    if (textInput) textInput.value = selectedClaim.text || '';
    if (tagsInput) tagsInput.value = (selectedClaim.tags || []).join(', ');
    if (sourcesInput) sourcesInput.value = (selectedClaim.sourcesOfTruth || []).join(', ');
    if (notesInput) notesInput.value = selectedClaim.notes || '';
  } else {
    [catInput, textInput, tagsInput, sourcesInput, notesInput].forEach(el => {
      if (el) el.value = '';
    });
  }

  applyOptions();

  if (saveBtn) saveBtn.disabled = !selectedClaim;
  if (deleteBtn) deleteBtn.disabled = !selectedClaim;
}

export function registerClaimsTab(ctx) {
  const tab = {
    __handlers: null,
    __state: { activeClaimId: null },
    mount(context) {
      const catSelect = document.getElementById('claims-category-filter');
      const entSelect = document.getElementById('claims-entity-filter');
      const claimSelect = document.getElementById('claims-editor-claim-select');
      const newBtn = document.getElementById('btn-claims-new');
      const saveBtn = document.getElementById('btn-claims-save');
      const deleteBtn = document.getElementById('btn-claims-delete');
      const catInput = document.getElementById('claims-editor-category');
      const textInput = document.getElementById('claims-editor-text');
      const tagsInput = document.getElementById('claims-editor-tags');
      const aboutSelect = document.getElementById('claims-editor-about-entities');
      const sourceTextSelect = document.getElementById('claims-editor-source-texts');
      const sourceEntitiesSelect = document.getElementById('claims-editor-source-entities');
      const sourcesInput = document.getElementById('claims-editor-sources');
      const notesInput = document.getElementById('claims-editor-notes');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'claims') return;
        rerender();
      };

      const listeners = [];
      const addListener = (el, event, handler) => {
        if (!el || typeof el.addEventListener !== 'function') return;
        el.addEventListener(event, handler);
        listeners.push({ el, event, handler });
      };

      addListener(catSelect, 'change', rerender);
      addListener(entSelect, 'change', rerender);
      addListener(claimSelect, 'change', () => {
        tab.__state.activeClaimId = claimSelect.value || null;
        rerender();
      });

      const DomainService = getDomainService(context);

      addListener(newBtn, 'click', () => {
        const state = getState(context);
        const snapshot = state.snapshot;
        const movementId = state.currentMovementId;
        if (!snapshot || !movementId || !DomainService?.addNewItem) return;
        try {
          const newClaim = DomainService.addNewItem(snapshot, 'claims', movementId);
          tab.__state.activeClaimId = newClaim?.id || null;
          const nextState = flagSnapshotDirty({ ...state, snapshot });
          setState(context, nextState);
          context?.setStatus?.('New claim created');
          rerender();
        } catch (err) {
          console.error(err);
          context?.showFatalImportError?.(err);
        }
      });

      addListener(saveBtn, 'click', () => {
        const state = getState(context);
        const snapshot = state.snapshot;
        const movementId = state.currentMovementId;
        if (!snapshot || !movementId || !DomainService?.upsertItem) return;
        const claimId = tab.__state.activeClaimId;
        const claim = (snapshot.claims || []).find(c => c.id === claimId);
        if (!claim) return;
        const updated = {
          ...claim,
          movementId,
          category: catInput?.value?.trim() || null,
          text: textInput?.value || '',
          tags: parseCsvInput(tagsInput?.value),
          aboutEntityIds: getSelectedValues(aboutSelect),
          sourceTextIds: getSelectedValues(sourceTextSelect),
          sourceEntityIds: getSelectedValues(sourceEntitiesSelect),
          sourcesOfTruth: parseCsvInput(sourcesInput?.value),
          notes: notesInput?.value || null
        };

        try {
          DomainService.upsertItem(snapshot, 'claims', updated);
          const nextState = flagSnapshotDirty({ ...state, snapshot });
          setState(context, nextState);
          context?.setStatus?.('Claim saved');
          rerender();
        } catch (err) {
          console.error(err);
          context?.showFatalImportError?.(err);
        }
      });

      addListener(deleteBtn, 'click', () => {
        const state = getState(context);
        const snapshot = state.snapshot;
        if (!snapshot || !DomainService?.deleteItem) return;
        const claimId = tab.__state.activeClaimId;
        if (!claimId) return;
        try {
          DomainService.deleteItem(snapshot, 'claims', claimId);
          tab.__state.activeClaimId = null;
          const nextState = flagSnapshotDirty({ ...state, snapshot });
          setState(context, nextState);
          context?.setStatus?.('Claim deleted');
          rerender();
        } catch (err) {
          console.error(err);
          context?.showFatalImportError?.(err);
        }
      });

      const inputsToRerender = [catInput, textInput, tagsInput, sourcesInput, notesInput];
      inputsToRerender.forEach(input => {
        if (!input) return;
        addListener(input, 'input', () => {
          const active = document.querySelector('.tab.active');
          if (!active || active.dataset.tab !== 'claims') return;
        });
      });

      [aboutSelect, sourceTextSelect, sourceEntitiesSelect].forEach(selectEl => {
        if (!selectEl) return;
        addListener(selectEl, 'change', () => {
          const active = document.querySelector('.tab.active');
          if (!active || active.dataset.tab !== 'claims') return;
        });
      });

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        catSelect,
        entSelect,
        claimSelect,
        newBtn,
        saveBtn,
        deleteBtn,
        listeners,
        rerender,
        unsubscribe
      };
    },
    render: renderClaimsTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      (h.listeners || []).forEach(({ el, event, handler }) => {
        if (!el || typeof el.removeEventListener !== 'function') return;
        el.removeEventListener(event, handler);
      });
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
