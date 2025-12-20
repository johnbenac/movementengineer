import { renderMarkdownPreview, openMarkdownModal } from '../ui/markdown.js';
import {
  collectDescendants,
  normaliseArray,
  parseCsvInput
} from '../utils/values.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function getState(ctx) {
  if (ctx?.getState) return ctx.getState();
  if (ctx?.store?.getState) return ctx.store.getState();
  return {};
}

function getActions(ctx) {
  const legacy = ctx?.legacy || {};
  const globalActions = ctx?.actions || movementEngineerGlobal.actions || {};
  return {
    saveSnapshot: globalActions.saveSnapshot || legacy.saveSnapshot || (() => {}),
    setState: legacy.setState || ctx?.setState || (() => {}),
    notify: legacy.notify || (() => {})
  };
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || (el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  });
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

function renderLibrarySearchResults(ctx, vm, setState) {
  const resultsEl = document.getElementById('library-search-results');
  const searchInput = document.getElementById('library-search');
  if (!resultsEl || !searchInput) return;

  const query = (searchInput.value || '').trim();
  getClear(ctx)(resultsEl);
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
        const updates = {
          currentTextId: result.nodeId,
          currentBookId: result.bookId || result.nodeId
        };
        if (result.shelfIds && result.shelfIds.length) {
          updates.currentShelfId = result.shelfIds[0];
        } else if (vm.shelvesByBookId[updates.currentBookId]?.length) {
          updates.currentShelfId = vm.shelvesByBookId[updates.currentBookId][0];
        }
        setState(updates);
        setTimeout(() => scrollTocNodeIntoView(result.nodeId), 0);
      });

      resultsEl.appendChild(li);
    });
}

function renderShelfPane(ctx, vm, state, setState) {
  const clear = getClear(ctx);
  const shelfList = document.getElementById('shelf-list');
  const unshelvedList = document.getElementById('unshelved-list');
  const shelfHint = document.getElementById('shelf-hint');
  if (!shelfList || !unshelvedList) return;

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
      setState({
        currentShelfId: shelf.id,
        currentBookId: shelf.bookIds[0] || null,
        currentTextId: shelf.bookIds[0] || null
      });
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
        setState({ currentBookId: id, currentTextId: id });
      });
      unshelvedList.appendChild(card);
    });
  }
}

function renderBooksPane(ctx, vm, state, setState, { DomainService }) {
  const clear = getClear(ctx);
  const bookList = document.getElementById('book-list');
  const titleEl = document.getElementById('books-pane-title');
  const hintEl = document.getElementById('books-pane-hint');
  if (!bookList) return;

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

    const actions = document.createElement('div');
    actions.className = 'inline-actions';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove from shelf';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      const shelf = (state.snapshot.textCollections || []).find(tc => tc.id === activeShelf.id);
      if (!shelf) return;
      shelf.rootTextIds = normaliseArray(shelf.rootTextIds).filter(bookId => bookId !== id);
      getActions(ctx).saveSnapshot({ show: false });
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete book';
    deleteBtn.className = 'danger';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      const descendants = Array.from(
        collectDescendants(id, vm.nodesById, new Set())
      );
      const ok = window.confirm(
        `Delete this text and ${descendants.length - 1} descendant(s)? This cannot be undone.`
      );
      if (!ok) return;
      const descendantSet = new Set(descendants);
      descendants.forEach(textId => DomainService.deleteItem(state.snapshot, 'texts', textId));
      (state.snapshot.textCollections || []).forEach(tc => {
        tc.rootTextIds = normaliseArray(tc.rootTextIds).filter(textId => !descendantSet.has(textId));
      });
      if (state.currentTextId && descendantSet.has(state.currentTextId)) {
        setState({ currentTextId: null, currentBookId: null });
      } else {
        getActions(ctx).setState({});
      }
      getActions(ctx).saveSnapshot();
    });
    actions.appendChild(removeBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    card.addEventListener('click', () => {
      setState({ currentBookId: id, currentTextId: id });
    });
    bookList.appendChild(card);
  });
}

