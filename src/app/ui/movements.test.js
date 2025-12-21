import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initMovements } from './movements.js';

function renderDom() {
  document.body.innerHTML = `
    <aside id="movement-sidebar" class="sidebar">
      <div class="sidebar-header">
        <h2>Movements</h2>
        <button id="btn-add-movement" title="Create a new movement">+</button>
      </div>
      <ul id="movement-list" class="item-list"></ul>
    </aside>
    <div id="sidebar-scrim"></div>
    <section class="content">
      <section id="tab-dashboard" class="tab-panel active">
        <div class="panel-body">
          <form id="movement-form">
            <span id="movement-id-label"></span>
            <input id="movement-name" />
            <input id="movement-shortName" />
            <textarea id="movement-summary"></textarea>
            <input id="movement-tags" />
            <button id="btn-save-movement" type="button">Save</button>
            <button id="btn-delete-movement" type="button">Delete</button>
          </form>
        </div>
      </section>
    </section>
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
    },
    update: updater => {
      state = typeof updater === 'function' ? updater(state) || state : { ...state, ...updater };
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

describe('movements UI module', () => {
  let restoreRaf;

  beforeEach(() => {
    vi.restoreAllMocks();
    renderDom();
    const g = window.MovementEngineer || {};
    g.bootstrapOptions = {};
    g.__movementsUI = null;
    window.MovementEngineer = g;
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = fn => {
      fn();
      return 1;
    };
    restoreRaf = () => {
      window.requestAnimationFrame = originalRaf;
    };
  });

  afterEach(() => {
    restoreRaf?.();
  });

  it('renders movement list and form from state', () => {
    const state = {
      snapshot: {
        movements: [{ id: 'm1', name: 'One', shortName: '1', summary: 'hello', tags: ['a'] }]
      },
      currentMovementId: 'm1'
    };
    const store = createStore(state);
    const ctx = { store, getState: store.getState, subscribe: store.subscribe, actions: {}, services: {} };

    initMovements(ctx);

    const row = document.querySelector('#movement-list li');
    expect(row?.dataset.movementId).toBe('m1');
    expect(row?.className).toContain('selected');
    expect(row?.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('movement-name').value).toBe('One');
    expect(document.getElementById('movement-shortName').value).toBe('1');
    expect(document.getElementById('movement-summary').value).toBe('hello');
    expect(document.getElementById('movement-tags').value).toBe('a');
  });

  it('invokes selectMovement action when a list row is clicked', () => {
    const state = {
      snapshot: {
        movements: [
          { id: 'm1', name: 'One' },
          { id: 'm2', name: 'Two' }
        ]
      },
      currentMovementId: 'm1'
    };
    const store = createStore(state);
    const selectMovement = vi.fn();
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement },
      services: {}
    };

    initMovements(ctx);
    const second = document.querySelector('#movement-list li[data-movement-id="m2"]');
    second?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(selectMovement).toHaveBeenCalledWith('m2');
  });

  it('updates snapshot and marks dirty when form changes', () => {
    const state = {
      snapshot: { movements: [{ id: 'm1', name: 'One', shortName: '', summary: '', tags: [] }] },
      currentMovementId: 'm1'
    };
    const store = createStore(state);
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: {},
      services: {}
    };

    initMovements(ctx);
    const nameInput = document.getElementById('movement-name');
    nameInput.value = 'Updated';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(store.getState().snapshot.movements[0].name).toBe('Updated');
    expect(store.markDirty).toHaveBeenCalledWith('movement');
  });

  it('adds a movement and saves snapshot', () => {
    const DomainService = {
      addMovement: (snap, overrides = {}) => {
        const movement = { id: overrides.id || 'm2', name: 'New Movement' };
        snap.movements.push(movement);
        return movement;
      }
    };
    const state = { snapshot: { movements: [{ id: 'm1', name: 'One' }] }, currentMovementId: 'm1' };
    const store = createStore(state);
    const selectMovement = vi.fn();
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement },
      services: { DomainService }
    };

    initMovements(ctx);
    document.getElementById('btn-add-movement').dispatchEvent(new Event('click', { bubbles: true }));

    expect(store.saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ clearMovementDirty: true, clearItemDirty: false })
    );
    expect(selectMovement).toHaveBeenCalledWith('m2');
  });

  it('deletes a movement using DomainService and selects fallback', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const DomainService = {
      deleteMovement: (snap, id) => {
        snap.movements = snap.movements.filter(m => m.id !== id);
        return snap.movements[0]?.id || null;
      }
    };
    const state = {
      snapshot: { movements: [{ id: 'm1', name: 'One' }, { id: 'm2', name: 'Two' }] },
      currentMovementId: 'm2'
    };
    const store = createStore(state);
    const selectMovement = vi.fn();
    const ctx = {
      store,
      getState: store.getState,
      subscribe: store.subscribe,
      actions: { selectMovement },
      services: { DomainService }
    };

    initMovements(ctx);
    document.getElementById('btn-delete-movement').dispatchEvent(new Event('click', { bubbles: true }));

    expect(store.saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ clearMovementDirty: true, clearItemDirty: false })
    );
    expect(store.getState().snapshot.movements).toHaveLength(1);
    expect(selectMovement).toHaveBeenCalledWith('m1');
  });
});
