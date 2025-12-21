import { renderLibraryView } from './canon/libraryView.js';
import {
  addTextCollection,
  saveTextCollection,
  deleteTextCollection,
  addNewBookToShelf,
  addExistingBookToShelf
} from './canon/actions.js';

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
      const listeners = [];

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'canon') return;
        rerender();
      };

      const searchInput = document.getElementById('library-search');
      addListener(searchInput, 'input', () => rerender(), listeners);

      const addShelfBtn = document.getElementById('btn-add-text-collection');
      addListener(addShelfBtn, 'click', () => {
        addTextCollection(context);
        rerender();
      }, listeners);

      const saveShelfBtn = document.getElementById('btn-save-text-collection');
      addListener(saveShelfBtn, 'click', () => {
        saveTextCollection(context);
        rerender();
      }, listeners);

      const deleteShelfBtn = document.getElementById('btn-delete-text-collection');
      addListener(deleteShelfBtn, 'click', () => {
        deleteTextCollection(context);
        rerender();
      }, listeners);

      const addRootTextBtn = document.getElementById('btn-add-root-text');
      addListener(addRootTextBtn, 'click', () => {
        addNewBookToShelf(context);
        rerender();
      }, listeners);

      const addExistingBookBtn = document.getElementById('btn-add-existing-book');
      addListener(addExistingBookBtn, 'click', () => {
        addExistingBookToShelf(context);
        rerender();
      }, listeners);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { listeners, unsubscribe, rerender };
    },
    render(context) {
      renderLibraryView(context);
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
