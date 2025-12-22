import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initShell } from '../../../src/app/shell.js';

function buildDom(active = 'collections') {
  document.body.innerHTML = `
    <nav>
      <a class="tab ${active === 'collections' ? 'active' : ''}" data-tab="collections">Collections</a>
      <a class="tab ${active === 'claims' ? 'active' : ''}" data-tab="claims">Claims</a>
    </nav>
    <div class="tab-panel ${active === 'collections' ? 'active' : ''}" id="tab-collections" data-tab-panel="collections"></div>
    <div class="tab-panel ${active === 'claims' ? 'active' : ''}" id="tab-claims" data-tab-panel="claims"></div>
  `;
}

function createCtx() {
  return {
    tabs: {
      collections: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() },
      claims: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() }
    },
    ui: {
      showFatalImportError: vi.fn(),
      clearFatalImportError: vi.fn()
    }
  };
}

function resetShell() {
  const g = window.MovementEngineer;
  if (g?.__moduleShell?.destroy) {
    g.__moduleShell.destroy();
  }
  if (g) {
    delete g.__moduleShell;
    delete g.shell;
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetShell();
  document.body.innerHTML = '';
});

afterEach(() => {
  resetShell();
  document.body.innerHTML = '';
});

describe('module shell', () => {
  it('renders the active tab on init', async () => {
    buildDom('collections');
    const ctx = createCtx();

    const shell = initShell(ctx);
    await shell.initialRender;

    expect(ctx.tabs.collections.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).not.toHaveBeenCalled();
  });

  it('activates and renders a tab when clicked', async () => {
    buildDom('collections');
    const ctx = createCtx();
    const shell = initShell(ctx);
    await shell.initialRender;

    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);
    expect(claimsTab.classList.contains('active')).toBe(true);
    expect(document.querySelector('#tab-claims').classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-tab="collections"]').classList.contains('active')).toBe(false);
    expect(document.querySelector('#tab-collections').classList.contains('active')).toBe(false);
  });

  it('mounts a tab only once per activation', async () => {
    buildDom('collections');
    const ctx = createCtx();
    const shell = initShell(ctx);
    await shell.initialRender;

    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(2);
  });

  it('unmounts the previous tab when switching', async () => {
    buildDom('collections');
    const ctx = createCtx();
    const shell = initShell(ctx);
    await shell.initialRender;

    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);
  });

  it('reports render errors through the fatal import banner', async () => {
    buildDom('collections');
    const ctx = createCtx();
    const error = new Error('boom');
    ctx.tabs.collections.render.mockImplementation(() => {
      throw error;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const shell = initShell(ctx);
    await shell.initialRender;

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(ctx.ui.showFatalImportError).toHaveBeenCalledWith(error);
  });

  it('clears the fatal banner before rendering', async () => {
    buildDom('collections');
    const ctx = createCtx();

    const shell = initShell(ctx);
    await shell.initialRender;

    const clearOrder = ctx.ui.clearFatalImportError.mock.invocationCallOrder[0];
    const renderOrder = ctx.tabs.collections.render.mock.invocationCallOrder[0];

    expect(clearOrder).toBeLessThan(renderOrder);
  });
});
