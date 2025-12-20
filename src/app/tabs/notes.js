const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function fallbackClearElement(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function fallbackEnsureSelectOptions(selectEl, options = [], includeEmptyLabel) {
  if (!selectEl) return;
  const previous = selectEl.value;
  fallbackClearElement(selectEl);
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

function getClearElement(ctx) {
  return ctx?.dom?.clearElement || fallbackClearElement;
}

function getEnsureSelectOptions(ctx) {
  return ctx?.dom?.ensureSelectOptions || fallbackEnsureSelectOptions;
}

function renderHint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function getViewModels(ctx) {
  return ctx?.ViewModels || ctx?.services?.ViewModels || window.ViewModels;
}

function getState(ctx) {
  if (!ctx) return {};
  const storeState =
    typeof ctx.getState === 'function'
      ? ctx.getState()
      : ctx.store && typeof ctx.store.getState === 'function'
        ? ctx.store.getState()
        : {};
  const legacyState = ctx?.legacy && typeof ctx.legacy.getState === 'function'
    ? ctx.legacy.getState()
    : null;
  return legacyState || storeState || {};
}

function renderNotesTable(wrapper, notes) {
  const table = document.createElement('table');

  const headerRow = document.createElement('tr');
  ['Target type', 'Target', 'Author', 'Body', 'Context', 'Tags'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  notes.forEach(note => {
    const tr = document.createElement('tr');

    const tdType = document.createElement('td');
    tdType.textContent = note.targetType || '';
    tr.appendChild(tdType);

    const tdTarget = document.createElement('td');
    tdTarget.textContent = note.targetLabel || note.targetId || '';
    tr.appendChild(tdTarget);

    const tdAuthor = document.createElement('td');
    tdAuthor.textContent = note.author || '';
    tr.appendChild(tdAuthor);

    const tdBody = document.createElement('td');
    tdBody.textContent = note.body || '';
    tr.appendChild(tdBody);

    const tdCtx = document.createElement('td');
    tdCtx.textContent = note.context || '';
    tr.appendChild(tdCtx);

    const tdTags = document.createElement('td');
    tdTags.textContent = (note.tags || []).join(', ');
    tr.appendChild(tdTags);

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
}

function renderNotesTab(ctx) {
  const clearElement = getClearElement(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state?.snapshot;
  const currentMovementId = state?.currentMovementId;

  const wrapper = document.getElementById('notes-table-wrapper');
  const typeSelect = document.getElementById('notes-target-type-filter');
  const idSelect = document.getElementById('notes-target-id-filter');
  if (!wrapper || !typeSelect || !idSelect) return;

  const disableControls = text => {
    typeSelect.disabled = true;
    idSelect.disabled = true;
    ensureSelectOptions(typeSelect, [], 'All');
    ensureSelectOptions(idSelect, [], 'Any');
    clearElement(wrapper);
    if (text) {
      wrapper.appendChild(renderHint(text));
    }
  };

  const viewModels = getViewModels(ctx);
  if (!currentMovementId) {
    disableControls('Create or select a movement on the left to explore this section.');
    return;
  }

  if (!viewModels || typeof viewModels.buildNotesViewModel !== 'function') {
    disableControls();
    wrapper.appendChild(renderHint('ViewModels module not loaded.'));
    return;
  }

  typeSelect.disabled = false;
  idSelect.disabled = false;

  const baseVm = viewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: null,
    targetIdFilter: null
  });

  const allNotes = Array.isArray(baseVm?.notes) ? baseVm.notes : [];
  const targetTypes = Array.from(new Set(allNotes.map(n => n.targetType).filter(Boolean))).sort(
    (a, b) => String(a).localeCompare(String(b))
  );

  ensureSelectOptions(
    typeSelect,
    targetTypes.map(t => ({ value: t, label: t })),
    'All'
  );

  const selectedType = typeSelect.value || '';

  const idsForType = allNotes.filter(note => !selectedType || note.targetType === selectedType);
  const idOptionsMap = new Map();
  idsForType.forEach(note => {
    if (!note.targetId || idOptionsMap.has(note.targetId)) return;
    idOptionsMap.set(note.targetId, note.targetLabel || note.targetId);
  });

  const idOptions = Array.from(idOptionsMap.entries()).map(([value, label]) => ({ value, label }));
  idOptions.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  ensureSelectOptions(idSelect, idOptions, 'Any');

  const selectedId = idSelect.value || '';

  const vm = viewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: selectedType || null,
    targetIdFilter: selectedId || null
  });

  const notes = Array.isArray(vm?.notes) ? vm.notes : [];
  clearElement(wrapper);

  if (!notes.length) {
    wrapper.appendChild(renderHint('No notes match this filter.'));
    return;
  }

  renderNotesTable(wrapper, notes);
}

export function registerNotesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const typeSelect = document.getElementById('notes-target-type-filter');
      const idSelect = document.getElementById('notes-target-id-filter');
      const rerender = () => renderNotesTab(context);

      if (typeSelect) typeSelect.addEventListener('change', rerender);
      if (idSelect) idSelect.addEventListener('change', rerender);

      this.__handlers = { typeSelect, idSelect, rerender };
    },
    render: renderNotesTab,
    unmount() {
      const handlers = this.__handlers;
      if (!handlers) return;
      if (handlers.typeSelect) {
        handlers.typeSelect.removeEventListener('change', handlers.rerender);
      }
      if (handlers.idSelect) {
        handlers.idSelect.removeEventListener('change', handlers.rerender);
      }
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.notes = tab;
  if (ctx?.tabs) {
    ctx.tabs.notes = tab;
  }
  return tab;
}
