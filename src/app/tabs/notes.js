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

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function renderNotesTable(wrapper, notes, clear) {
  clear(wrapper);

  if (!notes || notes.length === 0) {
    wrapper.appendChild(hint('No notes match this filter.'));
    return;
  }

  const table = document.createElement('table');

  const headerRow = document.createElement('tr');
  ['Target type', 'Target', 'Author', 'Body', 'Context', 'Tags'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  notes.forEach(n => {
    const tr = document.createElement('tr');

    const tdType = document.createElement('td');
    tdType.textContent = n.targetType || '';
    tr.appendChild(tdType);

    const tdTarget = document.createElement('td');
    tdTarget.textContent = n.targetLabel || n.targetId || '';
    tr.appendChild(tdTarget);

    const tdAuthor = document.createElement('td');
    tdAuthor.textContent = n.author || '';
    tr.appendChild(tdAuthor);

    const tdBody = document.createElement('td');
    tdBody.textContent = n.body || '';
    tr.appendChild(tdBody);

    const tdCtx = document.createElement('td');
    tdCtx.textContent = n.context || '';
    tr.appendChild(tdCtx);

    const tdTags = document.createElement('td');
    tdTags.textContent = (n.tags || []).join(', ');
    tr.appendChild(tdTags);

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
}

function renderNotesTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = ctx?.getState?.() || {};
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('notes-table-wrapper');
  const typeSelect = document.getElementById('notes-target-type-filter');
  const idSelect = document.getElementById('notes-target-id-filter');
  if (!wrapper || !typeSelect || !idSelect) return;

  if (!currentMovementId) {
    typeSelect.disabled = true;
    idSelect.disabled = true;
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(typeSelect, [], 'All');
    ensureSelectOptions(idSelect, [], 'Any');
    return;
  }

  typeSelect.disabled = false;
  idSelect.disabled = false;

  const ViewModels = ctx?.ViewModels || window.ViewModels;
  if (!ViewModels || typeof ViewModels.buildNotesViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const baseVm = ViewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: null,
    targetIdFilter: null
  });

  const notesAll = baseVm?.notes || [];
  const targetTypes = Array.from(
    new Set(notesAll.map(n => n.targetType).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)));

  ensureSelectOptions(
    typeSelect,
    targetTypes.map(t => ({ value: t, label: t })),
    'All'
  );

  const selectedType = typeSelect.value || '';

  const idsForType = notesAll.filter(n => !selectedType || n.targetType === selectedType);

  const idOptionsMap = new Map();
  idsForType.forEach(n => {
    if (!n.targetId) return;
    if (!idOptionsMap.has(n.targetId)) {
      idOptionsMap.set(n.targetId, n.targetLabel || n.targetId);
    }
  });

  const idOptions = Array.from(idOptionsMap.entries()).map(([value, label]) => ({
    value,
    label
  }));
  idOptions.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  ensureSelectOptions(idSelect, idOptions, 'Any');

  const selectedId = idSelect.value || '';

  const vm = ViewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: selectedType || null,
    targetIdFilter: selectedId || null
  });

  renderNotesTable(wrapper, vm?.notes || [], clear);
}

export function registerNotesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const typeSelect = document.getElementById('notes-target-type-filter');
      const idSelect = document.getElementById('notes-target-id-filter');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'notes') return;
        rerender();
      };

      if (typeSelect) typeSelect.addEventListener('change', rerender);
      if (idSelect) idSelect.addEventListener('change', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { typeSelect, idSelect, rerender, unsubscribe };
    },
    render: renderNotesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.typeSelect) h.typeSelect.removeEventListener('change', h.rerender);
      if (h.idSelect) h.idSelect.removeEventListener('change', h.rerender);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.notes = tab;
  if (ctx?.tabs) {
    ctx.tabs.notes = tab;
  }
  return tab;
}
