import { normaliseArray } from '../../utils/values.js';

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function applyState(ctx, updater) {
  if (typeof ctx?.update === 'function') {
    return ctx.update(updater);
  }
  if (typeof ctx?.store?.update === 'function') {
    return ctx.store.update(updater);
  }
  if (typeof ctx?.setState === 'function') {
    const prev = typeof ctx?.getState === 'function' ? ctx.getState() : {};
    const next = typeof updater === 'function' ? updater(prev) : updater;
    return ctx.setState(next || prev);
  }
  return null;
}

export function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

export function persistCanonItem(ctx, { show = false } = {}) {
  if (ctx?.store?.markDirty) ctx.store.markDirty('item');
  if (ctx?.store?.saveSnapshot) {
    ctx.store.saveSnapshot({ show, clearItemDirty: true, clearMovementDirty: false });
  }
}

function getActiveShelf(ctx, state) {
  const snapshot = state?.snapshot || {};
  const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
  const shelfId = state?.currentShelfId || null;
  return shelves.find(tc => tc?.id === shelfId) || null;
}

export function addTextCollection(ctx) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const movementId = state.currentMovementId;
  if (!DomainService || !movementId) {
    window.alert?.('Select a movement first.');
    return;
  }
  try {
    const collection = DomainService.addNewItem(snapshot, 'textCollections', movementId);
    applyState(ctx, prev => ({
      ...prev,
      currentShelfId: collection.id,
      currentBookId: null,
      currentTextId: null
    }));
    persistCanonItem(ctx, { show: false });
    ctx?.setStatus?.('Text collection created');
  } catch (err) {
    window.alert?.(err?.message || 'Failed to create collection');
  }
}

export function saveTextCollection(ctx) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  if (!DomainService) return;
  const snapshot = state.snapshot || {};
  const shelf = getActiveShelf(ctx, state);
  if (!shelf) return;

  const shelfEditor = document.getElementById('shelf-editor');
  const nameInput = shelfEditor?.querySelector('input[type="text"]');
  const descInput = shelfEditor?.querySelector('textarea');

  const updated = {
    ...shelf,
    name: nameInput ? nameInput.value : shelf.name,
    description: descInput ? descInput.value : shelf.description
  };

  DomainService.upsertItem(snapshot, 'textCollections', updated);
  persistCanonItem(ctx, { show: false });
  ctx?.setStatus?.('Shelf saved');
}

export function deleteTextCollection(ctx, shelfId = null) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  if (!DomainService) return;
  const snapshot = state.snapshot || {};
  const shelves = Array.isArray(snapshot.textCollections) ? snapshot.textCollections : [];
  const target = shelfId
    ? shelves.find(tc => tc.id === shelfId)
    : shelves.find(tc => tc.id === state.currentShelfId);
  if (!target) return;
  const ok = window.confirm?.(
    `Delete this text collection?\n\n${target.name || target.id}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  DomainService.deleteItem(snapshot, 'textCollections', target.id);
  applyState(ctx, prev => {
    if (prev.currentShelfId !== target.id) return prev;
    return { ...prev, currentShelfId: null, currentBookId: null, currentTextId: null };
  });
  persistCanonItem(ctx, { show: false });
  ctx?.setStatus?.('Text collection deleted');
}

export function addNewBookToShelf(ctx) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const movementId = state.currentMovementId;
  const shelf = getActiveShelf(ctx, state);
  if (!DomainService || !movementId) return;
  if (!shelf) {
    window.alert?.('Choose a shelf first.');
    return;
  }
  const book = DomainService.addNewItem(snapshot, 'texts', movementId);
  book.parentId = null;
  book.title = 'New book';
  book.label = book.label || '';

  const roots = normaliseArray(shelf.rootTextIds);
  roots.push(book.id);
  shelf.rootTextIds = roots;

  applyState(ctx, prev => ({
    ...prev,
    currentBookId: book.id,
    currentTextId: book.id
  }));
  persistCanonItem(ctx, { show: false });
  ctx?.setStatus?.('Book created');
}

export function addExistingBookToShelf(ctx) {
  const DomainService = getDomainService(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const movementId = state.currentMovementId;
  const shelf = getActiveShelf(ctx, state);
  if (!DomainService || !movementId || !shelf) return;

  const roots = (snapshot.texts || []).filter(
    t => t?.movementId === movementId && !t?.parentId
  );
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

  shelf.rootTextIds = [...existing, selected];
  applyState(ctx, prev => ({
    ...prev,
    currentBookId: selected,
    currentTextId: selected
  }));
  persistCanonItem(ctx, { show: false });
  ctx?.setStatus?.('Book added to shelf');
}
