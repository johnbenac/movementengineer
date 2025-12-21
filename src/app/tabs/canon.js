const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function addListener(el, event, handler, bucket) {
  if (!el || typeof el.addEventListener !== 'function') return;
  el.addEventListener(event, handler);
  bucket.push({ el, event, handler });
}

export function registerCanonTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const legacy =
        context?.legacy ||
        movementEngineerGlobal.legacy ||
        movementEngineerGlobal.__legacyRef ||
        {};
      const listeners = [];

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'canon') return;
        rerender();
      };

      const searchInput = document.getElementById('library-search');
      addListener(searchInput, 'input', () => legacy.renderLibraryView?.(), listeners);

      const addShelfBtn = document.getElementById('btn-add-text-collection');
      addListener(addShelfBtn, 'click', () => legacy.addTextCollection?.(), listeners);

      const saveShelfBtn = document.getElementById('btn-save-text-collection');
      addListener(saveShelfBtn, 'click', () => legacy.saveTextCollection?.(), listeners);

      const deleteShelfBtn = document.getElementById('btn-delete-text-collection');
      addListener(
        deleteShelfBtn,
        'click',
        () => legacy.deleteTextCollection?.(),
        listeners
      );

      const addRootTextBtn = document.getElementById('btn-add-root-text');
      addListener(addRootTextBtn, 'click', () => legacy.addNewBookToShelf?.(), listeners);

      const addExistingBookBtn = document.getElementById('btn-add-existing-book');
      addListener(
        addExistingBookBtn,
        'click',
        () => legacy.addExistingBookToShelf?.(),
        listeners
      );

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { listeners, unsubscribe, rerender };
    },
    render(context) {
      const legacy =
        context?.legacy || movementEngineerGlobal.legacy || movementEngineerGlobal.__legacyRef;
      if (!legacy || typeof legacy.renderLibraryView !== 'function') {
        context?.showFatalImportError?.(
          new Error('Canon tab has been migrated to ES modules. Legacy renderer missing.')
        );
        return;
      }
      legacy.renderLibraryView();
    },
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      (h.listeners || []).forEach(({ el, event, handler }) => {
        if (el && typeof el.removeEventListener === 'function') {
          el.removeEventListener(event, handler);
        }
      });
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.canon = tab;
  if (ctx?.tabs) {
    ctx.tabs.canon = tab;
  }
  return tab;
}
