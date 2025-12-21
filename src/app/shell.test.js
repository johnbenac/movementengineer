import { beforeEach, describe, expect, test, vi } from 'vitest';
import { initShell } from './shell.js';

function buildDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="collections"></button>
    <button class="tab" data-tab="claims"></button>

    <div class="tab-panel active" data-tab-panel="collections"></div>
    <div class="tab-panel" data-tab-panel="claims"></div>
  `;
}

function buildCtx() {
  return {
    tabs: {
      collections: {
        mount: vi.fn(),
        render: vi.fn(),
        unmount: vi.fn()
      },
      claims: {
        mount: vi.fn(),
        render: vi.fn(),
        unmount: vi.fn()
      }
    },
    ui: {
      showFatalImportError: vi.fn(),
      clearFatalImportError: vi.fn()
    }
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
  delete window.__MODULE_SHELL_INITIALIZED__;
  delete window.__MODULE_SHELL_INSTANCE__;
});

describe('initShell', () => {
  test('initial render calls the active tab render', async () => {
    buildDom();
    const ctx = buildCtx();

    const shell = initShell(ctx);
    await Promise.resolve();

    expect(ctx.tabs.collections.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(1);
    expect(ctx.ui.clearFatalImportError).toHaveBeenCalled();

    shell.destroy();
  });

  test('clicking a tab activates it and renders the module', async () => {
    buildDom();
    const ctx = buildCtx();

    const shell = initShell(ctx);
    await Promise.resolve();

    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    const activeTab = document.querySelector('.tab.active');
    const activePanel = document.querySelector('.tab-panel.active');

    expect(activeTab.dataset.tab).toBe('claims');
    expect(activePanel.dataset.tabPanel).toBe('claims');
    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).toHaveBeenCalled();
    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);

    shell.destroy();
  });

  test('mount is called only when a tab is first activated', async () => {
    buildDom();
    const ctx = buildCtx();
    const shell = initShell(ctx);

    await Promise.resolve();
    await shell.renderActiveTab();

    expect(ctx.tabs.collections.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(2);

    shell.destroy();
  });

  test('unmount is called on the previous tab when switching', async () => {
    buildDom();
    const ctx = buildCtx();

    const shell = initShell(ctx);
    await Promise.resolve();

    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);

    shell.destroy();
  });

  test('render errors surface through showFatalImportError', async () => {
    buildDom();
    const ctx = buildCtx();
    const error = new Error('render boom');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ctx.tabs.collections.render.mockImplementation(() => {
      throw error;
    });

    const shell = initShell(ctx);
    await Promise.resolve();

    expect(ctx.ui.showFatalImportError).toHaveBeenCalledWith(error);

    consoleSpy.mockRestore();
    shell.destroy();
  });

  test('successful render clears the fatal banner', async () => {
    buildDom();
    const ctx = buildCtx();

    const shell = initShell(ctx);
    await Promise.resolve();

    ctx.ui.clearFatalImportError.mockClear();
    await shell.renderActiveTab();

    expect(ctx.ui.clearFatalImportError).toHaveBeenCalledTimes(1);

    shell.destroy();
  });
});
