import { renderMarkdownPreview, openMarkdownModal } from '../ui/markdown.js';
import { parseCsvInput, normaliseArray, collectDescendants } from '../utils/values.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function getServices(ctx) {
  return ctx?.services || {
    DomainService: window.DomainService,
    ViewModels: window.ViewModels
  };
}

function clearElement(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function renderEmptyHint(text) {
  const p = document.createElement('p');
  p.className = 'library-empty';
  p.textContent = text;
  return p;
}

function getActiveTabName() {
  const btn = document.querySelector('.tab.active');
  return btn ? btn.dataset.tab : 'dashboard';
}

function isCanonActive() {
  return getActiveTabName() === 'canon';
}

function renderLibrarySearchResults(ctx, vm) {
  const resultsEl = document.getElementById('library-search-results');
  const searchInput = document.getElementById('library-search');
  if (!resultsEl || !searchInput) return;

  const query = (searchInput.value || '').trim();
  clearElement(resultsEl);
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

  const state = ctx.getState?.() || {};
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
        const bookId = result.bookId || result.nodeId;
        const shelves = result.shelfIds?.length
          ? result.shelfIds
          : vm.shelvesByBookId[bookId] || [];
        ctx.legacy?.setState?.({
          snapshot: state.snapshot,
          currentMovementId: state.currentMovementId,
          currentTextId: result.nodeId,
          currentBookId: bookId,
          currentShelfId: shelves[0] || state.currentShelfId
        });
        tabRender(ctx);
        setTimeout(() => scrollTocNodeIntoView(result.nodeId), 0);
      });

      resultsEl.appendChild(li);
    });
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

