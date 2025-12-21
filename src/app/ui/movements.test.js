import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initMovements } from './movements.js';

function createDom() {
  document.body.innerHTML = `
    <aside id="movement-sidebar" class="sidebar">
      <div class="sidebar-header">
        <h2>Movements</h2>
        <button id="btn-add-movement" type="button">+</button>
      </div>
      <ul id="movement-list" class="item-list"></ul>
    </aside>
    <form id="movement-form">
      <div class="form-row">
        <label>ID</label>
        <span id="movement-id-label"></span>
      </div>
      <input id="movement-name" />
      <input id="movement-shortName" />
      <textarea id="movement-summary"></textarea>
      <input id="movement-tags" />
      <button id="btn-save-movement" type="button">Save</button>
      <button id="btn-delete-movement" type="button">Delete</button>
    </form>
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
    saveSnapshot: vi.fn()
  };
}

const DomainService = {
  addMovement(snapshot) {
    const movement = {
      id: 'm3',
      movementId: 'm3',
      name: 'Three',
      shortName: 'Three',
      summary: '',
      tags: []
    };
    snapshot.movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    snapshot.movements.push(movement);
    return movement;
  },
  updateMovement(snapshot, movementId, updates) {
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const found = movements.find(m => m.id === movementId);
    if (!found) return null;
    Object.assign(found, updates);
    return found;
  },
  deleteMovement(snapshot, movementId) {
    snapshot.movements = (snapshot.movements || []).filter(m => m.id !== movementId);
    return snapshot.movements[0]?.id || null;
  }
};

describe('movements UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('requestAnimationFrame', cb => {
      cb();
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    createDom();
    window.MovementEngineer = window.MovementEngineer || {};
    window.MovementEngineer.actions = {};
    window.MovementEngineer.bootstrapOptions = {};
    window.MovementEngineer.__movementsUI = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders movement list and form values from the store state', () => {
    const state = {
      snapshot: {
        movements: [
          { id: 'm1', name: 'One', shortName: 'O', summary: 'Hello', tags: ['a'] },
          { id: 'm2', name: 'Two', shortName: 'T', summary: 'World', tags: [] }
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
      actions: {},
      services: { DomainService }
    };

    initMovements(ctx);

    const items = document.querySelectorAll('#movement-list li');
    expect(items.length).toBe(2);
    expect(items[0].classList.contains('active')).toBe(true);
    expect(document.getElementById('movement-name').value).toBe('One');
    expect(document.getElementById('movement-summary').value).toBe('Hello');
  });

  it('updates snapshot and marks dirty when form fields change', () => {
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
      actions: {},
      services: { DomainService }
    };

    initMovements(ctx);

    const nameInput = document.getElementById('movement-name');
    nameInput.value = 'Updated';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const snapshot = store.getState().snapshot;
    expect(snapshot.movements[0].name).toBe('Updated');
    expect(store.markDirty).toHaveBeenCalledWith('movement');
  });

  it('adds a movement via the add button and saves the snapshot', () => {
    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'One', shortName: 'O', summary: '', tags: [] }]
      },
      currentMovementId: 'm1',
      flags: {}
    };
    const store = createStore(state);
    const selectMovement = vi.fn(id => {
      store.setState(prev => ({ ...prev, currentMovementId: id }));
    });
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement },
      services: { DomainService }
    };

    initMovements(ctx);

    document.getElementById('btn-add-movement').click();

    const snapshot = store.getState().snapshot;
    expect(snapshot.movements).toHaveLength(2);
    expect(selectMovement).toHaveBeenCalledWith('m3');
    expect(store.saveSnapshot).toHaveBeenCalledWith({
      clearMovementDirty: true,
      clearItemDirty: false,
      show: true
    });
  });
});
