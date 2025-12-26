import { describe, expect, it, vi } from 'vitest';
import { createPersistenceFacade } from '../../../src/app/persistenceFacade.js';

describe('persistenceFacade', () => {
  it('marks dirty scopes consistently', () => {
    const markDirty = vi.fn();
    const facade = createPersistenceFacade({
      getSnapshot: () => ({}),
      setSnapshot: vi.fn(),
      saveSnapshot: vi.fn(),
      markDirty
    });

    facade.markDirty('item');
    expect(markDirty).toHaveBeenCalledTimes(1);
    expect(markDirty).toHaveBeenCalledWith('item');

    markDirty.mockClear();
    facade.markDirty('movement');
    expect(markDirty).toHaveBeenCalledTimes(1);
    expect(markDirty).toHaveBeenCalledWith('movement');

    markDirty.mockClear();
    facade.markDirty('all');
    expect(markDirty).toHaveBeenCalledTimes(2);
    expect(markDirty).toHaveBeenNthCalledWith(1, 'movement');
    expect(markDirty).toHaveBeenNthCalledWith(2, 'item');

    markDirty.mockClear();
    facade.markDirty('snapshot');
    expect(markDirty).toHaveBeenCalledTimes(2);
    expect(markDirty).toHaveBeenNthCalledWith(1, 'movement');
    expect(markDirty).toHaveBeenNthCalledWith(2, 'item');
  });

  it('saves with explicit defaults and bubbles failures', () => {
    const saveSnapshot = vi.fn();
    const facade = createPersistenceFacade({
      getSnapshot: () => ({ value: 'canonical' }),
      setSnapshot: vi.fn(),
      saveSnapshot,
      markDirty: vi.fn(),
      defaultShow: false
    });

    facade.save();
    expect(saveSnapshot).toHaveBeenCalledWith({
      show: false,
      clearItemDirty: false,
      clearMovementDirty: false
    });

    saveSnapshot.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => facade.save({ show: true })).toThrow('boom');
  });

  it('commits snapshots with dirty scope and save defaults', () => {
    const setSnapshot = vi.fn();
    const markDirty = vi.fn();
    const saveSnapshot = vi.fn();
    const facade = createPersistenceFacade({
      getSnapshot: () => ({}),
      setSnapshot,
      saveSnapshot,
      markDirty,
      defaultShow: true
    });

    const nextSnapshot = { updated: true };
    facade.commitSnapshot(nextSnapshot, { dirtyScope: 'item', save: true });

    expect(setSnapshot).toHaveBeenCalledWith(nextSnapshot);
    expect(markDirty).toHaveBeenCalledWith('item');
    expect(saveSnapshot).toHaveBeenCalledWith({
      show: true,
      clearItemDirty: true,
      clearMovementDirty: false
    });

    saveSnapshot.mockClear();
    markDirty.mockClear();

    facade.commitSnapshot(nextSnapshot, {
      dirtyScope: 'movement',
      save: { show: false, clearMovementDirty: false }
    });

    expect(markDirty).toHaveBeenCalledWith('movement');
    expect(saveSnapshot).toHaveBeenCalledWith({
      show: false,
      clearItemDirty: false,
      clearMovementDirty: false
    });
  });

  it('treats snapshot scope as all when committing', () => {
    const setSnapshot = vi.fn();
    const markDirty = vi.fn();
    const saveSnapshot = vi.fn();
    const facade = createPersistenceFacade({
      getSnapshot: () => ({}),
      setSnapshot,
      saveSnapshot,
      markDirty,
      defaultShow: true
    });

    facade.commitSnapshot({ next: true }, { dirtyScope: 'snapshot', save: true });

    expect(setSnapshot).toHaveBeenCalledWith({ next: true });
    expect(markDirty).toHaveBeenNthCalledWith(1, 'movement');
    expect(markDirty).toHaveBeenNthCalledWith(2, 'item');
    expect(saveSnapshot).toHaveBeenCalledWith({
      show: true,
      clearItemDirty: true,
      clearMovementDirty: true
    });
  });
});
