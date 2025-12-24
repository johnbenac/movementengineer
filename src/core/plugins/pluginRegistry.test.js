import { describe, expect, it } from 'vitest';
import { createPluginRegistry } from './pluginRegistry.js';

describe('pluginRegistry', () => {
  it('throws on duplicate registrations for views and widgets', () => {
    const registry = createPluginRegistry();
    registry.registerCollectionView('events', 'detail', () => null);
    expect(() => {
      registry.registerCollectionView('events', 'detail', () => null);
    }).toThrow(/already registered/i);

    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'timingRuleBuilder',
      component: () => null
    });
    expect(() => {
      registry.registerFieldWidget({
        collectionName: 'events',
        fieldName: 'timingRule',
        widgetId: 'timingRuleBuilder',
        component: () => null
      });
    }).toThrow(/already registered/i);
  });

  it('resolves wildcard collection views', () => {
    const registry = createPluginRegistry();
    registry.registerCollectionView('*', 'detail', () => null);
    const view = registry.getCollectionView('entities', 'detail');
    expect(view).not.toBeNull();
    expect(view?.viewId).toBe('detail');
  });

  it('prevents registration after finalize', () => {
    const registry = createPluginRegistry();
    registry.finalize();
    expect(() => {
      registry.registerCollectionView('events', 'detail', () => null);
    }).toThrow(/finalized/i);
  });

  it('resolves widget precedence by specificity', () => {
    const registry = createPluginRegistry();
    const exact = () => 'exact';
    const collection = () => 'collection';
    const global = () => 'global';

    registry.registerFieldWidget({
      collectionName: '*',
      fieldName: '*',
      widgetId: 'example',
      component: global
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: '*',
      widgetId: 'example',
      component: collection
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'example',
      component: exact
    });

    expect(
      registry.getFieldWidget({
        collectionName: 'events',
        fieldName: 'timingRule',
        widgetId: 'example'
      })?.component
    ).toBe(exact);

    expect(
      registry.getFieldWidget({
        collectionName: 'events',
        fieldName: 'other',
        widgetId: 'example'
      })?.component
    ).toBe(collection);

    expect(
      registry.getFieldWidget({
        collectionName: 'entities',
        fieldName: 'other',
        widgetId: 'example'
      })?.component
    ).toBe(global);
  });
});
