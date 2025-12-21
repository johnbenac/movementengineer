import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initShell } from './shell.js';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="collections"></button>
    <button class="tab" data-tab="claims"></button>
    <section class="tab-panel active" id="tab-collections"></section>
    <section class="tab-panel" id="tab-claims"></section>
  `;
}

function createCtx() {
  const ctx = {
    tabs: {
      collections: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() },
      claims: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() }
    },
    ui: {
      showFatalImportError: vi.fn(),
      clearFatalImportError: vi.fn()
    },
    actions: {}
  };

  return ctx;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('module shell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    document.body.innerHTML = '';
    window.location.hash = '';
    const me = window.MovementEngineer || (window.MovementEngineer = {});
    me.tabs = {};
    me.bootstrapOptions = {};
    delete me.__moduleShell;
  });

  it('renders the initially active tab', async () => {
    renderDom();
    const ctx = createCtx();

    const shell = initShell(ctx);
    await flushPromises();

    expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(1);
    expect(shell.getActiveTabName()).toBe('collections');

    shell.destroy();
  });

  it('activates and renders the clicked tab', async () => {
    renderDom();
    const ctx = createCtx();
    const shell = initShell(ctx);
    await flushPromises();

    const claimsTab = document.querySelector('.tab[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(1);
    expect(claimsTab.classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-claims').classList.contains('active')).toBe(true);

    shell.destroy();
  });

  it('mounts a tab only once per activation', async () => {
    renderDom();
    const ctx = createCtx();
    const shell = initShell(ctx);
    await flushPromises();

    const claimsTab = document.querySelector('.tab[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);

    shell.destroy();
  });

  it('unmounts the previous tab when switching', async () => {
    renderDom();
    const ctx = createCtx();
    const shell = initShell(ctx);
    await flushPromises();

    document.querySelector('.tab[data-tab="claims"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await flushPromises();

    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);

    shell.destroy();
  });

  it('shows fatal import errors from render failures', async () => {
    renderDom();
    const ctx = createCtx();
    const error = new Error('boom');
    ctx.tabs.claims.render = vi.fn(() => {
      throw error;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const shell = initShell(ctx);
    await flushPromises();

    document.querySelector('.tab[data-tab="claims"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await flushPromises();

    expect(ctx.ui.showFatalImportError).toHaveBeenCalledWith(error);
    consoleSpy.mockRestore();
    shell.destroy();
  });

  it('clears the fatal banner before successful render attempts', async () => {
    renderDom();
    const ctx = createCtx();
    const shell = initShell(ctx);
    await flushPromises();
    ctx.ui.clearFatalImportError.mockClear();

    document.querySelector('.tab[data-tab="claims"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await flushPromises();

    expect(ctx.ui.clearFatalImportError).toHaveBeenCalled();

    shell.destroy();
  });
});
