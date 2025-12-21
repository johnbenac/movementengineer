const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getServices(ctx) {
  const services = ctx?.services || {};
  return {
    DomainService: services.DomainService || window.DomainService,
    StorageService: services.StorageService || window.StorageService,
    ViewModels: services.ViewModels || ctx?.ViewModels || window.ViewModels
  };
}

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

const targetTypeLabels = [
  'Movement',
  'TextNode',
  'Entity',
  'Practice',
  'Event',
  'Rule',
  'Claim',
  'MediaAsset'
];

const moduleState = {
  selectedNoteId: null,
  isCreating: false,
  lastMovementId: null
};

function renderNotesTable(wrapper, notes, clear, selectedId) {
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
    if (n.id === selectedId) {
      tr.classList.add('selected');
    }

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

function getTargetOptions(snapshot, targetType, movementId) {
  const collectionsByType = {
    Movement: snapshot.movements || [],
    TextNode: (snapshot.texts || []).filter(t => t.movementId === movementId),
    Entity: (snapshot.entities || []).filter(e => e.movementId === movementId),
    Practice: (snapshot.practices || []).filter(p => p.movementId === movementId),
    Event: (snapshot.events || []).filter(e => e.movementId === movementId),
    Rule: (snapshot.rules || []).filter(r => r.movementId === movementId),
    Claim: (snapshot.claims || []).filter(c => c.movementId === movementId),
    MediaAsset: (snapshot.media || []).filter(m => m.movementId === movementId)
  };

  const items = collectionsByType[targetType] || [];
  return items
    .map(item => {
      const label = item.name || item.title || item.shortText || item.id;
      return { value: item.id, label };
    })
    .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
}

function parseTags(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getSelectedNote(notes) {
  if (!notes || notes.length === 0) return null;
  const found = notes.find(n => n.id === moduleState.selectedNoteId);
  return found || notes[0] || null;
}

function populateEditor(ctx, opts) {
  const {
    snapshot,
    movementId,
    targetTypes,
    notesForMovement,
    targetTypeSelect,
    targetIdInput,
    targetIdOptions,
    authorInput,
    contextInput,
    bodyInput,
    tagsInput,
    titleEl,
    deleteBtn,
    saveBtn,
    cancelBtn
  } = opts;

  const selected = moduleState.isCreating ? null : getSelectedNote(notesForMovement);
  const note = moduleState.isCreating
    ? {
        targetType: targetTypes[0] || '',
        targetId: '',
        author: '',
        context: '',
        body: '',
        tags: []
      }
    : selected;

  const isDisabled = !movementId;
  [targetTypeSelect, targetIdInput, authorInput, contextInput, bodyInput, tagsInput, saveBtn, cancelBtn].forEach(
    el => {
      if (el) el.disabled = isDisabled;
    }
  );
  if (deleteBtn) deleteBtn.disabled = isDisabled || !selected;

  if (!note) {
    targetTypeSelect.value = targetTypes[0] || '';
    targetIdInput.value = '';
    authorInput.value = '';
    contextInput.value = '';
    bodyInput.value = '';
    tagsInput.value = '';
    titleEl.textContent = 'Add note';
    const defaultOptions = getTargetOptions(
      snapshot,
      targetTypes[0] || '',
      movementId
    );
    targetIdOptions.innerHTML = '';
    defaultOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.label = opt.label;
      targetIdOptions.appendChild(option);
    });
    return;
  }

  const tt = note.targetType || targetTypes[0] || '';
  targetTypeSelect.value = tt;
  authorInput.value = note.author || '';
  contextInput.value = note.context || '';
  bodyInput.value = note.body || '';
  tagsInput.value = (note.tags || []).join(', ');
  targetIdInput.value = note.targetId || '';

  const options = getTargetOptions(snapshot, tt, movementId);
  targetIdOptions.innerHTML = '';
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.label = opt.label;
    targetIdOptions.appendChild(option);
  });

  titleEl.textContent = moduleState.isCreating ? 'Add note' : 'Edit note';
}