function renderShelfPane(ctx, vm, state) {
  const shelfList = document.getElementById('shelf-list');
  const unshelvedList = document.getElementById('unshelved-list');
  const shelfHint = document.getElementById('shelf-hint');
  clearElement(shelfList);
  clearElement(unshelvedList);
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
    if (shelf.id === state.currentShelfId) card.classList.add('active');
    const title = document.createElement('div');
    title.textContent = shelf.name || 'Untitled shelf';
    card.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${shelf.bookCount} books · ${shelf.textCount} texts`;
    card.appendChild(meta);
    card.addEventListener('click', () => {
      ctx.legacy?.setState?.({
        snapshot: state.snapshot,
        currentMovementId: state.currentMovementId,
        currentShelfId: shelf.id,
        currentBookId: shelf.bookIds[0] || null,
        currentTextId: shelf.bookIds[0] || null
      });
      tabRender(ctx);
    });
    shelfList.appendChild(card);
  });

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
        ctx.legacy?.setState?.({
          snapshot: state.snapshot,
          currentMovementId: state.currentMovementId,
          currentBookId: id,
          currentTextId: id
        });
        tabRender(ctx);
      });
      unshelvedList.appendChild(card);
    });
  }
}

function toggleBookMembership(ctx, state, shelfId, bookId, shouldExist) {
  const { DomainService } = getServices(ctx);
  const shelf = (state.snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return;
  const roots = new Set(normaliseArray(shelf.rootTextIds));
  if (shouldExist) roots.add(bookId);
  else roots.delete(bookId);
  shelf.rootTextIds = Array.from(roots);
  ctx.legacy?.saveSnapshot?.({ show: false });
}

function removeBookFromShelf(ctx, state = {}, shelfId, bookId) {
  const shelf = (state.snapshot.textCollections || []).find(tc => tc.id === shelfId);
  if (!shelf) return;
  shelf.rootTextIds = normaliseArray(shelf.rootTextIds).filter(id => id !== bookId);
  ctx.legacy?.saveSnapshot?.({ show: false });
  ctx.ui?.setStatus?.('Book removed from shelf');
  tabRender(ctx);
}

function deleteBookAndDescendants(ctx, state = {}, vm, bookId) {
  const { DomainService } = getServices(ctx);
  const descendants = Array.from(collectDescendants(bookId, vm.nodesById, new Set()));
  const ok = window.confirm(
    `Delete this text and ${descendants.length - 1} descendant(s)? This cannot be undone.`
  );
  if (!ok) return;
  const descendantSet = new Set(descendants);
  descendants.forEach(id => DomainService.deleteItem(state.snapshot, 'texts', id));
  (state.snapshot.textCollections || []).forEach(tc => {
    tc.rootTextIds = normaliseArray(tc.rootTextIds).filter(id => !descendantSet.has(id));
  });
  const nextState = {
    snapshot: state.snapshot,
    currentMovementId: state.currentMovementId,
    currentTextId: descendantSet.has(state.currentTextId) ? null : state.currentTextId,
    currentBookId: descendantSet.has(state.currentBookId) ? null : state.currentBookId
  };
  ctx.legacy?.setState?.(nextState);
  ctx.legacy?.saveSnapshot?.();
  tabRender(ctx);
}

function renderBooksPane(ctx, vm, state) {
  const bookList = document.getElementById('book-list');
  const titleEl = document.getElementById('books-pane-title');
  const hintEl = document.getElementById('books-pane-hint');
  clearElement(bookList);
  const activeShelf = state.currentShelfId ? vm.shelvesById[state.currentShelfId] : null;
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

  vm.activeShelf.bookIds.forEach(id => {
    const book = vm.booksById[id];
    const node = vm.nodesById[id];
    if (!book || !node) return;
    const card = document.createElement('div');
    card.className = 'book-card';
    if (id === state.currentBookId) card.classList.add('active');
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
      removeBookFromShelf(ctx, state, activeShelf.id, id);
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete book';
    deleteBtn.className = 'danger';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteBookAndDescendants(ctx, state, vm, id);
    });
    actions.appendChild(removeBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    card.addEventListener('click', () => {
      ctx.legacy?.setState?.({
        snapshot: state.snapshot,
        currentMovementId: state.currentMovementId,
        currentBookId: id,
        currentTextId: id
      });
      tabRender(ctx);
    });
    bookList.appendChild(card);
  });
}

function renderTocPane(ctx, vm, state) {
  const tocTree = document.getElementById('toc-tree');
  clearElement(tocTree);
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
    if (id === state.currentTextId) row.classList.add('active');
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
      ctx.legacy?.setState?.({
        snapshot: state.snapshot,
        currentMovementId: state.currentMovementId,
        currentTextId: id,
        currentBookId: vm.bookIdByNodeId[id] || state.currentBookId
      });
      tabRender(ctx);
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

function renderNodeEditor(ctx, vm, state) {
  const { DomainService } = getServices(ctx);
  const shelfEditor = document.getElementById('shelf-editor');
  const textEditor = document.getElementById('text-editor');
  const breadcrumb = document.getElementById('library-breadcrumb');
  clearElement(shelfEditor);
  clearElement(textEditor);
  if (breadcrumb) clearElement(breadcrumb);

  const activeShelf = state.currentShelfId ? vm.shelvesById[state.currentShelfId] : null;
  const activeNode = state.currentTextId ? vm.nodesById[state.currentTextId] : null;

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
      DomainService.upsertItem(state.snapshot, 'textCollections', {
        ...state.snapshot.textCollections.find(tc => tc.id === activeShelf.id),
        name: nameInput.value,
        description: desc.value
      });
      ctx.legacy?.saveSnapshot?.({ show: false });
      ctx.ui?.setStatus?.('Shelf saved');
      tabRender(ctx);
    });
    const del = document.createElement('button');
    del.textContent = 'Delete shelf';
    del.className = 'danger';
    del.addEventListener('click', () => deleteTextCollection(ctx, state, activeShelf.id));
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
        toggleBookMembership(ctx, state, shelf.id, activeNode.id, cb.checked);
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
    const vmLatest = getServices(ctx).ViewModels.buildLibraryEditorViewModel(state.snapshot, {
      movementId: state.currentMovementId
    });
    const descendants = collectDescendants(activeNode.id, vmLatest.nodesById, new Set());
    if (parentId && descendants.has(parentId)) {
      alert('Cannot set a descendant as the parent.');
      return;
    }
    getServices(ctx).DomainService.upsertItem(state.snapshot, 'texts', {
      ...(() => {
        const existing = state.snapshot.texts.find(t => t.id === activeNode.id) || {};
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
    ctx.legacy?.saveSnapshot?.({ show: false });
    ctx.ui?.setStatus?.('Saved');
    tabRender(ctx);
  });

  const addChildBtn = document.createElement('button');
  addChildBtn.textContent = 'Add child';
  addChildBtn.addEventListener('click', () => {
    const text = DomainService.addNewItem(state.snapshot, 'texts', state.currentMovementId);
    text.parentId = activeNode.id;
    ctx.legacy?.setState?.({
      snapshot: state.snapshot,
      currentMovementId: state.currentMovementId,
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || state.currentBookId
    });
    ctx.legacy?.saveSnapshot?.({ show: false });
    tabRender(ctx);
  });

  const addSiblingBtn = document.createElement('button');
  addSiblingBtn.textContent = 'Add sibling';
  addSiblingBtn.addEventListener('click', () => {
    const text = DomainService.addNewItem(state.snapshot, 'texts', state.currentMovementId);
    text.parentId = activeNode.parentId || null;
    ctx.legacy?.setState?.({
      snapshot: state.snapshot,
      currentMovementId: state.currentMovementId,
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || state.currentBookId
    });
    ctx.legacy?.saveSnapshot?.({ show: false });
    tabRender(ctx);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'danger';
  deleteBtn.addEventListener('click', () => deleteBookAndDescendants(ctx, state, vm, activeNode.id));

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

  if (activeNode.mentionsEntities?.length) {
    const row = document.createElement('div');
    row.className = 'chip-row';
    activeNode.mentionsEntities.forEach(ent => {
      const chip = document.createElement('span');
      chip.className = 'chip chip-entity clickable';
      chip.textContent = ent.name || ent.id;
      chip.addEventListener('click', () => ctx.actions?.jumpToEntity?.(ent.id));
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

function addNewBookToShelf(ctx, state = {}) {
  const { DomainService } = getServices(ctx);
  if (!state.currentMovementId) return;
  if (!state.currentShelfId) {
    alert('Choose a shelf first.');
    return;
  }
  const book = DomainService.addNewItem(state.snapshot, 'texts', state.currentMovementId);
  book.parentId = null;
  book.title = 'New book';
  book.label = book.label || '';
  const shelf = state.snapshot.textCollections.find(tc => tc.id === state.currentShelfId);
  if (shelf) {
    shelf.rootTextIds = normaliseArray(shelf.rootTextIds);
    shelf.rootTextIds.push(book.id);
  }
  ctx.legacy?.setState?.({
    snapshot: state.snapshot,
    currentMovementId: state.currentMovementId,
    currentBookId: book.id,
    currentTextId: book.id
  });
  ctx.legacy?.saveSnapshot?.({ show: false });
  tabRender(ctx);
}

function addExistingBookToShelf(ctx, state = {}) {
  if (!state.currentMovementId || !state.currentShelfId) return;
  const roots = (state.snapshot.texts || []).filter(
    t => t.movementId === state.currentMovementId && !t.parentId
  );
  const shelf = state.snapshot.textCollections.find(tc => tc.id === state.currentShelfId);
  if (!shelf) return;
  const existing = new Set(normaliseArray(shelf.rootTextIds));
  const choices = roots.filter(t => !existing.has(t.id));
  if (!choices.length) {
    alert('No other books available to add.');
    return;
  }
  const selected = window.prompt(
    'Enter the ID of the book to add:\n' + choices.map(c => `${c.id}: ${c.title}`).join('\n')
  );
  if (!selected) return;
  if (!choices.some(c => c.id === selected)) {
    alert('Book not found');
    return;
  }
  shelf.rootTextIds.push(selected);
  ctx.legacy?.saveSnapshot?.({ show: false });
  tabRender(ctx);
}

function addTextCollection(ctx, state = {}) {
  const { DomainService } = getServices(ctx);
  if (!state.currentMovementId) {
    alert('Select a movement first.');
    return;
  }
  try {
    const collection = DomainService.addNewItem(state.snapshot, 'textCollections', state.currentMovementId);
    ctx.legacy?.saveSnapshot?.({ show: false });
    ctx.ui?.setStatus?.('Text collection created');
    ctx.legacy?.setState?.({
      snapshot: state.snapshot,
      currentMovementId: state.currentMovementId,
      currentShelfId: collection.id
    });
    tabRender(ctx);
  } catch (e) {
    alert(e.message);
  }
}

function saveTextCollection(ctx, state = {}) {
  const select = document.getElementById('canon-collection-select');
  const activeCollection = select
    ? (state.snapshot.textCollections || []).find(tc => tc.id === select.value)
    : null;
  if (!activeCollection) return;
  const nameInput = document.getElementById('canon-collection-name');
  const descInput = document.getElementById('canon-collection-description');
  const tagsInput = document.getElementById('canon-collection-tags');
  if (!nameInput || !descInput || !tagsInput) return;

  const updated = {
    ...activeCollection,
    name: nameInput.value.trim() || activeCollection.name,
    description: descInput.value,
    tags: parseCsvInput(tagsInput.value)
  };

  getServices(ctx).DomainService.upsertItem(state.snapshot, 'textCollections', updated);
  ctx.legacy?.saveSnapshot?.({ show: false });
  ctx.ui?.setStatus?.('Collection saved');
  tabRender(ctx);
}

function deleteTextCollection(ctx, state = {}, id = null) {
  const { DomainService } = getServices(ctx);
  const collection =
    id !== null ? (state.snapshot.textCollections || []).find(tc => tc.id === id) : null;
  const target = collection || null;
  if (!target) return;
  const ok = window.confirm(
    `Delete this text collection?\n\n${target.name || target.id}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  DomainService.deleteItem(state.snapshot, 'textCollections', target.id);
  const nextState = {
    snapshot: state.snapshot,
    currentMovementId: state.currentMovementId,
    currentShelfId: state.currentShelfId === target.id ? null : state.currentShelfId,
    currentBookId: state.currentBookId,
    currentTextId: state.currentTextId
  };
  if (state.currentShelfId === target.id) {
    nextState.currentBookId = null;
    nextState.currentTextId = null;
  }
  ctx.legacy?.setState?.(nextState);
  ctx.legacy?.saveSnapshot?.();
  tabRender(ctx);
}

