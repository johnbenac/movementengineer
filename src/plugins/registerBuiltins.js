import { GenericDetailView } from './builtins/views/genericDetailView.tsx';
import { EventsCalendarView } from './builtins/views/eventsCalendarView.tsx';

export function registerBuiltInPlugins(plugins, { modelRegistry }) {
  if (!plugins) {
    throw new Error('registerBuiltInPlugins requires a plugin registry.');
  }

  plugins.registerCollectionView('*', 'detail', GenericDetailView, { label: 'Detail' });
  plugins.registerCollectionView('events', 'calendar', EventsCalendarView, { label: 'Calendar' });

  if (modelRegistry) {
    void modelRegistry;
  }
}
