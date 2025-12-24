let activePlugins = null;

export function PluginProvider({ plugins, children }) {
  activePlugins = plugins || null;
  return children ?? null;
}

export function usePlugins() {
  if (!activePlugins) {
    throw new Error('usePlugins must be used within a PluginProvider.');
  }
  return activePlugins;
}
