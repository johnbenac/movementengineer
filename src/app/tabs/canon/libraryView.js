import {
  HINT_TEXT,
  createHint,
  guardMissingViewModels,
  guardNoMovement
} from '../../ui/hints.js';
import { collectDescendants, normaliseArray, parseCsvInput } from '../../utils/values.js';
import { renderMarkdownPreview, openMarkdownModal } from '../../ui/markdown.js';
import { deleteTextCollection, persistCanonItem } from './actions.js';
import { createChipTile } from '../../ui/chips.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function getState(ctx) {
  return ctx.store.getState() || {};
}

function applyState(ctx, updater) {
  if (typeof ctx?.update === 'function') {
    return ctx.update(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next || prev;
    });
  }
  if (typeof ctx?.setState === 'function') {
    const prev = typeof ctx?.getState === 'function' ? ctx.getState() : {};
    const next = typeof updater === 'function' ? updater(prev) : updater;
    return ctx.setState(next || prev);
  }
  return null;
}

function getDomainService(ctx) {
  return ctx.services.DomainService;
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function getActions(ctx) {
  return ctx.actions;
}

function setStatus(ctx, text) {
  if (typeof ctx?.setStatus === 'function') return ctx.setStatus(text);
  if (typeof ctx?.store?.setStatus === 'function') return ctx.store.setStatus(text);
  return null;
}

function normalizeVm(vm) {
  return {
    ...vm,
    shelves: Array.isArray(vm?.shelves) ? vm.shelves : [],
    shelvesById: vm?.shelvesById || {},
    unshelvedBookIds: Array.isArray(vm?.unshelvedBookIds) ? vm.unshelvedBookIds : [],
    booksById: vm?.booksById || {},
    nodesById: vm?.nodesById || {},
    tocChildrenByParentId: vm?.tocChildrenByParentId || new Map(),
    searchResults: Array.isArray(vm?.searchResults) ? vm.searchResults : [],
    shelvesByBookId: vm?.shelvesByBookId || {},
    bookIdByNodeId: vm?.bookIdByNodeId || {}
  };
}

function renderEmptyHint(text) {
  return createHint(text, { extraClasses: ['library-empty'] });
}

export function renderLibraryView(ctx) {
  const clear = ctx.dom.clearElement;
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const selection = {
    currentMovementId: state.currentMovementId || null,
    currentShelfId: state.currentShelfId || null,
    currentBookId: state.currentBookId || null,
    currentTextId: state.currentTextId || null
  };

  const shelfList = document.getElementById('shelf-list');
  const bookList = document.getElementById('book-list');
  const tocTree = document.getElementById('toc-tree');
  const shelfEditor = document.getElementById('shelf-editor');
  const textEditor = document.getElementById('text-editor');
  const breadcrumb = document.getElementById('library-breadcrumb');
  const searchResults = document.getElementById('library-search-results');

  if (!shelfList || !bookList || !tocTree || !shelfEditor || !textEditor) return;

  clear(shelfList);
  clear(bookList);
  clear(tocTree);
  clear(shelfEditor);
  clear(textEditor);
  if (breadcrumb) clear(breadcrumb);
  if (searchResults) {
    clear(searchResults);
    searchResults.classList.remove('visible');
  }

  if (
    guardNoMovement({
      movementId: selection.currentMovementId,
      wrappers: [shelfList, bookList, tocTree, textEditor],
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED,
      hintOptions: { extraClasses: ['library-empty'] }
    })
  )
    return;

  const ViewModels = getViewModels(ctx);
  if (
    guardMissingViewModels({
      ok: ViewModels && typeof ViewModels.buildLibraryEditorViewModel === 'function',
      wrappers: [shelfList, bookList, tocTree, textEditor],
      dom: ctx.dom,
      hintOptions: { extraClasses: ['library-empty'] }
    })
  )
    return;

  const searchQuery = document.getElementById('library-search')?.value || '';
  const buildVm = params =>
    ViewModels.buildLibraryEditorViewModel(snapshot, {
      movementId: selection.currentMovementId,
      activeShelfId: selection.currentShelfId,
      activeBookId: selection.currentBookId,
      activeNodeId: selection.currentTextId,
      searchQuery,
      ...params
    });

  let vm = normalizeVm(buildVm());
  let nextShelfId = selection.currentShelfId;
  let nextBookId = selection.currentBookId;
  let nextTextId = selection.currentTextId;

  if (!nextShelfId && vm.shelves.length) {
    nextShelfId = vm.shelves[0].id;
  }
  const activeShelf = nextShelfId ? vm.shelvesById[nextShelfId] : null;
  const activeShelfBookIds = Array.isArray(activeShelf?.bookIds) ? activeShelf.bookIds : [];
  if (!nextBookId && activeShelf && activeShelfBookIds.length) {
    nextBookId = activeShelfBookIds[0];
  }
  if (!nextTextId && nextBookId) {
    nextTextId = nextBookId;
  }

  const selectionChanged =
    nextShelfId !== selection.currentShelfId ||
    nextBookId !== selection.currentBookId ||
    nextTextId !== selection.currentTextId;

  if (selectionChanged) {
    selection.currentShelfId = nextShelfId;
    selection.currentBookId = nextBookId;
    selection.currentTextId = nextTextId;
    applyState(ctx, prev => ({
      ...prev,
      currentShelfId: nextShelfId,
      currentBookId: nextBookId,
      currentTextId: nextTextId
    }));
    vm = normalizeVm(
      buildVm({
        activeShelfId: nextShelfId,
        activeBookId: nextBookId,
        activeNodeId: nextTextId
      })
    );
  }

  renderLibrarySearchResults(ctx, vm, selection);
  renderShelfPane(ctx, vm, selection);
  renderBooksPane(ctx, vm, selection);
  renderTocPane(ctx, vm, selection);
  renderNodeEditor(ctx, vm, selection);
}

function renderLibrarySearchResults(ctx, vm, selection) {
  const resultsEl = document.getElementById('library-search-results');
  const searchInput = document.getElementById('library-search');
  if (!resultsEl || !searchInput) return;

  const query = (searchInput.value || '').trim();
  const clear = ctx.dom.clearElement;
  clear(resultsEl);
  resultsEl.classList.remove('visible');

  if (!query) return;

  resultsEl.classList.add('visible');

  if (!vm.searchResults || !vm.searchResults.length) {
    const li = document.createElement('li');
    li.className = 'library-search-item muted';
    li.textContent = 'No matches.';
    resultsEl.appendChild(li);
    return;
  }

  vm.searchResults
    .slice(0, 200)
    .sort((a, b) => (a.pathLabel || '').localeCompare(b.pathLabel || ''))
    .forEach(result => {
      const li = document.createElement('li');
      li.className = 'library-search-item';

      const path = document.createElement('div');
      path.className = 'path';
      path.textContent = result.pathLabel || result.nodeId;
      li.appendChild(path);

      const meta = document.createElement('div');
      meta.className = 'meta';
      const shelfName =
        result.shelfIds && result.shelfIds.length
          ? vm.shelvesById[result.shelfIds[0]]?.name || result.shelfIds[0]
          : null;
      const bits = [result.nodeId];
      if (shelfName) bits.push(`Shelf: ${shelfName}`);
      if (result.bookId && result.bookId !== result.nodeId) bits.push(result.bookId);
      meta.textContent = bits.join(' · ');
      li.appendChild(meta);

      li.addEventListener('click', () => {
        const targetShelf =
          (result.shelfIds && result.shelfIds[0]) ||
          (vm.shelvesByBookId[result.bookId]?.[0] || selection.currentShelfId);
        applyState(ctx, prev => ({
          ...prev,
          currentShelfId: targetShelf || prev.currentShelfId,
          currentBookId: result.bookId || result.nodeId || prev.currentBookId,
          currentTextId: result.nodeId || prev.currentTextId
        }));
        renderLibraryView(ctx);
        setTimeout(() => scrollTocNodeIntoView(result.nodeId), 0);
      });

      resultsEl.appendChild(li);
    });
}

function renderShelfPane(ctx, vm, selection) {
  const clear = ctx.dom.clearElement;
  const shelfList = document.getElementById('shelf-list');
  const unshelvedList = document.getElementById('unshelved-list');
  const shelfHint = document.getElementById('shelf-hint');
  clear(shelfList);
  if (unshelvedList) clear(unshelvedList);
  if (shelfHint) {
    shelfHint.textContent = vm.shelves.length
      ? 'Choose a shelf to browse its books.'
      : 'Create your first shelf to start organising books.';
  }

  if (!vm.shelves.length) {
    shelfList.appendChild(renderEmptyHint('No shelves yet.'));
  }

  vm.shelves.forEach(shelf => {
    const card = createChipTile({
      className: ['shelf-card', shelf.id === selection.currentShelfId ? 'active' : '']
        .filter(Boolean)
        .join(' '),
      title: shelf.name || 'Untitled shelf',
      meta: `${shelf.bookCount} books · ${shelf.textCount} texts`,
      target: { kind: 'item', collection: 'textCollections', id: shelf.id }
    });
    shelfList.appendChild(card);
  });

  if (unshelvedList) {
    if (vm.unshelvedBookIds.length === 0) {
      unshelvedList.appendChild(renderEmptyHint('All books are on shelves.'));
    } else {
      vm.unshelvedBookIds.forEach(id => {
        const node = vm.nodesById[id];
        if (!node) return;
        const card = createChipTile({
          className: 'shelf-card',
          title: node.title || 'Untitled book',
          target: { kind: 'item', collection: 'texts', id }
        });
        unshelvedList.appendChild(card);
      });
    }
  }
}

function renderBooksPane(ctx, vm, selection) {
  const clear = ctx.dom.clearElement;
  const bookList = document.getElementById('book-list');
  const titleEl = document.getElementById('books-pane-title');
  const hintEl = document.getElementById('books-pane-hint');
  clear(bookList);
  const activeShelf = selection.currentShelfId ? vm.shelvesById[selection.currentShelfId] : null;
  if (titleEl) titleEl.textContent = activeShelf ? activeShelf.name : 'Books';
  if (hintEl) {
    hintEl.textContent = activeShelf
      ? 'Select a book to view its table of contents.'
      : 'Pick a shelf to see its books.';
  }

  if (!activeShelf) {
    bookList.appendChild(renderEmptyHint('No shelf selected.'));
    return;
  }

  const activeShelfBookIds = Array.isArray(activeShelf.bookIds) ? activeShelf.bookIds : [];

  if (!activeShelfBookIds.length) {
    bookList.appendChild(renderEmptyHint('No books on this shelf yet.'));
  }

  activeShelfBookIds.forEach(id => {
    const book = vm.booksById[id];
    const node = vm.nodesById[id];
    if (!book || !node) return;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove from shelf';
    removeBtn.dataset.chipAction = 'true';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      removeBookFromShelf(ctx, activeShelf.id, id);
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete book';
    deleteBtn.className = 'danger';
    deleteBtn.dataset.chipAction = 'true';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteBookAndDescendants(ctx, id);
    });

    const shelfCount = book.shelves.length;
    const card = createChipTile({
      className: ['book-card', id === selection.currentBookId ? 'active' : '']
        .filter(Boolean)
        .join(' '),
      title: `${node.label ? node.label + ' ' : ''}${node.title || 'Untitled'}`,
      meta: `${book.descendantCount} sections · ${book.contentCount} with content${
        shelfCount > 1 ? ` · also on ${shelfCount - 1} shelf(s)` : ''
      }`,
      actions: [removeBtn, deleteBtn],
      target: { kind: 'item', collection: 'texts', id }
    });
    bookList.appendChild(card);
  });
}

