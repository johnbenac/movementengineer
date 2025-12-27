import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTabManager } from '../../../../src/app/ui/tabManager.js';
import { registerCollectionTabs } from '../../../../src/app/tabs/collectionTabs.js';

function buildDom() {
  document.body.innerHTML = `
    <nav id="tabs-nav" class="tabs"></nav>
    <div id="tool-panels"></div>
    <div id="collection-panels"></div>
  `;
}

function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: next => {
      state = typeof next === 'function' ? next(state) : next;
      listeners.forEach(listener => listener());
    },
    subscribe: fn => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

function createCtx(store) {
  const ctx = {
    store,
    tabs: {},
    subscribe: fn => store.subscribe(fn)
  };
  ctx.tabManager = createTabManager(ctx);
  return ctx;
}

describe('collection tab factory', () => {
  beforeEach(() => {
    vi.resetModules();
    buildDom();
  });

  it('creates a tab per model collection', () => {
    const model = {
      specVersion: 'test',
      collections: {
        notes: { typeName: 'Note' },
        locations: { typeName: 'Location' }
      }
    };

    globalThis.ModelRegistry = {
      getModel: () => model,
      listCollections: () => ['notes', 'locations']
    };

    const store = createStore({ snapshot: { specVersion: 'test' } });
    const ctx = createCtx(store);

    registerCollectionTabs(ctx);

    expect(document.querySelector('[data-tab="notes"]')).not.toBeNull();
    expect(document.querySelector('[data-tab="locations"]')).not.toBeNull();
  });

  it('adds new collection tabs when the model changes', () => {
    let model = {
      specVersion: 'test',
      collections: {
        notes: { typeName: 'Note' }
      }
    };

    globalThis.ModelRegistry = {
      getModel: () => model,
      listCollections: () => Object.keys(model.collections)
    };

    const store = createStore({ snapshot: { specVersion: 'test' } });
    const ctx = createCtx(store);

    registerCollectionTabs(ctx);
    expect(document.querySelector('[data-tab="events"]')).toBeNull();

    model = {
      specVersion: 'test',
      collections: {
        notes: { typeName: 'Note' },
        events: { typeName: 'Event' }
      }
    };

    store.setState(prev => ({ ...prev }));

    expect(document.querySelector('[data-tab="events"]')).not.toBeNull();
  });
});
