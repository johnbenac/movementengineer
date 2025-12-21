import { normaliseArray } from '../../utils/values.js';

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function updateState(ctx, updater) {
  if (typeof ctx?.update === 'function') return ctx.update(updater);
  if (typeof ctx?.setState === 'function') {
    const prev = typeof ctx?.getState === 'function' ? ctx.getState() : {};
    const next = typeof updater === 'function' ? updater(prev) : updater;
    return ctx.setState(next || prev);
  }
  return null;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

function getStore(ctx) {
  return ctx?.store || null;
}

export function persistCanonItem(ctx, { show = false } = {}) {
  const store = getStore(ctx);
  store?.markDirty?.('item');
  store?.saveSnapshot?.({ show, clearItemDirty: true, clearMovementDirty: false });
}

export function addTextCollection(ctx) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  if (!DomainService || !state.currentMovementId) {
    if (!state.currentMovementId) window.alert?.('Select a movement first.');
    return null;
  }

  let collection = null;
  updateState(ctx, prev => {
    const snapshot = prev.snapshot || {};
    collection = DomainService.addNewItem(snapshot, 'textCollections', prev.currentMovementId);
    return {
      ...prev,
      snapshot,
      currentShelfId: collection.id,
      currentBookId: null,
      currentTextId: null
    };
  });
  persistCanonItem(ctx);
  ctx.setStatus?.('Text collection created');
  return collection;
}

export function saveTextCollection(ctx) {
  const DomainService = getDomainService(ctx);
  if (!DomainService) return null;

  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const shelfId = state.currentShelfId;
  if (!shelfId) return null;

  const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return null;

  const nameInput = document.querySelector('#shelf-editor input[type="text"]');
  const descInput = document.querySelector('#shelf-editor textarea');
  const updated = {
    ...shelf,
    name: nameInput?.value?.trim() || shelf.name,
    description: descInput?.value ?? shelf.description
  };

  updateState(ctx, prev => {
    const snap = prev.snapshot || {};
    DomainService.upsertItem(snap, 'textCollections', updated);
    return { ...prev, snapshot: snap };
  });
  persistCanonItem(ctx);
  ctx.setStatus?.('Shelf saved');
  return updated;
}

export function deleteTextCollection(ctx, shelfId = null) {
  const DomainService = getDomainService(ctx);
  if (!DomainService) return;

  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const targetId = shelfId || state.currentShelfId;
  if (!targetId) return;

  const collection = (snapshot.textCollections || []).find(tc => tc.id === targetId);
  if (!collection) return;
  const ok = window.confirm(
    `Delete this text collection?\n\n${collection.name || collection.id}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  updateState(ctx, prev => {
    const snap = prev.snapshot || {};
    DomainService.deleteItem(snap, 'textCollections', targetId);
    const next = { ...prev, snapshot: snap };
    if (prev.currentShelfId === targetId) {
      next.currentShelfId = null;
      next.currentBookId = null;
      next.currentTextId = null;
    }
    return next;
  });
  persistCanonItem(ctx, { show: true });
  ctx.setStatus?.('Text collection deleted');
}

export function addNewBookToShelf(ctx) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  if (!DomainService || !state.currentMovementId) return null;
  if (!state.currentShelfId) {
    window.alert?.('Choose a shelf first.');
    return null;
  }

  let created = null;
  updateState(ctx, prev => {
    const snapshot = prev.snapshot || {};
    const shelf = (snapshot.textCollections || []).find(tc => tc.id === prev.currentShelfId);
    if (!shelf) return prev;
    created = DomainService.addNewItem(snapshot, 'texts', prev.currentMovementId);
    created.parentId = null;
    created.title = 'New book';
    created.label = created.label || '';
    const roots = normaliseArray(shelf.rootTextIds);
    roots.push(created.id);
    shelf.rootTextIds = roots;
    return { ...prev, snapshot, currentBookId: created.id, currentTextId: created.id };
  });
  if (created) {
    persistCanonItem(ctx);
    ctx.setStatus?.('Text created');
  }
  return created;
}

export function addExistingBookToShelf(ctx) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  if (!DomainService || !state.currentMovementId || !state.currentShelfId) return;

  const snapshot = state.snapshot || {};
  const roots = (snapshot.texts || []).filter(
    t => t?.movementId === state.currentMovementId && !t.parentId
  );
  const shelf = (snapshot.textCollections || []).find(tc => tc.id === state.currentShelfId);
  if (!shelf) return;
  const existing = new Set(normaliseArray(shelf.rootTextIds));
  const choices = roots.filter(t => !existing.has(t.id));
  if (!choices.length) {
    window.alert?.('No other books available to add.');
    return;
  }

  const selected = window.prompt(
    'Enter the ID of the book to add:\n' + choices.map(c => `${c.id}: ${c.title}`).join('\n')
  );
  if (!selected) return;
  if (!choices.some(c => c.id === selected)) {
    window.alert?.('Book not found');
    return;
  }

  updateState(ctx, prev => {
    const snap = prev.snapshot || {};
    const targetShelf = (snap.textCollections || []).find(tc => tc.id === prev.currentShelfId);
    if (!targetShelf) return prev;
    const rootsNext = normaliseArray(targetShelf.rootTextIds);
    rootsNext.push(selected);
    targetShelf.rootTextIds = rootsNext;
    return { ...prev, snapshot: snap };
  });
  persistCanonItem(ctx);
  ctx.setStatus?.('Book added to shelf');
}

