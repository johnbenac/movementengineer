import { createStore } from './store.js';
import { createStatusUi } from './ui/status.js';
import { createDomUtils } from './ui/dom.js';
import { registerComparisonTab } from './tabs/comparison.js';
import { registerNotesTab } from './tabs/notes.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.bootstrapOptions = movementEngineerGlobal.bootstrapOptions || {};
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};
if (typeof movementEngineerGlobal.bootstrapOptions.legacyAutoInit === 'undefined') {
  movementEngineerGlobal.bootstrapOptions.legacyAutoInit = true;
}

const legacy = movementEngineerGlobal.legacy;
const services = {
  DomainService: window.DomainService,
  StorageService: window.StorageService,
  ViewModels: window.ViewModels,
  EntityGraphView: window.EntityGraphView,
  MarkdownDatasetLoader: window.MarkdownDatasetLoader,
  d3: window.d3
};

const store = createStore({ legacy });
const ui = createStatusUi({ legacy });
const dom = createDomUtils();

const ctx = {
  store,
  services,
  ui,
  dom,
  legacy,
  getState: () => store.getState(),
  setState: next => store.setState(next),
  update: updater => store.update(updater),
  subscribe: fn => store.subscribe(fn),
  setStatus: (...args) => ui.setStatus?.(...args),
  showFatalImportError: (...args) => ui.showFatalImportError?.(...args),
  clearFatalImportError: (...args) => ui.clearFatalImportError?.(...args),
  get ViewModels() {
    return services.ViewModels;
  },
  tabs: movementEngineerGlobal.tabs || {},
  actions: movementEngineerGlobal.actions || {},
  components: movementEngineerGlobal.components || {}
};

movementEngineerGlobal.ctx = ctx;
movementEngineerGlobal.store = store;
movementEngineerGlobal.ui = ui;
movementEngineerGlobal.dom = dom;
movementEngineerGlobal.services = services;

if (legacy) {
  legacy.context = ctx;
}

registerComparisonTab(ctx);
registerNotesTab(ctx);
