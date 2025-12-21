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

function addListener(el, event, handler, bucket) {
  if (!el || typeof el.addEventListener !== 'function') return;
  el.addEventListener(event, handler);
  if (Array.isArray(bucket)) {
    bucket.push({ el, event, handler });
  }
}

function ensureMultiSelectOptions(selectEl, options = [], previousValues = []) {
  if (!selectEl) return;
  const prevSet = new Set(previousValues.filter(Boolean));
  fallbackClear(selectEl);
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    opt.selected = prevSet.has(option.value);
    selectEl.appendChild(opt);
  });
}

function deepClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj || {}));
}

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function joinCsv(values) {
  return Array.isArray(values) ? values.filter(Boolean).join(', ') : '';
}

function getSelectedValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || [])
    .map(opt => opt.value)
    .filter(Boolean);
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

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

function disableClaimsEditor(elements, reason = '') {
  Object.values(elements).forEach(el => {
    if (!el) return;
    if (
      el.tagName === 'SELECT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'INPUT' ||
      el.tagName === 'BUTTON'
    ) {
      el.disabled = true;
      if (el.tagName !== 'SELECT') {
        el.value = '';
      } else {
        el.value = '';
      }
      if (el.multiple) {
        Array.from(el.options || []).forEach(opt => {
          opt.selected = false;
        });
      }
    }
  });
  if (elements.status) {
    elements.status.textContent = reason || '';
  }
}

function formatClaimLabel(claim) {
  const prefix = claim.category ? `[${claim.category}] ` : '';
  return prefix + (claim.text || claim.id);
}

function renderClaimsEditor(ctx, state, elements, claimsForMovement, entities, texts) {
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const currentMovementId = state.currentMovementId;

  if (!currentMovementId) {
    ensureSelectOptions(elements.claimsSelect, [], 'Select a claim');
    ensureMultiSelectOptions(elements.aboutSelect, [], []);
    ensureMultiSelectOptions(elements.sourceTextSelect, [], []);
    ensureMultiSelectOptions(elements.sourceEntitySelect, [], []);
    disableClaimsEditor(elements, 'Create or select a movement to manage claims.');
    return;
  }

  const claimOptions = claimsForMovement
    .slice()
    .sort((a, b) => formatClaimLabel(a).localeCompare(formatClaimLabel(b)))
    .map(c => ({ value: c.id, label: formatClaimLabel(c) }));

  ensureSelectOptions(elements.claimsSelect, claimOptions, 'Select a claim');
  if (elements.claimsSelect) elements.claimsSelect.disabled = false;
  if (elements.newBtn) elements.newBtn.disabled = false;

  const selectedId =
    elements.claimsSelect?.value ||
    ctx?.tabs?.claims?.__selectedClaimId ||
    (claimOptions[0] ? claimOptions[0].value : '');

  if (elements.claimsSelect && selectedId && !elements.claimsSelect.value) {
    elements.claimsSelect.value = selectedId;
  }

  const activeClaim =
    claimsForMovement.find(c => c.id === elements.claimsSelect?.value) || null;
  if (ctx?.tabs?.claims) {
    ctx.tabs.claims.__selectedClaimId = activeClaim?.id || null;
  }

  const entityOptions = entities
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => ({ value: e.id, label: e.name || e.id }));

  const textOptions = texts
    .slice()
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    .map(t => ({
      value: t.id,
      label: t.title || t.id
    }));

  ensureMultiSelectOptions(
    elements.aboutSelect,
    entityOptions,
    activeClaim?.aboutEntityIds || []
  );
  ensureMultiSelectOptions(
    elements.sourceEntitySelect,
    entityOptions,
    activeClaim?.sourceEntityIds || []
  );
  ensureMultiSelectOptions(
    elements.sourceTextSelect,
    textOptions,
    activeClaim?.sourceTextIds || []
  );

  const canEdit = Boolean(activeClaim);
  [
    elements.textInput,
    elements.categoryInput,
    elements.tagsInput,
    elements.aboutSelect,
    elements.sourceTextSelect,
    elements.sourceEntitySelect,
    elements.sourcesInput,
    elements.notesInput,
    elements.saveBtn,
    elements.deleteBtn
  ].forEach(el => {
    if (!el) return;
    el.disabled = !canEdit && el !== elements.saveBtn && el !== elements.deleteBtn;
    if (el === elements.saveBtn || el === elements.deleteBtn) {
      el.disabled = !canEdit && el === elements.saveBtn ? true : !canEdit;
    }
  });

  if (activeClaim) {
    if (elements.textInput) elements.textInput.value = activeClaim.text || '';
    if (elements.categoryInput) elements.categoryInput.value = activeClaim.category || '';
    if (elements.tagsInput) elements.tagsInput.value = joinCsv(activeClaim.tags);
    if (elements.sourcesInput) {
      elements.sourcesInput.value = joinCsv(activeClaim.sourcesOfTruth);
    }
    if (elements.notesInput) elements.notesInput.value = activeClaim.notes || '';
    if (elements.status) {
      elements.status.textContent = `Editing ${formatClaimLabel(activeClaim)}`;
    }
  } else {
    if (elements.textInput) elements.textInput.value = '';
    if (elements.categoryInput) elements.categoryInput.value = '';
    if (elements.tagsInput) elements.tagsInput.value = '';
    if (elements.sourcesInput) elements.sourcesInput.value = '';
    if (elements.notesInput) elements.notesInput.value = '';
    if (elements.status) {
      elements.status.textContent = claimOptions.length
        ? 'Select a claim to edit or create a new one.'
        : 'No claims yet. Create your first claim for this movement.';
    }
  }
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
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('claims-table-wrapper');
  const catSelect = document.getElementById('claims-category-filter');
  const entSelect = document.getElementById('claims-entity-filter');
  const claimsSelect = document.getElementById('claims-select');
  const newBtn = document.getElementById('claims-new-btn');
  const saveBtn = document.getElementById('claims-save-btn');
  const deleteBtn = document.getElementById('claims-delete-btn');
  const textInput = document.getElementById('claims-text-input');
  const categoryInput = document.getElementById('claims-category-input');
  const tagsInput = document.getElementById('claims-tags-input');
  const aboutSelect = document.getElementById('claims-about-entities');
  const sourceTextSelect = document.getElementById('claims-source-texts');
  const sourceEntitySelect = document.getElementById('claims-source-entities');
  const sourcesInput = document.getElementById('claims-sources-input');
  const notesInput = document.getElementById('claims-notes-input');
  const status = document.getElementById('claims-editor-status');

  const editorElements = {
    claimsSelect,
    newBtn,
    saveBtn,
    deleteBtn,
    textInput,
    categoryInput,
    tagsInput,
    aboutSelect,
    sourceTextSelect,
    sourceEntitySelect,
    sourcesInput,
    notesInput,
    status
  };

  if (!wrapper || !catSelect || !entSelect) return;

  if (!currentMovementId) {
    catSelect.disabled = true;
    entSelect.disabled = true;
    disableClaimsEditor(editorElements);
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(catSelect, [], 'All');
    ensureSelectOptions(entSelect, [], 'Any');
    return;
  }

  catSelect.disabled = false;
  entSelect.disabled = false;

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildClaimsExplorerViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    renderClaimsEditor(
      ctx,
      state,
      editorElements,
      [],
      snapshot?.entities || [],
      snapshot?.texts || []
    );
    return;
  }

  const claimsForMovement = (snapshot?.claims || []).filter(
    c => c.movementId === currentMovementId
  );
  const categories = Array.from(
    new Set(claimsForMovement.map(c => c.category).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)));

  const entities = (snapshot?.entities || []).filter(e => e.movementId === currentMovementId);
  const texts = (snapshot?.texts || []).filter(t => t.movementId === currentMovementId);

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

  renderClaimsEditor(ctx, state, editorElements, claimsForMovement, entities, texts);
}

