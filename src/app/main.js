import { createStore } from './store.js';
import { createStatusUi } from './ui/status.js';
import { createDomUtils } from './ui/dom.js';
import { registerComparisonTab } from './tabs/comparison.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.bootstrapOptions = movementEngineerGlobal.bootstrapOptions || {};
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
