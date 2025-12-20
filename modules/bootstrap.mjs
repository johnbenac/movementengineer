// modules/bootstrap.mjs
const ME = window.MovementEngineer || (window.MovementEngineer = {});
ME.tabs = ME.tabs || {};

if (!ME.ctx) {
  ME.ctx = {
    get legacy() {
      return ME.legacy;
    },
    getState() {
      return ME.legacy?.getState?.() || {};
    },
    setState(next) {
      return ME.legacy?.setState?.(next);
    },
    update(updater) {
      return ME.legacy?.update?.(updater);
    },
    subscribe(fn) {
      return ME.legacy?.subscribe?.(fn);
    },
    setStatus(text) {
      return ME.legacy?.setStatus?.(text);
    },
    showFatalImportError(err) {
      return ME.legacy?.showFatalImportError?.(err);
    },
    clearFatalImportError() {
      return ME.legacy?.clearFatalImportError?.();
    },
    // Convenience accessors:
    get ViewModels() {
      return window.ViewModels;
    }
  };
}

// Import tabs (add more as you extract them)
import './tabs/authority-tab.mjs';
