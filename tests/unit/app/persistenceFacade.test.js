import { describe, expect, it, vi } from 'vitest';
import { createPersistenceFacade } from '../../../src/app/persistenceFacade.js';

function createState(overrides = {}) {
  return {
    snapshot: { version: '2.3', movements: [] },
    flags: {
      snapshotDirty: false,
      movementFormDirty: false,
      itemEditorDirty: false,
      isDirty: false
    },
    ...overrides
  };
}

function setup(options = {}) {
  let state = createState(options.stateOverrides);
  const setState = updater => {
    state = typeof updater === 'function' ? updater(state) : updater;
    return state;
  };
  const saveSnapshot = options.saveSnapshot || vi.fn();
  const ensureAllCollections = options.ensureAllCollections || vi.fn(snapshot => snapshot);
  const persistence = createPersistenceFacade({
    getSnapshot: () => state.snapshot,
    setSnapshot: next => {
      state = { ...state, snapshot: next };
    },
    getState: () => state,
    setState,
    saveSnapshot,
    ensureAllCollections,
    setStatus: vi.fn(),
    defaultShow: false
  });
  return { persistence, getState: () => state, saveSnapshot, ensureAllCollections };
}

describe('persistenceFacade', () => {
  it('marks item dirty only', () => {
    const { persistence, getState } = setup();

    persistence.markDirty('item');

    expect(getState().flags).toMatchObject({
      snapshotDirty: true,
      itemEditorDirty: true,
      movementFormDirty: false,
      isDirty: true
    });
  });

  it('marks movement dirty only', () => {
    const { persistence, getState } = setup();

    persistence.markDirty('movement');

    expect(getState().flags).toMatchObject({
      snapshotDirty: true,
      itemEditorDirty: false,
      movementFormDirty: true,
      isDirty: true
    });
  });

  it('marks all dirty for all/snapshot scopes', () => {
    const { persistence, getState } = setup();

    persistence.markDirty('all');

    expect(getState().flags).toMatchObject({
      snapshotDirty: true,
      itemEditorDirty: true,
      movementFormDirty: true,
      isDirty: true
    });

    const { persistence: snapshotPersistence, getState: getSnapshotState } = setup();
    snapshotPersistence.markDirty('snapshot');
    expect(getSnapshotState().flags).toMatchObject({
      snapshotDirty: true,
      itemEditorDirty: true,
      movementFormDirty: true,
      isDirty: true
    });
  });

  it('saves canonical snapshot and preserves dirty flags by default', async () => {
    const { persistence, getState, saveSnapshot } = setup({
      stateOverrides: {
        flags: {
          snapshotDirty: true,
          movementFormDirty: true,
          itemEditorDirty: true,
          isDirty: true
        }
      }
    });

    await persistence.save({ show: false });

    expect(saveSnapshot).toHaveBeenCalledWith(getState().snapshot);
    expect(getState().flags).toMatchObject({
      snapshotDirty: false,
      movementFormDirty: true,
      itemEditorDirty: true,
      isDirty: true
    });
  });

  it('clears requested dirty flags after save', async () => {
    const { persistence, getState } = setup({
      stateOverrides: {
        flags: {
          snapshotDirty: true,
          movementFormDirty: true,
          itemEditorDirty: true,
          isDirty: true
        }
      }
    });

    await persistence.save({ show: false, clearMovementDirty: true, clearItemDirty: true });

    expect(getState().flags).toMatchObject({
      snapshotDirty: false,
      movementFormDirty: false,
      itemEditorDirty: false,
      isDirty: false
    });
  });

  it('does not clear dirty flags on save failure', async () => {
    const saveSnapshot = vi.fn(() => {
      throw new Error('fail');
    });
    const { persistence, getState } = setup({
      saveSnapshot,
      stateOverrides: {
        flags: {
          snapshotDirty: true,
          movementFormDirty: true,
          itemEditorDirty: true,
          isDirty: true
        }
      }
    });

    await expect(persistence.save({ show: false })).rejects.toThrow('fail');

    expect(getState().flags).toMatchObject({
      snapshotDirty: true,
      movementFormDirty: true,
      itemEditorDirty: true,
      isDirty: true
    });
  });

  it('commits snapshot, marks dirty, and saves with inferred defaults', async () => {
    const { persistence, getState, saveSnapshot } = setup({
      stateOverrides: {
        flags: {
          snapshotDirty: false,
          movementFormDirty: false,
          itemEditorDirty: false,
          isDirty: false
        }
      }
    });
    const nextSnapshot = { version: '2.3', movements: [{ id: 'm1' }] };

    await persistence.commitSnapshot(nextSnapshot, { dirtyScope: 'item', save: true });

    expect(getState().snapshot).toBe(nextSnapshot);
    expect(saveSnapshot).toHaveBeenCalledWith(nextSnapshot);
    expect(getState().flags).toMatchObject({
      snapshotDirty: false,
      movementFormDirty: false,
      itemEditorDirty: false,
      isDirty: false
    });
  });

  it('respects save overrides in commitSnapshot', async () => {
    const { persistence, getState } = setup({
      stateOverrides: {
        flags: {
          snapshotDirty: false,
          movementFormDirty: false,
          itemEditorDirty: false,
          isDirty: false
        }
      }
    });

    await persistence.commitSnapshot(
      { version: '2.3', movements: [{ id: 'm2' }] },
      { dirtyScope: 'item', save: { show: false, clearItemDirty: false, clearMovementDirty: true } }
    );

    expect(getState().flags).toMatchObject({
      snapshotDirty: false,
      movementFormDirty: false,
      itemEditorDirty: true,
      isDirty: true
    });
  });
});
