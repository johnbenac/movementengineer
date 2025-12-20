import { createLegacyBackedStore } from './store.js';
import { createStatusApi } from './ui/status.js';
import { createDomApi } from './ui/dom.js';

window.__ME_BOOTSTRAP_FROM_MODULE = true;

function getLegacyApp() {
  return window.movementEngineerApp || null;
}

function buildServices(legacyApp) {
  if (legacyApp?.services) {
    return legacyApp.services;
  }

  return {
    DomainService: window.DomainService,
    StorageService: window.StorageService,
    ViewModels: window.ViewModels,
    EntityGraphView: window.EntityGraphView,
    MarkdownDatasetLoader: window.MarkdownDatasetLoader,
    d3: window.d3
  };
}

function createContext() {
  const legacyApp = getLegacyApp();
  const store = createLegacyBackedStore(legacyApp);
  const ui = createStatusApi({ legacy: legacyApp });
  const dom = createDomApi();

  return {
    store,
    services: buildServices(legacyApp),
    ui,
    dom,
    tabs: {},
    actions: {},
    components: {}
  };
}

const ctx = createContext();
window.__MOVEMENT_ENGINEER_CTX = ctx;

async function bootstrapFromModule() {
  const legacyApp = getLegacyApp();
  if (!legacyApp?.bootstrap) {
    console.warn('Legacy app bootstrap not available yet.');
    return;
  }

  try {
    await legacyApp.bootstrap();
  } catch (error) {
    ctx.ui.showFatalImportError(error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapFromModule();
  });
} else {
  bootstrapFromModule();
}
