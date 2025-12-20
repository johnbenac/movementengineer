import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="canon"></button>
    <input id="library-search" />
    <button id="btn-add-text-collection"></button>
    <button id="btn-save-text-collection"></button>
    <button id="btn-delete-text-collection"></button>
    <button id="btn-add-root-text"></button>
    <button id="btn-add-existing-book"></button>
  `;
}

function createCtx() {
  const legacy = {
    renderLibraryView: vi.fn(),
    addTextCollection: vi.fn(),
    saveTextCollection: vi.fn(),
    deleteTextCollection: vi.fn(),
    addNewBookToShelf: vi.fn(),
    addExistingBookToShelf: vi.fn()
  };
  let subscriber = null;
  return {
    legacy,
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    get subscriber() {
      return subscriber;
    }
  };
}

describe('canon tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders using the legacy library renderer', async () => {
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(ctx.legacy.renderLibraryView).toHaveBeenCalledTimes(1);
  });

  it('wires canon controls to legacy actions', async () => {
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);
    tab.mount(ctx);

    document.getElementById('library-search').dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-add-text-collection').click();
    document.getElementById('btn-save-text-collection').click();
    document.getElementById('btn-delete-text-collection').click();
    document.getElementById('btn-add-root-text').click();
    document.getElementById('btn-add-existing-book').click();

    expect(ctx.legacy.renderLibraryView).toHaveBeenCalled();
    expect(ctx.legacy.addTextCollection).toHaveBeenCalled();
    expect(ctx.legacy.saveTextCollection).toHaveBeenCalled();
    expect(ctx.legacy.deleteTextCollection).toHaveBeenCalled();
    expect(ctx.legacy.addNewBookToShelf).toHaveBeenCalled();
    expect(ctx.legacy.addExistingBookToShelf).toHaveBeenCalled();
  });

  it('responds to state changes when canon tab is active', async () => {
    const ctx = createCtx();
    const { registerCanonTab } = await import('./canon.js');
    const tab = registerCanonTab(ctx);
    tab.mount(ctx);

    ctx.subscriber?.();

    expect(ctx.legacy.renderLibraryView).toHaveBeenCalled();
  });
});
