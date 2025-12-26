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
import { registerCollectionsTab } from './tabs/collections.js';
import { registerAuthorityTab } from './tabs/authority.js';
import { registerGenericCrudTab } from './tabs/genericCrud.js';
import { PluginProvider } from '../core/plugins/PluginProvider.js';
import { createPluginRegistry } from '../core/plugins/pluginRegistry.js';
import { registerBuiltInPlugins } from '../plugins/registerBuiltins.js';
import { initMovements } from './ui/movements.js';
import { initShell } from './shell.js';
import { createActions } from './actions.js';
import { renderMarkdownPreview, openMarkdownModal } from './ui/markdown.js';
import { createPersistenceFacade } from './persistenceFacade.js';
import {
  collectDescendants,
  normaliseArray,
  parseCsvInput,
  uniqueSorted
} from './utils/values.js';

function assertCtx(ctx) {
  if (!ctx?.store?.getState) throw new Error('ctx.store.getState missing');
  if (!ctx?.services?.DomainService) throw new Error('ctx.services.DomainService missing');
  if (!ctx?.services?.ViewModels) throw new Error('ctx.services.ViewModels missing');
  if (!ctx?.dom?.clearElement) throw new Error('ctx.dom.clearElement missing');
  if (!ctx?.dom?.ensureSelectOptions) throw new Error('ctx.dom.ensureSelectOptions missing');
  if (!ctx?.dom?.ensureMultiSelectOptions)
    throw new Error('ctx.dom.ensureMultiSelectOptions missing');
  if (!ctx?.ui?.setStatus) throw new Error('ctx.ui.setStatus missing');
  if (!ctx?.ui?.markdown?.renderMarkdownPreview)
    throw new Error('ctx.ui.markdown.renderMarkdownPreview missing');
  if (!ctx?.ui?.markdown?.openMarkdownModal)
    throw new Error('ctx.ui.markdown.openMarkdownModal missing');
  if (!ctx?.actions?.openTarget) throw new Error('ctx.actions.openTarget missing');
  if (!ctx?.actions?.openItem) throw new Error('ctx.actions.openItem missing');
  if (!ctx?.actions?.openFacet) throw new Error('ctx.actions.openFacet missing');
  if (!ctx?.persistence?.commitSnapshot)
    throw new Error('ctx.persistence.commitSnapshot missing');
}

const movementEngineerGlobal = (globalThis.MovementEngineer ||= {});
movementEngineerGlobal.bootstrapOptions = movementEngineerGlobal.bootstrapOptions || {};
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const {
  DomainService,
  StorageService,
  ViewModels,
  EntityGraphView,
  EntityGraphColors,
  MovementEngineerColors,
  MarkdownDatasetLoader,
  d3
} = globalThis;

const services = {
  DomainService,
  StorageService,
  ViewModels,
  EntityGraphView,
  EntityGraphColors,
  MovementEngineerColors,
  MarkdownDatasetLoader,
  d3
};

const statusUi = createStatusUi();
const ui = {
  ...statusUi,
  markdown: {
    renderMarkdownPreview,
    openMarkdownModal
  }
};
services.ui = ui;

const dom = createDomUtils();
const utils = {
  values: {
    parseCsvInput,
    normaliseArray,
    uniqueSorted,
    collectDescendants
  }
};
const store = createStore({ services });

const ctx = {
  store,
  services,
  ui,
  dom,
  utils,
  getState: () => store.getState(),
  setState: next => store.setState(next),
  update: updater => store.update(updater),
  subscribe: fn => store.subscribe(fn),
  setStatus: (...args) => ui.setStatus?.(...args),
  showFatalImportError: (...args) => ui.showFatalImportError?.(...args),
  clearFatalImportError: (...args) => ui.clearFatalImportError?.(...args),
  tabs: movementEngineerGlobal.tabs || {},
  actions: {},
  persistence: null
};

ctx.persistence = createPersistenceFacade({
  getState: () => store.getState(),
  setState: next => store.setState(next),
  getSnapshot: () => store.getState()?.snapshot || {},
  setSnapshot: nextSnapshot =>
    store.setState(prev => ({
      ...prev,
      snapshot: nextSnapshot || {}
    })),
  persistSnapshot: snapshot => services.StorageService?.saveSnapshot?.(snapshot),
  ensureAllCollections: snapshot => services.StorageService?.ensureAllCollections?.(snapshot),
  setStatus: (...args) => ui.setStatus?.(...args),
  defaultShow: true
});

ctx.actions = {
  ...createActions(ctx)
};

movementEngineerGlobal.ctx = ctx;

ctx.dom.installGlobalChipHandler?.(ctx);

assertCtx(ctx);

const modelRegistry = globalThis.ModelRegistry || null;
const plugins = createPluginRegistry();
registerBuiltInPlugins(plugins, { modelRegistry });
plugins.finalize();
PluginProvider({ plugins });
ctx.plugins = plugins;

const enabledTabs = movementEngineerGlobal.bootstrapOptions?.moduleTabs;
const shouldEnable = name =>
  !Array.isArray(enabledTabs) ||
  enabledTabs.includes(name) ||
  (name === 'collections' && enabledTabs.includes('data'));

ctx.actions.selectMovement = function selectMovement(movementId) {
  const state = ctx.getState();
  const snapshot = state.snapshot || {};
  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
  const movement =
    movements.find(m => m?.id === movementId || m?.movementId === movementId) || null;
  if (!movement) return;
  const canonicalId = movement.id || movement.movementId || movementId;

  ctx.store.setState(prev => ({
    ...prev,
    currentMovementId: canonicalId,
    currentItemId: null,
    currentTextId: null,
    currentShelfId: null,
    currentBookId: null,
    facetExplorer: null,
    navigation: { stack: [], index: -1 }
  }));

  ctx.shell?.renderActiveTab?.();
};

if (shouldEnable('authority')) registerAuthorityTab(ctx);
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
if (shouldEnable('collections')) registerCollectionsTab(ctx);
registerGenericCrudTab(ctx);

function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

onReady(() => {
  if (!ctx.movementsUI) {
    ctx.movementsUI = initMovements(ctx);
  }
  if (!ctx.shell) {
    ctx.shell = initShell(ctx);
  }
});