function renderTocPane(ctx, vm, state, setState) {
  const clear = getClear(ctx);
  const tocTree = document.getElementById('toc-tree');
  if (!tocTree) return;

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
      setState({
        currentTextId: id,
        currentBookId: vm.bookIdByNodeId[id] || state.currentBookId
      });
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

function renderNodeEditor(ctx, vm, state, setState) {
  const clear = getClear(ctx);
  const shelfEditor = document.getElementById('shelf-editor');
  const textEditor = document.getElementById('text-editor');
  const breadcrumb = document.getElementById('library-breadcrumb');
  if (!shelfEditor || !textEditor) return;

  clear(shelfEditor);
  clear(textEditor);
  if (breadcrumb) clear(breadcrumb);

  const { DomainService, ViewModels } = ctx.services || {};
  const actions = getActions(ctx);

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
      actions.saveSnapshot({ show: false });
      renderCanonTab(ctx);
    });
    const del = document.createElement('button');
    del.textContent = 'Delete shelf';
    del.className = 'danger';
    del.addEventListener('click', () => {
      const ok = window.confirm(
        `Delete this text collection?\n\n${activeShelf.name || activeShelf.id}\n\nThis cannot be undone.`
      );
      if (!ok) return;
      DomainService.deleteItem(state.snapshot, 'textCollections', activeShelf.id);
      actions.saveSnapshot();
      setState({ currentShelfId: null, currentBookId: null, currentTextId: null });
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
        const shelfRef = (state.snapshot.textCollections || []).find(tc => tc.id === shelf.id);
        if (!shelfRef) return;
        const roots = new Set(normaliseArray(shelfRef.rootTextIds));
        if (cb.checked) roots.add(activeNode.id);
        else roots.delete(activeNode.id);
        shelfRef.rootTextIds = Array.from(roots);
        actions.saveSnapshot({ show: false });
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
    const vmLatest = ViewModels.buildLibraryEditorViewModel(state.snapshot, {
      movementId: state.currentMovementId
    });
    const descendants = collectDescendants(activeNode.id, vmLatest.nodesById, new Set());
    if (parentId && descendants.has(parentId)) {
      alert('Cannot set a descendant as the parent.');
      return;
    }
    DomainService.upsertItem(state.snapshot, 'texts', {
      ...(() => {
        const existing =
          (state.snapshot.texts || []).find(t => t.id === activeNode.id) || {};
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
    renderCanonTab(ctx);
  });

  const addChildBtn = document.createElement('button');
  addChildBtn.textContent = 'Add child';
  addChildBtn.addEventListener('click', () => {
    const text = DomainService.addNewItem(state.snapshot, 'texts', state.currentMovementId);
    text.parentId = activeNode.id;
    text.title = 'New section';
    setState({
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || state.currentBookId
    });
    actions.saveSnapshot({ show: false });
  });

  const addSiblingBtn = document.createElement('button');
  addSiblingBtn.textContent = 'Add sibling';
  addSiblingBtn.addEventListener('click', () => {
    const text = DomainService.addNewItem(state.snapshot, 'texts', state.currentMovementId);
    text.parentId = activeNode.parentId || null;
    text.title = 'New section';
    setState({
      currentTextId: text.id,
      currentBookId: vm.bookIdByNodeId[activeNode.id] || state.currentBookId
    });
    actions.saveSnapshot({ show: false });
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'danger';
  deleteBtn.addEventListener('click', () => {
    const descendants = Array.from(collectDescendants(activeNode.id, vm.nodesById, new Set()));
    const ok = window.confirm(
      `Delete this text and ${descendants.length - 1} descendant(s)? This cannot be undone.`
    );
    if (!ok) return;
    const descendantSet = new Set(descendants);
    descendants.forEach(id => DomainService.deleteItem(state.snapshot, 'texts', id));
    (state.snapshot.textCollections || []).forEach(tc => {
      tc.rootTextIds = normaliseArray(tc.rootTextIds).filter(id => !descendantSet.has(id));
    });
    actions.saveSnapshot();
    setState({ currentTextId: null });
  });

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
      chip.addEventListener('click', () => {
        if (ctx.actions?.jumpToEntity) ctx.actions.jumpToEntity(ent.id);
      });
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

function renderCanonTab(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const { ViewModels, DomainService } = ctx.services || {};
  const setState = updates => getActions(ctx).setState({ ...state, ...updates });
  const actions = getActions(ctx);
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

  if (!state.currentMovementId) {
    shelfList.appendChild(renderEmptyHint('Create or select a movement first.'));
    bookList.appendChild(renderEmptyHint('Choose a movement to see books.'));
    tocTree.appendChild(renderEmptyHint('No table of contents to show.'));
    textEditor.appendChild(renderEmptyHint('Select a movement to edit texts.'));
    return;
  }

  if (!ViewModels || typeof ViewModels.buildLibraryEditorViewModel !== 'function') {
    shelfList.appendChild(renderEmptyHint('ViewModels module not loaded.'));
    return;
  }

  const searchQuery = document.getElementById('library-search')?.value || '';
  const vm = ViewModels.buildLibraryEditorViewModel(state.snapshot, {
    movementId: state.currentMovementId,
    activeShelfId: state.currentShelfId,
    activeBookId: state.currentBookId,
    activeNodeId: state.currentTextId,
    searchQuery
  });

  renderLibrarySearchResults(ctx, vm, setState);

  if (!state.currentShelfId && vm.shelves.length) {
    actions.setState({
      ...state,
      currentShelfId: vm.shelves[0].id,
      currentBookId: vm.shelves[0].bookIds[0] || null,
      currentTextId: vm.shelves[0].bookIds[0] || null
    });
    return;
  }
  if (!state.currentBookId && vm.activeShelf && vm.activeShelf.bookIds.length) {
    actions.setState({
      ...state,
      currentBookId: vm.activeShelf.bookIds[0],
      currentTextId: vm.activeShelf.bookIds[0]
    });
    return;
  }
  if (!state.currentTextId && state.currentBookId) {
    actions.setState({ ...state, currentTextId: state.currentBookId });
    return;
  }

  renderShelfPane(ctx, vm, state, updates => {
    actions.setState({ ...state, ...updates });
  });
  renderBooksPane(ctx, vm, state, updates => {
    actions.setState({ ...state, ...updates });
  }, { DomainService });
  renderTocPane(ctx, vm, state, updates => {
    actions.setState({ ...state, ...updates });
  });
  renderNodeEditor(ctx, vm, state, updates => {
    actions.setState({ ...state, ...updates });
  });
}

export function registerCanonTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const searchInput = document.getElementById('library-search');
      const addCollectionBtn = document.getElementById('btn-add-text-collection');
      const addRootBtn = document.getElementById('btn-add-root-text');
      const addExistingBtn = document.getElementById('btn-add-existing-book');

      const rerender = () => tab.render(context);

      const handleStateChange = next => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'canon') return;
        rerender(next);
      };

      if (searchInput) searchInput.addEventListener('input', rerender);

      const handleAddCollection = () => {
        const state = getState(context);
        if (!state.currentMovementId) {
          alert('Select a movement first.');
          return;
        }
        const collection = context.services.DomainService.addNewItem(
          state.snapshot,
          'textCollections',
          state.currentMovementId
        );
        getActions(context).saveSnapshot({ show: false });
        getActions(context).setState({
          ...state,
          currentShelfId: collection.id,
          currentBookId: null,
          currentTextId: null
        });
      };

      const handleAddRoot = () => {
        const state = getState(context);
        if (!state.currentMovementId || !state.currentShelfId) {
          alert('Choose a shelf first.');
          return;
        }
        const book = context.services.DomainService.addNewItem(
          state.snapshot,
          'texts',
          state.currentMovementId
        );
        book.parentId = null;
        book.title = 'New book';
        const shelf = state.snapshot.textCollections.find(tc => tc.id === state.currentShelfId);
        if (shelf) {
          shelf.rootTextIds = normaliseArray(shelf.rootTextIds);
          shelf.rootTextIds.push(book.id);
        }
        getActions(context).saveSnapshot({ show: false });
        getActions(context).setState({
          ...state,
          currentBookId: book.id,
          currentTextId: book.id
        });
      };

      const handleAddExisting = () => {
        const state = getState(context);
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
          'Enter the ID of the book to add:\n' +
            choices.map(c => `${c.id}: ${c.title}`).join('\n')
        );
        if (!selected) return;
        if (!choices.some(c => c.id === selected)) {
          alert('Book not found');
          return;
        }
        shelf.rootTextIds.push(selected);
        getActions(context).saveSnapshot({ show: false });
        rerender();
      };

      if (addCollectionBtn) addCollectionBtn.addEventListener('click', handleAddCollection);
      if (addRootBtn) addRootBtn.addEventListener('click', handleAddRoot);
      if (addExistingBtn) addExistingBtn.addEventListener('click', handleAddExisting);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        searchInput,
        addCollectionBtn,
        addRootBtn,
        addExistingBtn,
        rerender,
        handleAddCollection,
        handleAddExisting,
        handleAddRoot,
        unsubscribe
      };
    },
    render: renderCanonTab,
    unmount() {
      if (!this.__handlers) return;
      const {
        searchInput,
        addCollectionBtn,
        addRootBtn,
        addExistingBtn,
        unsubscribe,
        rerender,
        handleAddCollection,
        handleAddExisting,
        handleAddRoot
      } = this.__handlers;
      if (searchInput) searchInput.removeEventListener('input', rerender);
      if (addCollectionBtn) addCollectionBtn.removeEventListener('click', handleAddCollection);
      if (addRootBtn) addRootBtn.removeEventListener('click', handleAddRoot);
      if (addExistingBtn) addExistingBtn.removeEventListener('click', handleAddExisting);
      if (typeof unsubscribe === 'function') unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.canon = tab;
  if (ctx?.tabs) {
    ctx.tabs.canon = tab;
  }
  return tab;
}
