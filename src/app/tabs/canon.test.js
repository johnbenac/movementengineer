import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addTextCollection } from './canon/actions.js';

vi.mock('./canon/libraryView.js', () => ({ renderLibraryView: vi.fn() }));

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="canon"></button>
    <input id="library-search" />
    <button id="btn-add-text-collection"></button>
    <button id="btn-save-text-collection"></button>
    <button id="btn-delete-text-collection"></button>
    <button id="btn-add-root-text"></button>
    <button id="btn-add-existing-book"></button>
    <div id="shelf-list"></div>
    <div id="unshelved-list"></div>
    <div id="book-list"></div>
    <div id="toc-tree"></div>
    <div id="shelf-editor"></div>
    <div id="text-editor"></div>
    <div id="library-search-results"></div>
    <div id="library-breadcrumb"></div>
  `;
}

function createCtx(overrides = {}) {
  let subscriber = null;
  return {
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    get subscriber() {
      return subscriber;
    },
    ...overrides
  };
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    window.alert = vi.fn();
    renderDom();
  });

  it('renders without requiring legacy and responds to state changes', async () => {
    const { renderLibraryView } = await import('./canon/libraryView.js');
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);
    expect(renderLibraryView).toHaveBeenCalledTimes(1);

    ctx.subscriber?.();
    expect(renderLibraryView).toHaveBeenCalledTimes(2);
  });

  it('wires canon controls to module actions', async () => {
    const actions = await import('./canon/actions.js');
    const addCollectionSpy = vi.spyOn(actions, 'addTextCollection');
    const saveCollectionSpy = vi.spyOn(actions, 'saveTextCollection');
    const deleteCollectionSpy = vi.spyOn(actions, 'deleteTextCollection');
    const addRootSpy = vi.spyOn(actions, 'addNewBookToShelf');
    const addExistingSpy = vi.spyOn(actions, 'addExistingBookToShelf');
    const { registerCanonTab } = await import('./canon.js');
    const ctx = createCtx();
    const tab = registerCanonTab(ctx);
    tab.mount(ctx);

    document.getElementById('library-search').dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-add-text-collection').click();
    document.getElementById('btn-save-text-collection').click();
    document.getElementById('btn-delete-text-collection').click();
    document.getElementById('btn-add-root-text').click();
    document.getElementById('btn-add-existing-book').click();

    expect(addCollectionSpy).toHaveBeenCalled();
    expect(saveCollectionSpy).toHaveBeenCalled();
    expect(deleteCollectionSpy).toHaveBeenCalled();
    expect(addRootSpy).toHaveBeenCalled();
    expect(addExistingSpy).toHaveBeenCalled();
  });

  it('adds a text collection and persists through store actions', () => {
    let state = {
      snapshot: { textCollections: [], texts: [] },
      currentMovementId: 'm1',
      currentShelfId: null,
      currentBookId: null,
      currentTextId: null
    };
    const markDirty = vi.fn();
    const saveSnapshot = vi.fn();
    const DomainService = {
      addNewItem: vi.fn((snap, collection) => {
        const created = { id: 'tc-1', movementId: 'm1' };
        snap[collection] = snap[collection] || [];
        snap[collection].push(created);
        return created;
      })
    };
    const ctx = {
      getState: () => state,
      update: updater => {
        const next = typeof updater === 'function' ? updater(state) : updater;
        state = next;
      },
      services: { DomainService },
      store: { markDirty, saveSnapshot },
      setStatus: vi.fn()
    };

    const created = addTextCollection(ctx);

    expect(created?.id).toBe('tc-1');
    expect(state.currentShelfId).toBe('tc-1');
    expect(markDirty).toHaveBeenCalledWith('item');
    expect(saveSnapshot).toHaveBeenCalledWith({
      show: false,
      clearItemDirty: true,
      clearMovementDirty: false
    });
  });
});
