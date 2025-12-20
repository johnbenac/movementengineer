import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="canon"></button>
    <div id="library-search"></div>
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

function createSnapshot() {
  return {
    movements: [{ id: 'm1', name: 'Movement One' }],
    textCollections: [
      {
        id: 's1',
        movementId: 'm1',
        name: 'Shelf 1',
        bookIds: ['b1'],
        rootTextIds: ['b1'],
        description: ''
      }
    ],
    texts: [
      {
        id: 'b1',
        movementId: 'm1',
        parentId: null,
        title: 'Book 1',
        label: 'B1',
        depth: 0,
        content: ''
      }
    ],
    entities: []
  };
}

function createVm() {
  const node = {
    id: 'b1',
    title: 'Book 1',
    label: 'B1',
    depth: 0,
    mainFunction: null,
    hasContent: true,
    parentId: null,
    mentionsEntities: [],
    referencedByClaims: [],
    usedInEvents: []
  };
  return {
    shelves: [{ id: 's1', name: 'Shelf 1', bookCount: 1, textCount: 1, bookIds: ['b1'] }],
    activeShelf: { id: 's1', bookIds: ['b1'] },
    shelvesById: { s1: { id: 's1', name: 'Shelf 1', bookIds: ['b1'] } },
    shelvesByBookId: { b1: ['s1'] },
    unshelvedBookIds: [],
    booksById: { b1: { descendantCount: 1, contentCount: 1, shelves: ['s1'] } },
    nodesById: { b1: node },
    tocRootId: 'b1',
    tocChildrenByParentId: new Map([['b1', []]]),
    bookIdByNodeId: { b1: 'b1' },
    searchResults: [],
    activeShelfId: 's1'
  };
}

async function setup(stateOverrides = {}) {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const snapshot = createSnapshot();
  let state = {
    snapshot,
    currentMovementId: 'm1',
    currentShelfId: 's1',
    currentBookId: 'b1',
    currentTextId: 'b1',
    graphWorkbenchState: {},
    ...stateOverrides
  };

  const DomainService = {
    addNewItem: vi.fn((snap, collection, movementId) => ({ id: 'new', movementId })),
    upsertItem: vi.fn(),
    deleteItem: vi.fn()
  };

  const ViewModels = {
    buildLibraryEditorViewModel: vi.fn(() => createVm())
  };

  const legacy = {
    setState: vi.fn(patch => {
      state = { ...state, ...patch };
      return state;
    }),
    saveSnapshot: vi.fn(),
    subscribe: () => () => {}
  };

  const ctx = {
    getState: () => state,
    subscribe: () => () => {},
    services: { DomainService, ViewModels },
    legacy,
    ui: { setStatus: vi.fn() },
    actions: {},
    tabs: {},
    dom: { clearElement: fallback => {
      if (!fallback) return;
      while (fallback.firstChild) fallback.removeChild(fallback.firstChild);
    } }
  };

  const { registerCanonTab } = await import('./canon.js');
  const tab = registerCanonTab(ctx);
  return { tab, ctx, DomainService, legacy, state: () => state };
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows hints when no movement selected', async () => {
    const { tab, ctx } = await setup({ currentMovementId: null });

    tab.render(ctx);

    expect(document.querySelector('#shelf-list').textContent).toContain('Create or select');
    expect(document.querySelector('#book-list').textContent).toContain('Choose a movement');
  });

  it('renders shelves and books when movement selected', async () => {
    const { tab, ctx } = await setup();

    tab.render(ctx);

    expect(document.querySelectorAll('.shelf-card').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.book-card').length).toBeGreaterThan(0);
  });

  it('updates state when selecting a shelf', async () => {
    const { tab, ctx, legacy } = await setup();

    tab.render(ctx);
    const shelfCard = document.querySelector('.shelf-card');
    shelfCard.click();

    expect(legacy.setState).toHaveBeenCalled();
    const call = legacy.setState.mock.calls.at(-1)[0];
    expect(call.currentShelfId).toBe('s1');
  });

  it('saves a text and calls saveSnapshot', async () => {
    const { tab, ctx, DomainService, legacy } = await setup();

    tab.render(ctx);
    const saveButton = Array.from(document.querySelectorAll('#text-editor button')).find(
      btn => btn.textContent === 'Save'
    );
    expect(saveButton).toBeTruthy();
    saveButton.click();

    expect(DomainService.upsertItem).toHaveBeenCalled();
    expect(legacy.saveSnapshot).toHaveBeenCalled();
  });
});