function renderTocPane(ctx, vm, selection) {
  const clear = ctx.dom.clearElement;
  const tocTree = document.getElementById('toc-tree');
  clear(tocTree);
  const rootId = vm.tocRootId;
  if (!rootId) {
    tocTree.appendChild(renderEmptyHint('Select a book to see its chapters.'));
    return;
  }

  const renderNode = (id, depth) => {
    const node = vm.nodesById[id];
    if (!node) return null;
    const wrapper = document.createElement('div');
    wrapper.style.paddingLeft = depth * 12 + 'px';
    const row = document.createElement('div');
    row.className = 'toc-node';
    row.dataset.nodeId = id;
    if (id === selection.currentTextId) row.classList.add('active');
    const label = document.createElement('span');
    label.className = 'toc-label';
    label.textContent = node.label || '';
    row.appendChild(label);
    const title = document.createElement('span');
    title.textContent = node.title || 'Untitled';
    row.appendChild(title);
    const meta = document.createElement('span');
    meta.className = 'toc-meta';
    const bits = [];
    if (Number.isFinite(node.depth)) bits.push(`depth ${node.depth}`);
    if (node.mainFunction) bits.push(node.mainFunction);
    if (node.hasContent) bits.push('has content');
    meta.textContent = bits.join(' · ');
    row.appendChild(meta);
    row.addEventListener('click', () => {
      applyState(ctx, prev => ({
        ...prev,
        currentTextId: id,
        currentBookId: vm.bookIdByNodeId[id] || prev.currentBookId
      }));
      renderLibraryView(ctx);
    });
    wrapper.appendChild(row);
    (vm.tocChildrenByParentId.get(id) || []).forEach(childId => {
      const child = renderNode(childId, depth + 1);
      if (child) wrapper.appendChild(child);
    });
    return wrapper;
  };

  const rendered = renderNode(rootId, 0);
  if (rendered) tocTree.appendChild(rendered);
}

