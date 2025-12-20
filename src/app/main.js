import { createStore } from './store.js';
import {
  $,
  clearElement,
  ensureSelectOptions,
  addListenerById
} from './ui/dom.js';
import {
  setStatus,
  showFatalImportError,
  clearFatalImportError,
  renderSaveBanner
} from './ui/status.js';

function readServicesFromGlobals() {
  return {
    DomainService: window.DomainService,
    StorageService: window.StorageService,
    ViewModels: window.ViewModels,
    EntityGraphView: window.EntityGraphView,
    MarkdownDatasetLoader: window.MarkdownDatasetLoader,
    d3: window.d3
  };
}

function buildContext() {
  const legacy = window.MovementEngineerLegacy || {};
  const store = createStore({
    initialState:
      typeof legacy.getState === 'function' ? legacy.getState() : {},
    getLegacyState: legacy.getState,
    setLegacyState: legacy.setState
  });

  const services = readServicesFromGlobals();
  const ui = {
    setStatus,
    showFatalImportError,
    clearFatalImportError,
    renderSaveBanner
  };
  const dom = { $, clearElement, ensureSelectOptions, addListenerById };

  const ctx = { store, services, ui, dom, legacy };
  window.__movementEngineerCtx = ctx;
  return ctx;
}

function bootstrap(ctx) {
  const legacyBootstrap = ctx.legacy && ctx.legacy.bootstrap;
  if (typeof legacyBootstrap !== 'function') return;
  const start = () => legacyBootstrap();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

const ctx = buildContext();
bootstrap(ctx);
