import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCollectionsTab } from './collections.js';

function renderDom() {
  document.body.innerHTML = `
    <select id="collection-select"></select>
    <input id="collection-filter-by-movement" type="checkbox" />
    <ul id="collection-items"></ul>
    <div id="item-preview-title"></div>
    <div id="item-preview-subtitle"></div>
    <div id="item-preview-body"></div>
    <div id="item-preview-collection"></div>
    <textarea id="item-editor"></textarea>
    <button id="btn-delete-item"></button>
    <button id="btn-preview-back"></button>
    <button id="btn-preview-forward"></button>
    <button id="btn-add-item"></button>
    <button id="btn-save-item"></button>
  `;
}

function createCtx(initialState) {
  let state = initialState;
  const subscribers = [];

  const DomainService = {
    COLLECTION_NAMES: [
      'entities',
      'practices',
      'events',
      'rules',
      'claims',
      'textCollections',
      'texts',
      'media',
      'notes'
    ],
    COLLECTIONS_WITH_MOVEMENT_ID: new Set([
      'entities',
      'practices',
      'events',
      'rules',
      'claims',
      'textCollections',
      'texts',
      'media',
      'notes'
    ]),
    addNewItem: vi.fn(),
    upsertItem: vi.fn(),
    deleteItem: vi.fn()
  };

  const legacy = {
    markDirty: vi.fn(),
    saveSnapshot: vi.fn(),
    setStatus: vi.fn(),
    notify: vi.fn()
  };

  const ctx = {
    getState: () => state,
    update: updater => {
      state = typeof updater === 'function' ? updater(state) : updater;
      subscribers.forEach(fn => fn(state));
      return state;
    },
    subscribe: fn => {
      subscribers.push(fn);
      return () => {};
    },
    services: { DomainService },
    legacy,
    actions: { activateTab: vi.fn(), selectMovement: vi.fn() },
    tabs: {}
  };

  return { ctx, DomainService, legacy, getState: () => state };
}

describe('collections tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders collection list and preview when an item is selected', () => {
    const initialState = {
      snapshot: { entities: [{ id: 'e1', name: 'Entity One', movementId: 'm1' }] },
      currentCollectionName: 'entities',
      currentMovementId: 'm1',
      currentItemId: 'e1',
      navigation: { stack: [], index: -1 }
    };
    const { ctx } = createCtx(initialState);
    const tab = registerCollectionsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(document.querySelector('#collection-items li').textContent).toContain('Entity One');
    expect(document.getElementById('item-preview-title').textContent).toBe('Entity One');
    expect(document.getElementById('item-preview-collection').textContent).toBe('entities');
  });

  it('updates navigation state when clicking a collection item', () => {
    const initialState = {
      snapshot: { entities: [{ id: 'e1', name: 'Entity One', movementId: 'm1' }] },
      currentCollectionName: 'entities',
      currentMovementId: 'm1',
      currentItemId: null,
      navigation: { stack: [], index: -1 }
    };
    const { ctx, getState } = createCtx(initialState);
    const tab = registerCollectionsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    document.querySelector('#collection-items li')?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(getState().currentItemId).toBe('e1');
    expect(getState().navigation.stack).toEqual([{ collectionName: 'entities', itemId: 'e1' }]);
    expect(getState().navigation.index).toBe(0);
  });
});
