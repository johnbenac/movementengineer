import { describe, expect, it } from 'vitest';
import { createPluginRegistry } from './pluginRegistry.js';

describe('pluginRegistry', () => {
  it('throws on duplicate registration for views and widgets', () => {
    const registry = createPluginRegistry();
    const viewComponent = () => null;
    registry.registerCollectionView('events', 'calendar', viewComponent);
    expect(() => registry.registerCollectionView('events', 'calendar', viewComponent)).toThrow(
      /Duplicate collection view registration/
    );

    const widgetComponent = () => null;
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'timingRuleBuilder',
      component: widgetComponent
    });
    expect(() =>
      registry.registerFieldWidget({
        collectionName: 'events',
        fieldName: 'timingRule',
        widgetId: 'timingRuleBuilder',
        component: widgetComponent
      })
    ).toThrow(/Duplicate field widget registration/);
  });

  it('resolves wildcard collection views', () => {
    const registry = createPluginRegistry();
    const detail = () => null;
    registry.registerCollectionView('*', 'detail', detail);
    const resolved = registry.getCollectionView('entities', 'detail');
    expect(resolved?.component).toBe(detail);
  });

  it('prevents registration after finalize', () => {
    const registry = createPluginRegistry();
    registry.finalize();
    expect(() =>
      registry.registerCollectionView('events', 'calendar', () => null)
    ).toThrow(/finalized/);
  });

  it('resolves widget precedence from exact to global', () => {
    const registry = createPluginRegistry();
    const globalWidget = () => 'global';
    const collectionWidget = () => 'collection';
    const exactWidget = () => 'exact';

    registry.registerFieldWidget({
      collectionName: '*',
      fieldName: '*',
      widgetId: 'widget',
      component: globalWidget
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: '*',
      widgetId: 'widget',
      component: collectionWidget
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'widget',
      component: exactWidget
    });

    const exact = registry.getFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'widget'
    });
    expect(exact?.component).toBe(exactWidget);

    const collection = registry.getFieldWidget({
      collectionName: 'events',
      fieldName: 'other',
      widgetId: 'widget'
    });
    expect(collection?.component).toBe(collectionWidget);

    const global = registry.getFieldWidget({
      collectionName: 'notes',
      fieldName: 'body',
      widgetId: 'widget'
    });
    expect(global?.component).toBe(globalWidget);
  });
});
