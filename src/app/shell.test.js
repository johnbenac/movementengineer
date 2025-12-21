import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initShell } from './shell.js';

let shell;

function resetGlobal() {
  const global = window.MovementEngineer || (window.MovementEngineer = {});
  Object.keys(global).forEach(key => {
    delete global[key];
  });
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function renderDom(active = 'collections') {
  document.body.innerHTML = `
    <nav class="tabs">
      <a class="tab ${active === 'collections' ? 'active' : ''}" data-tab="collections">Collections</a>
      <a class="tab ${active === 'claims' ? 'active' : ''}" data-tab="claims">Claims</a>
      <a class="tab ${active === 'broken' ? 'active' : ''}" data-tab="broken">Broken</a>
    </nav>
    <div class="tab-panel ${active === 'collections' ? 'active' : ''}" data-tab-panel="collections"></div>
    <div class="tab-panel ${active === 'claims' ? 'active' : ''}" data-tab-panel="claims"></div>
    <div class="tab-panel ${active === 'broken' ? 'active' : ''}" data-tab-panel="broken"></div>
  `;
}

function createCtx(overrides = {}) {
  return {
    tabs: {
      collections: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() },
      claims: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() },
      broken: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() },
      ...overrides.tabs
    },
    ui: {
      showFatalImportError: vi.fn(),
      clearFatalImportError: vi.fn(),
      ...overrides.ui
    },
    ...overrides.ctx
  };
}

beforeEach(() => {
  resetGlobal();
  document.body.innerHTML = '';
  location.hash = '';
});

afterEach(() => {
  shell?.destroy?.();
  resetGlobal();
  document.body.innerHTML = '';
  location.hash = '';
  shell = null;
});

describe('initShell', () => {
  it('renders the initially active tab', () => {
    renderDom('collections');
    const ctx = createCtx();

    shell = initShell(ctx);
    return flushPromises().then(() => {
      expect(ctx.ui.clearFatalImportError).toHaveBeenCalledTimes(1);
      expect(ctx.tabs.collections.mount).toHaveBeenCalledTimes(1);
      expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.tab.active')?.dataset.tab).toBe('collections');
      expect(document.querySelector('.tab-panel.active')?.dataset.tabPanel).toBe('collections');
    });
  });

  it('activates and renders a tab when clicked', async () => {
    renderDom('collections');
    const ctx = createCtx();

    shell = initShell(ctx);
    await flushPromises();
    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.tab.active')?.dataset.tab).toBe('claims');
    expect(document.querySelector('.tab-panel.active')?.dataset.tabPanel).toBe('claims');
  });

  it('only mounts a tab once per activation', async () => {
    renderDom('collections');
    const ctx = createCtx();

    shell = initShell(ctx);
    await flushPromises();
    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(2);
  });

  it('unmounts the previous tab when switching', async () => {
    renderDom('collections');
    const ctx = createCtx();

    shell = initShell(ctx);
    await flushPromises();
    document.querySelector('[data-tab="claims"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);
  });

  it('shows a fatal import error when rendering fails', async () => {
    renderDom('collections');
    const ctx = createCtx({
      tabs: {
        claims: {
          mount: vi.fn(),
          render: vi.fn(() => {
            throw new Error('boom');
          }),
          unmount: vi.fn()
        }
      }
    });

    shell = initShell(ctx);
    await flushPromises();
    document.querySelector('[data-tab="claims"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(ctx.ui.showFatalImportError).toHaveBeenCalledTimes(1);
  });

  it('clears fatal import errors before a successful render', async () => {
    renderDom('claims');
    const renderMock = vi.fn().mockImplementationOnce(() => {
      throw new Error('first render fails');
    });
    const ctx = createCtx({
      tabs: {
        claims: { mount: vi.fn(), render: renderMock, unmount: vi.fn() }
      }
    });

    shell = initShell(ctx);
    await flushPromises();
    renderMock.mockImplementation(() => {});
    document.querySelector('[data-tab="collections"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(ctx.ui.clearFatalImportError).toHaveBeenCalledTimes(2);
    expect(ctx.ui.showFatalImportError).toHaveBeenCalledTimes(1);
  });
});
