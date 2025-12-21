import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as actions from './canon/actions.js';

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

function createCtx(overrides = {}) {
  let state = {
    snapshot: {},
    currentMovementId: null,
    currentShelfId: null,
    currentBookId: null,
    currentTextId: null,
    ...overrides.state
  };
  let subscriber = null;
  const ctx = {
    ...overrides,
    getState: () => state,
    update: updater => {
      state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
      return state;
    },
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    get subscriber() {
      return subscriber;
    }
  };
  return ctx;
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders without legacy and shows movement hint', async () => {
    const libraryModule = await import('./canon/libraryView.js');
    const renderSpy = vi.spyOn(libraryModule, 'renderLibraryView');
    const ctx = createCtx({ showFatalImportError: vi.fn(), services: { ViewModels: null } });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(renderSpy).toHaveBeenCalled();
    expect(ctx.showFatalImportError).not.toHaveBeenCalled();
    expect(document.getElementById('shelf-list').textContent).toContain(
      'Create or select a movement first.'
    );
  });

  it('wires canon controls to module actions', async () => {
    const addTextCollectionSpy = vi.spyOn(actions, 'addTextCollection');
    const saveTextCollectionSpy = vi.spyOn(actions, 'saveTextCollection');
    const deleteTextCollectionSpy = vi.spyOn(actions, 'deleteTextCollection');
    const addNewBookToShelfSpy = vi.spyOn(actions, 'addNewBookToShelf');
    const addExistingBookToShelfSpy = vi.spyOn(actions, 'addExistingBookToShelf');
    const ctx = createCtx({ services: { ViewModels: null } });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);
    tab.mount(ctx);

    document.getElementById('library-search').dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-add-text-collection').click();
    document.getElementById('btn-save-text-collection').click();
    document.getElementById('btn-delete-text-collection').click();
    document.getElementById('btn-add-root-text').click();
    document.getElementById('btn-add-existing-book').click();

    expect(addTextCollectionSpy).toHaveBeenCalled();
    expect(saveTextCollectionSpy).toHaveBeenCalled();
    expect(deleteTextCollectionSpy).toHaveBeenCalled();
    expect(addNewBookToShelfSpy).toHaveBeenCalled();
    expect(addExistingBookToShelfSpy).toHaveBeenCalled();
  });

  it('responds to state changes when canon tab is active', async () => {
    const libraryModule = await import('./canon/libraryView.js');
    const renderSpy = vi.spyOn(libraryModule, 'renderLibraryView');
    const ctx = createCtx({ services: { ViewModels: null } });
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);
    tab.mount(ctx);

    ctx.subscriber?.();

    expect(renderSpy).toHaveBeenCalled();
  });
});

describe('canon actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    renderDom();
  });

  it('addTextCollection persists and updates selection', () => {
    const snapshot = { textCollections: [] };
    const DomainService = {
      addNewItem: vi.fn((snap, collection) => {
        const item = { id: 'tc-1', movementId: 'm1', name: 'New collection' };
        if (collection === 'textCollections') snap.textCollections.push(item);
        return item;
      })
    };
    const store = { markDirty: vi.fn(), saveSnapshot: vi.fn() };
    const ctx = createCtx({ state: { snapshot, currentMovementId: 'm1' }, services: { DomainService }, store });

    actions.addTextCollection(ctx);

    expect(store.markDirty).toHaveBeenCalledWith('item');
    expect(store.saveSnapshot).toHaveBeenCalledWith({
      show: false,
      clearItemDirty: true,
      clearMovementDirty: false
    });
    expect(ctx.getState().currentShelfId).toBe('tc-1');
  });
});
