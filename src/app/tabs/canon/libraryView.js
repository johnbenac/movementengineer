import { renderMarkdownPreview, openMarkdownModal } from '../../ui/markdown.js';
import { collectDescendants, normaliseArray, parseCsvInput } from '../../utils/values.js';
import { deleteTextCollection, saveTextCollection } from './actions.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function updateState(ctx, updater) {
  if (typeof ctx?.update === 'function') return ctx.update(updater);
  if (typeof ctx?.store?.update === 'function') return ctx.store.update(updater);
  return null;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
}

function persistCanonItem(ctx, { show = false } = {}) {
  ctx?.store?.markDirty?.('item');
  ctx?.store?.saveSnapshot?.({
    show,
    clearItemDirty: true,
    clearMovementDirty: false
  });
}

function renderEmptyHint(text) {
  const p = document.createElement('p');
  p.className = 'library-empty';
  p.textContent = text;
  return p;
}

export function renderLibraryView(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const currentMovementId = state.currentMovementId || null;
  let currentShelfId = state.currentShelfId || null;
  let currentBookId = state.currentBookId || null;
  let currentTextId = state.currentTextId || null;

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

  if (!currentMovementId) {
    shelfList.appendChild(renderEmptyHint('Create or select a movement first.'));
    bookList.appendChild(renderEmptyHint('Choose a movement to see books.'));
    tocTree.appendChild(renderEmptyHint('No table of contents to show.'));
    textEditor.appendChild(renderEmptyHint('Select a movement to edit texts.'));
    return;
  }

  const searchQuery = document.getElementById('library-search')?.value || '';
  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildLibraryEditorViewModel !== 'function') {
    shelfList.appendChild(renderEmptyHint('Library view is unavailable.'));
    return;
  }

  const vm = ViewModels.buildLibraryEditorViewModel(snapshot, {
    movementId: currentMovementId,
    activeShelfId: currentShelfId,
    activeBookId: currentBookId,
    activeNodeId: currentTextId,
    searchQuery
  });

  if (!currentShelfId && vm.shelves.length) {
    currentShelfId = vm.shelves[0].id;
  }
  if (!currentBookId && currentShelfId && vm.shelvesById[currentShelfId]?.bookIds.length) {
    currentBookId = vm.shelvesById[currentShelfId].bookIds[0];
  }
  if (!currentTextId && currentBookId) {
    currentTextId = currentBookId;
  }

  const selectionChanged =
    currentShelfId !== state.currentShelfId ||
    currentBookId !== state.currentBookId ||
    currentTextId !== state.currentTextId;

  if (selectionChanged) {
    updateState(ctx, prev => ({
      ...prev,
      currentShelfId,
      currentBookId,
      currentTextId
    }));
  }

  const selection = { shelfId: currentShelfId, bookId: currentBookId, textId: currentTextId };
  const rerender = () => renderLibraryView(ctx);

  renderLibrarySearchResults(ctx, vm, selection, rerender);
  renderShelfPane(ctx, vm, selection, rerender);
  renderBooksPane(ctx, vm, selection, rerender);
  renderTocPane(ctx, vm, selection, rerender);
  renderNodeEditor(ctx, vm, selection, rerender);
}

function renderLibrarySearchResults(ctx, vm, selection, rerender) {
  const resultsEl = document.getElementById('library-search-results');
  const searchInput = document.getElementById('library-search');
  if (!resultsEl || !searchInput) return;

  const query = (searchInput.value || '').trim();
  while (resultsEl.firstChild) resultsEl.removeChild(resultsEl.firstChild);
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
        const shelfId = result.shelfIds?.[0]
          ? result.shelfIds[0]
          : vm.shelvesByBookId[result.bookId || result.nodeId]?.[0] || selection.shelfId;
        updateState(ctx, prev => ({
          ...prev,
          currentShelfId: shelfId || prev.currentShelfId || null,
          currentBookId: result.bookId || result.nodeId,
          currentTextId: result.nodeId
        }));
        rerender();
        setTimeout(() => scrollTocNodeIntoView(result.nodeId), 0);
      });

      resultsEl.appendChild(li);
    });
}

