import { EventsCalendarView } from './builtins/views/eventsCalendarView.js';
import { GenericDetailView } from './builtins/views/genericDetailView.js';

export function registerBuiltInPlugins(plugins, { modelRegistry }) {
  if (!plugins) {
    throw new Error('[plugins] registerBuiltInPlugins called without registry.');
  }

  plugins.registerCollectionView('*', 'detail', GenericDetailView, { label: 'Detail' });
  plugins.registerCollectionView('events', 'calendar', EventsCalendarView, { label: 'Calendar' });

  return { modelRegistry };
}
