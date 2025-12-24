import { describe, expect, it } from 'vitest';
import { createPluginRegistry } from './pluginRegistry.js';

function noop() {}

describe('pluginRegistry', () => {
  it('throws on duplicate registrations', () => {
    const registry = createPluginRegistry();
    registry.registerCollectionView('events', 'detail', noop);
    expect(() => registry.registerCollectionView('events', 'detail', noop)).toThrow();

    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'name',
      widgetId: 'text',
      component: noop
    });
    expect(() =>
      registry.registerFieldWidget({
        collectionName: 'events',
        fieldName: 'name',
        widgetId: 'text',
        component: noop
      })
    ).toThrow();
  });

  it('resolves collection views via wildcard', () => {
    const registry = createPluginRegistry();
    registry.registerCollectionView('*', 'detail', noop);

    const view = registry.getCollectionView('entities', 'detail');
    expect(view?.component).toBe(noop);
  });

  it('prevents registrations after finalize', () => {
    const registry = createPluginRegistry();
    registry.finalize();

    expect(() => registry.registerCollectionView('events', 'detail', noop)).toThrow();
    expect(() =>
      registry.registerFieldWidget({
        collectionName: 'events',
        fieldName: 'name',
        widgetId: 'text',
        component: noop
      })
    ).toThrow();
  });

  it('resolves widget precedence order', () => {
    const registry = createPluginRegistry();
    const exact = () => 'exact';
    const collectionWide = () => 'collection';
    const global = () => 'global';

    registry.registerFieldWidget({
      collectionName: '*',
      fieldName: '*',
      widgetId: 'picker',
      component: global
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: '*',
      widgetId: 'picker',
      component: collectionWide
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'date',
      widgetId: 'picker',
      component: exact
    });

    const resolved = registry.getFieldWidget({
      collectionName: 'events',
      fieldName: 'date',
      widgetId: 'picker'
    });
    expect(resolved?.component).toBe(exact);

    const resolvedCollection = registry.getFieldWidget({
      collectionName: 'events',
      fieldName: 'other',
      widgetId: 'picker'
    });
    expect(resolvedCollection?.component).toBe(collectionWide);

    const resolvedGlobal = registry.getFieldWidget({
      collectionName: 'entities',
      fieldName: 'other',
      widgetId: 'picker'
    });
    expect(resolvedGlobal?.component).toBe(global);
  });
});
