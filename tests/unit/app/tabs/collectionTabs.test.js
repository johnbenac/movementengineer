import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTabManager } from '../../../../src/app/ui/tabManager.js';
import { registerCollectionTabs } from '../../../../src/app/tabs/collectionTabs.js';

function buildDom() {
  document.body.innerHTML = `
    <nav id="tabs-nav" class="tabs">
      <div id="tool-tabs" class="tab-group"></div>
      <div id="collection-tabs" class="tab-group"></div>
    </nav>
    <div id="tool-panels"></div>
    <div id="collection-panels"></div>
  `;
}

function createStore(initialState) {
  let state = initialState;
  const subscribers = new Set();

  return {
    getState: () => state,
    setState: next => {
      state = typeof next === 'function' ? next(state) : next;
      subscribers.forEach(fn => fn(state));
      return state;
    },
    subscribe: fn => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
}

describe('collection tab registration', () => {
  beforeEach(() => {
    buildDom();
    vi.restoreAllMocks();
    globalThis.ModelRegistry = null;
  });

  it('creates one tab per model collection', () => {
    const model = {
      specVersion: 'test',
      collections: {
        notes: { typeName: 'Note', ui: { label: 'Notes' }, fields: {} },
        locations: { typeName: 'Location', fields: {} }
      }
    };
    globalThis.ModelRegistry = {
      getModel: () => model,
      listCollections: () => ['notes', 'locations']
    };

    const store = createStore({ snapshot: { specVersion: 'test' } });
    const ctx = {
      store,
      subscribe: store.subscribe,
      tabs: {},
      tabManager: createTabManager({})
    };

    registerCollectionTabs(ctx);

    expect(document.querySelector('[data-tab="notes"]')).toBeTruthy();
    expect(document.querySelector('[data-tab="locations"]')).toBeTruthy();
    expect(ctx.tabs.notes).toBeTruthy();
    expect(ctx.tabs.locations).toBeTruthy();
    ctx.tabManager.destroy();
  });

  it('adds new collection tabs when the model changes', () => {
    let model = {
      specVersion: 'test',
      collections: {
        notes: { typeName: 'Note', ui: { label: 'Notes' }, fields: {} }
      }
    };
    globalThis.ModelRegistry = {
      getModel: () => model,
      listCollections: () => Object.keys(model.collections)
    };

    const store = createStore({ snapshot: { specVersion: 'test' } });
    const ctx = {
      store,
      subscribe: store.subscribe,
      tabs: {},
      tabManager: createTabManager({})
    };

    registerCollectionTabs(ctx);

    expect(document.querySelector('[data-tab="notes"]')).toBeTruthy();
    expect(document.querySelector('[data-tab="locations"]')).toBeFalsy();

    model = {
      specVersion: 'test',
      collections: {
        notes: { typeName: 'Note', ui: { label: 'Notes' }, fields: {} },
        locations: { typeName: 'Location', fields: {} }
      }
    };

    store.setState(prev => ({ ...prev, snapshot: { specVersion: 'test' } }));

    expect(document.querySelector('[data-tab="locations"]')).toBeTruthy();
    ctx.tabManager.destroy();
  });
});