function syncDefaults(ctx, vm, state) {
  let nextShelfId = state.currentShelfId;
  let nextBookId = state.currentBookId;
  let nextTextId = state.currentTextId;

  if (!nextShelfId && vm.shelves.length) {
    nextShelfId = vm.shelves[0].id;
  }
  if (!nextBookId && vm.activeShelf && vm.activeShelf.bookIds.length) {
    nextBookId = vm.activeShelf.bookIds[0];
  }
  if (!nextTextId && nextBookId) {
    nextTextId = nextBookId;
  }

  if (
    nextShelfId !== state.currentShelfId ||
    nextBookId !== state.currentBookId ||
    nextTextId !== state.currentTextId
  ) {
    ctx.legacy?.setState?.({
      snapshot: state.snapshot,
      currentMovementId: state.currentMovementId,
      currentShelfId: nextShelfId,
      currentBookId: nextBookId,
      currentTextId: nextTextId
    });
    return true;
  }
  return false;
}

function tabRender(ctx) {
  const state = ctx.getState?.() || {};
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const shelfList = document.getElementById('shelf-list');
  const bookList = document.getElementById('book-list');
  const tocTree = document.getElementById('toc-tree');
  const shelfEditor = document.getElementById('shelf-editor');
  const textEditor = document.getElementById('text-editor');
  const breadcrumb = document.getElementById('library-breadcrumb');
  const searchResults = document.getElementById('library-search-results');
  if (!shelfList || !bookList || !tocTree || !shelfEditor || !textEditor) return;

  clearElement(shelfList);
  clearElement(bookList);
  clearElement(tocTree);
  clearElement(shelfEditor);
  clearElement(textEditor);
  if (breadcrumb) clearElement(breadcrumb);
  if (searchResults) {
    clearElement(searchResults);
    searchResults.classList.remove('visible');
  }

  if (!currentMovementId) {
    shelfList.appendChild(renderEmptyHint('Create or select a movement first.'));
    bookList.appendChild(renderEmptyHint('Choose a movement to see books.'));
    tocTree.appendChild(renderEmptyHint('No table of contents to show.'));
    textEditor.appendChild(renderEmptyHint('Select a movement to edit texts.'));
    return;
  }

  const services = getServices(ctx);
  const searchQuery = document.getElementById('library-search')?.value || '';
  const vm = services.ViewModels.buildLibraryEditorViewModel(snapshot, {
    movementId: currentMovementId,
    activeShelfId: state.currentShelfId,
    activeBookId: state.currentBookId,
    activeNodeId: state.currentTextId,
    searchQuery
  });

  renderLibrarySearchResults(ctx, vm);

  const hasSyncedDefaults = syncDefaults(ctx, vm, state);
  if (hasSyncedDefaults) return;

  renderShelfPane(ctx, vm, state);
  renderBooksPane(ctx, vm, state);
  renderTocPane(ctx, vm, state);
  renderNodeEditor(ctx, vm, state);
}

