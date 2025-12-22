import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="collections"></button>
    <select id="collection-select">
      <option value="entities">entities</option>
      <option value="practices">practices</option>
    </select>
    <input id="collection-filter-by-movement" type="checkbox" checked />
    <ul id="collection-items"></ul>
    <div id="item-preview-title"></div>
    <div id="item-preview-subtitle"></div>
    <div id="item-preview-body"></div>
    <div id="item-preview-collection"></div>
    <textarea id="item-editor"></textarea>
    <button id="btn-add-item"></button>
    <button id="btn-delete-item"></button>
    <button id="btn-save-item"></button>
    <button id="btn-preview-back"></button>
    <button id="btn-preview-forward"></button>
  `;
}

function createCtx(initialState, overrides = {}) {
  let state = initialState;
  const setState = next => {
    state = typeof next === 'function' ? next(state) : next || state;
    return state;
  };
  const update = updater => {
    const next = typeof updater === 'function' ? updater(state) : updater;
    return setState(next || state);
  };
  const DomainService = overrides.DomainService || {
    COLLECTION_NAMES: ['entities', 'practices'],
    COLLECTIONS_WITH_MOVEMENT_ID: new Set(['entities', 'practices']),
    addNewItem: vi.fn((snap, coll, movementId) => {
      const obj = { id: 'new-item', movementId, name: 'New item' };
      snap[coll].push(obj);
      return obj;
    }),
    upsertItem: vi.fn((snap, coll, obj) => {
      const list = snap[coll];
      const idx = list.findIndex(it => it.id === obj.id);
      if (idx >= 0) list[idx] = obj;
      else list.push(obj);
      return obj;
    }),
    deleteItem: vi.fn((snap, coll, id) => {
      snap[coll] = snap[coll].filter(it => it.id !== id);
      return true;
    })
  };

  const store =
    overrides.store ||
    {
      markDirty: vi.fn(),
      markSaved: vi.fn(),
      saveSnapshot: vi.fn(),
      getState: () => state,
      setState,
      update
    };
  store.getState = () => state;
  const StorageService =
    overrides.StorageService ||
    {
      ensureAllCollections: snap => snap,
      saveSnapshot: vi.fn()
    };
  const dom = createDomUtils();

  return {
    getState: () => state,
    setState,
    update,
    store,
    services: { DomainService, StorageService },
    dom,
    setStatus: vi.fn(),
    actions: overrides.actions || {},
    tabs: {}
  };
}

describe('collections tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders filtered list and preview for the current collection', async () => {
    renderDom();
    const snapshot = {
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Alpha' },
        { id: 'e2', movementId: 'm2', name: 'Beta' }
      ]
    };
    const state = {
      snapshot,
      currentMovementId: 'm1',
      currentCollectionName: 'entities',
      currentItemId: 'e1',
      navigation: { stack: [], index: -1 },
      flags: {}
    };
    const ctx = createCtx(state);
    const { registerCollectionsTab } = await import('../../../../src/app/tabs/collections.js');
    const tab = registerCollectionsTab(ctx);

    tab.render(ctx);

    expect(document.querySelectorAll('#collection-items li')).toHaveLength(1);
    expect(document.getElementById('item-preview-title').textContent).toContain('Alpha');
  });

  it('saves editor changes and persists the snapshot', async () => {
    renderDom();
    const snapshot = { entities: [{ id: 'e1', movementId: 'm1', name: 'Alpha' }] };
    const store = {
      markDirty: vi.fn(),
      markSaved: vi.fn(),
      saveSnapshot: vi.fn(),
      getState: () => ({}),
      setState: vi.fn(),
      update: vi.fn()
    };
    const ctx = createCtx(
      {
        snapshot,
        currentMovementId: 'm1',
        currentCollectionName: 'entities',
        currentItemId: 'e1',
        navigation: { stack: [], index: -1 },
        flags: {}
      },
      { store }
    );
    const { registerCollectionsTab } = await import('../../../../src/app/tabs/collections.js');
    const tab = registerCollectionsTab(ctx);

    document.getElementById('item-editor').value = JSON.stringify(
      { id: 'e1', movementId: 'm1', name: 'Updated' },
      null,
      2
    );

    const result = tab.saveCurrentItem(ctx);

    expect(result).toBe(true);
    expect(snapshot.entities[0].name).toBe('Updated');
    expect(ctx.getState().navigation.stack[0]).toEqual({
      collectionName: 'entities',
      itemId: 'e1'
    });
    expect(store.saveSnapshot).toHaveBeenCalledWith({
      clearItemDirty: true,
      clearMovementDirty: false
    });
  });

  it('jumps to referenced items and activates the collections tab', async () => {
    renderDom();
    const actions = { activateTab: vi.fn(), selectMovement: vi.fn() };
    const snapshot = { entities: [{ id: 'e1', movementId: 'm1', name: 'Alpha' }] };
    const ctx = createCtx(
      {
        snapshot,
        currentMovementId: 'm1',
        currentCollectionName: 'entities',
        currentItemId: null,
        navigation: { stack: [], index: -1 },
        flags: {}
      },
      { actions }
    );
    const { registerCollectionsTab } = await import('../../../../src/app/tabs/collections.js');
    const tab = registerCollectionsTab(ctx);

    tab.jumpToReferencedItem(ctx, 'entities', 'e1');

    expect(actions.activateTab).toHaveBeenCalledWith('collections');
    expect(ctx.getState().currentItemId).toBe('e1');
  });

  it('marks item editor as dirty when user edits the JSON', async () => {
    renderDom();
    const snapshot = { entities: [{ id: 'e1', movementId: 'm1', name: 'Alpha' }] };
    const store = {
      markDirty: vi.fn(),
      markSaved: vi.fn(),
      saveSnapshot: vi.fn(),
      getState: () => ({}),
      setState: vi.fn(),
      update: vi.fn()
    };
    const ctx = createCtx(
      {
        snapshot,
        currentMovementId: 'm1',
        currentCollectionName: 'entities',
        currentItemId: 'e1',
        navigation: { stack: [], index: -1 },
        flags: {}
      },
      { store }
    );
    const { registerCollectionsTab } = await import('../../../../src/app/tabs/collections.js');
    const tab = registerCollectionsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const editor = document.getElementById('item-editor');
    editor.value = JSON.stringify(snapshot.entities[0], null, 2);
    editor.dispatchEvent(new Event('input'));

    expect(store.markDirty).toHaveBeenCalledWith('item');
  });
});
