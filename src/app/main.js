import { createStore } from './store.js';
import { createStatusUi } from './ui/status.js';
import { createDomUtils } from './ui/dom.js';
import { registerDashboardTab } from './tabs/dashboard.js';
import { registerComparisonTab } from './tabs/comparison.js';
import { registerNotesTab } from './tabs/notes.js';
import { registerPracticesTab } from './tabs/practices.js';
import { registerClaimsTab } from './tabs/claims.js';
import { registerRulesTab } from './tabs/rules.js';
import { registerMediaTab } from './tabs/media.js';
import { registerCanonTab } from './tabs/canon.js';
import { registerGraphTab } from './tabs/graph.js';
import { registerEntitiesTab } from './tabs/entities.js';
import { registerCalendarTab } from './tabs/calendar.js';
import { registerCollectionsTab } from './tabs/collections.js';
import { initShell } from './shell.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.bootstrapOptions = movementEngineerGlobal.bootstrapOptions || {};
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};
if (typeof movementEngineerGlobal.bootstrapOptions.legacyAutoInit === 'undefined') {
  movementEngineerGlobal.bootstrapOptions.legacyAutoInit = true;
}
movementEngineerGlobal.bootstrapOptions.__mode =
  movementEngineerGlobal.bootstrapOptions.__mode ||
  (movementEngineerGlobal.bootstrapOptions.legacyFree ? 'legacy-free' : 'legacy-on');
if (!document.documentElement.dataset.meMode && movementEngineerGlobal.bootstrapOptions.__mode) {
  document.documentElement.dataset.meMode = movementEngineerGlobal.bootstrapOptions.__mode;
}

const legacy = movementEngineerGlobal.__legacyRef || movementEngineerGlobal.legacy;
const services = {
  DomainService: window.DomainService,
  StorageService: window.StorageService,
  ViewModels: window.ViewModels,
  EntityGraphView: window.EntityGraphView,
  MarkdownDatasetLoader: window.MarkdownDatasetLoader,
  d3: window.d3,
  ui: null
};

const ui = createStatusUi({ legacy });
services.ui = ui;
const store = createStore({ services });
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

function mirrorLegacyState(nextState = {}) {
  store.setState(prev => ({
    ...prev,
    snapshot: nextState.snapshot || prev.snapshot,
    currentMovementId:
      typeof nextState.currentMovementId === 'undefined'
        ? prev.currentMovementId
        : nextState.currentMovementId,
    currentCollectionName: nextState.currentCollectionName || prev.currentCollectionName,
    currentItemId:
      typeof nextState.currentItemId === 'undefined'
        ? prev.currentItemId
        : nextState.currentItemId,
    currentTextId:
      typeof nextState.currentTextId === 'undefined'
        ? prev.currentTextId
        : nextState.currentTextId,
    currentShelfId:
      typeof nextState.currentShelfId === 'undefined'
        ? prev.currentShelfId
        : nextState.currentShelfId,
    canonFilters: nextState.canonFilters || prev.canonFilters,
    navigation: nextState.navigation || prev.navigation,
    graphWorkbenchState: nextState.graphWorkbenchState || prev.graphWorkbenchState,
    flags: nextState.flags || prev.flags
  }));
}

const enabledTabs = movementEngineerGlobal.bootstrapOptions?.moduleTabs;
const shouldEnable = name =>
  !Array.isArray(enabledTabs) ||
  enabledTabs.includes(name) ||
  (name === 'collections' && enabledTabs.includes('data'));

if (shouldEnable('dashboard')) registerDashboardTab(ctx);
if (shouldEnable('comparison')) registerComparisonTab(ctx);
if (shouldEnable('notes')) registerNotesTab(ctx);
if (shouldEnable('practices')) registerPracticesTab(ctx);
if (shouldEnable('claims')) registerClaimsTab(ctx);
if (shouldEnable('rules')) registerRulesTab(ctx);
if (shouldEnable('media')) registerMediaTab(ctx);
if (shouldEnable('canon')) registerCanonTab(ctx);
if (shouldEnable('graph')) registerGraphTab(ctx);
if (shouldEnable('entities')) registerEntitiesTab(ctx);
if (shouldEnable('calendar')) registerCalendarTab(ctx);
if (shouldEnable('collections')) registerCollectionsTab(ctx);

function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

onReady(() => {
  if (legacy?.subscribe) {
    mirrorLegacyState(legacy.getState?.());
    legacy.subscribe(mirrorLegacyState);
  }
  if (movementEngineerGlobal.bootstrapOptions.legacyFree && typeof legacy?.init === 'function') {
    legacy.init();
  }
  if (!ctx.shell) {
    ctx.shell = initShell(ctx);
  }
});

document.addEventListener(
  'DOMContentLoaded',
  () => {
    movementEngineerGlobal.bootstrapOptions.__mode = 'legacy-free';
    movementEngineerGlobal.bootstrapOptions.legacyAutoInit = false;
    document.documentElement.dataset.meMode = 'legacy-free';
    if (legacy) {
      movementEngineerGlobal.__legacyRef = legacy;
      movementEngineerGlobal.legacy = null;
    }
  },
  { once: true }
);
