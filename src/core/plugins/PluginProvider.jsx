let currentPlugins = null;

export function PluginProvider({ plugins, children }) {
  if (!plugins || typeof plugins.getCollectionView !== 'function') {
    throw new Error('PluginProvider requires a valid plugin registry instance.');
  }
  currentPlugins = plugins;
  return typeof children === 'function' ? children() : children || null;
}

export function usePlugins() {
  if (!currentPlugins) {
    throw new Error('usePlugins must be used within a PluginProvider.');
  }
  return currentPlugins;
}
