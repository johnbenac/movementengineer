import * as store from './store.js';
import * as status from './ui/status.js';
import * as dom from './ui/dom.js';

const globals = {
  DomainService: globalThis.DomainService,
  StorageService: globalThis.StorageService,
  ViewModels: globalThis.ViewModels,
  EntityGraphView: globalThis.EntityGraphView,
  MarkdownDatasetLoader: globalThis.MarkdownDatasetLoader,
  d3: globalThis.d3
};

const ctx = {
  services: {
    DomainService: globals.DomainService,
    StorageService: globals.StorageService,
    ViewModels: globals.ViewModels,
    EntityGraphView: globals.EntityGraphView,
    MarkdownDatasetLoader: globals.MarkdownDatasetLoader
  },
  libs: {
    d3: globals.d3
  },
  store: {
    getState: store.getState,
    setState: store.setState,
    update: store.update,
    subscribe: store.subscribe
  },
  ui: {
    ...status,
    dom
  }
};

globalThis.ME = globalThis.ME || {};
globalThis.ME.ctx = ctx;
globalThis.ME.ui = Object.assign(globalThis.ME.ui || {}, status, { dom });
globalThis.ME.dom = Object.assign(globalThis.ME.dom || {}, dom);
globalThis.ME.store = Object.assign(
  globalThis.ME.store || {},
  {
    getState: store.getState,
    setState: store.setState,
    update: store.update,
    subscribe: store.subscribe
  }
);

if (import.meta.hot) {
  // Enable hot module replacement in supporting environments.
  import.meta.hot.accept();
}

export default ctx;
