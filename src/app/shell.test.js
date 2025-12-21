import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { initShell } from './shell.js';

const baseDom = `
  <nav class="tabs">
    <a class="tab active" data-tab="collections">Collections</a>
    <a class="tab" data-tab="claims">Claims</a>
  </nav>
  <section class="tab-panel active" id="tab-collections"></section>
  <section class="tab-panel" id="tab-claims"></section>
`;

function buildCtx(overrides = {}) {
  return {
    tabs: {
      collections: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() },
      claims: { mount: vi.fn(), render: vi.fn(), unmount: vi.fn() }
    },
    ui: {
      showFatalImportError: vi.fn(),
      clearFatalImportError: vi.fn()
    },
    ...overrides
  };
}

describe('initShell', () => {
  let shell;
  let ctx;

  beforeEach(() => {
    document.body.innerHTML = baseDom;
    ctx = buildCtx();
    shell = initShell(ctx);
  });

  afterEach(() => {
    shell?.destroy?.();
    shell = null;
    delete window.__MODULE_SHELL__;
    delete window.__MODULE_SHELL_INITIALIZED__;
  });

  it('renders the active tab on init', async () => {
    await vi.waitFor(() => {
      expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(1);
    });
  });

  it('activates and renders a tab when clicking', async () => {
    const claimsTab = document.querySelector('.tab[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.waitFor(() => {
      expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(1);
    });

    expect(claimsTab.classList.contains('active')).toBe(true);
    const panel = document.getElementById('tab-claims');
    expect(panel.classList.contains('active')).toBe(true);
  });

  it('mounts a tab only once per activation', async () => {
    await shell.renderActiveTab();
    await shell.renderActiveTab();

    expect(ctx.tabs.collections.mount).toHaveBeenCalledTimes(1);
  });

  it('unmounts the previous tab when switching', async () => {
    await shell.renderActiveTab();

    shell.activateTab('claims');
    await shell.renderActiveTab();

    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
  });

  it('reports render errors through showFatalImportError', async () => {
    const err = new Error('boom');
    ctx.tabs.collections.render.mockImplementation(() => {
      throw err;
    });

    await shell.renderActiveTab();

    expect(ctx.ui.showFatalImportError).toHaveBeenCalledWith(err);
  });

  it('clears fatal banner before rendering', async () => {
    await shell.renderActiveTab();
    expect(ctx.ui.clearFatalImportError).toHaveBeenCalled();
  });
});
