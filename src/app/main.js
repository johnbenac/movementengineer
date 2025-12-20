import { createStore, syncStoreFromLegacy } from './store.js';
import { createStatusApi } from '../ui/status.js';
import { createDomUtils } from '../ui/dom.js';

const BOOTSTRAP_FLAG = '__MOVEMENT_ENGINEER_BOOTSTRAP__';
const BOOTSTRAP_MODE = 'module';

window[BOOTSTRAP_FLAG] = BOOTSTRAP_MODE;

function getLegacyApp() {
  return window.MovementEngineerLegacyApp;
}

function getServices() {
  return {
    DomainService: window.DomainService,
    StorageService: window.StorageService,
    ViewModels: window.ViewModels,
    EntityGraphView: window.EntityGraphView,
    MarkdownDatasetLoader: window.MarkdownDatasetLoader,
    d3: window.d3
  };
}

function createContext(legacyApp) {
  const dom = createDomUtils(legacyApp);
  const ui = createStatusApi({ legacyApp });
  const store = createStore(
    legacyApp && typeof legacyApp.getState === 'function'
      ? legacyApp.getState()
      : {}
  );

  return {
    store,
    services: getServices(),
    ui,
    dom,
    legacy: legacyApp
  };
}

async function bootstrap() {
  const legacyApp = getLegacyApp();
  if (!legacyApp) {
    console.warn(
      '[MovementEngineer] Legacy UI bootstrap not found; nothing to initialize.'
    );
    return;
  }

  const ctx = createContext(legacyApp);
  window.MovementEngineerContext = ctx;

  if (typeof legacyApp.init !== 'function') return;

  try {
    await legacyApp.init();
    syncStoreFromLegacy(ctx.store, legacyApp);
  } catch (error) {
    ctx.ui.showFatalImportError(error);
    throw error;
  }
}

function handleBootstrapError(error) {
  console.error('[MovementEngineer] Bootstrap failed', error);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch(handleBootstrapError);
  });
} else {
  bootstrap().catch(handleBootstrapError);
}