export function registerClaimsTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const catSelect = document.getElementById('claims-category-filter');
      const entSelect = document.getElementById('claims-entity-filter');
      const claimsSelect = document.getElementById('claims-select');
      const newBtn = document.getElementById('claims-new-btn');
      const saveBtn = document.getElementById('claims-save-btn');
      const deleteBtn = document.getElementById('claims-delete-btn');
      const textInput = document.getElementById('claims-text-input');
      const categoryInput = document.getElementById('claims-category-input');
      const tagsInput = document.getElementById('claims-tags-input');
      const aboutSelect = document.getElementById('claims-about-entities');
      const sourceTextSelect = document.getElementById('claims-source-texts');
      const sourceEntitySelect = document.getElementById('claims-source-entities');
      const sourcesInput = document.getElementById('claims-sources-input');
      const notesInput = document.getElementById('claims-notes-input');
      const status = document.getElementById('claims-editor-status');
      const listeners = [];

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'claims') return;
        rerender();
      };

      addListener(catSelect, 'change', rerender, listeners);
      addListener(entSelect, 'change', rerender, listeners);
      addListener(claimsSelect, 'change', rerender, listeners);
      addListener(textInput, 'input', () => status && (status.textContent = 'Unsaved changes'), listeners);
      addListener(categoryInput, 'input', () => status && (status.textContent = 'Unsaved changes'), listeners);
      addListener(tagsInput, 'input', () => status && (status.textContent = 'Unsaved changes'), listeners);
      addListener(aboutSelect, 'change', () => status && (status.textContent = 'Unsaved changes'), listeners);
      addListener(
        sourceTextSelect,
        'change',
        () => status && (status.textContent = 'Unsaved changes'),
        listeners
      );
      addListener(
        sourceEntitySelect,
        'change',
        () => status && (status.textContent = 'Unsaved changes'),
        listeners
      );
      addListener(sourcesInput, 'input', () => status && (status.textContent = 'Unsaved changes'), listeners);
      addListener(notesInput, 'input', () => status && (status.textContent = 'Unsaved changes'), listeners);

      if (newBtn) {
        addListener(newBtn, 'click', () => {
          const DomainService = getDomainService(context);
          const state = getState(context);
          const snapshot = state.snapshot;
          const movementId = state.currentMovementId;
          if (!DomainService || !snapshot || !movementId) return;
          const nextSnapshot = deepClone(snapshot);
          const claim = DomainService.addNewItem(nextSnapshot, 'claims', movementId);
          if (context.setState) {
            context.setState({ ...state, snapshot: nextSnapshot });
          }
          if (context.tabs?.claims) {
            context.tabs.claims.__selectedClaimId = claim.id;
          }
          if (claimsSelect) claimsSelect.value = claim.id;
          if (context.setStatus) context.setStatus('New claim created');
          if (typeof context.actions?.saveSnapshot === 'function') {
            context.actions.saveSnapshot();
          }
          rerender();
        }, listeners);
      }

      if (saveBtn) {
        addListener(saveBtn, 'click', () => {
          const DomainService = getDomainService(context);
          const state = getState(context);
          const snapshot = state.snapshot;
          const movementId = state.currentMovementId;
          const claimId = claimsSelect?.value;
          if (!DomainService || !snapshot || !movementId || !claimId) return;
          const nextSnapshot = deepClone(snapshot);
          const claims = nextSnapshot.claims || [];
          const existing = claims.find(c => c.id === claimId);
          if (!existing) return;
          const updated = {
            ...existing,
            movementId,
            text: textInput?.value?.trim() || existing.text,
            category: (categoryInput?.value || '').trim() || null,
            tags: parseCsv(tagsInput?.value || ''),
            aboutEntityIds: getSelectedValues(aboutSelect),
            sourceTextIds: getSelectedValues(sourceTextSelect),
            sourceEntityIds: getSelectedValues(sourceEntitySelect),
            sourcesOfTruth: parseCsv(sourcesInput?.value || ''),
            notes: (notesInput?.value || '').trim() || null
          };
          DomainService.upsertItem(nextSnapshot, 'claims', updated);
          if (context.setState) {
            context.setState({ ...state, snapshot: nextSnapshot });
          }
          if (context.tabs?.claims) {
            context.tabs.claims.__selectedClaimId = updated.id;
          }
          if (context.setStatus) context.setStatus('Claim saved');
          if (typeof context.actions?.saveSnapshot === 'function') {
            context.actions.saveSnapshot();
          }
          rerender();
        }, listeners);
      }

      if (deleteBtn) {
        addListener(deleteBtn, 'click', () => {
          const DomainService = getDomainService(context);
          const state = getState(context);
          const snapshot = state.snapshot;
          const claimId = claimsSelect?.value;
          if (!DomainService || !snapshot || !claimId) return;
          const nextSnapshot = deepClone(snapshot);
          const claim = (nextSnapshot.claims || []).find(c => c.id === claimId);
          if (!claim) return;
          const confirmed = window.confirm(
            `Delete this claim?\n\n${formatClaimLabel(claim)}\n\nThis cannot be undone.`
          );
          if (!confirmed) return;

          DomainService.deleteItem(nextSnapshot, 'claims', claimId);
          ['practices', 'events', 'rules'].forEach(coll => {
            if (!Array.isArray(nextSnapshot[coll])) return;
            nextSnapshot[coll] = nextSnapshot[coll].map(item => {
              const ids = Array.isArray(item.supportingClaimIds)
                ? item.supportingClaimIds.filter(id => id !== claimId)
                : [];
              return { ...item, supportingClaimIds: ids };
            });
          });
          if (Array.isArray(nextSnapshot.notes)) {
            nextSnapshot.notes = nextSnapshot.notes.filter(
              note => !(note.targetType === 'Claim' && note.targetId === claimId)
            );
          }

          if (context.setState) {
            context.setState({ ...state, snapshot: nextSnapshot });
          }
          if (context.tabs?.claims) {
            context.tabs.claims.__selectedClaimId = null;
          }
          if (claimsSelect) claimsSelect.value = '';
          if (context.setStatus) context.setStatus('Claim deleted');
          if (typeof context.actions?.saveSnapshot === 'function') {
            context.actions.saveSnapshot();
          }
          rerender();
        }, listeners);
      }

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        catSelect,
        entSelect,
        claimsSelect,
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
        if (el && typeof el.removeEventListener === 'function') {
          el.removeEventListener(event, handler);
        }
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
