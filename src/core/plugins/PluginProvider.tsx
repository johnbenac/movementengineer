const pluginContext = {
  current: null
};

export function PluginProvider({ plugins, children }) {
  if (!plugins) {
    throw new Error('PluginProvider requires a plugins registry instance.');
  }
  pluginContext.current = plugins;
  return children ?? null;
}

export function usePlugins() {
  if (!pluginContext.current) {
    throw new Error('usePlugins must be used within a PluginProvider.');
  }
  return pluginContext.current;
}
