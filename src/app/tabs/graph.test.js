import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./graph/workbench.js', () => ({
  mountGraphWorkbench: vi.fn(),
  renderGraphWorkbench: vi.fn(),
  unmountGraphWorkbench: vi.fn()
}));

import { mountGraphWorkbench, renderGraphWorkbench, unmountGraphWorkbench } from './graph/workbench.js';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="graph"></button>
    <div id="graph-workbench-root"></div>
  `;
}

function createCtx(hasLegacy = true) {
  let subscriber = null;
  return {
    legacy: hasLegacy ? {} : null,
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    get subscriber() {
      return subscriber;
    }
  };
}

describe('graph tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('delegates mounting and rendering to the workbench module', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(mountGraphWorkbench).toHaveBeenCalledWith(ctx);
    expect(renderGraphWorkbench).toHaveBeenCalledTimes(1);
  });

  it('rerenders when subscribed state changes while active', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    ctx.subscriber?.();

    expect(renderGraphWorkbench).toHaveBeenCalled();
  });

  it('unmounts the workbench when tab unmounts', async () => {
    const ctx = createCtx(false);
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.unmount(ctx);

    expect(unmountGraphWorkbench).toHaveBeenCalled();
  });

  it('still renders without legacy context', async () => {
    const ctx = createCtx(false);
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    expect(renderGraphWorkbench).toHaveBeenCalled();
  });
});
