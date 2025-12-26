import { describe, expect, it, vi } from 'vitest';
import { createPersistenceFacade } from '../../../src/app/persistenceFacade.js';

function createHarness(initial = {}) {
  let state = {
    snapshot: initial.snapshot || { version: 'test' },
    flags: initial.flags
  };
  const getState = () => state;
  const setState = next => {
    state = typeof next === 'function' ? next(state) : next;
    return state;
  };
  const persistSnapshot = vi.fn();
  const facade = createPersistenceFacade({
    getState,
    setState,
    getSnapshot: () => state.snapshot,
    setSnapshot: nextSnapshot => {
      setState(prev => ({ ...prev, snapshot: nextSnapshot }));
    },
    persistSnapshot,
    setStatus: vi.fn(),
    defaultShow: false
  });
  return { getState, setState, persistSnapshot, facade };
}

describe('persistence facade', () => {
  it('markDirty sets item dirty only', () => {
    const { facade, getState } = createHarness();
    facade.markDirty('item');
    const flags = getState().flags;
    expect(flags.itemEditorDirty).toBe(true);
    expect(flags.movementFormDirty).toBe(false);
    expect(flags.snapshotDirty).toBe(true);
  });

  it('markDirty sets movement dirty only', () => {
    const { facade, getState } = createHarness();
    facade.markDirty('movement');
    const flags = getState().flags;
    expect(flags.itemEditorDirty).toBe(false);
    expect(flags.movementFormDirty).toBe(true);
    expect(flags.snapshotDirty).toBe(true);
  });

  it('markDirty sets both flags for all and snapshot', () => {
    const { facade, getState } = createHarness();
    facade.markDirty('all');
    let flags = getState().flags;
    expect(flags.itemEditorDirty).toBe(true);
    expect(flags.movementFormDirty).toBe(true);
    expect(flags.snapshotDirty).toBe(true);

    facade.markDirty('snapshot');
    flags = getState().flags;
    expect(flags.itemEditorDirty).toBe(true);
    expect(flags.movementFormDirty).toBe(true);
    expect(flags.snapshotDirty).toBe(true);
  });

  it('save persists the canonical snapshot and respects clear flags', async () => {
    const { facade, getState, persistSnapshot } = createHarness({
      flags: {
        snapshotDirty: true,
        movementFormDirty: true,
        itemEditorDirty: true,
        isDirty: true
      }
    });
    await facade.save({ show: false });
    expect(persistSnapshot).toHaveBeenCalledWith(getState().snapshot);
    expect(getState().flags.itemEditorDirty).toBe(true);
    expect(getState().flags.movementFormDirty).toBe(true);

    await facade.save({ show: false, clearItemDirty: true });
    expect(getState().flags.itemEditorDirty).toBe(false);
    expect(getState().flags.movementFormDirty).toBe(true);
  });

  it('save does not clear flags on failure', async () => {
    const { getState, setState } = createHarness({
      flags: {
        snapshotDirty: true,
        movementFormDirty: true,
        itemEditorDirty: true,
        isDirty: true
      }
    });
    const error = new Error('boom');
    const failingFacade = createPersistenceFacade({
      getState,
      setState,
      getSnapshot: () => getState().snapshot,
      setSnapshot: nextSnapshot =>
        setState(prev => ({
          ...prev,
          snapshot: nextSnapshot
        })),
      persistSnapshot: () => {
        throw error;
      },
      setStatus: vi.fn(),
      defaultShow: false
    });

    await expect(
      failingFacade.save({ show: false, clearItemDirty: true, clearMovementDirty: true })
    ).rejects.toThrow('boom');
    expect(getState().flags.itemEditorDirty).toBe(true);
    expect(getState().flags.movementFormDirty).toBe(true);
  });

  it('commitSnapshot sets snapshot, marks dirty, and saves with defaults', async () => {
    const { facade, getState, persistSnapshot } = createHarness();
    const nextSnapshot = { version: 'next' };
    await facade.commitSnapshot(nextSnapshot, { dirtyScope: 'item', save: true });
    expect(getState().snapshot).toBe(nextSnapshot);
    expect(persistSnapshot).toHaveBeenCalledWith(nextSnapshot);
    expect(getState().flags.itemEditorDirty).toBe(false);
  });

  it('commitSnapshot respects save overrides', async () => {
    const { facade, getState } = createHarness({
      flags: {
        snapshotDirty: true,
        movementFormDirty: true,
        itemEditorDirty: false,
        isDirty: true
      }
    });
    const nextSnapshot = { version: 'next' };
    await facade.commitSnapshot(nextSnapshot, {
      dirtyScope: 'item',
      save: { show: false, clearItemDirty: false, clearMovementDirty: true }
    });
    expect(getState().flags.itemEditorDirty).toBe(true);
    expect(getState().flags.movementFormDirty).toBe(false);
  });
});
