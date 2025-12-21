import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { initMovements } from './movements.js';

describe('movements UI module', () => {
  let rafSpy;
  let cafSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    window.MovementEngineer = {};
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb();
      return 1;
    });
    cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    document.body.innerHTML = `
      <aside id="movement-sidebar" class="sidebar">
        <div class="sidebar-header">
          <h2>Movements</h2>
          <button id="btn-add-movement" title="Create a new movement">+</button>
        </div>
        <ul id="movement-list" class="item-list"></ul>
      </aside>
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
          <button id="btn-delete-movement" type="button" class="danger">
            Delete movement & related data
          </button>
        </div>
      </form>
    `;
  });

  afterEach(() => {
    rafSpy?.mockRestore();
    cafSpy?.mockRestore();
    delete window.MovementEngineer?.__movementsUI;
    vi.useRealTimers();
  });

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
      update: updater => {
        state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
        subscribers.forEach(fn => fn(state));
        return state;
      },
      subscribe: fn => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
      markDirty: vi.fn(),
      saveSnapshot: vi.fn()
    };
  }

  it('renders movement list rows and handles selection', () => {
    const store = createStore({
      snapshot: {
        movements: [
          { id: 'm1', name: 'One', shortName: 'O1' },
          { id: 'm2', name: 'Two', shortName: 'T2' }
        ]
      },
      currentMovementId: 'm1'
    });
    const selectMovement = vi.fn();
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement }
    };

    initMovements(ctx, { force: true });

    const rows = Array.from(document.querySelectorAll('#movement-list li'));
    expect(rows).toHaveLength(2);
    expect(rows[0].className).toContain('selected');
    rows[1].dispatchEvent(new Event('click', { bubbles: true }));
    expect(selectMovement).toHaveBeenCalledWith('m2');
  });

  it('applies movement form edits to snapshot and marks dirty', () => {
    const store = createStore({
      snapshot: { movements: [{ id: 'm1', name: 'One', shortName: 'O1', tags: [] }] },
      currentMovementId: 'm1'
    });
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: {}
    };

    initMovements(ctx, { force: true });

    const nameInput = document.getElementById('movement-name');
    nameInput.value = 'Updated name';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(store.getState().snapshot.movements[0].name).toBe('Updated name');
    expect(store.markDirty).toHaveBeenCalledWith('movement');
  });

  it('saves movement snapshot with movement dirty flag cleared only', () => {
    const store = createStore({
      snapshot: { movements: [{ id: 'm1', name: 'One' }] },
      currentMovementId: 'm1'
    });
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: {}
    };

    initMovements(ctx, { force: true });

    document.getElementById('btn-save-movement').click();

    expect(store.saveSnapshot).toHaveBeenCalledWith({
      clearMovementDirty: true,
      clearItemDirty: false,
      show: true
    });
  });
});
