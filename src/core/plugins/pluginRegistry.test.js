import { describe, expect, it } from 'vitest';
import { createPluginRegistry } from './pluginRegistry.js';

describe('pluginRegistry', () => {
  it('throws on duplicate registrations for views and widgets', () => {
    const registry = createPluginRegistry();
    const component = () => null;
    registry.registerCollectionView('events', 'detail', component);
    expect(() =>
      registry.registerCollectionView('events', 'detail', component)
    ).toThrow();

    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'timingRuleBuilder',
      component
    });
    expect(() =>
      registry.registerFieldWidget({
        collectionName: 'events',
        fieldName: 'timingRule',
        widgetId: 'timingRuleBuilder',
        component
      })
    ).toThrow();
  });

  it('resolves wildcard collection views', () => {
    const registry = createPluginRegistry();
    const component = () => null;
    registry.registerCollectionView('*', 'detail', component);

    const view = registry.getCollectionView('entities', 'detail');
    expect(view).not.toBeNull();
    expect(view.component).toBe(component);
  });

  it('prevents registration after finalize', () => {
    const registry = createPluginRegistry();
    registry.finalize();
    expect(() =>
      registry.registerCollectionView('events', 'detail', () => null)
    ).toThrow();
  });

  it('resolves widget precedence exact > collection > global', () => {
    const registry = createPluginRegistry();
    const globalComponent = () => 'global';
    const collectionComponent = () => 'collection';
    const exactComponent = () => 'exact';

    registry.registerFieldWidget({
      collectionName: '*',
      fieldName: '*',
      widgetId: 'widget',
      component: globalComponent
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: '*',
      widgetId: 'widget',
      component: collectionComponent
    });
    registry.registerFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'widget',
      component: exactComponent
    });

    const widget = registry.getFieldWidget({
      collectionName: 'events',
      fieldName: 'timingRule',
      widgetId: 'widget'
    });

    expect(widget.component).toBe(exactComponent);
  });
});
