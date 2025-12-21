import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="collections"></button>
    <select id="collection-select">
      <option value="entities">entities</option>
    </select>
    <input id="collection-filter-by-movement" type="checkbox" />
    <ul id="collection-items"></ul>
    <div id="item-preview-title"></div>
    <div id="item-preview-subtitle"></div>
    <div id="item-preview-body"></div>
    <div id="item-preview-collection"></div>
    <textarea id="item-editor"></textarea>
    <button id="btn-delete-item" type="button"></button>
    <button id="btn-save-item" type="button"></button>
  `;
}

function createCtx({ state, DomainService }) {
  return {
    getState: () => state,
    setState: next => Object.assign(state, next),
    subscribe: () => () => {},
    services: { DomainService },
    setStatus: vi.fn(),
    legacy: {
      markDirty: vi.fn(),
      saveSnapshot: vi.fn()
    }
  };
}

describe('collections tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders collection list and preview for selected item', async () => {
    renderDom();
    const DomainService = {
      COLLECTION_NAMES: ['entities'],
      COLLECTIONS_WITH_MOVEMENT_ID: new Set(['entities'])
    };
    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'Movement One' }],
        entities: [{ id: 'e1', movementId: 'm1', name: 'Entity One' }]
      },
      currentCollectionName: 'entities',
      currentItemId: 'e1',
      currentMovementId: 'm1',
      navigation: { stack: [{ collectionName: 'entities', itemId: 'e1' }], index: 0 }
    };
    const ctx = createCtx({ state, DomainService });
    const { registerCollectionsTab } = await import('./collections.js');
    const tab = registerCollectionsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const listItems = document.querySelectorAll('#collection-items li');
    expect(listItems.length).toBe(1);
    expect(listItems[0].dataset.id).toBe('e1');
    expect(document.getElementById('item-preview-title').textContent).toContain('Entity One');
    expect(document.getElementById('item-preview-collection').textContent).toBe('entities');
  });

  it('saves editor changes and updates navigation state', async () => {
    renderDom();
    const DomainService = {
      COLLECTION_NAMES: ['entities'],
      COLLECTIONS_WITH_MOVEMENT_ID: new Set(['entities']),
      upsertItem: vi.fn((snap, coll, item) => {
        const idx = snap[coll].findIndex(it => it.id === item.id);
        if (idx >= 0) {
          snap[coll][idx] = item;
        } else {
          snap[coll].push(item);
        }
      })
    };
    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'Movement One' }],
        entities: [{ id: 'e1', movementId: 'm1', name: 'Old entity' }]
      },
      currentCollectionName: 'entities',
      currentItemId: 'e1',
      currentMovementId: 'm1',
      navigation: { stack: [], index: -1 },
      flags: {}
    };
    const ctx = createCtx({ state, DomainService });
    const { registerCollectionsTab } = await import('./collections.js');
    const tab = registerCollectionsTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);
    document.getElementById('item-editor').value = JSON.stringify({
      id: 'e2',
      movementId: 'm1',
      name: 'Entity Two'
    });

    const saved = tab.saveItemFromEditor({ persist: false });

    expect(saved).toBe(true);
    expect(DomainService.upsertItem).toHaveBeenCalledWith(state.snapshot, 'entities', {
      id: 'e2',
      movementId: 'm1',
      name: 'Entity Two'
    });
    expect(state.currentItemId).toBe('e2');
    expect(state.navigation.stack).toEqual([{ collectionName: 'entities', itemId: 'e2' }]);
    expect(state.flags.snapshotDirty).toBe(true);
  });
});
