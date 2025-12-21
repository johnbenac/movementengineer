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
import { initMovements } from './ui/movements.js';

const DEFAULT_CANON_FILTERS = {
  search: '',
  tag: '',
  mention: '',
  parent: '',
  child: ''
};

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
movementEngineerGlobal.actions = ctx.actions;

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

function syncLegacySelectionIfPresent(movementId) {
  const legacyRef = movementEngineerGlobal.__legacyRef || movementEngineerGlobal.legacy;
  if (!legacyRef) return;
  try {
    const storeState = ctx.getState();
    const nextLegacyState = {
      ...(legacyRef.getState?.() || {}),
      snapshot: storeState.snapshot,
      currentMovementId: movementId
    };
    if (typeof legacyRef.setState === 'function') {
      legacyRef.setState(nextLegacyState);
    } else if (typeof legacyRef.update === 'function') {
      legacyRef.update(() => nextLegacyState);
    }
  } catch (err) {
    console.error('Failed syncing movement selection to legacy', err);
  }
}

ctx.actions.selectMovement =
  ctx.actions.selectMovement ||
  function selectMovement(movementId) {
    const state = ctx.getState();
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const movement =
      movements.find(m => m?.id === movementId || m?.movementId === movementId) || null;
    if (!movement) return;
    ctx.store.setState(prev => ({
      ...prev,
      currentMovementId: movement.id,
      currentItemId: null,
      currentTextId: null,
      currentShelfId: null,
      currentBookId: null,
      canonFilters: { ...DEFAULT_CANON_FILTERS },
      navigation: { stack: [], index: -1 }
    }));
    ctx.shell?.renderActiveTab?.();
    syncLegacySelectionIfPresent(movement.id);
  };

ctx.actions.addMovement =
  ctx.actions.addMovement ||
  function addMovement(overrides = {}) {
    const DomainService = ctx.services?.DomainService || window.DomainService;
    const state = ctx.getState();
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const nextSnapshot = { ...snapshot, movements: [...movements] };
    const newMovement = DomainService?.addMovement
      ? DomainService.addMovement(nextSnapshot, overrides)
      : (() => {
          const id =
            overrides.id ||
            DomainService?.generateId?.('mov-') ||
            window.crypto?.randomUUID?.() ||
            `mov-${Date.now()}`;
          const movement = {
            id,
            movementId: overrides.movementId || id,
            name: overrides.name || 'New Movement',
            shortName: overrides.shortName || 'New',
            summary: overrides.summary || '',
            notes: overrides.notes ?? null,
            tags: overrides.tags || []
          };
          nextSnapshot.movements.push(movement);
          return movement;
        })();
    const newMovementId = newMovement?.id;
    ctx.store.setState(prev => ({
      ...prev,
      snapshot: nextSnapshot,
      currentMovementId: newMovementId,
      currentItemId: null,
      currentTextId: null,
      currentShelfId: null,
      currentBookId: null,
      navigation: { stack: [], index: -1 }
    }));
    ctx.store.markDirty('movement');
    ctx.store.saveSnapshot({ clearMovementDirty: true, clearItemDirty: false, show: true });
    ctx.shell?.renderActiveTab?.();
    if (newMovementId) syncLegacySelectionIfPresent(newMovementId);
    return newMovement;
  };

ctx.actions.deleteMovement =
  ctx.actions.deleteMovement ||
  function deleteMovement(movementId, options = {}) {
    const DomainService = ctx.services?.DomainService || window.DomainService;
    const state = ctx.getState();
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const targetId = movementId || state.currentMovementId;
    if (!targetId) return null;
    const movement = movements.find(m => m?.id === targetId);
    if (!movement) return null;
    const shouldDelete =
      options.confirmDelete === false
        ? true
        : options.confirmDelete?.(movement) ??
          window.confirm?.(
            'Delete this movement AND all data with this movementId?\n\n' +
              (movement.name || movement.id) +
              '\n\nThis cannot be undone.'
          );
    if (!shouldDelete) return null;

    const nextSnapshot = { ...snapshot, movements: [...movements] };
    const collections = DomainService?.COLLECTIONS_WITH_MOVEMENT_ID || [];
    collections.forEach(name => {
      if (Array.isArray(snapshot[name])) {
        nextSnapshot[name] = [...snapshot[name]];
      }
    });
    const fallbackMovementId = DomainService?.deleteMovement
      ? DomainService.deleteMovement(nextSnapshot, targetId)
      : (() => {
          nextSnapshot.movements = nextSnapshot.movements.filter(m => m.id !== targetId);
          return nextSnapshot.movements[0]?.id || null;
        })();
    ctx.store.setState(prev => ({
      ...prev,
      snapshot: nextSnapshot,
      currentMovementId: fallbackMovementId,
      currentItemId: null,
      currentTextId: null,
      currentShelfId: null,
      currentBookId: null,
      navigation: { stack: [], index: -1 }
    }));
    ctx.store.markDirty('movement');
    ctx.store.saveSnapshot({ clearMovementDirty: true, clearItemDirty: false, show: true });
    ctx.shell?.renderActiveTab?.();
    syncLegacySelectionIfPresent(fallbackMovementId);
    return fallbackMovementId;
  };

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
  if (!ctx.movementsUI) {
    ctx.movementsUI = initMovements(ctx);
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
