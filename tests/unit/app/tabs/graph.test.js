import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/app/tabs/graph/workbench.js', () => ({
  mountGraphWorkbench: vi.fn(),
  renderGraphWorkbench: vi.fn(),
  unmountGraphWorkbench: vi.fn()
}));

import {
  mountGraphWorkbench,
  renderGraphWorkbench,
  unmountGraphWorkbench
} from '../../../../src/app/tabs/graph/workbench.js';

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
    unsubscribe
  };
}

function resetWorkbenchMocks() {
  renderGraphWorkbench.mockClear();
  mountGraphWorkbench.mockClear();
  unmountGraphWorkbench.mockClear();
}

describe('graph tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetWorkbenchMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders the module graph workbench when asked to render', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('../../../../src/app/tabs/graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    expect(renderGraphWorkbench).toHaveBeenCalledWith(ctx);
  });

  it('rerenders when subscribed state changes while active', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('../../../../src/app/tabs/graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    ctx.subscriber?.();

    expect(renderGraphWorkbench).toHaveBeenCalled();
  });

  it('mounts and unmounts the graph workbench lifecycle', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('../../../../src/app/tabs/graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    expect(mountGraphWorkbench).toHaveBeenCalledWith(ctx);

    tab.unmount(ctx);
    expect(ctx.unsubscribe).toHaveBeenCalled();
    expect(unmountGraphWorkbench).toHaveBeenCalledWith(ctx);
  });
});
