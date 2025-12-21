import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initShell } from './shell.js';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('module shell', () => {
  let ctx;
  let shell;
  let consoleErrorSpy;

  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <button class="tab active" data-tab="collections">Collections</button>
        <button class="tab" data-tab="claims">Claims</button>
        <section id="tab-collections" class="tab-panel active"></section>
        <section id="tab-claims" class="tab-panel"></section>
      </div>
    `;

    ctx = {
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
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    shell = initShell(ctx);
  });

  afterEach(() => {
    shell?.destroy();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the initial active tab', async () => {
    await flush();
    expect(ctx.tabs.collections.render).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.collections.mount).toHaveBeenCalledTimes(1);
  });

  it('activates and renders a tab when clicked', async () => {
    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await flush();

    expect(claimsTab.classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-tab="collections"]').classList.contains('active')).toBe(
      false
    );
    expect(document.querySelector('#tab-claims').classList.contains('active')).toBe(true);
    expect(document.querySelector('#tab-collections').classList.contains('active')).toBe(false);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
  });

  it('mounts only once per tab', async () => {
    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await flush();

    expect(ctx.tabs.claims.mount).toHaveBeenCalledTimes(1);
    expect(ctx.tabs.claims.render).toHaveBeenCalledTimes(2);
  });

  it('unmounts the previous tab when switching', async () => {
    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await flush();

    expect(ctx.tabs.collections.unmount).toHaveBeenCalledTimes(1);
  });

  it('reports render errors through the fatal import UI', async () => {
    const error = new Error('boom');
    ctx.tabs.claims.render.mockImplementation(() => {
      throw error;
    });

    const claimsTab = document.querySelector('[data-tab="claims"]');
    claimsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await flush();

    expect(ctx.ui.showFatalImportError).toHaveBeenCalledWith(error);
  });

  it('clears the fatal banner before a successful render', async () => {
    ctx.tabs.claims.render.mockImplementation(() => {
      throw new Error('boom');
    });

    document.querySelector('[data-tab="claims"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await flush();

    ctx.tabs.claims.render.mockImplementation(() => {});
    ctx.ui.clearFatalImportError.mockClear();
    ctx.ui.showFatalImportError.mockClear();

    document.querySelector('[data-tab="collections"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await flush();

    expect(ctx.ui.clearFatalImportError).toHaveBeenCalled();
    expect(ctx.ui.showFatalImportError).not.toHaveBeenCalled();
  });
});
