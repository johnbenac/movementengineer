import { renderLibraryView } from './canon/libraryView.js';
import {
  addTextCollection,
  saveTextCollection,
  deleteTextCollection,
  addNewBookToShelf,
  addExistingBookToShelf
} from './canon/actions.js';
import { createTab } from './tabKit.js';

export function registerCanonTab(ctx) {
  ctx?.dom?.installGlobalChipHandler?.(ctx);

  return createTab(ctx, {
    name: 'canon',
    render: renderLibraryView,
    setup: ({ bucket, rerender, ctx: context }) => {
      const on = (id, event, handler) => {
        const el = document.getElementById(id);
        if (!el) return;
        bucket.on(el, event, handler);
      };

      on('library-search', 'input', () => rerender({ immediate: true }));

      on('btn-add-text-collection', 'click', () => {
        addTextCollection(context);
        rerender({ immediate: true });
      });

      on('btn-save-text-collection', 'click', () => {
        saveTextCollection(context);
        rerender({ immediate: true });
      });

      on('btn-delete-text-collection', 'click', () => {
        deleteTextCollection(context);
        rerender({ immediate: true });
      });

      on('btn-add-root-text', 'click', () => {
        addNewBookToShelf(context);
        rerender({ immediate: true });
      });

      on('btn-add-existing-book', 'click', () => {
        addExistingBookToShelf(context);
        rerender({ immediate: true });
      });
    }
  });
}
