import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mountGraphWorkbench,
  renderGraphWorkbench,
  unmountGraphWorkbench
} from './graph/workbench.js';

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

  return {
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

  it('renders through the ES module graph workbench', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(mountGraphWorkbench).toHaveBeenCalledWith(ctx);
    expect(renderGraphWorkbench).toHaveBeenCalledWith(ctx);
  });

  it('rerenders when subscribed state changes while active', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    ctx.subscriber?.();

    expect(renderGraphWorkbench).toHaveBeenCalledTimes(1);
  });

  it('unmounts the workbench when the tab is deactivated', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    const unsubscribe = vi.fn();
    ctx.subscribe = () => unsubscribe;

    tab.mount(ctx);
    tab.unmount(ctx);

    expect(unmountGraphWorkbench).toHaveBeenCalledWith(ctx);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
