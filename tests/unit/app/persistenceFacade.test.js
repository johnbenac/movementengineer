import { describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createStore } from '../../../src/app/store.js';
import { createPersistenceFacade } from '../../../src/app/persistenceFacade.js';

function createHarness() {
  const storage = {
    loadSnapshot: () => ({ movements: [] }),
    ensureAllCollections: snap => snap,
    saveSnapshot: vi.fn()
  };
  const store = createStore({ services: { StorageService: storage } });
  const persistence = createPersistenceFacade({
    getSnapshot: () => store.getState().snapshot,
    setSnapshot: snapshot => store.setState(prev => ({ ...prev, snapshot })),
    saveSnapshot: opts => store.saveSnapshot(opts),
    markDirty: scope => store.markDirty(scope),
    ensureAllCollections: storage.ensureAllCollections,
    showDefault: false
  });
  return { persistence, store, storage };
}

describe('persistence facade', () => {
  it('marks item dirty only for item scope', () => {
    const { persistence, store } = createHarness();

    persistence.markDirty('item');

    const flags = store.getState().flags;
    expect(flags.itemEditorDirty).toBe(true);
    expect(flags.movementFormDirty).toBe(false);
  });

  it('marks movement dirty only for movement scope', () => {
    const { persistence, store } = createHarness();

    persistence.markDirty('movement');

    const flags = store.getState().flags;
    expect(flags.movementFormDirty).toBe(true);
    expect(flags.itemEditorDirty).toBe(false);
  });

  it('marks both dirty for all scope', () => {
    const { persistence, store } = createHarness();

    persistence.markDirty('all');

    const flags = store.getState().flags;
    expect(flags.movementFormDirty).toBe(true);
    expect(flags.itemEditorDirty).toBe(true);
  });

  it('treats snapshot scope as all', () => {
    const { persistence, store } = createHarness();

    persistence.markDirty('snapshot');

    const flags = store.getState().flags;
    expect(flags.movementFormDirty).toBe(true);
    expect(flags.itemEditorDirty).toBe(true);
  });

  it('saves the canonical snapshot and respects clear flags', () => {
    const { persistence, store, storage } = createHarness();
    const snapshot = { movements: [{ id: 'm1' }], entities: [] };
    store.setState(prev => ({ ...prev, snapshot }));
    persistence.markDirty('item');

    persistence.save();

    expect(storage.saveSnapshot).toHaveBeenCalledWith(snapshot);
    expect(store.getState().flags.itemEditorDirty).toBe(true);

    persistence.save({ clearItemDirty: true });

    expect(store.getState().flags.itemEditorDirty).toBe(false);
  });

  it('does not clear dirty flags when save fails', () => {
    const { persistence, store, storage } = createHarness();
    storage.saveSnapshot.mockImplementation(() => {
      throw new Error('boom');
    });
    persistence.markDirty('movement');

    expect(() => persistence.save({ clearMovementDirty: true })).toThrow('boom');
    expect(store.getState().flags.movementFormDirty).toBe(true);
  });

  it('commits snapshots and infers save clears from scope', () => {
    const { persistence, store } = createHarness();
    const nextSnapshot = { movements: [{ id: 'm2' }] };
    const saveSpy = vi.spyOn(store, 'saveSnapshot');

    persistence.commitSnapshot(nextSnapshot, { dirtyScope: 'item', save: true });

    expect(store.getState().snapshot).toBe(nextSnapshot);
    expect(saveSpy).toHaveBeenCalledWith({
      show: false,
      clearItemDirty: true,
      clearMovementDirty: false
    });
  });

  it('honors save option overrides in commitSnapshot', () => {
    const { persistence, store } = createHarness();
    const nextSnapshot = { movements: [{ id: 'm3' }] };
    const saveSpy = vi.spyOn(store, 'saveSnapshot');

    persistence.commitSnapshot(nextSnapshot, {
      dirtyScope: 'movement',
      save: { show: true, clearItemDirty: true }
    });

    expect(saveSpy).toHaveBeenCalledWith({
      show: true,
      clearItemDirty: true,
      clearMovementDirty: true
    });
  });
});

describe('persistence guardrails', () => {
  it('avoids StorageService.saveSnapshot in tabs', () => {
    const root = join(process.cwd(), 'src', 'app', 'tabs');
    const stack = [root];
    const files = [];

    while (stack.length) {
      const current = stack.pop();
      const entries = readdirSync(current);
      entries.forEach(entry => {
        const fullPath = join(current, entry);
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.endsWith('.js')) {
          files.push(fullPath);
        }
      });
    }

    const offenders = files.filter(file => {
      const contents = readFileSync(file, 'utf8');
      return contents.includes('StorageService.saveSnapshot');
    });

    expect(offenders).toEqual([]);
  });
});
