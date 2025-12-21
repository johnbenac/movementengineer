import {
  mountGraphWorkbench,
  renderGraphWorkbench,
  unmountGraphWorkbench
} from './graph/workbench.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

export function registerGraphTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'graph') return;
        rerender();
      };

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { unsubscribe, rerender };
      mountGraphWorkbench(context);
    },
    render(context) {
      renderGraphWorkbench(context);
    },
    unmount(context) {
      const h = this.__handlers;
      if (!h) return;
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
      unmountGraphWorkbench(context);
    }
  };

  movementEngineerGlobal.tabs.graph = tab;
  if (ctx?.tabs) {
    ctx.tabs.graph = tab;
  }
  return tab;
}
