import { beforeEach, describe, expect, it, vi } from 'vitest';

function createDom() {
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
    <button id="btn-add-root-text"></button>
    <button id="btn-add-existing-book"></button>
  `;
}

function createCtx({ state, vm }) {
  let currentState = state;
  const setState = vi.fn(update => {
    currentState = { ...currentState, ...update };
    return currentState;
  });

  const legacy = {
    setState,
    saveSnapshot: vi.fn()
  };

  const ctx = {
    legacy,
    actions: {},
    getState: () => currentState,
    subscribe: vi.fn(() => vi.fn()),
    services: {
      ViewModels: {
        buildLibraryEditorViewModel: vi.fn(() => vm)
      },
      DomainService: {
        upsertItem: vi.fn(),
        addNewItem: vi.fn((snap, collection) => ({
          id: `new-${collection}`,
          movementId: currentState.currentMovementId
        })),
        deleteItem: vi.fn()
      }
    }
  };

  return { ctx, setState };
}

function createVm() {
  const nodesById = {
    book1: {
      id: 'book1',
      title: 'Book One',
      label: 'B1',
      depth: 0,
      mainFunction: null,
      hasContent: true,
      parentId: null,
      tags: [],
      mentionsEntityIds: [],
      content: '',
      mentionsEntities: [],
      referencedByClaims: [],
      usedInEvents: []
    },
    child1: {
      id: 'child1',
      title: 'Child',
      label: 'C1',
      depth: 1,
      parentId: 'book1',
      tags: [],
      mentionsEntityIds: [],
      content: '',
      mentionsEntities: [],
      referencedByClaims: [],
      usedInEvents: []
    }
  };
  return {
    shelves: [{ id: 's1', name: 'Shelf', bookCount: 1, textCount: 2, bookIds: ['book1'] }],
    activeShelf: { id: 's1', bookIds: ['book1'] },
    unshelvedBookIds: [],
    nodesById,
    shelvesById: { s1: { id: 's1', name: 'Shelf', bookCount: 1, textCount: 2, bookIds: ['book1'] } },
    booksById: { book1: { id: 'book1', shelves: ['s1'], descendantCount: 2, contentCount: 1 } },
    shelvesByBookId: { book1: ['s1'], child1: ['s1'] },
    bookIdByNodeId: { book1: 'book1', child1: 'book1' },
    tocRootId: 'book1',
    tocChildrenByParentId: new Map([
      ['book1', ['child1']],
      ['child1', []]
    ]),
    searchResults: []
  };
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    createDom();
  });

  it('shows a hint when no movement is selected', async () => {
    const vm = createVm();
    const state = {
      snapshot: {},
      currentMovementId: null
    };
    const { ctx } = createCtx({ state, vm });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);

    expect(document.querySelector('#shelf-list')?.textContent).toContain(
      'Create or select a movement first.'
    );
  });

  it('renders shelves and books when movement is selected', async () => {
    const vm = createVm();
    const state = {
      snapshot: { texts: [], textCollections: [] },
      currentMovementId: 'm1',
      currentShelfId: 's1',
      currentBookId: 'book1',
      currentTextId: 'book1'
    };
    const { ctx } = createCtx({ state, vm });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);

    const shelfCards = document.querySelectorAll('.shelf-card');
    expect(shelfCards.length).toBeGreaterThan(0);
    const bookCards = document.querySelectorAll('.book-card');
    expect(bookCards.length).toBe(1);
  });

  it('clicking a shelf updates selection state', async () => {
    const vm = createVm();
    const state = {
      snapshot: { texts: [], textCollections: [] },
      currentMovementId: 'm1'
    };
    const { ctx, setState } = createCtx({ state, vm });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);
    const shelf = document.querySelector('.shelf-card');
    shelf?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(setState).toHaveBeenCalled();
  });

  it('saving a text calls DomainService and saveSnapshot', async () => {
    const vm = createVm();
    const snapshot = {
      texts: [{ id: 'book1', movementId: 'm1' }, { id: 'child1', movementId: 'm1', parentId: 'book1' }],
      textCollections: [{ id: 's1', movementId: 'm1', rootTextIds: ['book1'] }]
    };
    const state = {
      snapshot,
      currentMovementId: 'm1',
      currentShelfId: 's1',
      currentBookId: 'book1',
      currentTextId: 'book1'
    };
    const { ctx } = createCtx({ state, vm });
    ctx.services.DomainService.upsertItem = vi.fn();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);

    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent === 'Save'
    );
    saveBtn?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.services.DomainService.upsertItem).toHaveBeenCalled();
    expect(ctx.legacy.saveSnapshot).toHaveBeenCalled();
  });
});