const canonTab = {
  __handlers: null,
  mount(ctx) {
    const searchInput = document.getElementById('library-search');
    const addShelfBtn = document.getElementById('btn-add-text-collection');
    const saveShelfBtn = document.getElementById('btn-save-text-collection');
    const deleteShelfBtn = document.getElementById('btn-delete-text-collection');
    const addBookBtn = document.getElementById('btn-add-root-text');
    const addExistingBtn = document.getElementById('btn-add-existing-book');

    const rerender = () => {
      if (!isCanonActive()) return;
      tabRender(ctx);
    };

    const handleStateChange = () => {
      if (!isCanonActive()) return;
      rerender();
    };

    const handleAddShelf = () => addTextCollection(ctx, ctx.getState?.());
    const handleSaveShelf = () => saveTextCollection(ctx, ctx.getState?.());
    const handleDeleteShelf = () =>
      deleteTextCollection(ctx, ctx.getState?.(), ctx.getState?.().currentShelfId);
    const handleAddBook = () => addNewBookToShelf(ctx, ctx.getState?.());
    const handleAddExisting = () => addExistingBookToShelf(ctx, ctx.getState?.());

    if (searchInput) searchInput.addEventListener('input', rerender);
    if (addShelfBtn) addShelfBtn.addEventListener('click', handleAddShelf);
    if (saveShelfBtn) saveShelfBtn.addEventListener('click', handleSaveShelf);
    if (deleteShelfBtn) deleteShelfBtn.addEventListener('click', handleDeleteShelf);
    if (addBookBtn) addBookBtn.addEventListener('click', handleAddBook);
    if (addExistingBtn) addExistingBtn.addEventListener('click', handleAddExisting);

    const unsubscribe = ctx?.subscribe ? ctx.subscribe(handleStateChange) : null;
    this.__handlers = {
      searchInput,
      addShelfBtn,
      saveShelfBtn,
      deleteShelfBtn,
      addBookBtn,
      addExistingBtn,
      rerender,
      handleAddShelf,
      handleSaveShelf,
      handleDeleteShelf,
      handleAddBook,
      handleAddExisting,
      unsubscribe
    };
  },
  render(ctx) {
    if (!isCanonActive()) return;
    tabRender(ctx);
  },
  unmount() {
    const h = this.__handlers;
    if (!h) return;
    if (h.searchInput) h.searchInput.removeEventListener('input', h.rerender);
    if (h.addShelfBtn) h.addShelfBtn.removeEventListener('click', h.handleAddShelf);
    if (h.saveShelfBtn) h.saveShelfBtn.removeEventListener('click', h.handleSaveShelf);
    if (h.deleteShelfBtn) h.deleteShelfBtn.removeEventListener('click', h.handleDeleteShelf);
    if (h.addBookBtn) h.addBookBtn.removeEventListener('click', h.handleAddBook);
    if (h.addExistingBtn) h.addExistingBtn.removeEventListener('click', h.handleAddExisting);
    if (typeof h.unsubscribe === 'function') h.unsubscribe();
    this.__handlers = null;
  }
};

export function registerCanonTab(ctx) {
  movementEngineerGlobal.tabs.canon = canonTab;
  if (ctx?.tabs) {
    ctx.tabs.canon = canonTab;
  }
  return canonTab;
}
