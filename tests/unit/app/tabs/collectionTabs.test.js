import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCollectionTabs } from '../../../../src/app/tabs/collectionTabs.js';
import { createTabManager } from '../../../../src/app/ui/tabManager.js';

function setupDom() {
  document.body.innerHTML = `
    <nav id="tabs-nav">
      <div id="tool-tabs"></div>
      <div id="collection-tabs"></div>
    </nav>
    <main>
      <div id="tool-panels"></div>
      <div id="collection-panels"></div>
    </main>
  `;
}

describe('collectionTabs', () => {
  beforeEach(() => {
    setupDom();
    globalThis.ModelRegistry = {
      getModel: () => ({
        specVersion: '2.3',
        collections: {
          movements: { typeName: 'Movement', fields: {} },
          notes: { typeName: 'Note', fields: {} }
        },
        collectionsOrder: ['movements', 'notes']
      }),
      listCollections: () => ['movements', 'notes']
    };
    globalThis.MovementEngineer = { tabs: {} };
  });

  it('builds one tab per collection from the model', () => {
    const store = {
      getState: () => ({ snapshot: { specVersion: '2.3', movements: [], notes: [] } })
    };
    const ctx = {
      store,
      tabs: {},
      dom: { clearElement: vi.fn() },
      shell: { renderActiveTab: vi.fn() }
    };
    ctx.tabManager = createTabManager(ctx);

    registerCollectionTabs(ctx);

    const buttons = document.querySelectorAll('#collection-tabs .tab');
    expect(Array.from(buttons).map(btn => btn.textContent)).toEqual(['Movements', 'Notes']);
    expect(document.getElementById('tab-movements')).not.toBeNull();
    expect(document.getElementById('tab-notes')).not.toBeNull();
  });
});
