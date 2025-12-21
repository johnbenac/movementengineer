import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { initShell } from './shell.js';

function createDom() {
  document.body.innerHTML = `
    <nav>
      <a class="tab active" data-tab="collections">Collections</a>
      <a class="tab" data-tab="claims">Claims</a>
    </nav>
    <section class="tab-panel active" data-tab-panel="collections"></section>
    <section class="tab-panel" data-tab-panel="claims"></section>
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

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('initShell', () => {
  beforeEach(() => {
    createDom();
  });

  afterEach(() => {
    const shell = window.__MODULE_SHELL_INITIALIZED__;
    shell?.destroy?.();
    document.body.innerHTML = '';
    delete window.__MODULE_SHELL_INITIALIZED__;
  });

  it('renders the initially active tab', async () => {
    const ctx = createCtx();
    const shell = initShell(ctx);

    await Promise.resolve();

    expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(1);
    expect(shell.getActiveTabName()).toBe('collections');
  });

  it('activates and renders a tab when clicked', async () => {
    const ctx = createCtx();
    initShell(ctx);

    const claimsTab = document.querySelector('.tab[data-tab="claims"]');
    click(claimsTab);
    await flush();

    expect(claimsTab.classList.contains('active')).toBe(true);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(1);
  });

  it('mounts only once per tab and unmounts the previous tab on switch', async () => {
    const ctx = createCtx();
    initShell(ctx);

    const claimsTab = document.querySelector('.tab[data-tab="claims"]');
    click(claimsTab);
    await flush();
    click(claimsTab);
    await flush();

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.unmount).not.toHaveBeenCalled();

    const collectionsTab = document.querySelector('.tab[data-tab="collections"]');
    click(collectionsTab);
    await Promise.resolve();

    expect(ctx.tabs.claims.unmount).toHaveBeenCalledTimes(1);
  });

  it('calls showFatalImportError when rendering throws', async () => {
    const ctx = createCtx();
    const error = new Error('boom');
    ctx.tabs.collections.render.mockImplementation(() => {
      throw error;
    });

    initShell(ctx);
    await flush();

    expect(ctx.ui.showFatalImportError).toHaveBeenCalledWith(error);
  });

  it('clears fatal banner before a successful render', async () => {
    const ctx = createCtx();
    initShell(ctx);
    await flush();

    expect(ctx.ui.clearFatalImportError).toHaveBeenCalled();
    const clearOrder = ctx.ui.clearFatalImportError.mock.invocationCallOrder[0];
    const renderOrder = ctx.tabs.collections.render.mock.invocationCallOrder[0];
    expect(clearOrder).toBeLessThan(renderOrder);
  });
});
