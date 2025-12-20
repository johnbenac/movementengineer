import { openMarkdownModal, renderMarkdownPreview } from '../ui/markdown.js';
import { collectDescendants, normaliseArray, parseCsvInput } from '../utils/values.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const DEFAULT_HINT = 'Create or select a movement on the left to explore this section.';

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getServices(ctx) {
  const services = ctx?.services || movementEngineerGlobal.services || {};
  return {
    DomainService: services.DomainService || window.DomainService,
    ViewModels: services.ViewModels || window.ViewModels
  };
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
}

function getLegacy(ctx) {
  return ctx?.legacy || movementEngineerGlobal.legacy || {};
}

function getState(ctx) {
  return ctx?.getState?.() || {};
}

function setState(ctx, patch) {
  const legacy = getLegacy(ctx);
  if (legacy?.setState) {
    legacy.setState(patch);
    return;
  }
  ctx?.setState?.(current => Object.assign({}, current, patch));
}

function renderEmptyHint(text) {
  const p = document.createElement('p');
  p.className = 'library-empty';
  p.textContent = text;
  return p;
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

function renderLibrarySearchResults({ vm, state, clear, actions }) {
  const resultsEl = document.getElementById('library-search-results');
  const searchInput = document.getElementById('library-search');
  if (!resultsEl || !searchInput) return;

  const query = (searchInput.value || '').trim();
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
        const patch = {
          currentTextId: result.nodeId,
          currentBookId: result.bookId || result.nodeId,
          currentShelfId: result.shelfIds?.[0] || vm.shelvesByBookId[result.bookId || result.nodeId]?.[0] || state.currentShelfId
        };
        setState(actions.ctx, patch);
        actions.render();
        setTimeout(() => scrollTocNodeIntoView(result.nodeId), 0);
      });

      resultsEl.appendChild(li);
    });
}

function renderShelfPane({ vm, state, actions, clear }) {
  const shelfList = document.getElementById('shelf-list');
  const unshelvedList = document.getElementById('unshelved-list');
  const shelfHint = document.getElementById('shelf-hint');
  clear(shelfList);
  clear(unshelvedList);
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
      setState(actions.ctx, {
        currentShelfId: shelf.id,
        currentBookId: shelf.bookIds[0] || null,
        currentTextId: shelf.bookIds[0] || null
      });
      actions.render();
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
        setState(actions.ctx, { currentBookId: id, currentTextId: id });
        actions.render();
      });
      unshelvedList.appendChild(card);
    });
  }
}

function renderBooksPane({ vm, state, clear, actions, services }) {
  const bookList = document.getElementById('book-list');
  const titleEl = document.getElementById('books-pane-title');
  const hintEl = document.getElementById('books-pane-hint');
  clear(bookList);
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

  activeShelf.bookIds.forEach(id => {
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

    const cardActions = document.createElement('div');
    cardActions.className = 'inline-actions';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove from shelf';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      actions.removeBookFromShelf(activeShelf.id, id);
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete book';
    deleteBtn.className = 'danger';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      actions.deleteBookAndDescendants(id);
    });
    cardActions.appendChild(removeBtn);
    cardActions.appendChild(deleteBtn);
    card.appendChild(cardActions);

    card.addEventListener('click', () => {
      setState(actions.ctx, { currentBookId: id, currentTextId: id });
      actions.render();
    });
    bookList.appendChild(card);
  });
}

