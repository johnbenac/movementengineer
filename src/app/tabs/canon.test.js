import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <input id="library-search" />
    <ul id="library-search-results"></ul>
    <div id="shelf-list"></div>
    <div id="unshelved-list"></div>
    <div id="book-list"></div>
    <div id="toc-tree"></div>
    <div id="shelf-editor"></div>
    <div id="text-editor"></div>
    <div id="library-breadcrumb"></div>
    <button id="btn-add-text-collection"></button>
    <button id="btn-save-text-collection"></button>
    <button id="btn-delete-text-collection"></button>
    <button id="btn-add-root-text"></button>
    <button id="btn-add-existing-book"></button>
  `;
}

function createVm() {
  return {
    shelves: [{ id: 'tc1', name: 'Shelf', bookCount: 1, textCount: 2, bookIds: ['b1'] }],
    shelvesById: { tc1: { id: 'tc1', name: 'Shelf', bookIds: ['b1'] } },
    shelvesByBookId: { b1: ['tc1'] },
    unshelvedBookIds: [],
    booksById: { b1: { id: 'b1', shelves: ['tc1'], descendantCount: 1, contentCount: 0 } },
    nodesById: {
      b1: { id: 'b1', title: 'Book', label: '', depth: 0, hasContent: false, childIds: ['t1'] },
      t1: { id: 't1', title: 'Chapter', label: '1', depth: 1, hasContent: true, childIds: [] }
    },
    tocRootId: 'b1',
    tocChildrenByParentId: new Map([['b1', ['t1']]]),
    bookIdByNodeId: { b1: 'b1', t1: 'b1' },
    searchResults: []
  };
}

function createCtx(snapshotOverrides = {}, stateOverrides = {}) {
  const snapshot = {
    movements: [{ id: 'm1', name: 'One' }],
    textCollections: [{ id: 'tc1', movementId: 'm1', name: 'Shelf', rootTextIds: ['b1'] }],
    texts: [
      { id: 'b1', movementId: 'm1', title: 'Book', parentId: null },
      { id: 't1', movementId: 'm1', title: 'Chapter', parentId: 'b1' }
    ],
    entities: [],
    ...snapshotOverrides
  };

  const DomainService = {
    addNewItem: vi.fn((snap, collection, movementId) => ({
      id: 'new',
      movementId,
      parentId: null
    })),
    upsertItem: vi.fn(),
    deleteItem: vi.fn()
  };
  const ViewModels = {
    buildLibraryEditorViewModel: vi.fn(() => createVm())
  };

  const setState = vi.fn();
  const saveSnapshot = vi.fn();

  return {
    getState: () => ({
      snapshot,
      currentMovementId: 'm1',
      currentShelfId: 'tc1',
      currentBookId: 'b1',
      currentTextId: 'b1',
      ...stateOverrides
    }),
    legacy: { setState, saveSnapshot },
    services: { DomainService, ViewModels },
    actions: {},
    dom: { clearElement: el => el && (el.innerHTML = '') }
  };
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('shows hints when no movement is selected', async () => {
    renderDom();
    const ctx = createCtx({}, { currentMovementId: null });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('shelf-list').textContent).toMatch(/Create or select a movement/);
    expect(document.getElementById('text-editor').textContent).toMatch(/Select a movement/);
  });

  it('renders shelf and book panes for an active movement', async () => {
    renderDom();
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);

    expect(document.querySelectorAll('.shelf-card')).toHaveLength(1);
    expect(document.querySelectorAll('.book-card')).toHaveLength(1);
    expect(document.querySelectorAll('#toc-tree .toc-node')).not.toHaveLength(0);
  });

  it('updates state when selecting a shelf card', async () => {
    renderDom();
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);
    document.querySelector('.shelf-card').dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.legacy.setState).toHaveBeenCalledWith(
      expect.objectContaining({ currentShelfId: 'tc1', currentBookId: 'b1', currentTextId: 'b1' })
    );
  });

  it('saves text edits via DomainService and saveSnapshot', async () => {
    renderDom();
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);

    const saveBtn = document
      .querySelector('#text-editor .inline-actions')
      .querySelector('button');
    saveBtn.click();

    expect(ctx.services.DomainService.upsertItem).toHaveBeenCalled();
    expect(ctx.legacy.saveSnapshot).toHaveBeenCalledWith({ show: false });
  });
});