function scrollTocNodeIntoView(nodeId) {
  if (!nodeId) return;
  const tocTree = document.getElementById('toc-tree');
  if (!tocTree) return;
  const safeId =
    typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(nodeId) : nodeId.replace(/"/g, '\\"');
  const target = tocTree.querySelector(`.toc-node[data-node-id="${safeId}"]`);
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function renderNodeEditor(ctx, vm, selection) {
  const clear = ctx.dom.clearElement;
  const shelfEditor = document.getElementById('shelf-editor');
  const textEditor = document.getElementById('text-editor');
  const breadcrumb = document.getElementById('library-breadcrumb');
  clear(shelfEditor);
  clear(textEditor);
  if (breadcrumb) clear(breadcrumb);

  const state = getState(ctx);
  const dom = ctx.dom;
  const snapshot = state.snapshot || {};
  const currentMovementId = state.currentMovementId || selection.currentMovementId;
  const actions = getActions(ctx);
  const DomainService = getDomainService(ctx);
  const ViewModels = getViewModels(ctx);
  const activeShelf = selection.currentShelfId ? vm.shelvesById[selection.currentShelfId] : null;
  const activeNode = selection.currentTextId ? vm.nodesById[selection.currentTextId] : null;

  if (breadcrumb && activeNode) {
    breadcrumb.textContent = vm.searchResults?.length
      ? ''
      : vm.bookIdByNodeId[activeNode.id]
      ? 'Shelf view'
      : '';
  }

  if (activeShelf) {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = activeShelf.name || '';
    nameInput.placeholder = 'Shelf name';
    const desc = document.createElement('textarea');
    desc.rows = 3;
    desc.value = activeShelf.description || '';
    desc.placeholder = 'Description';
    const save = document.createElement('button');
    save.textContent = 'Save shelf';
    save.addEventListener('click', () => {
      if (!DomainService?.upsertItem) return;
      const nextSnapshot = ctx.persistence.cloneSnapshot();
      DomainService.upsertItem(nextSnapshot, 'textCollections', {
        ...(nextSnapshot.textCollections || []).find(tc => tc.id === activeShelf.id),
        name: nameInput.value,
        description: desc.value
      });
      persistCanonItem(ctx, nextSnapshot, { show: false });
      setStatus(ctx, 'Shelf saved');
      renderLibraryView(ctx);
    });
    const del = document.createElement('button');
    del.textContent = 'Delete shelf';
    del.className = 'danger';
    del.addEventListener('click', () => {
      deleteTextCollection(ctx, activeShelf.id);
      renderLibraryView(ctx);
    });
    shelfEditor.appendChild(nameInput);
    shelfEditor.appendChild(desc);
    const row = document.createElement('div');
    row.className = 'inline-actions';
    row.appendChild(save);
    row.appendChild(del);
    shelfEditor.appendChild(row);
  } else {
    shelfEditor.appendChild(renderEmptyHint('Select a shelf to edit metadata.'));
  }

  if (!activeNode) {
    textEditor.appendChild(renderEmptyHint('Select a book or chapter to edit.'));
    return;
  }

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = activeNode.title || '';
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.value = activeNode.label || '';
  const depthBadge = document.createElement('span');
  depthBadge.className = 'code-pill';
  depthBadge.textContent = Number.isFinite(activeNode.depth) ? `Depth ${activeNode.depth}` : 'Depth —';
  const mainFunctionInput = document.createElement('input');
  mainFunctionInput.type = 'text';
  mainFunctionInput.value = activeNode.mainFunction || '';
  const tagsInput = document.createElement('input');
  tagsInput.type = 'text';
  tagsInput.value = normaliseArray(activeNode.tags).join(', ');
  const mentionsInput = document.createElement('input');
  mentionsInput.type = 'text';
  mentionsInput.value = normaliseArray(activeNode.mentionsEntityIds).join(', ');
  const contentInput = document.createElement('textarea');
  contentInput.className = 'markdown-input form-control';
  contentInput.rows = 8;
  contentInput.value = activeNode.content || '';
  const contentPreview = document.createElement('div');
  contentPreview.className = 'markdown-preview-panel';
  renderMarkdownPreview(contentPreview, contentInput.value || '', { enabled: true });
  contentInput.addEventListener('input', () => {
    renderMarkdownPreview(contentPreview, contentInput.value, { enabled: true });
  });

  const parentSelect = document.createElement('select');
  const parentOptions = Object.values(vm.nodesById)
    .filter(n => n.id !== activeNode.id)
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  const rootOpt = document.createElement('option');
  rootOpt.value = '';
  rootOpt.textContent = 'Root (book)';
  parentSelect.appendChild(rootOpt);
  parentOptions.forEach(node => {
    const opt = document.createElement('option');
    opt.value = node.id;
    opt.textContent = `${node.label ? node.label + ' ' : ''}${node.title || ''}`;
    if (node.id === activeNode.parentId) opt.selected = true;
    parentSelect.appendChild(opt);
  });

  const shelfMembership = document.createElement('div');
  if (!activeNode.parentId && vm.shelves.length) {
    const label = document.createElement('div');
    label.textContent = 'Shelves containing this book:';
    shelfMembership.appendChild(label);
    vm.shelves.forEach(shelf => {
      const row = document.createElement('label');
      row.className = 'inline';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = (vm.shelvesByBookId[activeNode.id] || []).includes(shelf.id);
      cb.addEventListener('change', () => {
        toggleBookMembership(ctx, shelf.id, activeNode.id, cb.checked);
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(' ' + (shelf.name || 'Shelf')));
      shelfMembership.appendChild(row);
    });
  }

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    if (!DomainService?.upsertItem || !ViewModels?.buildLibraryEditorViewModel) return;
    const nextSnapshot = ctx.persistence.cloneSnapshot();
    const parentId = parentSelect.value || null;
    const vmLatest = ViewModels.buildLibraryEditorViewModel(nextSnapshot, {
      movementId: currentMovementId
    });
    const descendants = collectDescendants(activeNode.id, vmLatest.nodesById, new Set());
    if (parentId && descendants.has(parentId)) {
      window.alert?.('Cannot set a descendant as the parent.');
      return;
    }
    DomainService.upsertItem(nextSnapshot, 'texts', {
      ...(() => {
        const existing = (nextSnapshot.texts || []).find(t => t.id === activeNode.id) || {};
        const { level: _legacyLevel, ...rest } = existing;
        return rest;
      })(),
      title: titleInput.value,
      label: labelInput.value,
      mainFunction: mainFunctionInput.value || null,
      parentId,
      tags: parseCsvInput(tagsInput.value),
      mentionsEntityIds: parseCsvInput(mentionsInput.value),
      content: contentInput.value
    });
    persistCanonItem(ctx, nextSnapshot, { show: false });
    setStatus(ctx, 'Saved');
    renderLibraryView(ctx);
  });

  const addChildBtn = document.createElement('button');
  addChildBtn.textContent = 'Add child';
  addChildBtn.addEventListener('click', () => {
    if (!DomainService?.addNewItem || !currentMovementId) return;
    const nextSnapshot = ctx.persistence.cloneSnapshot();
    const text = DomainService.addNewItem(nextSnapshot, 'texts', currentMovementId);
    text.parentId = activeNode.id;
    text.title = 'New section';
    applyState(ctx, prev => ({
      ...prev,
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || prev.currentBookId
    }));
    persistCanonItem(ctx, nextSnapshot, { show: false });
    renderLibraryView(ctx);
  });

  const addSiblingBtn = document.createElement('button');
  addSiblingBtn.textContent = 'Add sibling';
  addSiblingBtn.addEventListener('click', () => {
    if (!DomainService?.addNewItem || !currentMovementId) return;
    const nextSnapshot = ctx.persistence.cloneSnapshot();
    const text = DomainService.addNewItem(nextSnapshot, 'texts', currentMovementId);
    text.parentId = activeNode.parentId || null;
    text.title = 'New section';
    applyState(ctx, prev => ({
      ...prev,
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || prev.currentBookId
    }));
    persistCanonItem(ctx, nextSnapshot, { show: false });
    renderLibraryView(ctx);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'danger';
  deleteBtn.addEventListener('click', () => deleteBookAndDescendants(ctx, activeNode.id));

  [
    { label: 'Title', field: titleInput },
    { label: 'Label', field: labelInput },
    { label: 'Depth (derived)', field: depthBadge },
    { label: 'Main function', field: mainFunctionInput },
    { label: 'Tags (comma separated)', field: tagsInput },
    { label: 'Mentions entity IDs', field: mentionsInput },
    { label: 'Parent', field: parentSelect }
  ].forEach(row => {
    const wrapper = document.createElement('div');
    const labelEl = document.createElement('div');
    labelEl.className = 'section-heading small';
    labelEl.textContent = row.label;
    wrapper.appendChild(labelEl);
    wrapper.appendChild(row.field);
    textEditor.appendChild(wrapper);
  });

  const contentRow = document.createElement('div');
  contentRow.className = 'form-row markdown-row';

  const contentHeader = document.createElement('div');
  contentHeader.className = 'markdown-row-header';
  const contentLabel = document.createElement('span');
  contentLabel.textContent = 'Content';
  contentHeader.appendChild(contentLabel);

  const contentActions = document.createElement('div');
  contentActions.className = 'markdown-row-actions';
  const openMarkdownBtn = document.createElement('button');
  openMarkdownBtn.type = 'button';
  openMarkdownBtn.textContent = 'Open markdown editor';
  openMarkdownBtn.addEventListener('click', () => {
    openMarkdownModal({
      title: 'Edit text content',
      initial: contentInput.value,
      onSave: value => {
        contentInput.value = value;
        renderMarkdownPreview(contentPreview, value, { enabled: true });
      },
      onClose: () => {
        renderMarkdownPreview(contentPreview, contentInput.value, { enabled: true });
      }
    });
  });
  contentActions.appendChild(openMarkdownBtn);
  contentHeader.appendChild(contentActions);

  const contentGrid = document.createElement('div');
  contentGrid.className = 'markdown-editor-grid';
  contentGrid.appendChild(contentInput);
  contentGrid.appendChild(contentPreview);

  contentRow.appendChild(contentHeader);
  contentRow.appendChild(contentGrid);
  textEditor.appendChild(contentRow);

  if (shelfMembership.childNodes.length) textEditor.appendChild(shelfMembership);

  const actionsRow = document.createElement('div');
  actionsRow.className = 'inline-actions';
  actionsRow.appendChild(saveBtn);
  actionsRow.appendChild(addChildBtn);
  actionsRow.appendChild(addSiblingBtn);
  actionsRow.appendChild(deleteBtn);
  textEditor.appendChild(actionsRow);

  if (activeNode.mentionsEntities?.length) {
    dom.appendChipRow(textEditor, activeNode.mentionsEntities, {
      variant: 'entity',
      getLabel: ent => ent.name || ent.id,
      getTarget: ent => ({ kind: 'item', collection: 'entities', id: ent.id })
    });
  }

  if (activeNode.referencedByClaims?.length) {
    dom.appendChipRow(textEditor, activeNode.referencedByClaims, {
      getLabel: claim => claim.text || claim.id,
      getTarget: claim => ({ kind: 'item', collection: 'claims', id: claim.id })
    });
  }

  if (activeNode.usedInEvents?.length) {
    dom.appendChipRow(textEditor, activeNode.usedInEvents, {
      getLabel: evt => evt.name || evt.id,
      getTarget: evt => ({ kind: 'item', collection: 'events', id: evt.id })
    });
  }
}

function toggleBookMembership(ctx, shelfId, bookId, shouldExist) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const DomainService = getDomainService(ctx);
  const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return;
  const roots = new Set(normaliseArray(shelf.rootTextIds));
  if (shouldExist) roots.add(bookId);
  else roots.delete(bookId);
  shelf.rootTextIds = Array.from(roots);
  DomainService?.upsertItem?.(snapshot, 'textCollections', shelf);
  if (!shouldExist && state.currentShelfId === shelfId && state.currentBookId === bookId) {
    const nextBookId = shelf.rootTextIds[0] || null;
    applyState(ctx, prev => ({
      ...prev,
      currentBookId: nextBookId,
      currentTextId: nextBookId
    }));
  }
  persistCanonItem(ctx, snapshot, { show: false });
}

function removeBookFromShelf(ctx, shelfId, bookId) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const DomainService = getDomainService(ctx);
  const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return;
  shelf.rootTextIds = normaliseArray(shelf.rootTextIds).filter(id => id !== bookId);
  DomainService?.upsertItem?.(snapshot, 'textCollections', shelf);
  applyState(ctx, prev => {
    if (prev.currentShelfId !== shelfId || prev.currentBookId !== bookId) return prev;
    const nextBookId = shelf.rootTextIds[0] || null;
    return {
      ...prev,
      currentBookId: nextBookId,
      currentTextId: nextBookId
    };
  });
  persistCanonItem(ctx, snapshot, { show: false });
  setStatus(ctx, 'Book removed from shelf');
  renderLibraryView(ctx);
}

function deleteBookAndDescendants(ctx, bookId) {
  const state = getState(ctx);
  const snapshot = ctx.persistence.cloneSnapshot();
  const ViewModels = getViewModels(ctx);
  const DomainService = getDomainService(ctx);
  if (!ViewModels?.buildLibraryEditorViewModel || !DomainService?.deleteItem) return;
  const vm = ViewModels.buildLibraryEditorViewModel(snapshot, {
    movementId: state.currentMovementId
  });
  const descendants = Array.from(collectDescendants(bookId, vm.nodesById, new Set()));
  const ok =
    typeof window === 'undefined' ||
    window.confirm?.(
      `Delete this text and ${descendants.length - 1} descendant(s)? This cannot be undone.`
    );
  if (!ok) return;
  const descendantSet = new Set(descendants);
  descendants.forEach(id => DomainService.deleteItem(snapshot, 'texts', id));
  (snapshot.textCollections || []).forEach(tc => {
    tc.rootTextIds = normaliseArray(tc.rootTextIds).filter(id => !descendantSet.has(id));
  });
  applyState(ctx, prev => ({
    ...prev,
    currentTextId: descendantSet.has(prev.currentTextId) ? null : prev.currentTextId,
    currentBookId: descendantSet.has(prev.currentBookId) ? null : prev.currentBookId
  }));
  persistCanonItem(ctx, snapshot, { show: true });
  renderLibraryView(ctx);
}