function renderShelfPane(ctx, vm, selection, rerender) {
  const shelfList = document.getElementById('shelf-list');
  const unshelvedList = document.getElementById('unshelved-list');
  const shelfHint = document.getElementById('shelf-hint');
  if (!shelfList) return;

  while (shelfList.firstChild) shelfList.removeChild(shelfList.firstChild);
  if (unshelvedList) {
    while (unshelvedList.firstChild) unshelvedList.removeChild(unshelvedList.firstChild);
  }
  if (shelfHint) {
    shelfHint.textContent = vm.shelves.length
      ? 'Choose a shelf to browse its books.'
      : 'Create your first shelf to start organising books.';
  }

  if (!vm.shelves.length) {
    shelfList.appendChild(renderEmptyHint('No shelves yet.'));
  }

  vm.shelves.forEach(shelf => {
    const card = document.createElement('div');
    card.className = 'shelf-card';
    if (shelf.id === selection.shelfId) card.classList.add('active');
    const title = document.createElement('div');
    title.textContent = shelf.name || 'Untitled shelf';
    card.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${shelf.bookCount} books · ${shelf.textCount} texts`;
    card.appendChild(meta);
    card.addEventListener('click', () => {
      updateState(ctx, prev => ({
        ...prev,
        currentShelfId: shelf.id,
        currentBookId: shelf.bookIds[0] || null,
        currentTextId: shelf.bookIds[0] || null
      }));
      rerender();
    });
    shelfList.appendChild(card);
  });

  if (!unshelvedList) return;

  if (vm.unshelvedBookIds.length === 0) {
    unshelvedList.appendChild(renderEmptyHint('All books are on shelves.'));
  } else {
    vm.unshelvedBookIds.forEach(id => {
      const node = vm.nodesById[id];
      if (!node) return;
      const card = document.createElement('div');
      card.className = 'shelf-card';
      card.textContent = node.title || 'Untitled book';
      card.addEventListener('click', () => {
        updateState(ctx, prev => ({ ...prev, currentBookId: id, currentTextId: id }));
        rerender();
      });
      unshelvedList.appendChild(card);
    });
  }
}

function renderBooksPane(ctx, vm, selection, rerender) {
  const bookList = document.getElementById('book-list');
  const titleEl = document.getElementById('books-pane-title');
  const hintEl = document.getElementById('books-pane-hint');
  if (!bookList) return;

  while (bookList.firstChild) bookList.removeChild(bookList.firstChild);
  const activeShelf = selection.shelfId ? vm.shelvesById[selection.shelfId] : null;
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

  if (!activeShelf.bookIds.length) {
    bookList.appendChild(renderEmptyHint('No books on this shelf yet.'));
  }

  activeShelf.bookIds.forEach(id => {
    const book = vm.booksById[id];
    const node = vm.nodesById[id];
    if (!book || !node) return;
    const card = document.createElement('div');
    card.className = 'book-card';
    if (id === selection.bookId) card.classList.add('active');
    const title = document.createElement('div');
    title.textContent = `${node.label ? node.label + ' ' : ''}${node.title || 'Untitled'}`;
    card.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const shelfCount = book.shelves.length;
    meta.textContent = `${book.descendantCount} sections · ${book.contentCount} with content${
      shelfCount > 1 ? ` · also on ${shelfCount - 1} shelf(s)` : ''
    }`;
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'inline-actions';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove from shelf';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      removeBookFromShelf(ctx, activeShelf.id, id, selection, rerender);
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete book';
    deleteBtn.className = 'danger';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteBookAndDescendants(ctx, id, selection, rerender);
    });
    actions.appendChild(removeBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    card.addEventListener('click', () => {
      updateState(ctx, prev => ({ ...prev, currentBookId: id, currentTextId: id }));
      rerender();
    });
    bookList.appendChild(card);
  });
}

function renderTocPane(ctx, vm, selection, rerender) {
  const tocTree = document.getElementById('toc-tree');
  if (!tocTree) return;
  while (tocTree.firstChild) tocTree.removeChild(tocTree.firstChild);
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
    if (id === selection.textId) row.classList.add('active');
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
      updateState(ctx, prev => ({
        ...prev,
        currentTextId: id,
        currentBookId: vm.bookIdByNodeId[id] || prev.currentBookId
      }));
      rerender();
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

function renderNodeEditor(ctx, vm, selection, rerender) {
  const shelfEditor = document.getElementById('shelf-editor');
  const textEditor = document.getElementById('text-editor');
  const breadcrumb = document.getElementById('library-breadcrumb');
  if (!shelfEditor || !textEditor) return;

  while (shelfEditor.firstChild) shelfEditor.removeChild(shelfEditor.firstChild);
  while (textEditor.firstChild) textEditor.removeChild(textEditor.firstChild);
  if (breadcrumb) while (breadcrumb.firstChild) breadcrumb.removeChild(breadcrumb.firstChild);

  const activeShelf = selection.shelfId ? vm.shelvesById[selection.shelfId] : null;
  const activeNode = selection.textId ? vm.nodesById[selection.textId] : null;

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
      saveTextCollection(ctx);
      rerender();
    });
    const del = document.createElement('button');
    del.textContent = 'Delete shelf';
    del.className = 'danger';
    del.addEventListener('click', () => {
      deleteTextCollection(ctx, activeShelf.id);
      rerender();
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
  depthBadge.textContent = Number.isFinite(activeNode.depth)
    ? `Depth ${activeNode.depth}`
    : 'Depth —';
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
        toggleBookMembership(ctx, shelf.id, activeNode.id, cb.checked, selection, rerender);
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(' ' + (shelf.name || 'Shelf')));
      shelfMembership.appendChild(row);
    });
  }

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    const parentId = parentSelect.value || null;
    const vmLatest = getViewModels(ctx)?.buildLibraryEditorViewModel?.(getState(ctx).snapshot, {
      movementId: getState(ctx).currentMovementId
    });
    const descendants = collectDescendants(activeNode.id, vmLatest?.nodesById || {}, new Set());
    if (parentId && descendants.has(parentId)) {
      window.alert?.('Cannot set a descendant as the parent.');
      return;
    }
    const DomainService = getDomainService(ctx);
    if (!DomainService?.upsertItem) return;
    const snapshot = getState(ctx).snapshot || {};
    const existing = (snapshot.texts || []).find(t => t.id === activeNode.id) || {};
    const { level: _legacyLevel, ...rest } = existing;
    DomainService.upsertItem(snapshot, 'texts', {
      ...rest,
      title: titleInput.value,
      label: labelInput.value,
      mainFunction: mainFunctionInput.value || null,
      parentId,
      tags: parseCsvInput(tagsInput.value),
      mentionsEntityIds: parseCsvInput(mentionsInput.value),
      content: contentInput.value
    });
    updateState(ctx, prev => ({ ...prev, snapshot }));
    persistCanonItem(ctx, { show: false });
    ctx?.setStatus?.('Saved');
    rerender();
  });

  const addChildBtn = document.createElement('button');
  addChildBtn.textContent = 'Add child';
  addChildBtn.addEventListener('click', () => {
    const DomainService = getDomainService(ctx);
    const snapshot = getState(ctx).snapshot || {};
    const movementId = getState(ctx).currentMovementId;
    if (!DomainService?.addNewItem || !movementId) return;
    const text = DomainService.addNewItem(snapshot, 'texts', movementId);
    text.parentId = activeNode.id;
    text.title = 'New section';
    updateState(ctx, prev => ({
      ...prev,
      snapshot,
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || prev.currentBookId
    }));
    persistCanonItem(ctx, { show: false });
    rerender();
  });

  const addSiblingBtn = document.createElement('button');
  addSiblingBtn.textContent = 'Add sibling';
  addSiblingBtn.addEventListener('click', () => {
    const DomainService = getDomainService(ctx);
    const snapshot = getState(ctx).snapshot || {};
    const movementId = getState(ctx).currentMovementId;
    if (!DomainService?.addNewItem || !movementId) return;
    const text = DomainService.addNewItem(snapshot, 'texts', movementId);
    text.parentId = activeNode.parentId || null;
    text.title = 'New section';
    updateState(ctx, prev => ({
      ...prev,
      snapshot,
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || prev.currentBookId
    }));
    persistCanonItem(ctx, { show: false });
    rerender();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'danger';
  deleteBtn.addEventListener('click', () => deleteBookAndDescendants(ctx, activeNode.id, selection, rerender));

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

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  actions.appendChild(saveBtn);
  actions.appendChild(addChildBtn);
  actions.appendChild(addSiblingBtn);
  actions.appendChild(deleteBtn);
  textEditor.appendChild(actions);

  const actionsCtx = getActions(ctx);
  if (activeNode.mentionsEntities?.length) {
    const row = document.createElement('div');
    row.className = 'chip-row';
    activeNode.mentionsEntities.forEach(ent => {
      const chip = document.createElement('span');
      chip.className = 'chip chip-entity clickable';
      chip.textContent = ent.name || ent.id;
      chip.addEventListener('click', () => actionsCtx.jumpToEntity?.(ent.id));
      row.appendChild(chip);
    });
    textEditor.appendChild(row);
  }

  if (activeNode.referencedByClaims?.length) {
    const row = document.createElement('div');
    row.className = 'chip-row';
    activeNode.referencedByClaims.forEach(claim => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = claim.text || claim.id;
      row.appendChild(chip);
    });
    textEditor.appendChild(row);
  }

  if (activeNode.usedInEvents?.length) {
    const row = document.createElement('div');
    row.className = 'chip-row';
    activeNode.usedInEvents.forEach(evt => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = evt.name || evt.id;
      row.appendChild(chip);
    });
    textEditor.appendChild(row);
  }
}

function toggleBookMembership(ctx, shelfId, bookId, shouldExist, selection, rerender) {
  const snapshot = getState(ctx).snapshot || {};
  const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return;
  const roots = new Set(normaliseArray(shelf.rootTextIds));
  if (shouldExist) roots.add(bookId);
  else roots.delete(bookId);
  shelf.rootTextIds = Array.from(roots);
  updateState(ctx, prev => ({ ...prev, snapshot }));
  persistCanonItem(ctx, { show: false });
  if (!shouldExist && selection.bookId === bookId && selection.shelfId === shelfId) {
    updateState(ctx, prev => ({ ...prev, currentBookId: null, currentTextId: null }));
  }
  rerender();
}

function removeBookFromShelf(ctx, shelfId, bookId, selection, rerender) {
  const snapshot = getState(ctx).snapshot || {};
  const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return;
  shelf.rootTextIds = normaliseArray(shelf.rootTextIds).filter(id => id !== bookId);
  updateState(ctx, prev => ({ ...prev, snapshot }));
  persistCanonItem(ctx, { show: false });
  ctx?.setStatus?.('Book removed from shelf');
  if (selection.bookId === bookId && selection.shelfId === shelfId) {
    updateState(ctx, prev => ({ ...prev, currentBookId: null, currentTextId: null }));
  }
  rerender();
}

function deleteBookAndDescendants(ctx, bookId, selection, rerender) {
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const ViewModels = getViewModels(ctx);
  if (!ViewModels?.buildLibraryEditorViewModel) return;
  const vm = ViewModels.buildLibraryEditorViewModel(snapshot, { movementId: state.currentMovementId });
  const descendants = Array.from(collectDescendants(bookId, vm.nodesById, new Set()));
  const ok = window.confirm?.(
    `Delete this text and ${descendants.length - 1} descendant(s)? This cannot be undone.`
  );
  if (!ok) return;
  const DomainService = getDomainService(ctx);
  if (!DomainService?.deleteItem) return;
  const descendantSet = new Set(descendants);
  descendants.forEach(id => DomainService.deleteItem(snapshot, 'texts', id));
  (snapshot.textCollections || []).forEach(tc => {
    tc.rootTextIds = normaliseArray(tc.rootTextIds).filter(id => !descendantSet.has(id));
  });
  updateState(ctx, prev => ({
    ...prev,
    snapshot,
    currentTextId: descendantSet.has(selection.textId) ? null : prev.currentTextId,
    currentBookId: descendantSet.has(selection.bookId) ? null : prev.currentBookId
  }));
  persistCanonItem(ctx, { show: true });
  rerender();
}

function scrollTocNodeIntoView(nodeId) {
  if (!nodeId) return;
  const tocTree = document.getElementById('toc-tree');
  if (!tocTree) return;
  const safeId =
    typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(nodeId) : nodeId.replace(/"/g, '\"');
  const target = tocTree.querySelector(`.toc-node[data-node-id="${safeId}"]`);
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
