import {
  HINT_TEXT,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../ui/hints.js';
import { renderTable } from '../ui/table.js';
import { createTab } from './tabKit.js';

const DEFAULT_TARGET_TYPES = [
  'Movement',
  'TextNode',
  'Entity',
  'Practice',
  'Event',
  'Rule',
  'Claim',
  'MediaAsset'
];

const FALLBACK_COLLECTION_BY_TYPE = {
  Movement: 'movements',
  TextNode: 'texts',
  Entity: 'entities',
  Practice: 'practices',
  Event: 'events',
  Rule: 'rules',
  Claim: 'claims',
  MediaAsset: 'media',
  Note: 'notes'
};

let selectedNoteId = null;
let lastMovementId = null;

function idsMatch(a, b) {
  if (a == null || b == null) return false;
  const cleaner = globalThis?.CleanId?.cleanId;
  if (typeof cleaner === 'function') {
    return cleaner(a) === cleaner(b);
  }
  return String(a) === String(b);
}

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getServices(ctx) {
  return ctx.services;
}

function getViewModels(ctx) {
  const services = getServices(ctx);
  return services.ViewModels;
}

function getModelRegistry() {
  return globalThis?.ModelRegistry || null;
}

function parseCsvInput(raw) {
  return (raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function labelForTargetType(type) {
  return type || 'Unknown';
}

function buildTargetTypeOptions(snapshot) {
  const modelRegistry = getModelRegistry();
  const model = modelRegistry?.getModel
    ? modelRegistry.getModel(snapshot?.specVersion || modelRegistry.DEFAULT_SPEC_VERSION || '2.3')
    : null;
  const types = [];

  if (model?.collections) {
    Object.values(model.collections).forEach(collectionDef => {
      const typeName = collectionDef?.typeName || collectionDef?.collectionName;
      if (typeName) types.push(typeName);
    });
  }
  if (Array.isArray(snapshot?.notes)) {
    snapshot.notes.forEach(n => {
      if (n?.targetType) types.push(n.targetType);
    });
  }
  if (!types.length) {
    types.push(...DEFAULT_TARGET_TYPES);
  }
  const seen = new Set();
  const options = [];
  types.forEach(type => {
    if (!type || seen.has(type)) return;
    seen.add(type);
    options.push({ value: type, label: labelForTargetType(type) });
  });
  return options;
}

function buildTargetIdOptions(nodeIndex, movementId, targetType, modelRegistry, snapshot) {
  const resolvedCollection =
    (modelRegistry?.resolveCollectionName
      ? modelRegistry.resolveCollectionName(targetType, snapshot?.specVersion)
      : null) || FALLBACK_COLLECTION_BY_TYPE[targetType] || null;
  const nodes = Array.isArray(nodeIndex?.all) ? nodeIndex.all : null;
  if (nodes) {
    return nodes
      .filter(node => {
        if (movementId && node.movementId && node.movementId !== movementId) return false;
        if (resolvedCollection && node.collectionName !== resolvedCollection) return false;
        return true;
      })
      .map(node => ({
        value: node.id,
        label: `${node.title || node.id} (${node.collectionName})`
      }));
  }

  if (!resolvedCollection) return [];
  const items = Array.isArray(snapshot?.[resolvedCollection])
    ? snapshot[resolvedCollection]
    : [];
  return items
    .filter(item => {
      if (!item?.id) return false;
      if (resolvedCollection === 'movements') return item.id === movementId;
      if (movementId && item.movementId) return item.movementId === movementId;
      return true;
    })
    .map(item => ({
      value: item.id,
      label: item.name || item.title || item.shortText || item.id
    }));
}

function resolveTargetTypeFromSnapshot(snapshot, targetId, modelRegistry) {
  if (!snapshot || !targetId) return null;
  const model = modelRegistry?.getModel
    ? modelRegistry.getModel(snapshot?.specVersion || modelRegistry.DEFAULT_SPEC_VERSION || '2.3')
    : null;
  const collectionNames = model?.collections
    ? Object.keys(model.collections)
    : Object.keys(snapshot || {});

  for (const collectionName of collectionNames) {
    const items = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
    if (items.some(item => idsMatch(item?.id, targetId))) {
      const def = model?.collections?.[collectionName];
      return def?.typeName || def?.collectionName || collectionName;
    }
  }
  return null;
}

function populateTargetIdOptions(dom, datalistEl, options) {
  if (!datalistEl) return;
  dom.clearElement(datalistEl);
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label || opt.value;
    datalistEl.appendChild(el);
  });
}

function getFormDom() {
  const form = document.getElementById('notes-editor-form');
  if (!form) return null;
  return {
    form,
    formTitle: document.getElementById('notes-form-title'),
    targetType: document.getElementById('note-target-type'),
    targetId: document.getElementById('note-target-id'),
    targetIdDatalist: document.getElementById('notes-target-id-options'),
    author: document.getElementById('note-author'),
    body: document.getElementById('note-body'),
    context: document.getElementById('note-context'),
    tags: document.getElementById('note-tags'),
    deleteBtn: document.getElementById('note-delete-btn'),
    resetBtn: document.getElementById('note-reset-btn'),
    submitBtn: form.querySelector('button[type="submit"]')
  };
}

function setNoteFormEnabled(dom, enabled, canDelete) {
  if (!dom) return;
  const inputs = [
    dom.targetType,
    dom.targetId,
    dom.author,
    dom.body,
    dom.context,
    dom.tags,
    dom.submitBtn,
    dom.resetBtn
  ];
  inputs.forEach(el => {
    if (el) el.disabled = !enabled;
  });
  if (dom.deleteBtn) dom.deleteBtn.disabled = !enabled || !canDelete;
}

function clearNoteForm(dom) {
  if (!dom) return;
  if (dom.form) dom.form.reset();
  if (dom.targetId) dom.targetId.value = '';
  if (dom.tags) dom.tags.value = '';
}

function handleSaveNote(ctx, rerender) {
  const dom = getFormDom();
  const { DomainService } = getServices(ctx);
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const currentMovementId = state.currentMovementId;
  const nodeIndex = state.nodeIndex;
  const modelRegistry = getModelRegistry();
  if (!dom || !snapshot) return;
  if (!currentMovementId) {
    ctx?.setStatus?.('Select a movement before adding notes.');
    return;
  }

  if (typeof dom.form?.reportValidity === 'function' && !dom.form.reportValidity()) {
    return;
  }

  const noteData = {
    targetType: dom.targetType?.value || '',
    targetId: (dom.targetId?.value || '').trim(),
    author: (dom.author?.value || '').trim() || null,
    body: (dom.body?.value || '').trim(),
    context: (dom.context?.value || '').trim() || null,
    tags: parseCsvInput(dom.tags?.value)
  };

  if (!noteData.targetId || !noteData.body) {
    ctx?.setStatus?.('Target ID and body are required.');
    return;
  }
  if (!noteData.targetType) {
    const resolved = nodeIndex?.get?.(noteData.targetId) || null;
    noteData.targetType =
      resolved?.typeName ||
      resolved?.collectionName ||
      resolveTargetTypeFromSnapshot(snapshot, noteData.targetId, modelRegistry);
  } else if (modelRegistry?.resolveCollectionName) {
    const resolvedCollection = modelRegistry.resolveCollectionName(
      noteData.targetType,
      snapshot?.specVersion
    );
    if (!resolvedCollection) {
      noteData.targetType = noteData.targetType.trim();
    }
  }

  if (!DomainService?.upsertItem) {
    ctx?.setStatus?.('Domain service unavailable.');
    return;
  }

  const existing =
    Array.isArray(snapshot.notes) && selectedNoteId
      ? snapshot.notes.find(
          n => idsMatch(n.id, selectedNoteId) && n.movementId === currentMovementId
        )
      : null;

  let note = existing
    ? { ...existing, ...noteData, movementId: currentMovementId }
    : null;

  try {
    if (note) {
      DomainService?.upsertItem(snapshot, 'notes', note);
    } else {
      if (!DomainService?.addNewItem) throw new Error('Domain service unavailable');
      note = DomainService.addNewItem(snapshot, 'notes', currentMovementId);
      Object.assign(note, noteData);
      DomainService.upsertItem(snapshot, 'notes', note);
    }
  } catch (err) {
    console.error(err);
    ctx?.setStatus?.('Failed to save note');
    return;
  }

  selectedNoteId = note.id;
  ctx.persistence.commitSnapshot(snapshot, {
    dirtyScope: 'item',
    save: { show: false }
  });
  ctx?.setStatus?.('Note saved');
  if (typeof rerender === 'function') {
    rerender({ immediate: true, force: true });
  } else {
    renderNotesTab(ctx);
  }
}

function handleDeleteNote(ctx, noteId, rerender) {
  const { DomainService } = getServices(ctx);
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  if (!snapshot || !Array.isArray(snapshot.notes)) return;

  const note = snapshot.notes.find(n => idsMatch(n.id, noteId));
  if (!note) return;

  const preview = note.body || note.id;
  const ok = window.confirm(`Delete this note?\n\n${preview}\n\nThis cannot be undone.`);
  if (!ok) return;

  let deleted = false;
  if (DomainService?.deleteItem) {
    deleted = DomainService.deleteItem(snapshot, 'notes', noteId);
  } else {
    const before = snapshot.notes.length;
    snapshot.notes = snapshot.notes.filter(n => n.id !== noteId);
    deleted = before !== snapshot.notes.length;
  }

  if (!deleted) return;

  if (idsMatch(selectedNoteId, noteId)) selectedNoteId = null;
  ctx.persistence.commitSnapshot(snapshot, {
    dirtyScope: 'item',
    save: { show: false }
  });
  ctx?.setStatus?.('Note deleted');
  if (typeof rerender === 'function') {
    rerender({ immediate: true, force: true });
  } else {
    renderNotesTab(ctx);
  }
}

function renderNotesTab(ctx) {
  const tab = this;
  const dom = ctx.dom;
  const { clearElement: clear, ensureSelectOptions } = dom;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;
  const nodeIndex = state.nodeIndex;
  const modelRegistry = getModelRegistry();

  const wrapper = document.getElementById('notes-table-wrapper');
  const typeSelect = document.getElementById('notes-target-type-filter');
  const idSelect = document.getElementById('notes-target-id-filter');
  const formDom = getFormDom();
  if (!wrapper || !typeSelect || !idSelect || !formDom) return;
  const controls = [typeSelect, idSelect];

  if (lastMovementId !== currentMovementId) {
    selectedNoteId = null;
    lastMovementId = currentMovementId || null;
  }

  clear(wrapper);
  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [wrapper],
      controls,
      dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  ) {
    setNoteFormEnabled(formDom, false, false);
    clearNoteForm(formDom);
    if (formDom.formTitle) formDom.formTitle.textContent = 'Create note';
    if (formDom.targetIdDatalist) dom.clearElement(formDom.targetIdDatalist);
    ensureSelectOptions(typeSelect, [], 'All');
    ensureSelectOptions(idSelect, [], 'Any');
    return;
  }

  setDisabled(controls, false);
  setNoteFormEnabled(formDom, true, Boolean(selectedNoteId));

  const ViewModels = getViewModels(ctx);
  if (
    guardMissingViewModels({
      ok: ViewModels && typeof ViewModels.buildNotesViewModel === 'function',
      wrappers: [wrapper],
      controls,
      dom
    })
  ) {
    setNoteFormEnabled(formDom, false, false);
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

  renderTable(wrapper, {
    clear,
    rows: vm?.notes || [],
    getRowId: n => n.id,
    selectedId: selectedNoteId,
    rowIdDataKey: 'noteId',
    renderEmpty: w => renderHint(w, 'No notes match this filter.'),
    onRowSelect: id => {
      selectedNoteId = id;
      tab?.render?.call(tab, ctx);
    },
    columns: [
      { header: 'Target type', render: n => n.targetType || '' },
      { header: 'Target', render: n => n.targetLabel || n.targetId || '' },
      { header: 'Author', render: n => n.author || '' },
      { header: 'Body', render: n => n.body || '' },
      { header: 'Context', render: n => n.context || '' },
      { header: 'Tags', render: n => (n.tags || []).join(', ') },
      {
        header: 'Actions',
        render: n => {
          const wrap = document.createElement('div');
          wrap.className = 'note-actions';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'danger';
          btn.textContent = 'Delete';
          btn.dataset.noteAction = 'delete';
          btn.dataset.noteId = n.id;
          wrap.appendChild(btn);
          return wrap;
        }
      }
    ]
  });

  const notesForMovement = Array.isArray(snapshot?.notes)
    ? snapshot.notes.filter(note => note.movementId === currentMovementId)
    : [];
  const selectedNote =
    selectedNoteId && notesForMovement
      ? notesForMovement.find(n => idsMatch(n.id, selectedNoteId))
      : null;
  if (selectedNoteId && !selectedNote) {
    selectedNoteId = null;
  }

  const targetTypeOptions = buildTargetTypeOptions(snapshot);
  ensureSelectOptions(formDom.targetType, targetTypeOptions);

  const currentFormTargetType = formDom.targetType?.value || '';
  const desiredTargetType =
    selectedNote?.targetType ||
    currentFormTargetType ||
    typeSelect.value ||
    targetTypeOptions[0]?.value ||
    '';
  if (desiredTargetType && !targetTypeOptions.some(option => option.value === desiredTargetType)) {
    targetTypeOptions.push({
      value: desiredTargetType,
      label: labelForTargetType(desiredTargetType)
    });
    ensureSelectOptions(formDom.targetType, targetTypeOptions);
  }
  if (formDom.targetType) formDom.targetType.value = desiredTargetType;

  const targetIdOptions = buildTargetIdOptions(
    nodeIndex,
    currentMovementId,
    desiredTargetType,
    modelRegistry,
    snapshot
  );
  populateTargetIdOptions(dom, formDom.targetIdDatalist, targetIdOptions);

  formDom.targetId.value =
    selectedNote?.targetId || selectedId || formDom.targetId.value || '';
  formDom.author.value = selectedNote?.author || '';
  formDom.body.value = selectedNote?.body || '';
  formDom.context.value = selectedNote?.context || '';
  formDom.tags.value = (selectedNote?.tags || []).join(', ');

  if (formDom.formTitle) {
    formDom.formTitle.textContent = selectedNote ? 'Edit note' : 'Create note';
  }
  setNoteFormEnabled(formDom, true, Boolean(selectedNote));
}

export function registerNotesTab(ctx) {
  return createTab(ctx, {
    name: 'notes',
    render: renderNotesTab,
    setup: ({ bucket, rerender, ctx: context }) => {
      const typeSelect = document.getElementById('notes-target-type-filter');
      const idSelect = document.getElementById('notes-target-id-filter');
      const tableWrapper = document.getElementById('notes-table-wrapper');
      const formDom = getFormDom();

      if (typeSelect) bucket.on(typeSelect, 'change', () => rerender({ immediate: true }));
      if (idSelect) bucket.on(idSelect, 'change', () => rerender({ immediate: true }));

      if (formDom?.form) {
        bucket.on(formDom.form, 'submit', event => {
          event.preventDefault();
          handleSaveNote(context, rerender);
        });
      }

      if (formDom?.resetBtn) {
        bucket.on(formDom.resetBtn, 'click', () => {
          selectedNoteId = null;
          rerender({ immediate: true });
        });
      }

      if (formDom?.deleteBtn) {
        bucket.on(formDom.deleteBtn, 'click', () => {
          if (selectedNoteId) {
            handleDeleteNote(context, selectedNoteId, rerender);
          }
        });
      }

      if (formDom?.targetType) {
        bucket.on(formDom.targetType, 'change', () => rerender({ immediate: true }));
      }

      if (tableWrapper) {
        bucket.on(tableWrapper, 'click', event => {
          const actionBtn = event.target?.closest?.('[data-note-action]');
          if (!actionBtn) return;
          const { noteAction, noteId } = actionBtn.dataset || {};
          if (noteAction === 'delete' && noteId) {
            event.stopPropagation?.();
            handleDeleteNote(context, noteId, rerender);
          }
        });
      }
    },
    reset: () => {
      selectedNoteId = null;
      lastMovementId = null;
    }
  });
}
