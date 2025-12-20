import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="graph"></button>
    <div id="graph-workbench-root"></div>
  `;
}

function createCtx(hasLegacy = true) {
  let subscriber = null;
  const legacy = hasLegacy
    ? {
        renderGraphWorkbench: vi.fn()
      }
    : null;

  return {
    legacy,
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    showFatalImportError: vi.fn(),
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

  it('delegates rendering to the legacy graph workbench', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(ctx.legacy.renderGraphWorkbench).toHaveBeenCalledTimes(1);
  });

  it('rerenders when subscribed state changes while active', async () => {
    const ctx = createCtx();
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.mount(ctx);
    ctx.subscriber?.();

    expect(ctx.legacy.renderGraphWorkbench).toHaveBeenCalled();
  });

  it('shows a fatal error when legacy renderer is missing', async () => {
    const ctx = createCtx(false);
    const { registerGraphTab } = await import('./graph.js');
    const tab = registerGraphTab(ctx);

    tab.render(ctx);

    expect(ctx.showFatalImportError).toHaveBeenCalled();
  });
});
