import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';
import { initMovements } from '../../../../src/app/ui/movements.js';

function createDomainServiceStub() {
  return {
    addMovement: vi.fn((snapshot, overrides = {}) => {
      const id = overrides.id || `mov-${Math.random().toString(36).slice(2, 8)}`;
      const movement = {
        id,
        movementId: id,
        name: 'New Movement',
        shortName: 'New',
        summary: '',
        tags: [],
        ...overrides
      };
      snapshot.movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
      snapshot.movements.push(movement);
      return movement;
    }),
    deleteMovement: vi.fn((snapshot, movementId) => {
      snapshot.movements = (snapshot.movements || []).filter(m => m.id !== movementId);
      return snapshot.movements[0]?.id || null;
    })
  };
}

function renderDom() {
  document.body.innerHTML = `
    <main class="layout">
      <aside id="movement-sidebar" class="sidebar">
        <div class="sidebar-header">
          <h2>Movements</h2>
          <button id="btn-add-movement" title="Create a new movement">+</button>
        </div>
        <ul id="movement-list" class="item-list"></ul>
      </aside>
      <section class="content">
        <section id="tab-dashboard" class="tab-panel active">
          <div class="panel-body">
            <form id="movement-form" autocomplete="off">
              <div class="form-row">
                <label>ID</label>
                <span id="movement-id-label" class="code-pill">—</span>
              </div>
              <div class="form-row">
                <label for="movement-name">Name</label>
                <input id="movement-name" type="text" required />
              </div>
              <div class="form-row">
                <label for="movement-shortName">Short name</label>
                <input id="movement-shortName" type="text" />
              </div>
              <div class="form-row">
                <label for="movement-summary">Summary</label>
                <textarea id="movement-summary" rows="4"></textarea>
              </div>
              <div class="form-row">
                <label for="movement-tags">Tags (comma‑separated)</label>
                <input id="movement-tags" type="text" placeholder="test, upside, etc." />
              </div>
              <div class="form-actions">
                <button id="btn-save-movement" type="button">Save movement</button>
                <button id="btn-import-from-github" type="button">
                  Load markdown repo
                </button>
                <button id="btn-export-repo" type="button">Export markdown zip</button>
                <button id="btn-delete-movement" type="button" class="danger">
                  Delete movement & related data
                </button>
              </div>
            </form>
          </div>
        </section>
      </section>
    </main>
  `;
}

function createStore(initialState) {
  let state = initialState;
  const subscribers = new Set();
  return {
    getState: () => state,
    setState: updater => {
      state = typeof updater === 'function' ? updater(state) || state : updater;
      subscribers.forEach(fn => fn(state));
      return state;
    },
    subscribe: fn => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    markDirty: vi.fn(),
    markSaved: vi.fn(),
    saveSnapshot: vi.fn()
  };
}

