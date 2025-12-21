const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const TARGET_TYPE_COLLECTIONS = {
  Movement: 'movements',
  TextNode: 'texts',
  Entity: 'entities',
  Practice: 'practices',
  Event: 'events',
  Rule: 'rules',
  Claim: 'claims',
  MediaAsset: 'media'
};

let selectedNoteId = null;
let lastMovementId = null;

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

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || window.DomainService;
}

function getLegacy(ctx) {
  return ctx?.legacy || movementEngineerGlobal.legacy || {};
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function parseTags(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getTargetTypeOptions(snapshot, movementId) {
  const options = [];
  Object.entries(TARGET_TYPE_COLLECTIONS).forEach(([type, collName]) => {
    const coll = snapshot?.[collName];
    if (!Array.isArray(coll)) return;
    const items = coll.filter(item =>
      collName === 'movements' ? item.id === movementId : item.movementId === movementId
    );
    if (!items.length) return;
    options.push({ value: type, label: type });
  });
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function getTargetsForType(snapshot, movementId, targetType) {
  const collName = TARGET_TYPE_COLLECTIONS[targetType];
  if (!collName) return [];
  const coll = snapshot?.[collName];
  if (!Array.isArray(coll)) return [];

  const scoped = coll.filter(item =>
    collName === 'movements' ? item.id === movementId : item.movementId === movementId
  );

  return scoped
    .map(item => ({
      value: item.id,
      label: item.name || item.title || item.shortText || item.label || item.id
    }))
    .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
}

function renderNotesTable(wrapper, notes, clear, { onSelect, selectedId }) {
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
    tr.dataset.noteId = n.id;
    if (n.id === selectedId) tr.classList.add('selected');
    tr.addEventListener('click', () => {
      if (typeof onSelect === 'function') onSelect(n.id);
    });

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

function populateNoteForm({
  controls,
  note,
  snapshot,
  movementId,
  ensureSelectOptions,
  typeOptions
}) {
  const {
    targetType,
    targetId,
    author,
    context,
    tags,
    body,
    deleteBtn
  } = controls;

  ensureSelectOptions(targetType, typeOptions, typeOptions.length ? 'Select type' : '—');

  const selectedType = note?.targetType || targetType.value || typeOptions[0]?.value || '';
  if (selectedType) targetType.value = selectedType;

  const targetOptions = selectedType
    ? getTargetsForType(snapshot, movementId, selectedType)
    : [];
  ensureSelectOptions(targetId, targetOptions, targetOptions.length ? 'Select target' : '—');
  if (note?.targetId && targetOptions.some(opt => opt.value === note.targetId)) {
    targetId.value = note.targetId;
  }

  author.value = note?.author || '';
  context.value = note?.context || '';
  tags.value = (note?.tags || []).join(', ');
  body.value = note?.body || '';

  const disabled = !movementId;
  [targetType, targetId, author, context, tags, body].forEach(el => {
    if (el) el.disabled = disabled;
  });
  if (deleteBtn) deleteBtn.disabled = !note || disabled;
}

function getControls() {
  return {
    wrapper: document.getElementById('notes-table-wrapper'),
    filterType: document.getElementById('notes-target-type-filter'),
    filterId: document.getElementById('notes-target-id-filter'),
    form: document.getElementById('notes-editor-form'),
    targetType: document.getElementById('notes-form-target-type'),
    targetId: document.getElementById('notes-form-target-id'),
    author: document.getElementById('notes-form-author'),
    context: document.getElementById('notes-form-context'),
    tags: document.getElementById('notes-form-tags'),
    body: document.getElementById('notes-form-body'),
    saveBtn: document.getElementById('notes-save-btn'),
    newBtn: document.getElementById('notes-new-btn'),
    deleteBtn: document.getElementById('notes-delete-btn')
  };
}

function renderNotesTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;
  const ViewModels = getViewModels(ctx);
  const controls = getControls();
  const legacy = getLegacy(ctx);

  if (!controls.wrapper || !controls.filterType || !controls.filterId) return;

  if (currentMovementId !== lastMovementId) {
    selectedNoteId = null;
    lastMovementId = currentMovementId || null;
  }

  if (!currentMovementId) {
    controls.filterType.disabled = true;
    controls.filterId.disabled = true;
    clear(controls.wrapper);
    controls.wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(controls.filterType, [], 'All');
    ensureSelectOptions(controls.filterId, [], 'Any');
    populateNoteForm({
      controls,
      note: null,
      snapshot,
      movementId: null,
      ensureSelectOptions,
      typeOptions: []
    });
    return;
  }

  controls.filterType.disabled = false;
  controls.filterId.disabled = false;

  if (!ViewModels || typeof ViewModels.buildNotesViewModel !== 'function') {
    clear(controls.wrapper);
    controls.wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const baseVm = ViewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: null,
    targetIdFilter: null
  });

  const notesAll = baseVm?.notes || [];
  const targetTypesFromNotes = Array.from(
    new Set(notesAll.map(n => n.targetType).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)));

  ensureSelectOptions(
    controls.filterType,
    targetTypesFromNotes.map(t => ({ value: t, label: t })),
    'All'
  );

  const selectedType = controls.filterType.value || '';

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

  ensureSelectOptions(controls.filterId, idOptions, 'Any');

  const selectedId = controls.filterId.value || '';

  const vm = ViewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: selectedType || null,
    targetIdFilter: selectedId || null
  });

  const noteFromSnapshot = Array.isArray(snapshot?.notes)
    ? snapshot.notes.find(n => n.id === selectedNoteId && n.movementId === currentMovementId)
    : null;
  const typeOptions = getTargetTypeOptions(snapshot, currentMovementId);

  populateNoteForm({
    controls,
    note: noteFromSnapshot || null,
    snapshot,
    movementId: currentMovementId,
    ensureSelectOptions,
    typeOptions
  });

  renderNotesTable(controls.wrapper, vm?.notes || [], clear, {
    selectedId: selectedNoteId,
    onSelect(noteId) {
      selectedNoteId = noteId;
      tab.render(ctx);
    }
  });

  if (!legacy.hasInitialized?.()) {
    legacy.init?.();
  }
}

