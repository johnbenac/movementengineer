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
      mountGraphWorkbench(context);
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'graph') return;
        rerender();
      };

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { unsubscribe, rerender };
    },
    render(context) {
      renderGraphWorkbench(context);
    },
    unmount(context) {
      const h = this.__handlers;
      if (h?.unsubscribe) h.unsubscribe();
      unmountGraphWorkbench(context);
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.graph = tab;
  if (ctx?.tabs) {
    ctx.tabs.graph = tab;
  }
  return tab;
}