function saveNote(ctx) {
  const state = getState(ctx);
  const { snapshot, currentMovementId } = state;
  const { DomainService } = getServices(ctx);
  if (!snapshot || !currentMovementId || !DomainService) return;

  const targetTypeSelect = document.getElementById('notes-editor-target-type');
  const targetIdInput = document.getElementById('notes-editor-target-id');
  const authorInput = document.getElementById('notes-editor-author');
  const contextInput = document.getElementById('notes-editor-context');
  const bodyInput = document.getElementById('notes-editor-body');
  const tagsInput = document.getElementById('notes-editor-tags');

  if (!targetTypeSelect || !targetIdInput || !bodyInput) return;

  const targetType = (targetTypeSelect.value || '').trim();
  const targetId = (targetIdInput.value || '').trim();
  const body = (bodyInput.value || '').trim();
  if (!targetType) {
    alert('Target type is required.');
    return;
  }
  if (!targetId) {
    alert('Target ID is required.');
    return;
  }
  if (!body) {
    alert('Body is required.');
    return;
  }

  const tags = parseTags(tagsInput ? tagsInput.value : '');
  const author = authorInput ? authorInput.value.trim() : '';
  const context = contextInput ? contextInput.value.trim() : '';

  const noteId = moduleState.isCreating
    ? DomainService.generateId('note-')
    : moduleState.selectedNoteId;
  if (!noteId) {
    alert('Could not determine note ID.');
    return;
  }

  const note = {
    id: noteId,
    movementId: currentMovementId,
    targetType,
    targetId,
    author: author || null,
    body,
    context: context || null,
    tags
  };

  try {
    DomainService.upsertItem(snapshot, 'notes', note);
    moduleState.selectedNoteId = note.id;
    moduleState.isCreating = false;
    ctx?.legacy?.markDirty?.('item');
    ctx?.legacy?.saveSnapshot?.({ show: false, clearItemDirty: true });
    ctx?.legacy?.setStatus?.('Note saved');
    ctx?.legacy?.notify?.();
  } catch (e) {
    alert(e.message || 'Failed to save note');
  }
}

function deleteNote(ctx) {
  const state = getState(ctx);
  const { snapshot } = state;
  const { DomainService } = getServices(ctx);
  if (!snapshot || !DomainService || !moduleState.selectedNoteId) return;

  const existing = (snapshot.notes || []).find(n => n.id === moduleState.selectedNoteId);
  if (!existing) return;
  const ok = window.confirm('Delete this note? This cannot be undone.');
  if (!ok) return;

  try {
    DomainService.deleteItem(snapshot, 'notes', moduleState.selectedNoteId);
    moduleState.selectedNoteId = null;
    moduleState.isCreating = false;
    ctx?.legacy?.markDirty?.('item');
    ctx?.legacy?.saveSnapshot?.({ show: false, clearItemDirty: true });
    ctx?.legacy?.setStatus?.('Note deleted');
    ctx?.legacy?.notify?.();
  } catch (e) {
    alert(e.message || 'Failed to delete note');
  }
}

function renderNotesTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('notes-table-wrapper');
  const typeSelect = document.getElementById('notes-target-type-filter');
  const idSelect = document.getElementById('notes-target-id-filter');
  const editor = {
    targetTypeSelect: document.getElementById('notes-editor-target-type'),
    targetIdInput: document.getElementById('notes-editor-target-id'),
    targetIdOptions: document.getElementById('notes-target-id-options'),
    authorInput: document.getElementById('notes-editor-author'),
    contextInput: document.getElementById('notes-editor-context'),
    bodyInput: document.getElementById('notes-editor-body'),
    tagsInput: document.getElementById('notes-editor-tags'),
    titleEl: document.getElementById('notes-editor-title'),
    deleteBtn: document.getElementById('notes-delete-btn'),
    saveBtn: document.getElementById('notes-save-btn'),
    cancelBtn: document.getElementById('notes-cancel-btn')
  };
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
    ensureSelectOptions(editor.targetTypeSelect, targetTypeLabels.map(t => ({ value: t, label: t })));
    populateEditor(ctx, {
      snapshot,
      movementId: currentMovementId,
      targetTypes: targetTypeLabels,
      notesForMovement: [],
      ...editor
    });
    return;
  }

  typeSelect.disabled = false;
  idSelect.disabled = false;

  const { ViewModels } = getServices(ctx);
  if (!ViewModels || typeof ViewModels.buildNotesViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    ensureSelectOptions(editor.targetTypeSelect, targetTypeLabels.map(t => ({ value: t, label: t })));
    populateEditor(ctx, {
      snapshot,
      movementId: currentMovementId,
      targetTypes: targetTypeLabels,
      notesForMovement: [],
      ...editor
    });
    return;
  }

  const baseVm = ViewModels.buildNotesViewModel(snapshot, {
    movementId: currentMovementId,
    targetTypeFilter: null,
    targetIdFilter: null
  });

  const notesAll = baseVm?.notes || [];
  const targetTypes = Array.from(
    new Set([...notesAll.map(n => n.targetType).filter(Boolean), ...targetTypeLabels])
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

  const notesForMovement = vm?.notes || [];

  if (moduleState.lastMovementId !== currentMovementId) {
    moduleState.lastMovementId = currentMovementId;
    moduleState.selectedNoteId = null;
    moduleState.isCreating = false;
  }

  if (notesForMovement.length === 0) {
    moduleState.selectedNoteId = null;
    moduleState.isCreating = true;
  }

  if (!moduleState.isCreating) {
    const existingSelected = notesForMovement.find(n => n.id === moduleState.selectedNoteId);
    if (!existingSelected && notesForMovement.length > 0) {
      moduleState.selectedNoteId = notesForMovement[0].id;
    }
  }

  renderNotesTable(wrapper, notesForMovement, clear, moduleState.selectedNoteId);

  ensureSelectOptions(
    editor.targetTypeSelect,
    targetTypes.map(t => ({ value: t, label: t })),
    null
  );

  populateEditor(ctx, {
    snapshot,
    movementId: currentMovementId,
    targetTypes,
    notesForMovement,
    ...editor
  });
}

