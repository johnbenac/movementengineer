import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addTextCollection } from './canon/actions.js';

const baseSnapshot = () => ({
  movements: [],
  textCollections: [],
  texts: []
});

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="canon"></button>
    <input id="library-search" />
    <ul id="library-search-results"></ul>
    <div id="shelf-list"></div>
    <div id="unshelved-list"></div>
    <div id="shelf-hint"></div>
    <div id="book-list"></div>
    <div id="books-pane-title"></div>
    <div id="books-pane-hint"></div>
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

function createCtx({ state: stateOverrides = {}, services: servicesOverride = {} } = {}) {
  const state = {
    snapshot: baseSnapshot(),
    currentMovementId: null,
    currentShelfId: null,
    currentBookId: null,
    currentTextId: null,
    ...stateOverrides
  };
  const subscribers = [];
  let lastSubscriber = null;
  const store = {
    getState: () => state,
    update: updater => {
      const next = typeof updater === 'function' ? updater(state) : updater;
      if (next && typeof next === 'object') Object.assign(state, next);
      return state;
    },
    setStatus: vi.fn(),
    markDirty: vi.fn(),
    saveSnapshot: vi.fn()
  };
  return {
    getState: store.getState,
    update: updater => {
      const next = typeof updater === 'function' ? updater(state) : updater;
      if (next && typeof next === 'object') Object.assign(state, next);
      subscribers.forEach(fn => fn(state));
      return state;
    },
    subscribe: fn => {
      if (typeof fn === 'function') {
        subscribers.push(fn);
        lastSubscriber = fn;
      }
      return vi.fn();
    },
    store,
    services: {
      DomainService: servicesOverride.DomainService,
      ViewModels: servicesOverride.ViewModels
    },
    setStatus: vi.fn(),
    showFatalImportError: vi.fn(),
    actions: {},
    get subscriber() {
      return lastSubscriber;
    }
  };
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders without external dependencies and shows movement hint', async () => {
    const ctx = createCtx({
      services: {
        ViewModels: {
          buildLibraryEditorViewModel: vi.fn(() => ({
            shelves: [],
            shelvesById: {},
            unshelvedBookIds: [],
            booksById: {},
            nodesById: {},
            tocChildrenByParentId: new Map(),
            searchResults: [],
            shelvesByBookId: {},
            bookIdByNodeId: {}
          }))
        }
      }
    });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.render(ctx);

    expect(ctx.showFatalImportError).not.toHaveBeenCalled();
    expect(document.getElementById('shelf-list').textContent).toContain(
      'Create or select a movement first.'
    );
  });

  it('responds to state changes when canon tab is active', async () => {
    const renderSpy = vi.spyOn(await import('./canon/libraryView.js'), 'renderLibraryView');
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);
    tab.mount(ctx);

    renderSpy.mockClear();
    ctx.subscriber?.(ctx.getState());

    expect(renderSpy).toHaveBeenCalled();
  });

  it('adds and persists a text collection', () => {
    const snapshot = baseSnapshot();
    const DomainService = {
      addNewItem: vi.fn((snap, collection) => {
        const item = { id: 'tc1', movementId: 'm1', rootTextIds: [] };
        snap.textCollections.push(item);
        return item;
      })
    };
    const ctx = createCtx({
      state: { snapshot, currentMovementId: 'm1' },
      services: { DomainService }
    });

    addTextCollection(ctx);

    expect(ctx.store.markDirty).toHaveBeenCalledWith('item');
    expect(ctx.store.saveSnapshot).toHaveBeenCalledWith({
      show: false,
      clearItemDirty: true,
      clearMovementDirty: false
    });
    expect(ctx.getState().currentShelfId).toBe('tc1');
    expect(snapshot.textCollections).toHaveLength(1);
  });
});
