import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createActions } from '../../../../src/app/actions.js';
import { createDomUtils } from '../../../../src/app/ui/dom.js';
import { createPersistenceFacade } from '../../../../src/app/persistenceFacade.js';

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
  const persistence = createPersistenceFacade({
    getSnapshot: () => state.snapshot,
    setSnapshot: next => {
      state = { ...state, snapshot: next };
    },
    getState: () => state,
    setState,
    saveSnapshot: StorageService.saveSnapshot,
    ensureAllCollections: StorageService.ensureAllCollections,
    setStatus: vi.fn(),
    defaultShow: false
  });
  const dom = createDomUtils();

  return {
    getState: () => state,
    setState,
    update,
    store,
    persistence,
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
    const saveSnapshot = vi.fn();
    const ctx = createCtx(
      {
        snapshot,
        currentMovementId: 'm1',
        currentCollectionName: 'entities',
        currentItemId: 'e1',
        navigation: { stack: [], index: -1 },
        flags: {}
      },
      { StorageService: { ensureAllCollections: snap => snap, saveSnapshot } }
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
    expect(ctx.getState().snapshot.entities[0].name).toBe('Updated');
    expect(ctx.getState().navigation.stack[0]).toEqual({
      collectionName: 'entities',
      itemId: 'e1'
    });
    expect(saveSnapshot).toHaveBeenCalledWith(ctx.getState().snapshot);
  });

  it('opens referenced items and activates the collections tab', async () => {
    renderDom();
    const shell = { activateTab: vi.fn(), renderActiveTab: vi.fn() };
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
      {}
    );
    ctx.shell = shell;
    ctx.actions = createActions(ctx);

    ctx.actions.openItem('entities', 'e1');

    expect(shell.activateTab).toHaveBeenCalledWith('collections');
    expect(ctx.getState().currentItemId).toBe('e1');
  });

  it('marks item editor as dirty when user edits the JSON', async () => {
    renderDom();
    const snapshot = { entities: [{ id: 'e1', movementId: 'm1', name: 'Alpha' }] };
    const ctx = createCtx(
      {
        snapshot,
        currentMovementId: 'm1',
        currentCollectionName: 'entities',
        currentItemId: 'e1',
        navigation: { stack: [], index: -1 },
        flags: {}
      }
    );
    const { registerCollectionsTab } = await import('../../../../src/app/tabs/collections.js');
    const tab = registerCollectionsTab(ctx);

    const markDirtySpy = vi.spyOn(ctx.persistence, 'markDirty');

    tab.mount(ctx);
    tab.render(ctx);

    const editor = document.getElementById('item-editor');
    editor.value = JSON.stringify(snapshot.entities[0], null, 2);
    editor.dispatchEvent(new Event('input'));

    expect(markDirtySpy).toHaveBeenCalledWith('item');
  });
});
