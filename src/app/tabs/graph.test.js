import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./graph/workbench.js', () => ({
  mountGraphWorkbench: vi.fn(),
  renderGraphWorkbench: vi.fn(),
  unmountGraphWorkbench: vi.fn()
}));

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="graph"></button>
    <div id="graph-workbench-root"></div>
  `;
}

function createCtx() {
  let subscriber = null;
  const unsubscribe = vi.fn();
  return {
    subscribe: fn => {
      subscriber = fn;
      return unsubscribe;
    },
    get subscriber() {
      return subscriber;
    },
    get unsubscribe() {
      return unsubscribe;
    }
  };
}

describe('graph tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('mounts and renders the graph workbench module', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const { mountGraphWorkbench, renderGraphWorkbench } = await import('./graph/workbench.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(mountGraphWorkbench).toHaveBeenCalledWith(ctx);
    expect(renderGraphWorkbench).toHaveBeenCalledWith(ctx);
  });

  it('rerenders when subscribed state changes while active', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const { renderGraphWorkbench } = await import('./graph/workbench.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    ctx.subscriber?.();

    expect(renderGraphWorkbench).toHaveBeenCalled();
  });

  it('cleans up on unmount', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const { unmountGraphWorkbench } = await import('./graph/workbench.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.unmount(ctx);

    expect(unmountGraphWorkbench).toHaveBeenCalledWith(ctx);
    expect(ctx.unsubscribe).toHaveBeenCalled();
  });
});
