import { beforeEach, describe, expect, it, vi } from 'vitest';

const workbenchMocks = {
  mountGraphWorkbench: vi.fn(),
  renderGraphWorkbench: vi.fn(),
  unmountGraphWorkbench: vi.fn()
};

vi.mock('./graph/workbench.js', () => workbenchMocks);

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

  it('renders using the ES module workbench', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(workbenchMocks.mountGraphWorkbench).toHaveBeenCalledWith(ctx);
    expect(workbenchMocks.renderGraphWorkbench).toHaveBeenCalledWith(ctx);
  });

  it('rerenders when subscribed state changes while active', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    ctx.subscriber?.();

    expect(workbenchMocks.renderGraphWorkbench).toHaveBeenCalled();
  });

  it('unsubscribes and unmounts workbench on unmount', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.unmount(ctx);

    expect(ctx.unsubscribe).toHaveBeenCalled();
    expect(workbenchMocks.unmountGraphWorkbench).toHaveBeenCalledWith(ctx);
  });
});
