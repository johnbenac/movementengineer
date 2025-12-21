const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const TARGET_TYPE_CONFIGS = [
  { type: 'Movement', label: 'Movement', collection: 'movements', labelKey: 'name', scoped: false },
  { type: 'Entity', label: 'Entity', collection: 'entities', labelKey: 'name', scoped: true },
  { type: 'Practice', label: 'Practice', collection: 'practices', labelKey: 'name', scoped: true },
  { type: 'Event', label: 'Event', collection: 'events', labelKey: 'name', scoped: true },
  { type: 'Rule', label: 'Rule', collection: 'rules', labelKey: 'shortText', scoped: true },
  { type: 'Claim', label: 'Claim', collection: 'claims', labelKey: 'text', scoped: true },
  { type: 'TextNode', label: 'Text', collection: 'texts', labelKey: 'title', scoped: true },
  { type: 'MediaAsset', label: 'Media asset', collection: 'media', labelKey: 'title', scoped: true }
];

const TARGET_TYPE_MAP = new Map(TARGET_TYPE_CONFIGS.map(config => [config.type, config]));

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

function ensureDatalistOptions(listEl, options = []) {
  if (!listEl) return;
  fallbackClear(listEl);
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.label = option.label || option.value;
    listEl.appendChild(opt);
  });
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getEnsureSelectOptions(ctx) {
  return ctx?.dom?.ensureSelectOptions || fallbackEnsureSelectOptions;
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || ctx?.legacy?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.legacy?.DomainService || window.DomainService;
}

function getStorageService(ctx) {
  return ctx?.services?.StorageService || window.StorageService;
}

function getLegacy(ctx) {
  return ctx?.legacy || movementEngineerGlobal.legacy;
}

