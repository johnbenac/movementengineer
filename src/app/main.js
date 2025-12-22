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
import { registerAuthorityTab } from './tabs/authority.js';
import { initMovements } from './ui/movements.js';
import { initShell } from './shell.js';
import { createActions } from './actions.js';
import * as valueUtils from './utils/values.js';
import * as markdownUi from './ui/markdown.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.bootstrapOptions = movementEngineerGlobal.bootstrapOptions || {};
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const {
  DomainService,
  StorageService,
  ViewModels,
  EntityGraphView,
  EntityGraphColors,
  MarkdownDatasetLoader,
  d3
} = window;

const services = {
  DomainService,
  StorageService,
  ViewModels,
  EntityGraphView,
  EntityGraphColors,
  MarkdownDatasetLoader,
  d3,
  ui: null
};

const ui = createStatusUi();
services.ui = ui;
const store = createStore({ services });
const dom = createDomUtils();

const markdown = {
  renderMarkdownPreview: markdownUi.renderMarkdownPreview,
  openMarkdownModal: markdownUi.openMarkdownModal
};

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
}

const ctx = {
  store,
  services,
  ui: {
    ...ui,
    markdown
  },
  dom,
  utils: {
    values: valueUtils
  },
  getState: () => store.getState(),
  setState: next => store.setState(next),
  update: updater => store.update(updater),
  subscribe: fn => store.subscribe(fn),
  setStatus: (...args) => ui.setStatus?.(...args),
  showFatalImportError: (...args) => ui.showFatalImportError?.(...args),
  clearFatalImportError: (...args) => ui.clearFatalImportError?.(...args),
  tabs: movementEngineerGlobal.tabs || {},
  actions: {},
  components: {}
};

ctx.actions = createActions(ctx);

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
  assertCtx(ctx);
  if (!ctx.movementsUI) {
    ctx.movementsUI = initMovements(ctx);
  }
  if (!ctx.shell) {
    ctx.shell = initShell(ctx);
  }
});
