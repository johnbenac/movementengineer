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

function createHint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function getDomUtils(ctx) {
  return {
    clearElement: ctx?.dom?.clearElement || fallbackClearElement,
    ensureSelectOptions: ctx?.dom?.ensureSelectOptions || fallbackEnsureSelectOptions
  };
}

function renderNotesTable(wrapper, notes, { clearElement }) {
  clearElement(wrapper);

  if (!notes || notes.length === 0) {
    wrapper.appendChild(createHint('No notes match this filter.'));
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

    const tdContext = document.createElement('td');
    tdContext.textContent = note.context || '';
    tr.appendChild(tdContext);

    const tdTags = document.createElement('td');
    tdTags.textContent = (note.tags || []).join(', ');
    tr.appendChild(tdTags);

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
}

export function registerNotesTab(ctx) {
  const dom = getDomUtils(ctx);

  const tab = {
    __handlers: null,
    mount(context) {
      const typeSelect = document.getElementById('notes-target-type-filter');
      const idSelect = document.getElementById('notes-target-id-filter');
      const rerender = () => tab.render(context);

      if (typeSelect) typeSelect.addEventListener('change', rerender);
      if (idSelect) idSelect.addEventListener('change', rerender);

      this.__handlers = { typeSelect, idSelect, rerender };
    },
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
    },
    render(context) {
      const state =
        (context?.legacy?.getState && context.legacy.getState()) || context?.getState?.() || {};
      const snapshot = state.snapshot;
      const currentMovementId = state.currentMovementId;

      const wrapper = document.getElementById('notes-table-wrapper');
      const typeSelect = document.getElementById('notes-target-type-filter');
      const idSelect = document.getElementById('notes-target-id-filter');

      if (!wrapper || !typeSelect || !idSelect) return;

      if (!currentMovementId) {
        typeSelect.disabled = true;
        idSelect.disabled = true;
        dom.clearElement(wrapper);
        wrapper.appendChild(
          createHint('Create or select a movement on the left to explore this section.')
        );
        dom.ensureSelectOptions(typeSelect, [], 'All');
        dom.ensureSelectOptions(idSelect, [], 'Any');
        return;
      }

      typeSelect.disabled = false;
      idSelect.disabled = false;

      const ViewModels = context.ViewModels || window.ViewModels;
      if (!ViewModels || typeof ViewModels.buildNotesViewModel !== 'function') {
        dom.clearElement(wrapper);
        wrapper.appendChild(createHint('ViewModels module not loaded.'));
        return;
      }

      const baseVm = ViewModels.buildNotesViewModel(snapshot, {
        movementId: currentMovementId,
        targetTypeFilter: null,
        targetIdFilter: null
      });

      const notes = baseVm?.notes || [];
      const targetTypes = Array.from(
        new Set(notes.map(note => note.targetType).filter(Boolean))
      ).sort((a, b) => String(a).localeCompare(String(b)));

      dom.ensureSelectOptions(
        typeSelect,
        targetTypes.map(value => ({ value, label: value })),
        'All'
      );

      const selectedType = typeSelect.value || '';
      const notesForType = notes.filter(
        note => !selectedType || note.targetType === selectedType
      );

      const idOptionsMap = new Map();
      notesForType.forEach(note => {
        if (!note.targetId) return;
        if (!idOptionsMap.has(note.targetId)) {
          idOptionsMap.set(note.targetId, note.targetLabel || note.targetId);
        }
      });

      const idOptions = Array.from(idOptionsMap.entries()).map(([value, label]) => ({
        value,
        label
      }));
      idOptions.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

      dom.ensureSelectOptions(idSelect, idOptions, 'Any');

      const selectedId = idSelect.value || '';

      const vm = ViewModels.buildNotesViewModel(snapshot, {
        movementId: currentMovementId,
        targetTypeFilter: selectedType || null,
        targetIdFilter: selectedId || null
      });

      renderNotesTable(wrapper, vm?.notes || [], dom);
    }
  };

  movementEngineerGlobal.tabs.notes = tab;
  if (ctx?.tabs) {
    ctx.tabs.notes = tab;
  }
  return tab;
}
