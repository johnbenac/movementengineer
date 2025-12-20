import { createStore } from './store.js';
import { createStatusUi } from './ui/status.js';
import { createDomUtils } from './ui/dom.js';
import { registerComparisonTab } from './tabs/comparison.js';

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

const ctx = movementEngineerGlobal.ctx || {};
ctx.store = store;
ctx.services = services;
ctx.ui = ui;
ctx.dom = dom;
ctx.tabs = movementEngineerGlobal.tabs || ctx.tabs || {};
ctx.actions = movementEngineerGlobal.actions || ctx.actions || {};
ctx.components = movementEngineerGlobal.components || ctx.components || {};
ctx.getState = ctx.getState || store.getState;
ctx.setState = ctx.setState || store.setState;
ctx.update = ctx.update || store.update;
ctx.subscribe = ctx.subscribe || store.subscribe;
const viewModelsDescriptor = Object.getOwnPropertyDescriptor(ctx, 'ViewModels');
if (viewModelsDescriptor?.get && !viewModelsDescriptor.set) {
  Object.defineProperty(ctx, 'ViewModels', {
    value: viewModelsDescriptor.get(),
    writable: true,
    configurable: true,
    enumerable: viewModelsDescriptor.enumerable !== false
  });
} else if (!viewModelsDescriptor || viewModelsDescriptor.writable || viewModelsDescriptor.set) {
  ctx.ViewModels = ctx.ViewModels || services.ViewModels;
}

movementEngineerGlobal.ctx = ctx;
movementEngineerGlobal.tabs = ctx.tabs;
movementEngineerGlobal.store = store;
movementEngineerGlobal.ui = ui;
movementEngineerGlobal.dom = dom;
movementEngineerGlobal.services = services;

if (legacy) {
  legacy.context = ctx;
}

registerComparisonTab(ctx);