describe('movements UI module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    renderDom();
    window.MovementEngineer = window.MovementEngineer || {};
    window.MovementEngineer.tabs = {};
    window.MovementEngineer.actions = {};
    window.MovementEngineer.bootstrapOptions = {};
    window.MovementEngineer.__movementsUI = null;
    vi.stubGlobal('requestAnimationFrame', cb => {
      cb();
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('renders movement list and populates form from state', () => {
    const state = {
      snapshot: {
        movements: [
          { id: 'm1', name: 'One', shortName: 'O', summary: 'Sum', tags: ['t1'] },
          { id: 'm2', name: 'Two', shortName: 'T', summary: 'Two sum', tags: [] }
        ]
      },
      currentMovementId: 'm1',
      flags: {}
    };
    const store = createStore(state);
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement: vi.fn() },
      services: { DomainService: createDomainServiceStub() },
      dom: createDomUtils()
    };

    initMovements(ctx);

    const items = document.querySelectorAll('#movement-list li');
    expect(items).toHaveLength(2);
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[0].getAttribute('aria-selected')).toBe('true');

    expect(document.getElementById('movement-name').value).toBe('One');
    expect(document.getElementById('movement-shortName').value).toBe('O');
    expect(document.getElementById('movement-summary').value).toBe('Sum');
    expect(document.getElementById('movement-tags').value).toBe('t1');
  });

  it('applies form edits to snapshot and marks dirty', () => {
    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'One', shortName: 'O', summary: '', tags: [] }]
      },
      currentMovementId: 'm1',
      flags: {}
    };
    const store = createStore(state);
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement: vi.fn() },
      services: { DomainService: createDomainServiceStub() },
      dom: createDomUtils()
    };

    initMovements(ctx);

    const nameInput = document.getElementById('movement-name');
    nameInput.value = 'Updated';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(store.getState().snapshot.movements[0].name).toBe('Updated');
    expect(store.markDirty).toHaveBeenCalledWith('movement');
  });

  it('delegates selection, add, and save actions', () => {
    const domainMock = {
      addMovement: vi.fn(snapshot => {
        const movement = {
          id: 'm2',
          movementId: 'm2',
          name: 'New Movement',
          shortName: 'New',
          summary: '',
          tags: []
        };
        snapshot.movements.push(movement);
        return movement;
      }),
      deleteMovement: vi.fn((snapshot, id) => {
        snapshot.movements = snapshot.movements.filter(m => m.id !== id);
        return snapshot.movements[0]?.id || null;
      })
    };
    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'One', shortName: 'O', summary: '', tags: [] }]
      },
      currentMovementId: 'm1',
      flags: {}
    };
    const store = createStore(state);
    const selectMovement = vi.fn();
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement },
      services: { DomainService: domainMock },
      dom: createDomUtils()
    };

    initMovements(ctx);

    document.querySelector('#movement-list li').click();
    expect(selectMovement).toHaveBeenCalledWith('m1');

    document.getElementById('btn-add-movement').click();
    expect(domainMock.addMovement).toHaveBeenCalled();
    expect(selectMovement).toHaveBeenCalledWith('m2');

    document.getElementById('btn-save-movement').click();
    expect(store.saveSnapshot).toHaveBeenCalledWith({
      clearMovementDirty: true,
      clearItemDirty: false,
      show: true
    });
  });

  it('imports a markdown repo and replaces snapshot', async () => {
    const repoUrl = 'https://github.com/example/repo';
    vi.spyOn(window, 'prompt').mockReturnValue(repoUrl);
    const importedSnapshot = {
      movements: [{ id: 'imp1', name: 'Imported movement' }],
      __repoBaselineByMovement: {}
    };
    const importMovementRepo = vi.fn().mockResolvedValue(importedSnapshot);
    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'One', shortName: 'O', summary: '', tags: [] }]
      },
      currentMovementId: 'm1',
      flags: {}
    };
    const store = createStore(state);
    const selectMovement = vi.fn();
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement },
      services: {
        DomainService: createDomainServiceStub(),
        MarkdownDatasetLoader: { importMovementRepo }
      },
      dom: createDomUtils(),
      ui: { setStatus: vi.fn() },
      shell: { renderActiveTab: vi.fn() }
    };

    initMovements(ctx);

    document.getElementById('btn-import-from-github').click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(importMovementRepo).toHaveBeenCalledWith(repoUrl);
    expect(store.getState().snapshot).toEqual(importedSnapshot);
    expect(selectMovement).toHaveBeenCalledWith('imp1');
    expect(ctx.ui.setStatus).toHaveBeenCalledWith('Importing markdown repo…', {
      busy: true,
      persist: true
    });
    expect(ctx.ui.setStatus).toHaveBeenCalledWith('Repo imported ✓');
    expect(store.markSaved).toHaveBeenCalledWith({ movement: true, item: true });
  });

  it('exports a movement to a zip and triggers download', async () => {
    const exportMovementToZip = vi.fn().mockResolvedValue({
      archive: new Blob(['zip']),
      fileCount: 1
    });
    const buildBaselineByMovement = vi.fn().mockReturnValue({ m1: {} });
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => 'blob:mock';
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = () => undefined;
    }
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'One', shortName: 'O', summary: '', tags: [] }]
      },
      currentMovementId: 'm1',
      flags: {}
    };
    const store = createStore(state);
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement: vi.fn() },
      services: {
        DomainService: createDomainServiceStub(),
        MarkdownDatasetLoader: { exportMovementToZip, buildBaselineByMovement }
      },
      dom: createDomUtils(),
      ui: { setStatus: vi.fn() }
    };

    initMovements(ctx);

    document.getElementById('btn-export-repo').click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(buildBaselineByMovement).toHaveBeenCalled();
    expect(exportMovementToZip).toHaveBeenCalledWith(
      expect.objectContaining({
        movements: expect.any(Array),
        __repoBaselineByMovement: expect.any(Object),
        __repoFileIndex: expect.any(Object),
        __repoRawMarkdownByPath: expect.any(Object)
      }),
      'm1',
      { outputType: 'blob' }
    );
    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    expect(ctx.ui.setStatus).toHaveBeenCalledWith('Exported 1 file(s) ✓');
  });
});
