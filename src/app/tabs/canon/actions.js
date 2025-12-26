import { normaliseArray } from '../../utils/values.js';

function getState(ctx) {
  return ctx.store.getState() || {};
}

function applyState(ctx, updater) {
  if (typeof ctx?.update === 'function') {
    return ctx.update(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next || prev;
    });
  }
  if (typeof ctx?.setState === 'function') {
    const prev = typeof ctx?.getState === 'function' ? ctx.getState() : {};
    const next = typeof updater === 'function' ? updater(prev) : updater;
    return ctx.setState(next || prev);
  }
  return null;
}

function getDomainService(ctx) {
  return ctx.services.DomainService;
}

async function persistCanonItem(ctx, snapshot, { show = false } = {}) {
  await ctx.persistence.commitSnapshot(snapshot, {
    dirtyScope: 'item',
    save: { show }
  });
}

export async function addTextCollection(ctx) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const currentMovementId = state.currentMovementId;
  if (!currentMovementId) {
    if (typeof window !== 'undefined') {
      window.alert?.('Select a movement first.');
    }
    return null;
  }

  const DomainService = getDomainService(ctx);
  if (!DomainService?.addNewItem) return null;

  try {
    const collection = DomainService.addNewItem(snapshot, 'textCollections', currentMovementId);
    await persistCanonItem(ctx, snapshot, { show: false });
    applyState(ctx, prev => ({
      ...prev,
      currentShelfId: collection?.id || null,
      currentBookId: null,
      currentTextId: null
    }));
    ctx?.setStatus?.('Text collection created');
    return collection;
  } catch (err) {
    if (typeof window !== 'undefined') {
      window.alert?.(err instanceof Error ? err.message : 'Failed to add collection');
    }
    return null;
  }
}

export async function saveTextCollection(ctx) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const shelfId = state.currentShelfId;
  if (!shelfId) return null;

  const DomainService = getDomainService(ctx);
  if (!DomainService?.upsertItem) return null;

  const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return null;

  const editor = document.getElementById('shelf-editor');
  const nameInput = editor?.querySelector('input[type="text"]');
  const descInput = editor?.querySelector('textarea');

  const updated = {
    ...shelf,
    name: nameInput ? nameInput.value : shelf.name,
    description: descInput ? descInput.value : shelf.description
  };

  try {
    DomainService.upsertItem(snapshot, 'textCollections', updated);
    await persistCanonItem(ctx, snapshot, { show: false });
    ctx?.setStatus?.('Shelf saved');
    return updated;
  } catch (err) {
    console.error(err);
    ctx?.setStatus?.('Save failed');
    return null;
  }
}

export async function deleteTextCollection(ctx, shelfId = null) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const targetId = shelfId ?? state.currentShelfId;
  if (!targetId) return false;

  const collection = (snapshot.textCollections || []).find(tc => tc.id === targetId);
  if (!collection) return false;

  const ok =
    typeof window === 'undefined' ||
    window.confirm?.(
      `Delete this text collection?\n\n${collection.name || collection.id}\n\nThis cannot be undone.`
    );
  if (!ok) return false;

  const DomainService = getDomainService(ctx);
  if (!DomainService?.deleteItem) return false;

  try {
    DomainService.deleteItem(snapshot, 'textCollections', targetId);
    applyState(ctx, prev => {
      if (prev.currentShelfId !== targetId) return prev;
      return {
        ...prev,
        currentShelfId: null,
        currentBookId: null,
        currentTextId: null
      };
    });
    await persistCanonItem(ctx, snapshot, { show: true });
    ctx?.setStatus?.('Text collection deleted');
    return true;
  } catch (err) {
    console.error(err);
    ctx?.setStatus?.('Save failed');
    return false;
  }
}

export async function addNewBookToShelf(ctx) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const currentMovementId = state.currentMovementId;
  const currentShelfId = state.currentShelfId;
  if (!currentMovementId) return null;
  if (!currentShelfId) {
    if (typeof window !== 'undefined') {
      window.alert?.('Choose a shelf first.');
    }
    return null;
  }

  const DomainService = getDomainService(ctx);
  if (!DomainService?.addNewItem) return null;

  const shelf = (snapshot.textCollections || []).find(tc => tc.id === currentShelfId);
  if (!shelf) return null;

  const book = DomainService.addNewItem(snapshot, 'texts', currentMovementId);
  book.parentId = null;
  book.title = book.title || 'New book';
  book.label = book.label || '';

  shelf.rootTextIds = normaliseArray(shelf.rootTextIds).concat(book.id);
  DomainService.upsertItem?.(snapshot, 'textCollections', shelf);

  applyState(ctx, prev => ({
    ...prev,
    currentBookId: book.id,
    currentTextId: book.id
  }));
  try {
    await persistCanonItem(ctx, snapshot, { show: false });
    return book;
  } catch (err) {
    console.error(err);
    ctx?.setStatus?.('Save failed');
    return null;
  }
}

export async function addExistingBookToShelf(ctx) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const currentMovementId = state.currentMovementId;
  const currentShelfId = state.currentShelfId;
  if (!currentMovementId || !currentShelfId) return null;

  const DomainService = getDomainService(ctx);
  if (!DomainService?.upsertItem) return null;

  const shelf = (snapshot.textCollections || []).find(tc => tc.id === currentShelfId);
  if (!shelf) return null;

  const roots = (snapshot.texts || []).filter(
    t => t && t.movementId === currentMovementId && !t.parentId
  );
  const existing = new Set(normaliseArray(shelf.rootTextIds));
  const choices = roots.filter(t => !existing.has(t.id));
  if (!choices.length) {
    if (typeof window !== 'undefined') {
      window.alert?.('No other books available to add.');
    }
    return null;
  }

  const selected =
    typeof window === 'undefined'
      ? choices[0]?.id
      : window.prompt?.(
          'Enter the ID of the book to add:\n' + choices.map(c => `${c.id}: ${c.title}`).join('\n')
        );
  if (!selected) return null;
  if (!choices.some(c => c.id === selected)) {
    if (typeof window !== 'undefined') {
      window.alert?.('Book not found');
    }
    return null;
  }

  shelf.rootTextIds = normaliseArray(shelf.rootTextIds).concat(selected);
  DomainService.upsertItem(snapshot, 'textCollections', shelf);
  applyState(ctx, prev => ({
    ...prev,
    currentBookId: selected,
    currentTextId: selected
  }));
  try {
    await persistCanonItem(ctx, snapshot, { show: false });
    ctx?.setStatus?.('Book added to shelf');
    return selected;
  } catch (err) {
    console.error(err);
    ctx?.setStatus?.('Save failed');
    return null;
  }
}