function collectFormData(controls, movementId, defaultTargetType) {
  const targetType = controls.targetType?.value || defaultTargetType || '';
  const targetId = controls.targetId?.value || '';
  const body = (controls.body?.value || '').trim();

  if (!movementId || !targetType || !targetId || !body) {
    return null;
  }

  return {
    id: selectedNoteId,
    movementId,
    targetType,
    targetId,
    author: (controls.author?.value || '').trim() || null,
    context: (controls.context?.value || '').trim() || null,
    tags: parseTags(controls.tags?.value),
    body
  };
}

export function registerNotesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const controls = getControls();
      const rerender = () => tab.render(context);

      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'notes') return;
        rerender();
      };

      const handleSubmit = evt => {
        evt.preventDefault();
        const state = getState(context);
        const snapshot = state.snapshot;
        const movementId = state.currentMovementId;
        const DomainService = getDomainService(context);
        const legacy = getLegacy(context);
        const typeOptions = getTargetTypeOptions(snapshot, movementId);
        const data = collectFormData(controls, movementId, typeOptions[0]?.value);
        if (!data) {
          context?.setStatus?.('Fill in target, body, and movement before saving.');
          return;
        }
        if (!data.id) {
          data.id = DomainService?.generateId?.('note-') || `note-${Date.now()}`;
        }
        try {
          DomainService?.upsertItem?.(snapshot, 'notes', data);
          selectedNoteId = data.id;
          legacy.setState?.({ snapshot, flags: { snapshotDirty: true } });
          context?.setStatus?.('Note saved');
          rerender();
        } catch (err) {
          console.error(err);
          context?.setStatus?.('Failed to save note');
        }
      };

      const handleNew = () => {
        selectedNoteId = null;
        rerender();
      };

      const handleDelete = () => {
        if (!selectedNoteId) return;
        const state = getState(context);
        const snapshot = state.snapshot;
        const DomainService = getDomainService(context);
        const legacy = getLegacy(context);
        const confirmed = window.confirm('Delete this note? This cannot be undone.');
        if (!confirmed) return;
        try {
          DomainService?.deleteItem?.(snapshot, 'notes', selectedNoteId);
          selectedNoteId = null;
          legacy.setState?.({ snapshot, flags: { snapshotDirty: true } });
          context?.setStatus?.('Note deleted');
          rerender();
        } catch (err) {
          console.error(err);
          context?.setStatus?.('Failed to delete note');
        }
      };

      const handleTypeChange = () => {
        const state = getState(context);
        const snapshot = state.snapshot;
        const movementId = state.currentMovementId;
        const ensureSelectOptions = getEnsureSelectOptions(context);
        const typeOptions = getTargetTypeOptions(snapshot, movementId);
        populateNoteForm({
          controls,
          note: null,
          snapshot,
          movementId,
          ensureSelectOptions,
          typeOptions
        });
      };

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      controls.filterType?.addEventListener('change', rerender);
      controls.filterId?.addEventListener('change', rerender);
      controls.form?.addEventListener('submit', handleSubmit);
      controls.newBtn?.addEventListener('click', handleNew);
      controls.deleteBtn?.addEventListener('click', handleDelete);
      controls.targetType?.addEventListener('change', handleTypeChange);

      this.__handlers = {
        rerender,
        unsubscribe,
        controls,
        handleSubmit,
        handleNew,
        handleDelete,
        handleTypeChange
      };
    },
    render: renderNotesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      const c = h.controls || {};
      c.filterType?.removeEventListener('change', h.rerender);
      c.filterId?.removeEventListener('change', h.rerender);
      c.form?.removeEventListener('submit', h.handleSubmit);
      c.newBtn?.removeEventListener('click', h.handleNew);
      c.deleteBtn?.removeEventListener('click', h.handleDelete);
      c.targetType?.removeEventListener('change', h.handleTypeChange);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
      selectedNoteId = null;
    }
  };

  movementEngineerGlobal.tabs.notes = tab;
  if (ctx?.tabs) {
    ctx.tabs.notes = tab;
  }
  return tab;
}