function getStatusSetter(ctx) {
  return ctx?.setStatus || getLegacy(ctx)?.setStatus || (() => {});
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function renderNotesTable(wrapper, notes, clear, { selectedId } = {}) {
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
    tr.classList.add('selectable-row');
    if (selectedId && selectedId === n.id) tr.classList.add('selected');

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

function normaliseTagsInput(raw) {
  if (Array.isArray(raw)) {
    return raw.map(t => (t ?? '').toString().trim()).filter(Boolean);
  }
  return (raw || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

function collectTargetsFromNotes(targetType, vmNotes = []) {
  const options = new Map();
  vmNotes
    .filter(n => n.targetId && (!targetType || n.targetType === targetType))
    .forEach(n => {
      if (!options.has(n.targetId)) {
        options.set(n.targetId, n.targetLabel || n.targetId);
      }
    });
  return Array.from(options.entries()).map(([value, label]) => ({ value, label: label || value }));
}

function getTargetsForType(snapshot, movementId, targetType, vmNotes = []) {
  const def = TARGET_TYPE_MAP.get(targetType);
  if (def) {
    const collection = snapshot?.[def.collection] || [];
    const scopedItems = def.scoped
      ? collection.filter(item => item.movementId === movementId)
      : collection.filter(item => item.id === movementId);
    const mapped = scopedItems.map(item => ({
      value: item.id,
      label: item[def.labelKey] || item.name || item.title || item.id
    }));
    if (mapped.length) {
      return mapped.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    }
  }

  return collectTargetsFromNotes(targetType, vmNotes).sort((a, b) =>
    (a.label || '').localeCompare(b.label || '')
  );
}

function buildTargetTypeOptions(vmNotes = []) {
  const baseOptions = TARGET_TYPE_CONFIGS.map(config => ({
    value: config.type,
    label: config.label
  }));

  const extras = Array.from(
    new Set(vmNotes.map(n => n.targetType).filter(Boolean).filter(t => !TARGET_TYPE_MAP.has(t)))
  ).map(type => ({ value: type, label: type }));

  return baseOptions.concat(extras);
}

function buildFilterIdOptions(vmNotes = [], selectedType) {
  const filtered = vmNotes.filter(n => !selectedType || n.targetType === selectedType);
  const idOptionsMap = new Map();
  filtered.forEach(n => {
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
  return idOptions;
}

function getNoteFormElements() {
  return {
    form: document.getElementById('notes-editor-form'),
    idLabel: document.getElementById('notes-form-id'),
    hint: document.getElementById('notes-editor-hint'),
    targetTypeSelect: document.getElementById('notes-form-target-type'),
    targetIdInput: document.getElementById('notes-form-target-id'),
    targetIdDatalist: document.getElementById('notes-target-id-options'),
    authorInput: document.getElementById('notes-form-author'),
    contextInput: document.getElementById('notes-form-context'),
    tagsInput: document.getElementById('notes-form-tags'),
    bodyInput: document.getElementById('notes-form-body'),
    newBtn: document.getElementById('notes-new-btn'),
    saveBtn: document.getElementById('notes-save-btn'),
    resetBtn: document.getElementById('notes-reset-btn'),
    deleteBtn: document.getElementById('notes-delete-btn')
  };
}

function populateNoteForm(ctx, params) {
  const {
    movementId,
    snapshot,
    note,
    noteVm,
    typeOptions = [],
    vmNotes = [],
    selectedType
  } = params;
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const {
    form,
    idLabel,
    hint: hintEl,
    targetTypeSelect,
    targetIdInput,
    targetIdDatalist,
    authorInput,
    contextInput,
    tagsInput,
    bodyInput,
    newBtn,
    saveBtn,
    resetBtn,
    deleteBtn
  } = getNoteFormElements();

  if (!form || !targetTypeSelect || !targetIdInput) return;

  const controls = [
    targetTypeSelect,
    targetIdInput,
    authorInput,
    contextInput,
    tagsInput,
    bodyInput,
    saveBtn,
    resetBtn,
    deleteBtn
  ].filter(Boolean);

  if (!movementId) {
    controls.forEach(el => {
      el.value = '';
      el.disabled = true;
    });
    if (newBtn) newBtn.disabled = true;
    ensureSelectOptions(targetTypeSelect, []);
    ensureDatalistOptions(targetIdDatalist, []);
    if (idLabel) idLabel.textContent = 'New note';
    if (hintEl) {
      hintEl.textContent = 'Select a movement to create or edit notes.';
    }
    return;
  }

  controls.forEach(el => {
    el.disabled = false;
  });
  if (newBtn) newBtn.disabled = false;

  ensureSelectOptions(targetTypeSelect, typeOptions, 'Select type');
  const targetType =
    selectedType || note?.targetType || targetTypeSelect.value || typeOptions[0]?.value || '';
  if (targetType && targetTypeSelect.value !== targetType) {
    targetTypeSelect.value = targetType;
  }

  const targetOptions = getTargetsForType(snapshot, movementId, targetType, vmNotes);
  ensureDatalistOptions(targetIdDatalist, targetOptions);

  if (note) {
    targetIdInput.value = note.targetId || '';
    authorInput.value = note.author || '';
    contextInput.value = note.context || '';
    tagsInput.value = normaliseTagsInput(note.tags).join(', ');
    bodyInput.value = note.body || '';
  } else {
    if (!targetIdInput.value) targetIdInput.value = '';
    authorInput.value = '';
    contextInput.value = '';
    tagsInput.value = '';
    bodyInput.value = '';
  }

  if (idLabel) {
    idLabel.textContent = note?.id || 'New note';
  }
  if (hintEl) {
    hintEl.textContent = note
      ? `Editing note ${note.id} ${
          noteVm?.targetLabel ? `for ${noteVm.targetLabel}` : ''
        }`.trim()
      : 'Create a new note or select one from the table.';
  }

  if (deleteBtn) deleteBtn.disabled = !note;
}

function readNoteFormValues() {
  const {
    targetTypeSelect,
    targetIdInput,
    authorInput,
    contextInput,
    tagsInput,
    bodyInput
  } = getNoteFormElements();
  return {
    targetType: targetTypeSelect?.value?.trim() || '',
    targetId: targetIdInput?.value?.trim() || '',
    author: authorInput?.value?.trim() || '',
    context: contextInput?.value?.trim() || '',
    tags: normaliseTagsInput(tagsInput?.value || ''),
    body: bodyInput?.value?.trim() || ''
  };
}

function ensureTabState(tab) {
  if (!tab.__state) {
    tab.__state = { selectedNoteId: null };
  }
  return tab.__state;
}

function handleSaveNote(ctx, tabState) {
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const movementId = state.currentMovementId;
  const ds = getDomainService(ctx);
  const storage = getStorageService(ctx);
  const legacy = getLegacy(ctx);
  const setStatus = getStatusSetter(ctx);

  if (!snapshot || !ds || !storage) {
    setStatus('Notes service unavailable.');
    return;
  }
  if (!movementId) {
    setStatus('Select a movement first.');
    return;
  }

  const values = readNoteFormValues();
  if (!values.targetType) {
    setStatus('Choose a target type.');
    return;
  }
  if (!values.targetId) {
    setStatus('Choose a target.');
    return;
  }
  if (!values.body) {
    setStatus('Note body is required.');
    return;
  }

  const existing =
    tabState.selectedNoteId && Array.isArray(snapshot.notes)
      ? snapshot.notes.find(n => n.id === tabState.selectedNoteId)
      : null;

  const base = existing ? { ...existing } : ds.createSkeletonItem('notes', movementId);
  const updated = {
    ...base,
    movementId,
    targetType: values.targetType,
    targetId: values.targetId,
    author: values.author || null,
    body: values.body,
    context: values.context || null,
    tags: values.tags
  };

  ds.upsertItem(snapshot, 'notes', updated);
  if (legacy?.update) {
    legacy.update(prev => ({ ...prev, snapshot }));
  }
  if (legacy?.saveSnapshot) {
    legacy.saveSnapshot({ show: false, clearItemDirty: true });
  } else {
    storage.saveSnapshot(snapshot);
  }
  tabState.selectedNoteId = updated.id;
  setStatus('Note saved');
}

function handleDeleteNote(ctx, tabState) {
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const ds = getDomainService(ctx);
  const storage = getStorageService(ctx);
  const legacy = getLegacy(ctx);
  const setStatus = getStatusSetter(ctx);
  const noteId = tabState.selectedNoteId;

  if (!snapshot || !ds || !storage || !noteId) return;
  const note = (snapshot.notes || []).find(n => n.id === noteId);
  if (!note) return;

  const ok = window.confirm(`Delete this note?\n\n${note.body || note.id}`);
  if (!ok) return;

  ds.deleteItem(snapshot, 'notes', noteId);
  tabState.selectedNoteId = null;
  if (legacy?.update) {
    legacy.update(prev => ({ ...prev, snapshot }));
  }
  if (legacy?.saveSnapshot) {
    legacy.saveSnapshot({ show: false });
  } else {
    storage.saveSnapshot(snapshot);
  }
  setStatus('Note deleted');
}

function updateTargetIdOptions(ctx) {
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const movementId = state.currentMovementId;
  const { targetTypeSelect, targetIdDatalist } = getNoteFormElements();
  if (!snapshot || !movementId || !targetTypeSelect || !targetIdDatalist) return;

  const ViewModels = getViewModels(ctx);
  const vmNotes =
    ViewModels && typeof ViewModels.buildNotesViewModel === 'function'
      ? ViewModels.buildNotesViewModel(snapshot, {
          movementId,
          targetTypeFilter: null,
          targetIdFilter: null
        })?.notes || []
      : [];

  const targetOptions = getTargetsForType(snapshot, movementId, targetTypeSelect.value, vmNotes);
  ensureDatalistOptions(targetIdDatalist, targetOptions);
}

function renderNotesTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;
  const tab = movementEngineerGlobal.tabs.notes;
  const tabState = ensureTabState(tab);

  const wrapper = document.getElementById('notes-table-wrapper');
  const typeSelect = document.getElementById('notes-target-type-filter');
  const idSelect = document.getElementById('notes-target-id-filter');
  const tableHint = document.getElementById('notes-table-hint');
  if (!wrapper || !typeSelect || !idSelect) return;

  const ViewModels = getViewModels(ctx);
  if (!currentMovementId) {
    typeSelect.disabled = true;
    idSelect.disabled = true;
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(typeSelect, [], 'All');
    ensureSelectOptions(idSelect, [], 'Any');
    populateNoteForm(ctx, { movementId: null, snapshot });
    if (tableHint) tableHint.textContent = 'Select a movement to view notes.';
    return;
  }

  typeSelect.disabled = false;
  idSelect.disabled = false;

  if (!ViewModels || typeof ViewModels.buildNotesViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    populateNoteForm(ctx, { movementId: currentMovementId, snapshot, typeOptions: [] });
    return;
  }

  const baseVm = ViewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: null,
    targetIdFilter: null
  });

  const vmNotesAll = baseVm?.notes || [];
  const typeOptions = buildTargetTypeOptions(vmNotesAll);
  ensureSelectOptions(
    typeSelect,
    typeOptions.map(o => ({ value: o.value, label: o.label })),
    'All'
  );

  const selectedType = typeSelect.value || '';
  const idOptions = buildFilterIdOptions(vmNotesAll, selectedType);
  ensureSelectOptions(idSelect, idOptions, 'Any');

  const selectedId = idSelect.value || '';

  const vm = ViewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: selectedType || null,
    targetIdFilter: selectedId || null
  });

  const movementNotes = (snapshot?.notes || []).filter(n => n.movementId === currentMovementId);
  if (tabState.selectedNoteId) {
    const exists = movementNotes.find(n => n.id === tabState.selectedNoteId);
    if (!exists) tabState.selectedNoteId = null;
  }

  renderNotesTable(wrapper, vm?.notes || [], clear, { selectedId: tabState.selectedNoteId });

  const selectedNote =
    tabState.selectedNoteId && movementNotes.length
      ? movementNotes.find(n => n.id === tabState.selectedNoteId)
      : null;
  const selectedNoteVm =
    tabState.selectedNoteId && vmNotesAll.length
      ? vmNotesAll.find(n => n.id === tabState.selectedNoteId)
      : null;

  if (tableHint) {
    tableHint.textContent = tabState.selectedNoteId
      ? `Editing note ${tabState.selectedNoteId}`
      : 'Click a note row to load it into the editor.';
  }

  populateNoteForm(ctx, {
    movementId: currentMovementId,
    snapshot,
    note: selectedNote || null,
    noteVm: selectedNoteVm || null,
    typeOptions,
    vmNotes: vmNotesAll
  });
}

export function registerNotesTab(ctx) {
  const tab = {
    __handlers: null,
    __state: { selectedNoteId: null },
    mount(context) {
      const typeSelect = document.getElementById('notes-target-type-filter');
      const idSelect = document.getElementById('notes-target-id-filter');
      const tableWrapper = document.getElementById('notes-table-wrapper');
      const form = document.getElementById('notes-editor-form');
      const newBtn = document.getElementById('notes-new-btn');
      const deleteBtn = document.getElementById('notes-delete-btn');
      const resetBtn = document.getElementById('notes-reset-btn');
      const formTypeSelect = document.getElementById('notes-form-target-type');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'notes') return;
        rerender();
      };

      const handleTableClick = event => {
        const row = event.target.closest('tr[data-note-id]');
        if (!row) return;
        const noteId = row.dataset.noteId;
        tab.__state.selectedNoteId = noteId;
        rerender();
      };

      const handleFormSubmit = event => {
        event.preventDefault();
        handleSaveNote(context, tab.__state);
        rerender();
      };

      const handleNewNote = () => {
        tab.__state.selectedNoteId = null;
        rerender();
      };

      const handleDelete = () => {
        handleDeleteNote(context, tab.__state);
        rerender();
      };

      const handleReset = () => rerender();

      const handleTargetTypeChange = () => updateTargetIdOptions(context);

      if (typeSelect) typeSelect.addEventListener('change', rerender);
      if (idSelect) idSelect.addEventListener('change', rerender);
      if (tableWrapper) tableWrapper.addEventListener('click', handleTableClick);
      if (form) form.addEventListener('submit', handleFormSubmit);
      if (newBtn) newBtn.addEventListener('click', handleNewNote);
      if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
      if (resetBtn) resetBtn.addEventListener('click', handleReset);
      if (formTypeSelect) formTypeSelect.addEventListener('change', handleTargetTypeChange);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        typeSelect,
        idSelect,
        tableWrapper,
        form,
        newBtn,
        deleteBtn,
        resetBtn,
        formTypeSelect,
        rerender,
        handleTableClick,
        handleFormSubmit,
        handleNewNote,
        handleDelete,
        handleReset,
        handleTargetTypeChange,
        unsubscribe
      };
    },
    render: renderNotesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.typeSelect) h.typeSelect.removeEventListener('change', h.rerender);
      if (h.idSelect) h.idSelect.removeEventListener('change', h.rerender);
      if (h.tableWrapper) h.tableWrapper.removeEventListener('click', h.handleTableClick);
      if (h.form) h.form.removeEventListener('submit', h.handleFormSubmit);
      if (h.newBtn) h.newBtn.removeEventListener('click', h.handleNewNote);
      if (h.deleteBtn) h.deleteBtn.removeEventListener('click', h.handleDelete);
      if (h.resetBtn) h.resetBtn.removeEventListener('click', h.handleReset);
      if (h.formTypeSelect) {
        h.formTypeSelect.removeEventListener('change', h.handleTargetTypeChange);
      }
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
