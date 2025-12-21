import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div id="notes-table-wrapper"></div>
    <select id="notes-target-type-filter"></select>
    <select id="notes-target-id-filter"></select>
    <form id="notes-editor-form">
      <h3 id="notes-form-title"></h3>
      <select id="note-target-type"></select>
      <input id="note-target-id" list="notes-target-id-options" />
      <datalist id="notes-target-id-options"></datalist>
      <input id="note-author" />
      <textarea id="note-body"></textarea>
      <textarea id="note-context"></textarea>
      <input id="note-tags" />
      <button type="submit">Save</button>
      <button id="note-reset-btn" type="button">Reset</button>
      <button id="note-delete-btn" type="button">Delete</button>
    </form>
  `;
}

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
    entities: [{ id: 'e1', movementId: 'm1', name: 'Entity' }],
    practices: [],
    events: [],
    rules: [],
    claims: [],
    media: [],
    notes: [],
    textCollections: [],
    texts: []
  };
}

function createViewModels() {
  return {
    buildNotesViewModel(data, { movementId, targetTypeFilter, targetIdFilter }) {
      let notes = (data.notes || []).filter(n => n.movementId === movementId);
      if (targetTypeFilter) notes = notes.filter(n => n.targetType === targetTypeFilter);
      if (targetIdFilter) notes = notes.filter(n => n.targetId === targetIdFilter);
      return {
        notes: notes.map(n => ({
          ...n,
          targetLabel: n.targetId
        }))
      };
    }
  };
}

function createCtx({ snapshot, DomainService, StorageService }) {
  const state = { snapshot, currentMovementId: 'm1' };
  return {
    getState: () => state,
    setState: next => Object.assign(state, next),
    subscribe: () => () => {},
    services: {
      DomainService,
      StorageService,
      ViewModels: createViewModels()
    },
    setStatus: vi.fn()
  };
}

async function setup(options = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const { registerNotesTab } = await import('./notes.js');
  const snapshot = options.snapshot || createSnapshot();
  const DomainService =
    options.DomainService ||
    (() => ({
      COLLECTIONS_WITH_MOVEMENT_ID: new Set(['entities', 'notes']),
      addNewItem: vi.fn((snap, coll, movementId) => {
        const item = { id: 'note-new', movementId };
        snap[coll].push(item);
        return item;
      }),
      upsertItem: vi.fn((snap, coll, item) => {
        const idx = snap[coll].findIndex(n => n.id === item.id);
        if (idx >= 0) snap[coll][idx] = item;
        else snap[coll].push(item);
        return item;
      }),
      deleteItem: vi.fn((snap, coll, id) => {
        const before = snap[coll].length;
        snap[coll] = snap[coll].filter(n => n.id !== id);
        return before !== snap[coll].length;
      })
    }))();
  const StorageService =
    options.StorageService ||
    (() => ({ saveSnapshot: vi.fn() }))();
  const ctx = createCtx({ snapshot, DomainService, StorageService });
  const tab = registerNotesTab(ctx);
  tab.mount(ctx);
  tab.render(ctx);
  return { tab, ctx, DomainService, StorageService, snapshot };
}

describe('notes tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disables filters and form when no movement is selected', async () => {
    const snapshot = createSnapshot();
    const state = { snapshot, currentMovementId: null };
    const ctx = {
      getState: () => state,
      setState: next => Object.assign(state, next),
      subscribe: () => () => {},
      services: { ViewModels: createViewModels() },
      setStatus: vi.fn()
    };

    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    const { registerNotesTab } = await import('./notes.js');
    renderDom();
    const tab = registerNotesTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('notes-target-type-filter').disabled).toBe(true);
    expect(document.getElementById('notes-target-id-filter').disabled).toBe(true);
    expect(document.getElementById('note-target-type').disabled).toBe(true);
    expect(document.getElementById('note-target-id').disabled).toBe(true);
    expect(document.getElementById('notes-table-wrapper').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('creates a new note and persists it', async () => {
    const { ctx, DomainService, StorageService, snapshot } = await setup();

    document.getElementById('note-target-type').value = 'Entity';
    document.getElementById('note-target-id').value = 'e1';
    document.getElementById('note-author').value = 'Tester';
    document.getElementById('note-body').value = 'A new note';
    document.getElementById('note-tags').value = 'tag1, tag2';

    document.getElementById('notes-editor-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(DomainService.addNewItem).toHaveBeenCalled();
    expect(DomainService.upsertItem).toHaveBeenCalled();
    expect(StorageService.saveSnapshot).toHaveBeenCalledWith(snapshot);
    const created = snapshot.notes.find(n => n.id === 'note-new');
    expect(created).toMatchObject({
      movementId: 'm1',
      targetType: 'Entity',
      targetId: 'e1',
      author: 'Tester',
      body: 'A new note',
      tags: ['tag1', 'tag2']
    });
  });

  it('edits and deletes an existing note', async () => {
    const snapshot = createSnapshot();
    snapshot.notes.push({
      id: 'n1',
      movementId: 'm1',
      targetType: 'Entity',
      targetId: 'e1',
      author: 'Orig',
      body: 'Original body',
      tags: []
    });

    const { ctx, DomainService, StorageService } = await setup({ snapshot });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const editBtn = document.querySelector('[data-note-id="n1"][data-note-action="edit"]');
    editBtn.click();

    document.getElementById('note-body').value = 'Updated text';
    document.getElementById('notes-editor-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(DomainService.upsertItem).toHaveBeenCalledWith(
      snapshot,
      'notes',
      expect.objectContaining({ id: 'n1', body: 'Updated text' })
    );

    const deleteBtn = document.querySelector('[data-note-id="n1"][data-note-action="delete"]');
    deleteBtn.click();

    expect(DomainService.deleteItem).toHaveBeenCalledWith(snapshot, 'notes', 'n1');
    expect(StorageService.saveSnapshot).toHaveBeenCalled();
    expect(snapshot.notes.find(n => n.id === 'n1')).toBeUndefined();
  });

  it('populates target ID suggestions from the selected target type', async () => {
    const snapshot = createSnapshot();
    snapshot.practices.push({ id: 'p1', movementId: 'm1', name: 'A practice' });

    await setup({ snapshot });

    const typeSelect = document.getElementById('note-target-type');
    typeSelect.value = 'Practice';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const options = Array.from(
      document.querySelectorAll('#notes-target-id-options option')
    ).map(opt => opt.value);

    expect(typeSelect.value).toBe('Practice');
    expect(options).toContain('p1');
  });
});