export function registerNotesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const typeSelect = document.getElementById('notes-target-type-filter');
      const idSelect = document.getElementById('notes-target-id-filter');
      const tableWrapper = document.getElementById('notes-table-wrapper');
      const targetTypeSelect = document.getElementById('notes-editor-target-type');
      const targetIdInput = document.getElementById('notes-editor-target-id');
      const targetIdOptions = document.getElementById('notes-target-id-options');
      const newBtn = document.getElementById('notes-new-btn');
      const saveBtn = document.getElementById('notes-save-btn');
      const deleteBtn = document.getElementById('notes-delete-btn');
      const cancelBtn = document.getElementById('notes-cancel-btn');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'notes') return;
        rerender();
      };

      if (typeSelect) typeSelect.addEventListener('change', rerender);
      if (idSelect) idSelect.addEventListener('change', rerender);
      const handleTargetTypeChange = () => {
        const state = getState(context);
        const tt = targetTypeSelect.value || '';
        const options = getTargetOptions(state.snapshot || {}, tt, state.currentMovementId);
        if (targetIdOptions) {
          targetIdOptions.innerHTML = '';
          options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.label = opt.label;
            targetIdOptions.appendChild(option);
          });
        }
      };

      const handleTableClick = e => {
        const tr = e.target && e.target.closest('tr[data-note-id]');
        if (!tr) return;
        moduleState.selectedNoteId = tr.dataset.noteId;
        moduleState.isCreating = false;
        rerender();
      };

      const handleNew = () => {
        moduleState.selectedNoteId = null;
        moduleState.isCreating = true;
        rerender();
      };

      const handleCancel = () => {
        moduleState.isCreating = false;
        rerender();
      };

      const handleSave = () => saveNote(context);
      const handleDelete = () => deleteNote(context);

      if (targetTypeSelect && targetIdOptions) {
        targetTypeSelect.addEventListener('change', handleTargetTypeChange);
      }

      if (tableWrapper) {
        tableWrapper.addEventListener('click', handleTableClick);
      }

      if (newBtn) {
        newBtn.addEventListener('click', handleNew);
      }

      if (saveBtn) saveBtn.addEventListener('click', handleSave);
      if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
      if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        typeSelect,
        idSelect,
        targetTypeSelect,
        targetIdInput,
        newBtn,
        saveBtn,
        deleteBtn,
        cancelBtn,
        rerender,
        unsubscribe,
        tableWrapper,
        handleTargetTypeChange,
        handleTableClick,
        handleNew,
        handleCancel,
        handleSave,
        handleDelete
      };
    },
    render: renderNotesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.typeSelect) h.typeSelect.removeEventListener('change', h.rerender);
      if (h.idSelect) h.idSelect.removeEventListener('change', h.rerender);
      if (h.targetTypeSelect && h.handleTargetTypeChange) {
        h.targetTypeSelect.removeEventListener('change', h.handleTargetTypeChange);
      }
      if (h.tableWrapper && h.handleTableClick) {
        h.tableWrapper.removeEventListener('click', h.handleTableClick);
      }
      if (h.newBtn && h.handleNew) h.newBtn.removeEventListener('click', h.handleNew);
      if (h.saveBtn && h.handleSave) h.saveBtn.removeEventListener('click', h.handleSave);
      if (h.deleteBtn && h.handleDelete) h.deleteBtn.removeEventListener('click', h.handleDelete);
      if (h.cancelBtn && h.handleCancel) h.cancelBtn.removeEventListener('click', h.handleCancel);
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
