import { GenericDetailView } from './builtins/views/genericDetailView.js';
import { EventsCalendarView } from './builtins/views/eventsCalendarView.js';

export function registerBuiltInPlugins(plugins, { modelRegistry } = {}) {
  if (!plugins) {
    throw new Error('registerBuiltInPlugins requires a plugin registry.');
  }

  plugins.registerCollectionView('*', 'detail', GenericDetailView, { label: 'Detail' });
  plugins.registerCollectionView('events', 'calendar', EventsCalendarView, {
    label: 'Calendar'
  });

  if (modelRegistry) {
    void modelRegistry;
  }
}
