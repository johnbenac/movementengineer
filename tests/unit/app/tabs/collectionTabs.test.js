import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTabManager } from '../../../../src/app/ui/tabManager.js';
import { registerCollectionTabs } from '../../../../src/app/tabs/collectionTabs.js';

function setup(model, snapshot = { specVersion: '2.3' }) {
  document.body.innerHTML = `
    <nav>
      <div id="tool-tabs"></div>
      <div id="collection-tabs"></div>
    </nav>
    <main>
      <div id="tool-panels"></div>
      <div id="collection-panels"></div>
    </main>
  `;

  const subscribers = new Set();
  let state = { snapshot };

  const store = {
    getState: () => state,
    setState: updater => {
      state = typeof updater === 'function' ? updater(state) : updater;
      subscribers.forEach(cb => cb(state));
      return state;
    },
    subscribe: cb => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    }
  };

  vi.stubGlobal('ModelRegistry', {
    getModel: specVersion => model[specVersion] || model['2.3'],
    listCollections: specVersion =>
      Object.keys((model[specVersion] || model['2.3']).collections)
  });

  const ctx = {
    store,
    subscribe: store.subscribe,
    tabs: {},
    ui: {
      clearFatalImportError: vi.fn(),
      showFatalImportError: vi.fn()
    },
    dom: {},
    tabManager: null,
    shell: null
  };

  ctx.tabManager = createTabManager(ctx);

  return { ctx, store };
}

describe('collection tab registration', () => {
  beforeEach(() => {
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates collection tabs from the model registry', () => {
    const model = {
      '2.3': {
        specVersion: '2.3',
        collections: {
          movements: { typeName: 'Movement', ui: { label: 'Movements' } },
          notes: { typeName: 'Note', ui: { label: 'Notes' } }
        }
      }
    };
    const { ctx } = setup(model);

    registerCollectionTabs(ctx);

    const notesTab = document.querySelector('[data-tab="notes"]');
    const notesPanel = document.getElementById('tab-notes');

    expect(notesTab).not.toBeNull();
    expect(notesTab.textContent).toBe('Notes');
    expect(notesPanel).not.toBeNull();
  });

});
