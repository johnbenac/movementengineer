const ME = window.MovementEngineer || (window.MovementEngineer = {});
ME.tabs = ME.tabs || {};

const ctx =
  ME.ctx ||
  (ME.ctx = {
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
    ViewModels: window.ViewModels
  });

if (!ctx.tabs) {
  ctx.tabs = ME.tabs;
} else if (ctx.tabs !== ME.tabs) {
  ME.tabs = ctx.tabs;
}

const vmDescriptor = Object.getOwnPropertyDescriptor(ctx, 'ViewModels');
if (vmDescriptor?.get && !vmDescriptor.set) {
  Object.defineProperty(ctx, 'ViewModels', {
    value: vmDescriptor.get(),
    writable: true,
    configurable: true,
    enumerable: vmDescriptor.enumerable !== false
  });
} else if (!vmDescriptor) {
  ctx.ViewModels = window.ViewModels;
}

import './tabs/authority-tab.mjs';
