import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as libraryModule from './canon/libraryView.js';
import { addTextCollection } from './canon/actions.js';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="canon"></button>
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

function createCtx(overrides = {}) {
  const state = {
    snapshot: {},
    currentMovementId: null,
    currentShelfId: null,
    currentBookId: null,
    currentTextId: null,
    ...overrides.state
  };
  let subscriber = null;
  const ctx = {
    getState: () => state,
    update: updater => {
      const next = typeof updater === 'function' ? updater(state) : updater;
      if (next) Object.assign(state, next);
      return state;
    },
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    tabs: {},
    showFatalImportError: vi.fn(),
    ...overrides.ctx
  };
  Object.defineProperty(ctx, 'subscriber', { get: () => subscriber });
  return ctx;
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders without legacy and shows empty movement hint', async () => {
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(ctx.showFatalImportError).not.toHaveBeenCalled();
    expect(document.getElementById('shelf-list').textContent).toContain(
      'Create or select a movement first.'
    );
  });

  it('wires canon controls to module renderer and rerenders on events', async () => {
    const renderSpy = vi.spyOn(libraryModule, 'renderLibraryView');
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);
    tab.mount(ctx);

    document.getElementById('library-search').dispatchEvent(new Event('input', { bubbles: true }));
    ctx.subscriber?.();

    expect(renderSpy).toHaveBeenCalled();
  });

  it('addTextCollection marks dirty, saves, and updates selection', () => {
    const snapshot = { textCollections: [] };
    const markDirty = vi.fn();
    const saveSnapshot = vi.fn();
    const ctx = createCtx({
      state: { snapshot, currentMovementId: 'm1' },
      ctx: {
        store: { markDirty, saveSnapshot },
        services: {
          DomainService: {
            addNewItem: vi.fn((snap, collection) => {
              const item = { id: 'tc-1', movementId: 'm1', rootTextIds: [] };
              snap[collection] = snap[collection] || [];
              snap[collection].push(item);
              return item;
            })
          }
        },
        setStatus: vi.fn()
      }
    });

    addTextCollection(ctx);

    expect(markDirty).toHaveBeenCalledWith('item');
    expect(saveSnapshot).toHaveBeenCalledWith({
      show: false,
      clearItemDirty: true,
      clearMovementDirty: false
    });
    expect(ctx.getState().currentShelfId).toBe('tc-1');
  });
});