function renderTocPane({ vm, state, clear, actions }) {
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
      setState(actions.ctx, {
        currentTextId: id,
        currentBookId: vm.bookIdByNodeId[id] || state.currentBookId
      });
      actions.render();
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

function renderNodeEditor({ vm, state, clear, actions, services }) {
  const shelfEditor = document.getElementById('shelf-editor');
  const textEditor = document.getElementById('text-editor');
  const breadcrumb = document.getElementById('library-breadcrumb');
  clear(shelfEditor);
  clear(textEditor);
  if (breadcrumb) clear(breadcrumb);

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
      services.DomainService.upsertItem(state.snapshot, 'textCollections', {
        ...state.snapshot.textCollections.find(tc => tc.id === activeShelf.id),
        name: nameInput.value,
        description: desc.value
      });
      actions.saveSnapshot({ show: false });
      actions.setStatus?.('Shelf saved');
      actions.render();
    });
    const del = document.createElement('button');
    del.textContent = 'Delete shelf';
    del.className = 'danger';
    del.addEventListener('click', () => actions.deleteTextCollection(activeShelf.id));
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
        actions.toggleBookMembership(shelf.id, activeNode.id, cb.checked);
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
    const vmLatest = services.ViewModels.buildLibraryEditorViewModel(state.snapshot, {
      movementId: state.currentMovementId
    });
    const descendants = collectDescendants(activeNode.id, vmLatest.nodesById, new Set());
    if (parentId && descendants.has(parentId)) {
      alert('Cannot set a descendant as the parent.');
      return;
    }
    services.DomainService.upsertItem(state.snapshot, 'texts', {
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
    actions.saveSnapshot({ show: false });
    actions.setStatus?.('Saved');
    actions.render();
  });

  const addChildBtn = document.createElement('button');
  addChildBtn.textContent = 'Add child';
  addChildBtn.addEventListener('click', () => {
    const text = services.DomainService.addNewItem(state.snapshot, 'texts', state.currentMovementId);
    text.parentId = activeNode.id;
    text.title = 'New section';
    setState(actions.ctx, {
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || state.currentBookId
    });
    actions.saveSnapshot({ show: false });
    actions.render();
  });

  const addSiblingBtn = document.createElement('button');
  addSiblingBtn.textContent = 'Add sibling';
  addSiblingBtn.addEventListener('click', () => {
    const text = services.DomainService.addNewItem(state.snapshot, 'texts', state.currentMovementId);
    text.parentId = activeNode.parentId || null;
    text.title = 'New section';
    setState(actions.ctx, {
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || state.currentBookId
    });
    actions.saveSnapshot({ show: false });
    actions.render();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'danger';
  deleteBtn.addEventListener('click', () => actions.deleteBookAndDescendants(activeNode.id));

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
    const row = document.createElement('div');
    row.className = 'chip-row';
    activeNode.mentionsEntities.forEach(ent => {
      const chip = document.createElement('span');
      chip.className = 'chip chip-entity clickable';
      chip.textContent = ent.name || ent.id;
      chip.addEventListener('click', () => actions.jumpToEntity(ent.id));
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

function createActions(ctx) {
  const services = getServices(ctx);
  const actions = getActions(ctx);
  const legacy = getLegacy(ctx);
  const setStatus = (...args) => ctx?.setStatus?.(...args);

  const render = () => {
    const tab = movementEngineerGlobal.tabs?.canon;
    if (tab?.render) tab.render(ctx);
  };

  const saveSnapshot = options => {
    if (legacy?.saveSnapshot) {
      legacy.saveSnapshot(options);
    } else if (actions.saveSnapshot) {
      actions.saveSnapshot(options);
    }
  };

  const toggleBookMembership = (shelfId, bookId, shouldExist) => {
    const state = getState(ctx);
    const shelf = (state.snapshot.textCollections || []).find(tc => tc.id === shelfId);
    if (!shelf) return;
    const roots = new Set(normaliseArray(shelf.rootTextIds));
    if (shouldExist) roots.add(bookId);
    else roots.delete(bookId);
    shelf.rootTextIds = Array.from(roots);
    saveSnapshot({ show: false });
  };

  const removeBookFromShelf = (shelfId, bookId) => {
    const state = getState(ctx);
    const shelf = (state.snapshot.textCollections || []).find(tc => tc.id === shelfId);
    if (!shelf) return;
    shelf.rootTextIds = normaliseArray(shelf.rootTextIds).filter(id => id !== bookId);
    saveSnapshot({ show: false });
    setStatus?.('Book removed from shelf');
    render();
  };

  const deleteBookAndDescendants = bookId => {
    const state = getState(ctx);
    const vm = services.ViewModels.buildLibraryEditorViewModel(state.snapshot, {
      movementId: state.currentMovementId
    });
    const descendants = Array.from(collectDescendants(bookId, vm.nodesById, new Set()));
    const ok = window.confirm(
      `Delete this text and ${descendants.length - 1} descendant(s)? This cannot be undone.`
    );
    if (!ok) return;
    const descendantSet = new Set(descendants);
    descendants.forEach(id => services.DomainService.deleteItem(state.snapshot, 'texts', id));
    (state.snapshot.textCollections || []).forEach(tc => {
      tc.rootTextIds = normaliseArray(tc.rootTextIds).filter(id => !descendantSet.has(id));
    });
    const patch = {};
    if (state.currentTextId && descendantSet.has(state.currentTextId)) patch.currentTextId = null;
    if (state.currentBookId && descendantSet.has(state.currentBookId)) patch.currentBookId = null;
    if (Object.keys(patch).length) setState(ctx, patch);
    saveSnapshot();
    render();
  };

  const addNewBookToShelf = () => {
    const state = getState(ctx);
    if (!state.currentMovementId) return;
    if (!state.currentShelfId) {
      alert('Choose a shelf first.');
      return;
    }
    const book = services.DomainService.addNewItem(
      state.snapshot,
      'texts',
      state.currentMovementId
    );
    book.parentId = null;
    book.title = 'New book';
    book.label = book.label || '';
    const shelf = state.snapshot.textCollections.find(tc => tc.id === state.currentShelfId);
    if (shelf) {
      shelf.rootTextIds = normaliseArray(shelf.rootTextIds);
      shelf.rootTextIds.push(book.id);
    }
    setState(ctx, { currentBookId: book.id, currentTextId: book.id });
    saveSnapshot({ show: false });
    render();
  };

  const addExistingBookToShelf = () => {
    const state = getState(ctx);
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
    saveSnapshot({ show: false });
    render();
  };

  const addTextCollection = () => {
    const state = getState(ctx);
    if (!state.currentMovementId) {
      alert('Select a movement first.');
      return;
    }
    try {
      const collection = services.DomainService.addNewItem(
        state.snapshot,
        'textCollections',
        state.currentMovementId
      );
      saveSnapshot({ show: false });
      setStatus?.('Text collection created');
      setState(ctx, { currentShelfId: collection.id });
      render();
    } catch (e) {
      alert(e.message);
    }
  };

  const saveTextCollection = () => {
    const nameInput = document.getElementById('canon-collection-name');
    const descInput = document.getElementById('canon-collection-description');
    const tagsInput = document.getElementById('canon-collection-tags');
    const select = document.getElementById('canon-collection-select');
    const state = getState(ctx);
    const collection = (state.snapshot.textCollections || []).find(
      tc => tc.id === select?.value
    );
    if (!collection) return collection;
    const updated = {
      ...collection,
      name: nameInput?.value?.trim() || collection.name,
      description: descInput?.value,
      tags: parseCsvInput(tagsInput?.value)
    };
    services.DomainService.upsertItem(state.snapshot, 'textCollections', updated);
    saveSnapshot({ show: false });
    setStatus?.('Collection saved');
    render();
    return updated;
  };

  const deleteTextCollection = id => {
    const state = getState(ctx);
    const collection =
      id !== null && typeof id !== 'undefined'
        ? (state.snapshot.textCollections || []).find(tc => tc.id === id)
        : null;
    if (!collection) return;
    const ok = window.confirm(
      `Delete this text collection?\n\n${collection.name || collection.id}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    services.DomainService.deleteItem(state.snapshot, 'textCollections', collection.id);
    const patch = {};
    if (state.currentShelfId === collection.id) {
      patch.currentShelfId = null;
      patch.currentBookId = null;
      patch.currentTextId = null;
    }
    if (Object.keys(patch).length) setState(ctx, patch);
    saveSnapshot();
    render();
  };

  const jumpToEntity = id => {
    if (actions.jumpToEntity) actions.jumpToEntity(id);
    else legacy?.jumpToEntity?.(id);
  };

  return {
    ctx,
    render,
    saveSnapshot,
    toggleBookMembership,
    removeBookFromShelf,
    deleteBookAndDescendants,
    addNewBookToShelf,
    addExistingBookToShelf,
    addTextCollection,
    saveTextCollection,
    deleteTextCollection,
    jumpToEntity,
    setStatus
  };
}

function renderCanonTab(ctx) {
  const clear = getClear(ctx);
  const services = getServices(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;
  const actions = createActions(ctx);
  const renderSelf = () => renderCanonTab(ctx);

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
    shelfList.appendChild(renderEmptyHint(DEFAULT_HINT));
    bookList.appendChild(renderEmptyHint('Choose a movement to see books.'));
    tocTree.appendChild(renderEmptyHint('No table of contents to show.'));
    textEditor.appendChild(renderEmptyHint('Select a movement to edit texts.'));
    return;
  }

  const searchQuery = document.getElementById('library-search')?.value || '';
  const vm = services.ViewModels.buildLibraryEditorViewModel(snapshot, {
    movementId: currentMovementId,
    activeShelfId: state.currentShelfId,
    activeBookId: state.currentBookId,
    activeNodeId: state.currentTextId,
    searchQuery
  });

  renderLibrarySearchResults({ vm, state, clear, actions: { ...actions, render: renderSelf, ctx } });

  let desiredShelfId = state.currentShelfId;
  let desiredBookId = state.currentBookId;
  let desiredTextId = state.currentTextId;

  if (!desiredShelfId && vm.shelves.length) {
    desiredShelfId = vm.shelves[0].id;
  }
  if (!desiredBookId && desiredShelfId && vm.shelvesById[desiredShelfId]?.bookIds.length) {
    desiredBookId = vm.shelvesById[desiredShelfId].bookIds[0];
  }
  if (!desiredTextId && desiredBookId) {
    desiredTextId = desiredBookId;
  }

  if (
    desiredShelfId !== state.currentShelfId ||
    desiredBookId !== state.currentBookId ||
    desiredTextId !== state.currentTextId
  ) {
    setState(ctx, {
      currentShelfId: desiredShelfId || null,
      currentBookId: desiredBookId || null,
      currentTextId: desiredTextId || null
    });
    return;
  }

  renderShelfPane({ vm, state, clear, actions: { ...actions, render: renderSelf, ctx } });
  renderBooksPane({ vm, state, clear, actions: { ...actions, render: renderSelf, ctx } });
  renderTocPane({ vm, state, clear, actions: { ...actions, render: renderSelf, ctx } });
  renderNodeEditor({
    vm,
    state,
    clear,
    actions: { ...actions, render: renderSelf, ctx },
    services
  });
}

export function registerCanonTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'canon') return;
        rerender();
      };

      const searchInput = document.getElementById('library-search');
      const addCollectionBtn = document.getElementById('btn-add-text-collection');
      const saveCollectionBtn = document.getElementById('btn-save-text-collection');
      const deleteCollectionBtn = document.getElementById('btn-delete-text-collection');
      const addRootBtn = document.getElementById('btn-add-root-text');
      const addExistingBtn = document.getElementById('btn-add-existing-book');

      const actions = createActions(context);

      const searchHandler = () => rerender();
      const addCollectionHandler = () => actions.addTextCollection();
      const saveCollectionHandler = () => actions.saveTextCollection();
      const deleteCollectionHandler = () => actions.deleteTextCollection();
      const addRootHandler = () => actions.addNewBookToShelf();
      const addExistingHandler = () => actions.addExistingBookToShelf();

      if (searchInput) searchInput.addEventListener('input', searchHandler);
      if (addCollectionBtn) addCollectionBtn.addEventListener('click', addCollectionHandler);
      if (saveCollectionBtn) saveCollectionBtn.addEventListener('click', saveCollectionHandler);
      if (deleteCollectionBtn) deleteCollectionBtn.addEventListener('click', deleteCollectionHandler);
      if (addRootBtn) addRootBtn.addEventListener('click', addRootHandler);
      if (addExistingBtn) addExistingBtn.addEventListener('click', addExistingHandler);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = {
        searchInput,
        addCollectionBtn,
        saveCollectionBtn,
        deleteCollectionBtn,
        addRootBtn,
        addExistingBtn,
        searchHandler,
        addCollectionHandler,
        saveCollectionHandler,
        deleteCollectionHandler,
        addRootHandler,
        addExistingHandler,
        rerender,
        unsubscribe
      };
    },
    render: renderCanonTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.searchInput) h.searchInput.removeEventListener('input', h.searchHandler);
      if (h.addCollectionBtn) h.addCollectionBtn.removeEventListener('click', h.addCollectionHandler);
      if (h.saveCollectionBtn) h.saveCollectionBtn.removeEventListener('click', h.saveCollectionHandler);
      if (h.deleteCollectionBtn)
        h.deleteCollectionBtn.removeEventListener('click', h.deleteCollectionHandler);
      if (h.addRootBtn) h.addRootBtn.removeEventListener('click', h.addRootHandler);
      if (h.addExistingBtn) h.addExistingBtn.removeEventListener('click', h.addExistingHandler);
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
