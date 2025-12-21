import { normaliseArray } from '../../utils/values.js';

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function updateState(ctx, updater) {
  if (typeof ctx?.update === 'function') return ctx.update(updater);
  if (typeof ctx?.store?.update === 'function') return ctx.store.update(updater);
  return null;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

function persistCanonItem(ctx, { show = false } = {}) {
  ctx?.store?.markDirty?.('item');
  ctx?.store?.saveSnapshot?.({
    show,
    clearItemDirty: true,
    clearMovementDirty: false
  });
}

export function addTextCollection(ctx) {
  const state = getState(ctx);
  if (!state.currentMovementId) {
    window.alert?.('Select a movement first.');
    return;
  }

  const DomainService = getDomainService(ctx);
  if (!DomainService?.addNewItem) return;

  const snapshot = state.snapshot || {};
  const collection = DomainService.addNewItem(snapshot, 'textCollections', state.currentMovementId);

  updateState(ctx, prev => ({
    ...prev,
    snapshot,
    currentShelfId: collection.id,
    currentBookId: null,
    currentTextId: null
  }));

  persistCanonItem(ctx, { show: false });
  ctx?.setStatus?.('Text collection created');
}

export function saveTextCollection(ctx) {
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const shelfId = state.currentShelfId;
  if (!shelfId) return;

  const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return;

  const editor = document.getElementById('shelf-editor');
  const nameInput = editor?.querySelector('input[type="text"]');
  const descInput = editor?.querySelector('textarea');

  const DomainService = getDomainService(ctx);
  if (!DomainService?.upsertItem) return;

  DomainService.upsertItem(snapshot, 'textCollections', {
    ...shelf,
    name: nameInput ? nameInput.value : shelf.name,
    description: descInput ? descInput.value : shelf.description
  });

  updateState(ctx, prev => ({ ...prev, snapshot }));
  persistCanonItem(ctx, { show: false });
  ctx?.setStatus?.('Shelf saved');
}

export function deleteTextCollection(ctx, shelfId = null) {
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const targetId = shelfId ?? state.currentShelfId;
  if (!targetId) return;

  const collection = (snapshot.textCollections || []).find(tc => tc.id === targetId);
  if (!collection) return;

  const ok = window.confirm?.(
    `Delete this text collection?\n\n${collection.name || collection.id}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  const DomainService = getDomainService(ctx);
  if (!DomainService?.deleteItem) return;
  DomainService.deleteItem(snapshot, 'textCollections', targetId);

  updateState(ctx, prev => ({
    ...prev,
    snapshot,
    currentShelfId: prev.currentShelfId === targetId ? null : prev.currentShelfId,
    currentBookId: prev.currentShelfId === targetId ? null : prev.currentBookId,
    currentTextId: prev.currentShelfId === targetId ? null : prev.currentTextId
  }));

  persistCanonItem(ctx, { show: true });
}

export function addNewBookToShelf(ctx) {
  const state = getState(ctx);
  if (!state.currentMovementId) return;
  if (!state.currentShelfId) {
    window.alert?.('Choose a shelf first.');
    return;
  }

  const DomainService = getDomainService(ctx);
  if (!DomainService?.addNewItem) return;

  const snapshot = state.snapshot || {};
  const book = DomainService.addNewItem(snapshot, 'texts', state.currentMovementId);
  book.parentId = null;
  book.title = 'New book';
  book.label = book.label || '';

  const shelf = (snapshot.textCollections || []).find(tc => tc.id === state.currentShelfId);
  if (shelf) {
    shelf.rootTextIds = normaliseArray(shelf.rootTextIds);
    shelf.rootTextIds.push(book.id);
  }

  updateState(ctx, prev => ({
    ...prev,
    snapshot,
    currentBookId: book.id,
    currentTextId: book.id
  }));

  persistCanonItem(ctx, { show: false });
}

export function addExistingBookToShelf(ctx) {
  const state = getState(ctx);
  if (!state.currentMovementId || !state.currentShelfId) return;

  const snapshot = state.snapshot || {};
  const roots = (snapshot.texts || []).filter(
    t => t.movementId === state.currentMovementId && !t.parentId
  );
  const shelf = (snapshot.textCollections || []).find(tc => tc.id === state.currentShelfId);
  if (!shelf) return;

  const existing = new Set(normaliseArray(shelf.rootTextIds));
  const choices = roots.filter(t => !existing.has(t.id));
  if (!choices.length) {
    window.alert?.('No other books available to add.');
    return;
  }

  const selected = window.prompt?.(
    'Enter the ID of the book to add:\n' + choices.map(c => `${c.id}: ${c.title}`).join('\n')
  );
  if (!selected) return;
  if (!choices.some(c => c.id === selected)) {
    window.alert?.('Book not found');
    return;
  }

  shelf.rootTextIds = normaliseArray(shelf.rootTextIds);
  shelf.rootTextIds.push(selected);

  updateState(ctx, prev => ({
    ...prev,
    snapshot,
    currentBookId: selected,
    currentTextId: selected
  }));

  persistCanonItem(ctx, { show: false });
}
