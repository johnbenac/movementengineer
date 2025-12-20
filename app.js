/* app.js
 *
 * UI layer for Movement Engineer v3.
 * All domain logic lives in view-models.js & your data model.
 * This file just handles DOM, localStorage, import/export, and wiring.
 */

/* global DomainService, StorageService, ViewModels, EntityGraphView, MarkdownDatasetLoader, d3 */

(function () {
  'use strict';

  const { COLLECTION_NAMES, COLLECTIONS_WITH_MOVEMENT_ID } = DomainService;

  let snapshot = null;
  let currentMovementId = null;
  let currentCollectionName = 'entities';
  let currentItemId = null;
  let currentTextId = null;
  let currentShelfId = null;
  let currentBookId = null;
  const DEFAULT_CANON_FILTERS = {
    search: '',
    tag: '',
    mention: '',
    parent: '',
    child: ''
  };
  let canonFilters = { ...DEFAULT_CANON_FILTERS };
  let navigationStack = [];
  let navigationIndex = -1;
  let entityGraphView = null;
  // ---- Graph Workbench (new) ----
  let workbenchGraphView = null;
  let graphWorkbenchDom = null;
  let graphWorkbenchState = {
    leftWidth: 360,
    rightWidth: 420,
    searchKind: 'all',
    searchQuery: '',
    selection: null, // { type: 'entity'|'relation', id }
    focusEntityId: null,
    filterCenterId: null,
    filterDepth: null,
    filterNodeTypes: []
  };

  function normaliseSelectionType(type) {
    return typeof type === 'string' ? type.toLowerCase() : null;
  }

  function setGraphWorkbenchSelection(selection) {
    if (!selection || !selection.id) {
      graphWorkbenchState.selection = null;
      return;
    }

    const type = normaliseSelectionType(selection.type) || 'entity';
    graphWorkbenchState.selection = { type, id: selection.id };
  }
  let isDirty = false;
  let snapshotDirty = false;
  let movementFormDirty = false;
  let itemEditorDirty = false;
  let isPopulatingMovementForm = false;
  let isPopulatingEditor = false;
  let isPopulatingCanonForms = false;
  let isCanonMarkdownInitialized = false;
  let isCanonCollectionInputsInitialized = false;
  let fatalImportErrorDom = null;
  let githubImportModal = null;
  let lastRepoSourceConfig = null;
  let lastRepoInfo = null;
  const DEFAULT_GITHUB_REPO_URL = 'https://github.com/johnbenac/movementengineer';

  function updateDirtyState() {
    isDirty = snapshotDirty || movementFormDirty || itemEditorDirty;
    renderSaveBanner();
  }

  function saveSnapshot(options = {}) {
    const {
      show = true,
      clearMovementDirty = false,
      clearItemDirty = false
    } = options;
    try {
      StorageService.saveSnapshot(snapshot);
      markSaved({ movement: clearMovementDirty, item: clearItemDirty });
      if (show) setStatus('Saved ✓');
    } catch (e) {
      setStatus('Save failed');
    }
    renderMovementList();
    renderActiveTab();
  }

  function loadSnapshot() {
    return StorageService.loadSnapshot();
  }

  function setStatus(text) {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = text || '';
    if (!text) return;
    // Fade after a short delay
    setTimeout(() => {
      if (el.textContent === text) {
        el.textContent = '';
      }
    }, 2500);
  }

  function ensureFatalImportBanner() {
    if (fatalImportErrorDom) return fatalImportErrorDom;
    const root = document.createElement('div');
    root.id = 'fatal-import-error';
    root.className = 'fatal-error-banner hidden';
    const title = document.createElement('div');
    title.className = 'fatal-error-title';
    title.textContent = 'Import failed';
    const body = document.createElement('pre');
    body.className = 'fatal-error-body';
    root.appendChild(title);
    root.appendChild(body);
    document.body.appendChild(root);
    fatalImportErrorDom = { root, title, body };
    return fatalImportErrorDom;
  }

  function showFatalImportError(error) {
    console.error(error);
    const dom = ensureFatalImportBanner();
    const message =
      (error && (error.message || error.stack)) ?
        `${error.message || ''}\n${error.stack || ''}`.trim() :
        String(error || 'Unknown error');
    dom.body.textContent = message;
    dom.root.classList.remove('hidden');
  }

  function clearFatalImportError() {
    if (!fatalImportErrorDom) return;
    fatalImportErrorDom.root.classList.add('hidden');
    fatalImportErrorDom.body.textContent = '';
  }

  function markDirty(source) {
    if (source === 'movement') {
      movementFormDirty = true;
      snapshotDirty = true;
    }
    if (source === 'item') itemEditorDirty = true;
    updateDirtyState();
  }

  function markSaved({ movement = false, item = false } = {}) {
    snapshotDirty = false;
    if (movement) movementFormDirty = false;
    if (item) itemEditorDirty = false;
    updateDirtyState();
  }

  function renderSaveBanner() {
    const banner = document.getElementById('save-banner');
    const text = document.getElementById('save-banner-text');
    const saveBtn = document.getElementById('btn-save-banner');
    if (!banner || !text || !saveBtn) return;

    banner.classList.toggle('saved', !isDirty);
    saveBtn.disabled = !isDirty;
    text.textContent = isDirty
      ? 'Changes have not been saved to disk.'
      : 'All changes are saved to this browser.';
  }

  function persistDirtyChanges() {
    if (movementFormDirty) {
      applyMovementFormToSnapshot();
    }

    if (itemEditorDirty) {
      const saved = saveItemFromEditor({ persist: false });
      if (!saved) return;
    }

    saveSnapshot({ clearMovementDirty: true, clearItemDirty: true });
  }

  function activateTab(name) {
    const current = getActiveTabName();
    if (current === name) return;
    document
      .querySelectorAll('.tab')
      .forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
    document
      .querySelectorAll('.tab-panel')
      .forEach(panel =>
        panel.classList.toggle('active', panel.id === 'tab-' + name)
      );
    renderActiveTab();
  }

  function focusDataTab() {
    if (getActiveTabName() !== 'data') activateTab('data');
  }

  function updateNavigationButtons() {
    const backBtn = document.getElementById('btn-preview-back');
    const fwdBtn = document.getElementById('btn-preview-forward');
    if (!backBtn || !fwdBtn) return;
    backBtn.disabled = navigationIndex <= 0;
    fwdBtn.disabled =
      navigationIndex < 0 || navigationIndex >= navigationStack.length - 1;
  }

  function resetNavigationHistory() {
    navigationStack = [];
    navigationIndex = -1;
    updateNavigationButtons();
  }

  function pushNavigationState(collectionName, itemId) {
    if (!collectionName || !itemId) {
      updateNavigationButtons();
      return;
    }

    const current = navigationStack[navigationIndex];
    if (
      current &&
      current.collectionName === collectionName &&
      current.itemId === itemId
    ) {
      updateNavigationButtons();
      return;
    }

    navigationStack = navigationStack.slice(0, navigationIndex + 1);
    navigationStack.push({ collectionName, itemId });
    navigationIndex = navigationStack.length - 1;
    updateNavigationButtons();
  }

  function pruneNavigationState(collectionName, itemId) {
    if (!navigationStack.length) return;
    const filtered = [];
    navigationStack.forEach((entry, idx) => {
      if (entry.collectionName === collectionName && entry.itemId === itemId) {
        if (idx <= navigationIndex) navigationIndex -= 1;
        return;
      }
      filtered.push(entry);
    });
    navigationStack = filtered;
    if (!navigationStack.length) {
      navigationIndex = -1;
    } else {
      navigationIndex = Math.max(
        Math.min(navigationIndex, navigationStack.length - 1),
        0
      );
    }
    updateNavigationButtons();
  }

  function navigateHistory(direction) {
    if (!navigationStack.length) return;
    const target = navigationIndex + direction;
    if (target < 0 || target >= navigationStack.length) return;
    navigationIndex = target;
    const state = navigationStack[navigationIndex];
    setCollectionAndItem(state.collectionName, state.itemId, {
      addToHistory: false,
      fromHistory: true
    });
    updateNavigationButtons();
  }

  // ---- Movement helpers ----

  function getMovementById(id) {
    return snapshot.movements.find(r => r.id === id) || null;
  }

  function selectMovement(id) {
    currentMovementId = id || null;
    currentItemId = null; // reset item selection in collection editor
    currentTextId = null;
    canonFilters = { ...DEFAULT_CANON_FILTERS };
    renderMovementList();
    renderActiveTab();
    closeSidebarOnMobile();
  }

  function addMovement() {
    const movement = DomainService.addMovement(snapshot);
    selectMovement(movement.id);
    saveSnapshot();
  }

  function deleteMovement(id) {
    if (!id) return;
    const movement = getMovementById(id);
    if (!movement) return;

    const confirmed = window.confirm(
      'Delete this movement AND all data with this movementId?\n\n' +
        movement.name +
        '\n\nThis cannot be undone.'
    );
    if (!confirmed) return;

    currentMovementId = DomainService.deleteMovement(snapshot, id);
    currentItemId = null;
    currentTextId = null;
    resetNavigationHistory();
    saveSnapshot();
  }

  // ---- DOM helpers ----

  function $(selector) {
    return document.querySelector(selector);
  }

  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function getActiveTabName() {
    const btn = document.querySelector('.tab.active');
    return btn ? btn.dataset.tab : 'dashboard';
  }

  function renderActiveTab() {
    const tabName = getActiveTabName();
    switch (tabName) {
      case 'dashboard':
        renderMovementForm();
        renderDashboard();
        break;
      case 'canon':
      case 'entities':
      case 'practices':
      case 'calendar':
      case 'claims':
      case 'rules':
      case 'authority':
      case 'media':
      case 'graph':
      case 'notes':
        renderMovementSection(tabName);
        break;
      case 'data':
        renderCollectionList();
        renderItemDetail();
        break;
      case 'comparison':
        renderComparison();
        break;
      default:
        break;
    }
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 960px)').matches;
  }

  function setSidebarOpen(open) {
    const body = document.body;
    const toggle = document.getElementById('btn-toggle-sidebar');
    if (!body) return;

    body.classList.toggle('sidebar-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function syncSidebarToViewport() {
    setSidebarOpen(!isMobileViewport());
  }

  function closeSidebarOnMobile() {
    if (isMobileViewport()) setSidebarOpen(false);
  }

  // ---- Movement list & form ----

  function renderMovementList() {
    const list = document.getElementById('movement-list');
    if (!list) return;
    clearElement(list);

    if (!snapshot.movements.length) {
      const li = document.createElement('li');
      li.textContent = 'No movements yet. Click + to add one.';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      list.appendChild(li);
      return;
    }

    snapshot.movements.forEach(movement => {
      const li = document.createElement('li');
      li.dataset.id = movement.id;
      li.className = movement.id === currentMovementId ? 'selected' : '';
      const primary = document.createElement('span');
      primary.textContent = movement.name || movement.id;
      const secondary = document.createElement('span');
      secondary.className = 'secondary';
      secondary.textContent = movement.shortName || '';
      li.appendChild(primary);
      li.appendChild(secondary);
      li.addEventListener('click', () => selectMovement(movement.id));
      list.appendChild(li);
    });
  }

  function renderMovementForm() {
    const idLabel = document.getElementById('movement-id-label');
    const nameInput = document.getElementById('movement-name');
    const shortInput = document.getElementById('movement-shortName');
    const summaryInput = document.getElementById('movement-summary');
    const tagsInput = document.getElementById('movement-tags');
    const deleteBtn = document.getElementById('btn-delete-movement');
    const saveBtn = document.getElementById('btn-save-movement');

    if (!currentMovementId) {
      idLabel.textContent = '—';
      nameInput.value = '';
      shortInput.value = '';
      summaryInput.value = '';
      tagsInput.value = '';
      [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(
        el => {
          el.disabled = true;
        }
      );
      return;
    }

    const movement = getMovementById(currentMovementId);
    if (!movement) {
      // out of sync; reset
      currentMovementId = null;
      renderMovementForm();
      return;
    }

    [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(
      el => {
        el.disabled = false;
      }
    );

    isPopulatingMovementForm = true;
    idLabel.textContent = movement.id;
    nameInput.value = movement.name || '';
    shortInput.value = movement.shortName || '';
    summaryInput.value = movement.summary || '';
    tagsInput.value = Array.isArray(movement.tags)
      ? movement.tags.join(', ')
      : '';
    isPopulatingMovementForm = false;
  }

  function applyMovementFormToSnapshot() {
    if (!currentMovementId) return;
    if (!getMovementById(currentMovementId)) return;

    const nameInput = document.getElementById('movement-name');
    const shortInput = document.getElementById('movement-shortName');
    const summaryInput = document.getElementById('movement-summary');
    const tagsInput = document.getElementById('movement-tags');

    const name = nameInput.value.trim() || 'Untitled movement';
    const shortName = shortInput.value.trim() || name;
    const summary = summaryInput.value.trim();
    const tags = tagsInput.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    DomainService.updateMovement(snapshot, currentMovementId, {
      name,
      shortName,
      summary,
      tags
    });

    renderMovementList();
  }

  function saveMovementFromForm() {
    applyMovementFormToSnapshot();

    saveSnapshot({ clearMovementDirty: true });
  }

  function ensureSelectOptions(selectEl, options, includeEmptyLabel) {
    if (!selectEl) return;
    const prev = selectEl.value;
    clearElement(selectEl);
    if (includeEmptyLabel) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = includeEmptyLabel;
      selectEl.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      selectEl.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      selectEl.value = prev;
    }
  }

  // ---- Movement explorer (view-model-driven views) ----

  function renderMovementSection(name) {
    const panel = document.getElementById('tab-' + name);
    if (panel) {
      panel
        .querySelectorAll('.panel-body select, .panel-body input, .panel-body button')
        .forEach(el => {
          el.disabled = !currentMovementId;
        });
    }

    if (!currentMovementId) {
      // Show a simple message in each container
      const containers = {
        canon: $('#shelf-list'),
        entities: $('#entity-detail'),
        practices: $('#practice-detail'),
        calendar: $('#calendar-view'),
        claims: $('#claims-table-wrapper'),
        rules: $('#rules-table-wrapper'),
        authority: $('#authority-sources'),
        media: $('#media-gallery'),
        graph: $('#graph-workbench-root'),
        notes: $('#notes-table-wrapper')
      };
      const target = containers[name];
      if (target) {
        clearElement(target);
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent =
          'Create or select a movement on the left to explore this section.';
        target.appendChild(p);
      }
      return;
    }

    switch (name) {
      case 'canon':
        renderLibraryView();
        break;
      case 'entities':
        renderEntitiesView();
        break;
      case 'practices':
        renderPracticesView();
        break;
      case 'calendar':
        renderCalendarView();
        break;
      case 'claims':
        renderClaimsView();
        break;
      case 'rules':
        renderRulesView();
        break;
      case 'authority':
        renderAuthorityView();
        break;
      case 'media':
        renderMediaView();
        break;
      case 'graph':
        renderGraphWorkbench();
        break;
      case 'notes':
        renderNotesView();
        break;
      default:
        break;
    }
  }

  // ---- Canon (buildCanonTreeViewModel) ----

  function parseCsvInput(value) {
    return (value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function applyTextCollectionFormToSnapshot() {
    if (isPopulatingCanonForms) return null;

    const collection = getActiveTextCollection();
    if (!collection) return null;

    const nameInput = document.getElementById('canon-collection-name');
    const descInput = document.getElementById('canon-collection-description');
    const tagsInput = document.getElementById('canon-collection-tags');
    if (!nameInput || !descInput || !tagsInput) return collection;

    const updated = {
      ...collection,
      name: nameInput.value.trim() || collection.name,
      description: descInput.value,
      tags: parseCsvInput(tagsInput.value)
    };

    DomainService.upsertItem(snapshot, 'textCollections', updated);
    snapshotDirty = true;
    updateDirtyState();
    return updated;
  }

  function ensureCanonCollectionInputHandlers() {
    if (isCanonCollectionInputsInitialized) return;

    const nameInput = document.getElementById('canon-collection-name');
    const descInput = document.getElementById('canon-collection-description');
    const tagsInput = document.getElementById('canon-collection-tags');

    if (!nameInput || !descInput || !tagsInput) return;

    const handleInput = () => applyTextCollectionFormToSnapshot();
    [nameInput, descInput, tagsInput].forEach(el =>
      el.addEventListener('input', handleInput)
    );

    isCanonCollectionInputsInitialized = true;
  }

  function getActiveTextCollection() {
    const select = document.getElementById('canon-collection-select');
    if (!select) return null;
    return (snapshot.textCollections || []).find(tc => tc.id === select.value);
  }

  function collectDescendants(textId, nodesById, acc = new Set()) {
    const node = nodesById[textId];
    if (!node || acc.has(textId)) return acc;
    acc.add(textId);
    (node.childIds || []).forEach(childId =>
      collectDescendants(childId, nodesById, acc)
    );
    return acc;
  }

  function isTextInActiveTree(textId, vm) {
    if (
      !textId ||
      !vm ||
      !Array.isArray(vm.roots) ||
      vm.roots.length === 0
    ) {
      return false;
    }

    const visited = new Set();
    const stack = vm.roots.map(root => root.id);

    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      if (id === textId) return true;

      const node = vm.nodesById[id];
      if (node && Array.isArray(node.childIds)) {
        node.childIds.forEach(childId => {
          if (!visited.has(childId)) stack.push(childId);
        });
      }
    }

    return false;
  }

  function getReachableCanonTextIds(vm) {
    const reachable = new Set();
    if (!vm || !Array.isArray(vm.roots)) return reachable;

    const stack = vm.roots.map(root => root.id);
    while (stack.length) {
      const id = stack.pop();
      if (reachable.has(id)) continue;
      reachable.add(id);
      const node = vm.nodesById[id];
      if (node && Array.isArray(node.childIds)) {
        node.childIds.forEach(childId => {
          if (!reachable.has(childId)) stack.push(childId);
        });
      }
    }

    return reachable;
  }

  function doesCanonNodeMatchFilters(node, filters) {
    if (!node) return false;

    if (filters.tag) {
      const tags = Array.isArray(node.tags) ? node.tags : [];
      if (!tags.includes(filters.tag)) return false;
    }

    if (filters.mention) {
      const mentions = Array.isArray(node.mentionsEntityIds)
        ? node.mentionsEntityIds
        : [];
      if (!mentions.includes(filters.mention)) return false;
    }

    if (filters.parent) {
      if (filters.parent === '__root__') {
        if (node.parentId !== null) return false;
      } else if (node.parentId !== filters.parent) {
        return false;
      }
    }

    if (filters.child) {
      const childIds = Array.isArray(node.childIds) ? node.childIds : [];
      if (!childIds.includes(filters.child)) return false;
    }

    const query = (filters.search || '').trim().toLowerCase();
    if (query) {
      const haystack = [
        node.title,
        node.label,
        node.mainFunction,
        Number.isFinite(node.depth) ? `depth:${node.depth}` : '',
        Array.isArray(node.tags) ? node.tags.join(' ') : '',
        (node.mentionsEntities || [])
          .map(ent => ent.name || ent.id)
          .join(' '),
        node.content
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  }

  function populateCanonFilterControls({ texts, reachableIds, entities }) {
    const tagSelect = document.getElementById('canon-tag-filter');
    const mentionSelect = document.getElementById('canon-mention-filter');
    const parentSelect = document.getElementById('canon-parent-filter');
    const childSelect = document.getElementById('canon-child-filter');
    const searchInput = document.getElementById('canon-search');

    if (searchInput) searchInput.value = canonFilters.search;

    const reachableTexts = texts.filter(t => reachableIds.has(t.id));
    const textLookup = new Map(reachableTexts.map(t => [t.id, t]));

    const tagOptions = Array.from(
      new Set(
        reachableTexts.flatMap(text =>
          Array.isArray(text.tags) ? text.tags.filter(Boolean) : []
        )
      )
    ).sort((a, b) => a.localeCompare(b));
    ensureSelectOptions(
      tagSelect,
      tagOptions.map(tag => ({ value: tag, label: tag })),
      'Any tag'
    );
    if (!tagOptions.includes(canonFilters.tag)) canonFilters.tag = '';
    if (tagSelect) tagSelect.value = canonFilters.tag;

    const mentionIds = new Set();
    reachableTexts.forEach(text => {
      (text.mentionsEntityIds || []).forEach(id => mentionIds.add(id));
    });
    const mentionOptions = Array.from(mentionIds)
      .map(id => {
        const ent = entities.get(id);
        const label = ent
          ? `${ent.name || ent.id}${ent.kind ? ` (${ent.kind})` : ''}`
          : id;
        return { value: id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    ensureSelectOptions(
      mentionSelect,
      mentionOptions,
      'Any entity mention'
    );
    if (!mentionIds.has(canonFilters.mention)) canonFilters.mention = '';
    if (mentionSelect) mentionSelect.value = canonFilters.mention;

    let hasRootOption = false;
    const parentOptions = [];
    reachableTexts.forEach(text => {
      if (text.parentId) {
        parentOptions.push({
          value: text.parentId,
          label: getLabelForItem(textLookup.get(text.parentId))
        });
      } else {
        hasRootOption = true;
      }
    });

    const parentOptionMap = new Map();
    parentOptions.forEach(opt => {
      if (!opt || !opt.value) return;
      const prev = parentOptionMap.get(opt.value);
      if (!prev || prev.label.length < (opt.label || '').length) {
        parentOptionMap.set(opt.value, opt);
      }
    });

    const mergedParentOptions = hasRootOption
      ? [{ value: '__root__', label: 'Root texts' }]
      : [];
    mergedParentOptions.push(...Array.from(parentOptionMap.values()));
    mergedParentOptions.sort((a, b) => a.label.localeCompare(b.label));
    ensureSelectOptions(parentSelect, mergedParentOptions, 'Any parent');
    if (!mergedParentOptions.some(opt => opt.value === canonFilters.parent)) {
      canonFilters.parent = '';
    }
    if (parentSelect) parentSelect.value = canonFilters.parent;

    const childOptions = reachableTexts
      .map(text => ({ value: text.id, label: getLabelForItem(text) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    ensureSelectOptions(childSelect, childOptions, 'Any child');
    if (!childOptions.some(opt => opt.value === canonFilters.child)) {
      canonFilters.child = '';
    }
    if (childSelect) childSelect.value = canonFilters.child;
  }

  function renderMarkdownPreview(targetEl, content, { enabled = true } = {}) {
    if (!targetEl) return;

    if (!enabled) {
      targetEl.classList.add('empty');
      targetEl.innerHTML = '<p class="muted">Select a text to see its content.</p>';
      return;
    }

    const trimmed = (content || '').trim();
    if (!trimmed) {
      targetEl.classList.add('empty');
      targetEl.innerHTML = '<p class="muted">Add markdown content to see a preview.</p>';
      return;
    }

    targetEl.classList.remove('empty');
    try {
      if (window.marked && typeof window.marked.parse === 'function') {
        const parsed = window.marked.parse(content);
        if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
          targetEl.innerHTML = window.DOMPurify.sanitize(parsed);
        } else {
          targetEl.textContent = parsed;
        }
      } else {
        targetEl.textContent = content;
      }
    } catch (err) {
      targetEl.textContent = content;
    }
  }

  function openMarkdownModal({
    title = 'Edit Markdown',
    initial = '',
    onSave = null,
    onClose = null
  } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'markdown-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'markdown-modal';

    const header = document.createElement('div');
    header.className = 'markdown-modal-header';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    header.appendChild(h2);
    modal.appendChild(header);

    const body = document.createElement('div');
    body.className = 'markdown-modal-body';

    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'markdown-editor-container';
    const textarea = document.createElement('textarea');
    textarea.className = 'markdown-editor';
    textarea.value = initial || '';
    editorWrapper.appendChild(textarea);

    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'markdown-preview';
    renderMarkdownPreview(previewWrapper, textarea.value);

    body.appendChild(editorWrapper);
    body.appendChild(previewWrapper);
    modal.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'markdown-modal-footer';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'btn btn-primary';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn';
    footer.appendChild(saveBtn);
    footer.appendChild(cancelBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const handleInput = () => {
      renderMarkdownPreview(previewWrapper, textarea.value);
    };
    textarea.addEventListener('input', handleInput);

    const closeModal = (triggerOnClose = true) => {
      textarea.removeEventListener('input', handleInput);
      document.removeEventListener('keydown', onKeyDown);
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
      if (triggerOnClose && typeof onClose === 'function') onClose();
    };

    const onKeyDown = evt => {
      if (evt.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    saveBtn.addEventListener('click', () => {
      if (typeof onSave === 'function') onSave(textarea.value);
      closeModal(false);
    });
    cancelBtn.addEventListener('click', () => closeModal());
  }

  function ensureCanonMarkdownControls() {
    if (isCanonMarkdownInitialized) return;

    const contentInput = document.getElementById('canon-text-content');
    const preview = document.getElementById('canon-text-preview');
    const openBtn = document.getElementById('btn-open-canon-markdown');
    if (!contentInput || !preview || !openBtn) return;

    contentInput.addEventListener('input', () => {
      renderMarkdownPreview(preview, contentInput.value, {
        enabled: !contentInput.disabled
      });
    });

    openBtn.addEventListener('click', () => {
      if (contentInput.disabled) return;
      openMarkdownModal({
        title: 'Edit canon text',
        initial: contentInput.value,
        onSave: value => {
          contentInput.value = value;
          renderMarkdownPreview(preview, value, { enabled: true });
        },
        onClose: () => {
          renderMarkdownPreview(preview, contentInput.value, {
            enabled: !contentInput.disabled
          });
        }
      });
    });

    isCanonMarkdownInitialized = true;
  }

  function renderCanonForms(vm) {
    const collection = vm.collection;
    const nameInput = document.getElementById('canon-collection-name');
    const descInput = document.getElementById('canon-collection-description');
    const tagsInput = document.getElementById('canon-collection-tags');
    const saveCollectionBtn = document.getElementById('btn-save-text-collection');
    const deleteCollectionBtn = document.getElementById(
      'btn-delete-text-collection'
    );

    if (!nameInput || !descInput || !tagsInput) return;

    ensureCanonCollectionInputHandlers();

    isPopulatingCanonForms = true;
    if (collection) {
      nameInput.value = collection.name || '';
      descInput.value = collection.description || '';
      tagsInput.value = (collection.tags || []).join(', ');
      nameInput.disabled = false;
      descInput.disabled = false;
      tagsInput.disabled = false;
      if (saveCollectionBtn) saveCollectionBtn.disabled = false;
      if (deleteCollectionBtn) deleteCollectionBtn.disabled = false;
    } else {
      nameInput.value = '';
      descInput.value = '';
      tagsInput.value = '';
      nameInput.disabled = true;
      descInput.disabled = true;
      tagsInput.disabled = true;
      if (saveCollectionBtn) saveCollectionBtn.disabled = true;
      if (deleteCollectionBtn) deleteCollectionBtn.disabled = true;
    }
    isPopulatingCanonForms = false;

    const textHint = document.getElementById('canon-text-hint');
    const titleInput = document.getElementById('canon-text-title');
    const labelInput = document.getElementById('canon-text-label');
    const mainFunctionInput = document.getElementById(
      'canon-text-main-function'
    );
    const parentSelect = document.getElementById('canon-text-parent');
    const tagsField = document.getElementById('canon-text-tags');
    const mentionsField = document.getElementById('canon-text-mentions');
    const contentInput = document.getElementById('canon-text-content');
    const rootCheckbox = document.getElementById('canon-text-root');
    const markdownPreview = document.getElementById('canon-text-preview');
    const markdownModalBtn = document.getElementById('btn-open-canon-markdown');
    const saveTextBtn = document.getElementById('btn-save-text');
    const deleteTextBtn = document.getElementById('btn-delete-text');
    const addChildBtn = document.getElementById('btn-add-child-text');

    if (
      !textHint ||
      !titleInput ||
      !labelInput ||
      !mainFunctionInput ||
      !parentSelect ||
      !tagsField ||
      !mentionsField ||
      !contentInput ||
      !rootCheckbox
    )
      return;

    ensureCanonMarkdownControls();

    const activeText =
      currentTextId &&
      (snapshot.texts || []).find(t => t.id === currentTextId);

    const blockedParents = activeText
      ? collectDescendants(activeText.id, vm.nodesById, new Set())
      : new Set();
    if (activeText) blockedParents.delete(activeText.id);

    const availableParents = (snapshot.texts || [])
      .filter(t => t.movementId === currentMovementId)
      .filter(t => t.id !== currentTextId)
      .filter(t => !blockedParents.has(t.id))
      .map(t => ({ value: t.id, label: getLabelForItem(t) }));

    ensureSelectOptions(parentSelect, availableParents, '— Root (no parent)');

    const syncRootCheckboxWithParent = () => {
      const collectionForRoot = getActiveTextCollection();
      const hasParent = !!parentSelect.value;
      rootCheckbox.disabled = !collectionForRoot || hasParent;
      if (hasParent) {
        rootCheckbox.checked = false;
      }
    };

    parentSelect.onchange = () => {
      if (isPopulatingCanonForms) return;
      syncRootCheckboxWithParent();
    };

    isPopulatingCanonForms = true;
    if (!activeText) {
      textHint.textContent =
        'Select a text from the tree or create a new one to edit its details.';
      [
        titleInput,
        labelInput,
        mainFunctionInput,
        parentSelect,
        tagsField,
        mentionsField,
        contentInput
      ].forEach(el => (el.disabled = true));
      rootCheckbox.disabled = true;
      rootCheckbox.checked = false;
      if (markdownPreview) {
        renderMarkdownPreview(markdownPreview, '', { enabled: false });
      }
      if (markdownModalBtn) markdownModalBtn.disabled = true;
      if (saveTextBtn) saveTextBtn.disabled = true;
      if (deleteTextBtn) deleteTextBtn.disabled = true;
      if (addChildBtn) addChildBtn.disabled = true;
      isPopulatingCanonForms = false;
      return;
    }

    textHint.textContent = `Editing ${activeText.title || activeText.id}`;
    [
      titleInput,
      labelInput,
      mainFunctionInput,
      parentSelect,
      tagsField,
      mentionsField,
      contentInput
    ].forEach(el => (el.disabled = false));
    titleInput.value = activeText.title || '';
    labelInput.value = activeText.label || '';
    mainFunctionInput.value = activeText.mainFunction || '';
    parentSelect.value = activeText.parentId || '';
    tagsField.value = (activeText.tags || []).join(', ');
    mentionsField.value = (activeText.mentionsEntityIds || []).join(', ');
    contentInput.value = activeText.content || '';

    const collectionRoots = collection?.rootTextIds || [];
    rootCheckbox.disabled = !collection;
    rootCheckbox.checked = collection
      ? collectionRoots.includes(activeText.id)
      : false;
    if (markdownPreview) {
      renderMarkdownPreview(markdownPreview, activeText.content || '', {
        enabled: true
      });
    }
    if (markdownModalBtn) markdownModalBtn.disabled = false;

    if (parentSelect.value) {
      rootCheckbox.checked = false;
    }

    if (saveTextBtn) saveTextBtn.disabled = false;
    if (deleteTextBtn) deleteTextBtn.disabled = false;
    if (addChildBtn) addChildBtn.disabled = false;
    isPopulatingCanonForms = false;
    syncRootCheckboxWithParent();
  }

  function renderCanonView() {
    const treeContainer = document.getElementById('canon-tree');
    if (!treeContainer) return;
    clearElement(treeContainer);

    const select = document.getElementById('canon-collection-select');
    if (!select) return;

    const allCollections = snapshot.textCollections || [];
    const ownCollections = allCollections.filter(
      tc => tc.movementId === currentMovementId
    );
    const options = ownCollections.map(tc => ({
      value: tc.id,
      label: tc.name || tc.id
    }));
    ensureSelectOptions(select, options, 'All texts (no collection filter)');

    const textCollectionId = select.value || null;
    const activeCollection = textCollectionId
      ? ownCollections.find(tc => tc.id === textCollectionId)
      : null;

    const movementTexts = (snapshot.texts || []).filter(
      t => t.movementId === currentMovementId
    );
    const movementEntities = new Map(
      (snapshot.entities || [])
        .filter(ent => ent.movementId === currentMovementId)
        .map(ent => [ent.id, ent])
    );

    const vm = ViewModels.buildCanonTreeViewModel(snapshot, {
      movementId: currentMovementId,
      textCollectionId: textCollectionId || null
    });

    if (
      currentTextId &&
      textCollectionId &&
      !isTextInActiveTree(currentTextId, vm)
    ) {
      currentTextId = null;
    }

    const reachableIds = getReachableCanonTextIds(vm);
    populateCanonFilterControls({
      texts: movementTexts,
      reachableIds,
      entities: movementEntities
    });

    const hasFilters = Object.values(canonFilters).some(Boolean);
    const visibleIds = hasFilters ? new Set() : new Set(reachableIds);

    if (hasFilters) {
      const matches = new Set();
      reachableIds.forEach(id => {
        const node = vm.nodesById[id];
        if (doesCanonNodeMatchFilters(node, canonFilters)) {
          matches.add(id);
        }
      });

      const parentMap = new Map();
      reachableIds.forEach(id => {
        const node = vm.nodesById[id];
        parentMap.set(id, node ? node.parentId || null : null);
      });

      const addWithAncestors = id => {
        if (!reachableIds.has(id) || visibleIds.has(id)) return;
        visibleIds.add(id);
        const parentId = parentMap.get(id);
        if (parentId) addWithAncestors(parentId);
      };

      matches.forEach(addWithAncestors);

      if (canonFilters.child && reachableIds.has(canonFilters.child)) {
        addWithAncestors(canonFilters.child);
      }
    }

    if (currentTextId && !visibleIds.has(currentTextId)) {
      currentTextId = null;
    }

    if (!vm.roots || vm.roots.length === 0) {
      currentTextId = null;
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No texts found for this movement.';
      treeContainer.appendChild(p);
      renderCanonForms({ collection: activeCollection, roots: [], nodesById: {} });
      return;
    }

    const filteredRoots = vm.roots.filter(root => visibleIds.has(root.id));

    if (!filteredRoots.length) {
      currentTextId = null;
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = hasFilters
        ? 'No texts matched the current filters.'
        : 'No texts found for this movement.';
      treeContainer.appendChild(p);
      renderCanonForms({ collection: activeCollection, roots: [], nodesById: vm.nodesById });
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'text-tree';

    const renderNode = node => {
      if (!visibleIds.has(node.id)) return null;
      const li = document.createElement('li');
      li.className = 'text-node';
      if (node.id === currentTextId) li.classList.add('selected');

      const header = document.createElement('div');
      header.className = 'text-node-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'text-node-title';
      const labelPart = node.label ? node.label + ' ' : '';
      titleSpan.textContent =
        (labelPart + (node.title || '')).trim() || node.id;
      header.appendChild(titleSpan);

      const metaSpan = document.createElement('span');
      metaSpan.className = 'text-node-meta';
      const bits = [];
      if (Number.isFinite(node.depth)) bits.push(`depth ${node.depth}`);
      if (node.mainFunction) bits.push(node.mainFunction);
      if (node.hasContent) bits.push('has content');
      metaSpan.textContent = bits.join(' · ');
      header.appendChild(metaSpan);

      header.addEventListener('click', () => {
        currentTextId = node.id;
        renderCanonView();
      });

      li.appendChild(header);

      const body = document.createElement('div');
      body.className = 'text-node-body';

      if (node.tags && node.tags.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        node.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'chip chip-tag';
          chip.textContent = tag;
          row.appendChild(chip);
        });
        body.appendChild(row);
      }

      if (node.mentionsEntities && node.mentionsEntities.length) {
        const label = document.createElement('div');
        label.textContent = 'Mentions:';
        label.style.fontSize = '0.75rem';
        body.appendChild(label);

        const row = document.createElement('div');
        row.className = 'chip-row';
        node.mentionsEntities.forEach(ent => {
          const chip = document.createElement('span');
          chip.className = 'chip chip-entity clickable';
          chip.textContent = ent.name || ent.id;
          chip.title = ent.kind || '';
          chip.addEventListener('click', () => jumpToEntity(ent.id));
          row.appendChild(chip);
        });
        body.appendChild(row);
      }

      if (node.referencedByClaims && node.referencedByClaims.length) {
        const label = document.createElement('div');
        label.textContent = `Claims (${node.referencedByClaims.length}):`;
        label.style.fontSize = '0.75rem';
        body.appendChild(label);
      }

      if (node.usedInEvents && node.usedInEvents.length) {
        const label = document.createElement('div');
        label.textContent = `Used in events (${node.usedInEvents.length}):`;
        label.style.fontSize = '0.75rem';
        body.appendChild(label);
      }

      if (body.childNodes.length) {
        li.appendChild(body);
      }

      if (node.childIds && node.childIds.length) {
        const childUl = document.createElement('ul');
        childUl.className = 'text-tree';
        node.childIds.forEach(id => {
          const child = vm.nodesById[id];
          if (!child || !visibleIds.has(id)) return;
          const rendered = renderNode(child);
          if (rendered) childUl.appendChild(rendered);
        });
        if (childUl.childNodes.length) li.appendChild(childUl);
      }

      return li;
    };

    filteredRoots.forEach(root => {
      const rendered = renderNode(root);
      if (rendered) ul.appendChild(rendered);
    });
    treeContainer.appendChild(ul);

    renderCanonForms({
      collection: activeCollection,
      roots: filteredRoots,
      nodesById: vm.nodesById
    });
  }

  function handleCanonFilterChange() {
    const searchInput = document.getElementById('canon-search');
    const tagSelect = document.getElementById('canon-tag-filter');
    const mentionSelect = document.getElementById('canon-mention-filter');
    const parentSelect = document.getElementById('canon-parent-filter');
    const childSelect = document.getElementById('canon-child-filter');

    canonFilters = {
      search: searchInput ? searchInput.value.trim() : '',
      tag: tagSelect ? tagSelect.value : '',
      mention: mentionSelect ? mentionSelect.value : '',
      parent: parentSelect ? parentSelect.value : '',
      child: childSelect ? childSelect.value : ''
    };

    renderCanonView();
  }

  // ---- Library (Canon) ----

  function renderLibraryView() {
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

    const searchQuery = document.getElementById('library-search')?.value || '';
    const vm = ViewModels.buildLibraryEditorViewModel(snapshot, {
      movementId: currentMovementId,
      activeShelfId: currentShelfId,
      activeBookId: currentBookId,
      activeNodeId: currentTextId,
      searchQuery
    });

    renderLibrarySearchResults(vm);

    if (!currentShelfId && vm.shelves.length) {
      currentShelfId = vm.shelves[0].id;
    }
    if (!currentBookId && vm.activeShelf && vm.activeShelf.bookIds.length) {
      currentBookId = vm.activeShelf.bookIds[0];
    }
    if (!currentTextId && currentBookId) {
      currentTextId = currentBookId;
    }

    renderShelfPane(vm);
    renderBooksPane(vm);
    renderTocPane(vm);
    renderNodeEditor(vm);
  }

  function renderEmptyHint(text) {
    const p = document.createElement('p');
    p.className = 'library-empty';
    p.textContent = text;
    return p;
  }

  function renderLibrarySearchResults(vm) {
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
          currentTextId = result.nodeId;
          currentBookId = result.bookId || result.nodeId;
          if (result.shelfIds && result.shelfIds.length) {
            currentShelfId = result.shelfIds[0];
          } else if (vm.shelvesByBookId[currentBookId]?.length) {
            currentShelfId = vm.shelvesByBookId[currentBookId][0];
          }
          renderLibraryView();
          setTimeout(() => scrollTocNodeIntoView(result.nodeId), 0);
        });

        resultsEl.appendChild(li);
      });
  }

  function renderShelfPane(vm) {
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
      if (shelf.id === currentShelfId) card.classList.add('active');
      const title = document.createElement('div');
      title.textContent = shelf.name || 'Untitled shelf';
      card.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${shelf.bookCount} books · ${shelf.textCount} texts`;
      card.appendChild(meta);
      card.addEventListener('click', () => {
        currentShelfId = shelf.id;
        currentBookId = shelf.bookIds[0] || null;
        currentTextId = currentBookId;
        renderLibraryView();
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
          currentBookId = id;
          currentTextId = id;
          renderLibraryView();
        });
        unshelvedList.appendChild(card);
      });
    }
  }

  function renderBooksPane(vm) {
    const bookList = document.getElementById('book-list');
    const titleEl = document.getElementById('books-pane-title');
    const hintEl = document.getElementById('books-pane-hint');
    clearElement(bookList);
    const activeShelf = currentShelfId ? vm.shelvesById[currentShelfId] : null;
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
      if (id === currentBookId) card.classList.add('active');
      const title = document.createElement('div');
      title.textContent = `${node.label ? node.label + ' ' : ''}${
        node.title || 'Untitled'
      }`;
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
        removeBookFromShelf(activeShelf.id, id);
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete book';
      deleteBtn.className = 'danger';
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        deleteBookAndDescendants(id);
      });
      actions.appendChild(removeBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(actions);

      card.addEventListener('click', () => {
        currentBookId = id;
        currentTextId = id;
        renderLibraryView();
      });
      bookList.appendChild(card);
    });
  }

  function renderTocPane(vm) {
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
      if (id === currentTextId) row.classList.add('active');
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
        currentTextId = id;
        currentBookId = vm.bookIdByNodeId[id] || currentBookId;
        renderLibraryView();
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

  function renderNodeEditor(vm) {
    const shelfEditor = document.getElementById('shelf-editor');
    const textEditor = document.getElementById('text-editor');
    const breadcrumb = document.getElementById('library-breadcrumb');
    clearElement(shelfEditor);
    clearElement(textEditor);
    if (breadcrumb) clearElement(breadcrumb);

    const activeShelf = currentShelfId ? vm.shelvesById[currentShelfId] : null;
    const activeNode = currentTextId ? vm.nodesById[currentTextId] : null;

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
        DomainService.upsertItem(snapshot, 'textCollections', {
          ...snapshot.textCollections.find(tc => tc.id === activeShelf.id),
          name: nameInput.value,
          description: desc.value
        });
        saveSnapshot({ show: false });
        setStatus('Shelf saved');
        renderLibraryView();
      });
      const del = document.createElement('button');
      del.textContent = 'Delete shelf';
      del.className = 'danger';
      del.addEventListener('click', () => {
        deleteTextCollection(activeShelf.id);
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
          toggleBookMembership(shelf.id, activeNode.id, cb.checked);
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
      const vmLatest = ViewModels.buildLibraryEditorViewModel(snapshot, {
        movementId: currentMovementId
      });
      const descendants = collectDescendants(activeNode.id, vmLatest.nodesById, new Set());
      if (parentId && descendants.has(parentId)) {
        alert('Cannot set a descendant as the parent.');
        return;
      }
      DomainService.upsertItem(snapshot, 'texts', {
        ...(() => {
          const existing = snapshot.texts.find(t => t.id === activeNode.id) || {};
          // Strip legacy level on save; depth is derived.
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
      saveSnapshot({ show: false });
      setStatus('Saved');
      renderLibraryView();
    });

    const addChildBtn = document.createElement('button');
    addChildBtn.textContent = 'Add child';
    addChildBtn.addEventListener('click', () => {
      const text = DomainService.addNewItem(snapshot, 'texts', currentMovementId);
      text.parentId = activeNode.id;
      text.title = 'New section';
      currentTextId = text.id;
      currentBookId = vm.bookIdByNodeId[activeNode.id] || currentBookId;
      saveSnapshot({ show: false });
      renderLibraryView();
    });

    const addSiblingBtn = document.createElement('button');
    addSiblingBtn.textContent = 'Add sibling';
    addSiblingBtn.addEventListener('click', () => {
      const text = DomainService.addNewItem(snapshot, 'texts', currentMovementId);
      text.parentId = activeNode.parentId || null;
      text.title = 'New section';
      currentTextId = text.id;
      currentBookId = vm.bookIdByNodeId[activeNode.id] || currentBookId;
      saveSnapshot({ show: false });
      renderLibraryView();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'danger';
    deleteBtn.addEventListener('click', () => deleteBookAndDescendants(activeNode.id));

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
        chip.addEventListener('click', () => jumpToEntity(ent.id));
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

  function toggleBookMembership(shelfId, bookId, shouldExist) {
    const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
    if (!shelf) return;
    const roots = new Set(normaliseArray(shelf.rootTextIds));
    if (shouldExist) roots.add(bookId);
    else roots.delete(bookId);
    shelf.rootTextIds = Array.from(roots);
    saveSnapshot({ show: false });
  }

  function removeBookFromShelf(shelfId, bookId) {
    const shelf = (snapshot.textCollections || []).find(tc => tc.id === shelfId);
    if (!shelf) return;
    shelf.rootTextIds = normaliseArray(shelf.rootTextIds).filter(id => id !== bookId);
    saveSnapshot({ show: false });
    setStatus('Book removed from shelf');
    renderLibraryView();
  }

  function deleteBookAndDescendants(bookId) {
    const vm = ViewModels.buildLibraryEditorViewModel(snapshot, { movementId: currentMovementId });
    const descendants = Array.from(collectDescendants(bookId, vm.nodesById, new Set()));
    const ok = window.confirm(
      `Delete this text and ${descendants.length - 1} descendant(s)? This cannot be undone.`
    );
    if (!ok) return;
    const descendantSet = new Set(descendants);
    descendants.forEach(id => DomainService.deleteItem(snapshot, 'texts', id));
    (snapshot.textCollections || []).forEach(tc => {
      tc.rootTextIds = normaliseArray(tc.rootTextIds).filter(id => !descendantSet.has(id));
    });
    if (currentTextId && descendantSet.has(currentTextId)) currentTextId = null;
    if (currentBookId && descendantSet.has(currentBookId)) currentBookId = null;
    saveSnapshot();
    renderLibraryView();
  }

  function addNewBookToShelf() {
    if (!currentMovementId) return;
    if (!currentShelfId) {
      alert('Choose a shelf first.');
      return;
    }
    const book = DomainService.addNewItem(snapshot, 'texts', currentMovementId);
    book.parentId = null;
    book.title = 'New book';
    book.label = book.label || '';
    const shelf = snapshot.textCollections.find(tc => tc.id === currentShelfId);
    if (shelf) {
      shelf.rootTextIds = normaliseArray(shelf.rootTextIds);
      shelf.rootTextIds.push(book.id);
    }
    currentBookId = book.id;
    currentTextId = book.id;
    saveSnapshot({ show: false });
    renderLibraryView();
  }

  function addExistingBookToShelf() {
    if (!currentMovementId || !currentShelfId) return;
    const roots = (snapshot.texts || []).filter(
      t => t.movementId === currentMovementId && !t.parentId
    );
    const shelf = snapshot.textCollections.find(tc => tc.id === currentShelfId);
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
    renderLibraryView();
  }

  function addTextCollection() {
    if (!currentMovementId) {
      alert('Select a movement first.');
      return;
    }
    try {
      const collection = DomainService.addNewItem(
        snapshot,
        'textCollections',
        currentMovementId
      );
      saveSnapshot({ show: false });
      setStatus('Text collection created');
      currentShelfId = collection.id;
      renderLibraryView();
    } catch (e) {
      alert(e.message);
    }
  }

  function saveTextCollection() {
    const updated = applyTextCollectionFormToSnapshot();
    if (!updated) return;

    saveSnapshot({ show: false });
    setStatus('Collection saved');
    renderLibraryView();
  }

  function deleteTextCollection(id = null) {
    const collection =
      id !== null
        ? (snapshot.textCollections || []).find(tc => tc.id === id)
        : getActiveTextCollection();
    if (!collection) return;
    const ok = window.confirm(
      `Delete this text collection?\n\n${collection.name || collection.id}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    DomainService.deleteItem(snapshot, 'textCollections', collection.id);
    if (currentShelfId === collection.id) {
      currentShelfId = null;
      currentBookId = null;
      currentTextId = null;
    }
    saveSnapshot();
    renderLibraryView();
  }

  function addRootTextNode() {
    if (!currentMovementId) {
      alert('Select a movement first.');
      return;
    }
    try {
      const collection = applyTextCollectionFormToSnapshot();
      const text = DomainService.addNewItem(snapshot, 'texts', currentMovementId);
      text.parentId = null;
      if (collection) {
        const roots = new Set(collection.rootTextIds || []);
        roots.add(text.id);
        collection.rootTextIds = Array.from(roots);
      }
      currentTextId = text.id;
      saveSnapshot({ show: false });
      setStatus('Text created');
      renderCanonView();
    } catch (e) {
      alert(e.message);
    }
  }

  function addChildTextNode() {
    if (!currentTextId) {
      alert('Select a parent text first.');
      return;
    }
    if (!currentMovementId) {
      alert('Select a movement first.');
      return;
    }
    try {
      applyTextCollectionFormToSnapshot();
      const text = DomainService.addNewItem(snapshot, 'texts', currentMovementId);
      text.parentId = currentTextId;
      currentTextId = text.id;
      saveSnapshot({ show: false });
      setStatus('Child text created');
      renderCanonView();
    } catch (e) {
      alert(e.message);
    }
  }

  function saveCurrentTextNode() {
    if (isPopulatingCanonForms) return;
    const activeCollection = applyTextCollectionFormToSnapshot();
    if (!currentTextId) return;
    const text = (snapshot.texts || []).find(t => t.id === currentTextId);
    if (!text) return;

    const titleInput = document.getElementById('canon-text-title');
    const labelInput = document.getElementById('canon-text-label');
    const mainFunctionInput = document.getElementById(
      'canon-text-main-function'
    );
    const parentSelect = document.getElementById('canon-text-parent');
    const tagsField = document.getElementById('canon-text-tags');
    const mentionsField = document.getElementById('canon-text-mentions');
    const contentInput = document.getElementById('canon-text-content');
    const rootCheckbox = document.getElementById('canon-text-root');

    const parentId = parentSelect.value || null;
    const vm = ViewModels.buildCanonTreeViewModel(snapshot, {
      movementId: currentMovementId,
      textCollectionId: null
    });
    const descendants = collectDescendants(currentTextId, vm.nodesById, new Set());
    if (parentId && descendants.has(parentId)) {
      alert('Cannot set a descendant as the parent of this text.');
      return;
    }

    const { level: _legacyLevel, ...cleanText } = text || {};
    const updated = {
      ...cleanText,
      title: titleInput.value,
      label: labelInput.value,
      mainFunction: mainFunctionInput.value || null,
      parentId,
      tags: parseCsvInput(tagsField.value),
      mentionsEntityIds: parseCsvInput(mentionsField.value),
      content: contentInput.value
    };

    DomainService.upsertItem(snapshot, 'texts', updated);

    const collection = activeCollection || getActiveTextCollection();
    if (collection) {
      const roots = new Set(collection.rootTextIds || []);
      if (rootCheckbox.checked) {
        roots.add(updated.id);
      } else {
        roots.delete(updated.id);
      }
      collection.rootTextIds = Array.from(roots);
    }

    saveSnapshot({ show: false });
    setStatus('Text saved');
    renderCanonView();
  }

  function deleteCurrentTextNode() {
    if (!currentTextId) return;
    const vm = ViewModels.buildCanonTreeViewModel(snapshot, {
      movementId: currentMovementId,
      textCollectionId: null
    });
    const descendants = Array.from(
      collectDescendants(currentTextId, vm.nodesById, new Set())
    );
    const text = (snapshot.texts || []).find(t => t.id === currentTextId);
    const label = getLabelForItem(text);
    const ok = window.confirm(
      `Delete this text and ${descendants.length - 1} descendant(s)?\n\n${label}\n\nThis cannot be undone.`
    );
    if (!ok) return;
    applyTextCollectionFormToSnapshot();

    const descendantSet = new Set(descendants);
    descendants.forEach(id => {
      DomainService.deleteItem(snapshot, 'texts', id);
    });
    (snapshot.textCollections || []).forEach(tc => {
      tc.rootTextIds = (tc.rootTextIds || []).filter(id => !descendantSet.has(id));
    });
    currentTextId = null;
    saveSnapshot();
    renderCanonView();
  }

  // ---- Entities (buildEntityDetailViewModel + buildEntityGraphViewModel) ----

  function renderEntitiesView() {
    const select = document.getElementById('entity-select');
    const detailContainer = document.getElementById('entity-detail');
    const graphDepthSelect = document.getElementById('entity-graph-depth');
    const graphContainer = document.getElementById('entity-graph');
    if (!select || !detailContainer || !graphDepthSelect || !graphContainer)
      return;

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId
    );

    const options = entities
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(e => ({ value: e.id, label: e.name || e.id }));
    ensureSelectOptions(select, options, 'Choose entity');

    const entityId =
      select.value || (options.length ? options[0].value : null);

    clearElement(detailContainer);
    clearElement(graphContainer);

    if (!entityId) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No entities found for this movement.';
      detailContainer.appendChild(p);
      return;
    }

    // Detail view
    const vm = ViewModels.buildEntityDetailViewModel(snapshot, {
      entityId
    });

    if (!vm.entity) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Entity not found.';
      detailContainer.appendChild(p);
      return;
    }

    const title = document.createElement('h3');
    title.textContent =
      vm.entity.name +
      (vm.entity.kind ? ` (${vm.entity.kind})` : '');
    detailContainer.appendChild(title);

    if (vm.entity.summary) {
      const summary = document.createElement('p');
      summary.textContent = vm.entity.summary;
      detailContainer.appendChild(summary);
    }

    const mkSection = (label, contentBuilder) => {
      const heading = document.createElement('div');
      heading.className = 'section-heading small';
      heading.textContent = label;
      detailContainer.appendChild(heading);
      const section = document.createElement('div');
      section.style.fontSize = '0.8rem';
      contentBuilder(section);
      detailContainer.appendChild(section);
    };

    if (vm.claims && vm.claims.length) {
      mkSection('Claims about this entity', section => {
        const ul = document.createElement('ul');
        vm.claims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (vm.practices && vm.practices.length) {
      mkSection('Involved in practices', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.practices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.title = p.kind || '';
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.events && vm.events.length) {
      mkSection('Appears in events', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.events.forEach(ev => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = ev.name || ev.id;
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.mentioningTexts && vm.mentioningTexts.length) {
      mkSection('Mentioned in texts', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.mentioningTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.title = Number.isFinite(t.depth) ? `Depth ${t.depth}` : '';
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.media && vm.media.length) {
      mkSection('Linked media', section => {
        const ul = document.createElement('ul');
        vm.media.forEach(m => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = m.uri;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = `${m.title} (${m.kind})`;
          li.appendChild(a);
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (vm.connections && vm.connections.length) {
      mkSection('Connections (derived)', section => {
        const ul = document.createElement('ul');
        const typeToCollection = {
          Movement: 'movements',
          TextCollection: 'textCollections',
          TextNode: 'texts',
          Entity: 'entities',
          Practice: 'practices',
          Event: 'events',
          Rule: 'rules',
          Claim: 'claims',
          MediaAsset: 'media',
          Note: 'notes'
        };

        vm.connections.forEach(conn => {
          const li = document.createElement('li');
          const arrow = conn.direction === 'incoming' ? '←' : '→';
          const otherLabel = conn.node.name || conn.node.id;
          const meta = conn.node.type ? ` (${labelForNodeType(conn.node.type)})` : '';
          li.textContent = `${arrow} ${conn.relationType || 'link'} ${arrow} ${otherLabel}${meta}`;
          li.style.cursor = 'pointer';

          const targetCollection = typeToCollection[conn.node.type];
          li.addEventListener('click', () => {
            if (targetCollection) {
              jumpToReferencedItem(targetCollection, conn.node.id);
            }
          });

          if (conn.source) {
            const reason = document.createElement('div');
            reason.className = 'hint';
            const fieldLabel = conn.source.field
              ? `.${conn.source.field}`
              : '';
            reason.textContent =
              `Edge derived from ${conn.source.collection || 'record'} ${conn.source.id || ''}${fieldLabel}`.trim();
            li.appendChild(reason);
          }

          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    // Graph view
    const depth = parseInt(
      document.getElementById('entity-graph-depth').value,
      10
    );
    const relTypeInput = document.getElementById(
      'entity-graph-relation-types'
    );
    const relTypesRaw = relTypeInput.value || '';
    const relationTypeFilter = relTypesRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const graphVm = ViewModels.buildEntityGraphViewModel(snapshot, {
      movementId: currentMovementId,
      centerEntityId: entityId,
      depth: Number.isFinite(depth) ? depth : 1,
      relationTypeFilter
    });

    if (!entityGraphView) {
      entityGraphView = new EntityGraphView({
        onNodeClick: id => {
          if (!id) return;
          document.getElementById('entity-select').value = id;
          renderEntitiesView();
        }
      });
    }

    entityGraphView.render(graphContainer, graphVm, {
      centerEntityId: graphVm.centerEntityId,
      width: graphContainer.clientWidth || undefined,
      height: 440
    });
  }

  // ---- Practices (buildPracticeDetailViewModel) ----

  function renderPracticesView() {
    const select = document.getElementById('practice-select');
    const detailContainer = document.getElementById('practice-detail');
    if (!select || !detailContainer) return;
    clearElement(detailContainer);

    const practices = (snapshot.practices || []).filter(
      p => p.movementId === currentMovementId
    );
    const options = practices
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(p => ({ value: p.id, label: p.name || p.id }));
    ensureSelectOptions(select, options, 'Choose practice');

    const practiceId =
      select.value || (options.length ? options[0].value : null);

    if (!practiceId) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No practices found for this movement.';
      detailContainer.appendChild(p);
      return;
    }

    const vm = ViewModels.buildPracticeDetailViewModel(snapshot, {
      practiceId
    });

    if (!vm.practice) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Practice not found.';
      detailContainer.appendChild(p);
      return;
    }

    const title = document.createElement('h3');
    title.textContent =
      vm.practice.name +
      (vm.practice.kind ? ` (${vm.practice.kind})` : '');
    detailContainer.appendChild(title);

    const meta = document.createElement('p');
    meta.style.fontSize = '0.8rem';
    meta.textContent = `Frequency: ${vm.practice.frequency} · Public: ${
      vm.practice.isPublic ? 'yes' : 'no'
    }`;
    detailContainer.appendChild(meta);

    if (vm.practice.description) {
      const desc = document.createElement('p');
      desc.textContent = vm.practice.description;
      detailContainer.appendChild(desc);
    }

    const mkSection = (label, contentBuilder) => {
      const heading = document.createElement('div');
      heading.className = 'section-heading small';
      heading.textContent = label;
      detailContainer.appendChild(heading);
      const section = document.createElement('div');
      section.style.fontSize = '0.8rem';
      contentBuilder(section);
      detailContainer.appendChild(section);
    };

    if (vm.entities && vm.entities.length) {
      mkSection('Involves entities', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
          vm.entities.forEach(e => {
            const chip = document.createElement('span');
            chip.className = 'chip chip-entity clickable';
            chip.textContent = e.name || e.id;
            chip.title = e.kind || '';
            chip.addEventListener('click', () => jumpToEntity(e.id));
            row.appendChild(chip);
          });
        section.appendChild(row);
      });
    }

    if (vm.instructionsTexts && vm.instructionsTexts.length) {
      mkSection('Instruction texts', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.instructionsTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.title = Number.isFinite(t.depth) ? `Depth ${t.depth}` : '';
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.supportingClaims && vm.supportingClaims.length) {
      mkSection('Supporting claims', section => {
        const ul = document.createElement('ul');
        vm.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (vm.attachedRules && vm.attachedRules.length) {
      mkSection('Related rules', section => {
        const ul = document.createElement('ul');
        vm.attachedRules.forEach(r => {
          const li = document.createElement('li');
          li.textContent =
            (r.kind ? '[' + r.kind + '] ' : '') + r.shortText;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (vm.attachedEvents && vm.attachedEvents.length) {
      mkSection('Scheduled in events', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.attachedEvents.forEach(ev => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = `${ev.name} (${ev.recurrence})`;
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.media && vm.media.length) {
      mkSection('Media', section => {
        const ul = document.createElement('ul');
        vm.media.forEach(m => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = m.uri;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = `${m.title} (${m.kind})`;
          li.appendChild(a);
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }
  }

  // ---- Calendar (buildCalendarViewModel) ----

  function renderCalendarView() {
    const wrapper = document.getElementById('calendar-view');
    const select = document.getElementById('calendar-recurrence-filter');
    if (!wrapper || !select) return;
    clearElement(wrapper);

    const val = select.value;
    const recurrenceFilter = val ? [val] : [];

    const vm = ViewModels.buildCalendarViewModel(snapshot, {
      movementId: currentMovementId,
      recurrenceFilter
    });

    if (!vm.events || vm.events.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No events in the calendar for this filter.';
      wrapper.appendChild(p);
      return;
    }

    vm.events.forEach(e => {
      const card = document.createElement('div');
      card.className = 'card';

      const title = document.createElement('h4');
      title.textContent = e.name;
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${e.recurrence} · ${e.timingRule}`;
      card.appendChild(meta);

      if (e.description) {
        const p = document.createElement('p');
        p.textContent = e.description;
        card.appendChild(p);
      }

      if (e.tags && e.tags.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        e.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'chip chip-tag';
          chip.textContent = tag;
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.mainPractices && e.mainPractices.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Practices:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        e.mainPractices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.mainEntities && e.mainEntities.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Entities:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        e.mainEntities.forEach(ent => {
          const chip = document.createElement('span');
          chip.className = 'chip chip-entity clickable';
          chip.textContent = ent.name || ent.id;
          chip.addEventListener('click', () => jumpToEntity(ent.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.readings && e.readings.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Readings:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        e.readings.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.supportingClaims && e.supportingClaims.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Supporting claims:';
        card.appendChild(heading);

        const ul = document.createElement('ul');
        e.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      wrapper.appendChild(card);
    });
  }

  // ---- Claims (buildClaimsExplorerViewModel) ----

  function renderClaimsView() {
    const wrapper = document.getElementById('claims-table-wrapper');
    const catSelect = document.getElementById('claims-category-filter');
    const entSelect = document.getElementById('claims-entity-filter');
    if (!wrapper || !catSelect || !entSelect) return;
    clearElement(wrapper);

    const allClaims = (snapshot.claims || []).filter(
      c => c.movementId === currentMovementId
    );
    const categories = Array.from(
      new Set(
        allClaims
          .map(c => c.category)
          .filter(Boolean)
      )
    ).sort();

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId
    );

    ensureSelectOptions(
      catSelect,
      categories.map(c => ({ value: c, label: c })),
      'All'
    );
    ensureSelectOptions(
      entSelect,
      entities
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      'Any'
    );

    const categoryVal = catSelect.value || '';
    const entityVal = entSelect.value || '';

    const vm = ViewModels.buildClaimsExplorerViewModel(snapshot, {
      movementId: currentMovementId,
      categoryFilter: categoryVal ? [categoryVal] : [],
      entityIdFilter: entityVal || null
    });

    if (!vm.claims || vm.claims.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No claims match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    [
      'Category',
      'Text',
      'Tags',
      'About entities',
      'Source texts',
      'Sources of truth'
    ].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    vm.claims.forEach(c => {
      const tr = document.createElement('tr');

      const tdCat = document.createElement('td');
      tdCat.textContent = c.category || '';
      tr.appendChild(tdCat);

      const tdText = document.createElement('td');
      tdText.textContent = c.text;
      tr.appendChild(tdText);

      const tdTags = document.createElement('td');
      tdTags.textContent = (c.tags || []).join(', ');
      tr.appendChild(tdTags);

      const tdEnts = document.createElement('td');
      if (c.aboutEntities && c.aboutEntities.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        c.aboutEntities.forEach(e => {
          const chip = document.createElement('span');
          chip.className = 'chip chip-entity clickable';
          chip.textContent = e.name || e.id;
          chip.addEventListener('click', () => jumpToEntity(e.id));
          row.appendChild(chip);
        });
        tdEnts.appendChild(row);
      }
      tr.appendChild(tdEnts);

      const tdTexts = document.createElement('td');
      if (c.sourceTexts && c.sourceTexts.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        c.sourceTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        tdTexts.appendChild(row);
      }
      tr.appendChild(tdTexts);

      const tdSources = document.createElement('td');
      tdSources.textContent = (c.sourcesOfTruth || []).join(', ');
      tr.appendChild(tdSources);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ---- Rules (buildRuleExplorerViewModel) ----

  function renderRulesView() {
    const wrapper = document.getElementById('rules-table-wrapper');
    const kindSelect = document.getElementById('rules-kind-filter');
    const domainInput = document.getElementById('rules-domain-filter');
    if (!wrapper || !kindSelect || !domainInput) return;
    clearElement(wrapper);

    const kindVal = kindSelect.value || '';
    const rawDomain = domainInput.value || '';
    const domainFilter = rawDomain
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const vm = ViewModels.buildRuleExplorerViewModel(snapshot, {
      movementId: currentMovementId,
      kindFilter: kindVal ? [kindVal] : [],
      domainFilter
    });

    if (!vm.rules || vm.rules.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No rules match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    [
      'Kind',
      'Short text',
      'Domain',
      'Applies to',
      'Tags',
      'Supporting texts',
      'Supporting claims',
      'Related practices',
      'Sources of truth'
    ].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    vm.rules.forEach(r => {
      const tr = document.createElement('tr');

      const tdKind = document.createElement('td');
      tdKind.textContent = r.kind || '';
      tr.appendChild(tdKind);

      const tdShort = document.createElement('td');
      tdShort.textContent = r.shortText;
      tr.appendChild(tdShort);

      const tdDomain = document.createElement('td');
      tdDomain.textContent = (r.domain || []).join(', ');
      tr.appendChild(tdDomain);

      const tdApplies = document.createElement('td');
      tdApplies.textContent = (r.appliesTo || []).join(', ');
      tr.appendChild(tdApplies);

      const tdTags = document.createElement('td');
      tdTags.textContent = (r.tags || []).join(', ');
      tr.appendChild(tdTags);

      const tdTexts = document.createElement('td');
      if (r.supportingTexts && r.supportingTexts.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        r.supportingTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        tdTexts.appendChild(row);
      }
      tr.appendChild(tdTexts);

      const tdClaims = document.createElement('td');
      if (r.supportingClaims && r.supportingClaims.length) {
        const ul = document.createElement('ul');
        r.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        tdClaims.appendChild(ul);
      }
      tr.appendChild(tdClaims);

      const tdPractices = document.createElement('td');
      if (r.relatedPractices && r.relatedPractices.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        r.relatedPractices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        tdPractices.appendChild(row);
      }
      tr.appendChild(tdPractices);

      const tdSources = document.createElement('td');
      tdSources.textContent = (r.sourcesOfTruth || []).join(', ');
      tr.appendChild(tdSources);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ---- Authority (buildAuthorityViewModel) ----

  function renderAuthorityView() {
    const srcWrapper = document.getElementById('authority-sources');
    const entWrapper = document.getElementById('authority-entities');
    if (!srcWrapper || !entWrapper) return;
    clearElement(srcWrapper);
    clearElement(entWrapper);

    const vm = ViewModels.buildAuthorityViewModel(snapshot, {
      movementId: currentMovementId
    });

    if (!vm.sourcesByLabel || vm.sourcesByLabel.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No sources of truth recorded yet.';
      srcWrapper.appendChild(p);
    } else {
      vm.sourcesByLabel.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card';

        const h = document.createElement('h4');
        h.textContent = s.label;
        card.appendChild(h);

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = [
          `Claims: ${s.usedByClaims.length}`,
          `Rules: ${s.usedByRules.length}`,
          `Practices: ${s.usedByPractices.length}`,
          `Entities: ${s.usedByEntities.length}`
        ].join(' · ');
        card.appendChild(meta);

        srcWrapper.appendChild(card);
      });
    }

    if (!vm.authorityEntities || vm.authorityEntities.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No authority entities recorded yet.';
      entWrapper.appendChild(p);
    } else {
      vm.authorityEntities.forEach(e => {
        const card = document.createElement('div');
        card.className = 'card';

        const h = document.createElement('h4');
        h.textContent =
          e.name + (e.kind ? ` (${e.kind})` : '');
        card.appendChild(h);

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = [
          `Claims: ${e.usedAsSourceIn.claims.length}`,
          `Rules: ${e.usedAsSourceIn.rules.length}`,
          `Practices: ${e.usedAsSourceIn.practices.length}`,
          `Entities: ${e.usedAsSourceIn.entities.length}`
        ].join(' · ');
        card.appendChild(meta);

        entWrapper.appendChild(card);
      });
    }
  }

  // ---- Media (buildMediaGalleryViewModel) ----

  function renderMediaView() {
    const wrapper = document.getElementById('media-gallery');
    const entSelect = document.getElementById('media-entity-filter');
    const prSelect = document.getElementById('media-practice-filter');
    const evSelect = document.getElementById('media-event-filter');
    const txSelect = document.getElementById('media-text-filter');
    if (!wrapper || !entSelect || !prSelect || !evSelect || !txSelect) return;
    clearElement(wrapper);

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId
    );
    const practices = (snapshot.practices || []).filter(
      p => p.movementId === currentMovementId
    );
    const events = (snapshot.events || []).filter(
      e => e.movementId === currentMovementId
    );
    const texts = (snapshot.texts || []).filter(
      t => t.movementId === currentMovementId
    );

    ensureSelectOptions(
      entSelect,
      entities
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      'Any'
    );
    ensureSelectOptions(
      prSelect,
      practices
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(p => ({ value: p.id, label: p.name || p.id })),
      'Any'
    );
    ensureSelectOptions(
      evSelect,
      events
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      'Any'
    );
    ensureSelectOptions(
      txSelect,
      texts
        .slice()
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        .map(t => ({ value: t.id, label: t.title || t.id })),
      'Any'
    );

    const entityIdFilter = entSelect.value || null;
    const practiceIdFilter = prSelect.value || null;
    const eventIdFilter = evSelect.value || null;
    const textIdFilter = txSelect.value || null;

    const vm = ViewModels.buildMediaGalleryViewModel(snapshot, {
      movementId: currentMovementId,
      entityIdFilter: entityIdFilter || null,
      practiceIdFilter: practiceIdFilter || null,
      eventIdFilter: eventIdFilter || null,
      textIdFilter: textIdFilter || null
    });

    if (!vm.items || vm.items.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No media match this filter.';
      wrapper.appendChild(p);
      return;
    }

    vm.items.forEach(m => {
      const card = document.createElement('div');
      card.className = 'card';

      const h = document.createElement('h4');
      h.textContent =
        m.title + (m.kind ? ` (${m.kind})` : '');
      card.appendChild(h);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = m.uri;
      card.appendChild(meta);

      if (m.description) {
        const p = document.createElement('p');
        p.textContent = m.description;
        card.appendChild(p);
      }

      if (m.tags && m.tags.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        m.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'chip chip-tag';
          chip.textContent = tag;
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.entities && m.entities.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Entities:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.entities.forEach(e => {
          const chip = document.createElement('span');
          chip.className = 'chip chip-entity clickable';
          chip.textContent = e.name || e.id;
          chip.addEventListener('click', () => jumpToEntity(e.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.practices && m.practices.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Practices:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.practices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.events && m.events.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Events:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.events.forEach(e => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = e.name || e.id;
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.texts && m.texts.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Texts:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.texts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      wrapper.appendChild(card);
    });
  }

  // ============================================================
  // Graph Workbench — Ontorum-style panes
  // ============================================================

  function normaliseArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
    );
  }

  const GRAPH_NODE_TYPE_LABELS = {
    Entity: 'Entity',
    TextCollection: 'Canon collection',
    TextNode: 'Canon text',
    Practice: 'Practice',
    Event: 'Calendar event',
    Rule: 'Rule',
    Claim: 'Claim',
    MediaAsset: 'Media',
    Note: 'Note'
  };

  const labelForNodeType = type => GRAPH_NODE_TYPE_LABELS[type] || type || 'Unknown';

  const colorForNodeType = type => {
    if (typeof window !== 'undefined' && window.EntityGraphColors?.colorForNodeType) {
      return window.EntityGraphColors.colorForNodeType(type);
    }
    return '#1f2937';
  };

  const GRAPH_NODE_EDIT_CONFIG = {
    textcollection: {
      collection: 'textCollections',
      label: 'Canon collection',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Name', name: 'name' },
        { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' },
        { label: 'Root text IDs (csv)', name: 'rootTextIds', type: 'csv' }
      ]
    },
    textnode: {
      collection: 'texts',
      label: 'Canon text',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Parent ID', name: 'parentId', nullable: true },
        { label: 'Title', name: 'title' },
        { label: 'Label', name: 'label' },
        { label: 'Content', name: 'content', type: 'textarea', rows: 4, nullable: true },
        { label: 'Main function', name: 'mainFunction', nullable: true },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' },
        { label: 'Mentions entity IDs (csv)', name: 'mentionsEntityIds', type: 'csv' }
      ]
    },
    practice: {
      collection: 'practices',
      label: 'Practice',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Name', name: 'name' },
        { label: 'Kind', name: 'kind', nullable: true },
        { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
        { label: 'Frequency', name: 'frequency', nullable: true },
        { label: 'Is public', name: 'isPublic', type: 'checkbox' },
        { label: 'Notes', name: 'notes', type: 'textarea', rows: 3, nullable: true },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' },
        { label: 'Involved entity IDs (csv)', name: 'involvedEntityIds', type: 'csv' },
        { label: 'Instruction text IDs (csv)', name: 'instructionsTextIds', type: 'csv' },
        { label: 'Supporting claim IDs (csv)', name: 'supportingClaimIds', type: 'csv' },
        { label: 'Sources of truth (csv)', name: 'sourcesOfTruth', type: 'csv' },
        { label: 'Source entity IDs (csv)', name: 'sourceEntityIds', type: 'csv' }
      ]
    },
    event: {
      collection: 'events',
      label: 'Calendar event',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Name', name: 'name' },
        { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
        { label: 'Recurrence', name: 'recurrence', nullable: true },
        { label: 'Timing rule', name: 'timingRule', nullable: true },
        { label: 'Notes', name: 'notes', type: 'textarea', rows: 3, nullable: true },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' },
        { label: 'Main practice IDs (csv)', name: 'mainPracticeIds', type: 'csv' },
        { label: 'Main entity IDs (csv)', name: 'mainEntityIds', type: 'csv' },
        { label: 'Reading text IDs (csv)', name: 'readingTextIds', type: 'csv' },
        { label: 'Supporting claim IDs (csv)', name: 'supportingClaimIds', type: 'csv' }
      ]
    },
    rule: {
      collection: 'rules',
      label: 'Rule',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Short text', name: 'shortText' },
        { label: 'Kind', name: 'kind', nullable: true },
        { label: 'Details', name: 'details', type: 'textarea', rows: 3, nullable: true },
        { label: 'Applies to (csv)', name: 'appliesTo', type: 'csv' },
        { label: 'Domain (csv)', name: 'domain', type: 'csv' },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' },
        { label: 'Supporting text IDs (csv)', name: 'supportingTextIds', type: 'csv' },
        { label: 'Supporting claim IDs (csv)', name: 'supportingClaimIds', type: 'csv' },
        { label: 'Related practice IDs (csv)', name: 'relatedPracticeIds', type: 'csv' },
        { label: 'Sources of truth (csv)', name: 'sourcesOfTruth', type: 'csv' },
        { label: 'Source entity IDs (csv)', name: 'sourceEntityIds', type: 'csv' }
      ]
    },
    claim: {
      collection: 'claims',
      label: 'Claim',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Text', name: 'text', type: 'textarea', rows: 3 },
        { label: 'Category', name: 'category', nullable: true },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' },
        { label: 'Source text IDs (csv)', name: 'sourceTextIds', type: 'csv' },
        { label: 'About entity IDs (csv)', name: 'aboutEntityIds', type: 'csv' },
        { label: 'Sources of truth (csv)', name: 'sourcesOfTruth', type: 'csv' },
        { label: 'Source entity IDs (csv)', name: 'sourceEntityIds', type: 'csv' },
        { label: 'Notes', name: 'notes', type: 'textarea', rows: 3, nullable: true }
      ]
    },
    mediaasset: {
      collection: 'media',
      label: 'Media',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Kind', name: 'kind', nullable: true },
        { label: 'URI', name: 'uri' },
        { label: 'Title', name: 'title' },
        { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' },
        { label: 'Linked entity IDs (csv)', name: 'linkedEntityIds', type: 'csv' },
        { label: 'Linked practice IDs (csv)', name: 'linkedPracticeIds', type: 'csv' },
        { label: 'Linked event IDs (csv)', name: 'linkedEventIds', type: 'csv' },
        { label: 'Linked text IDs (csv)', name: 'linkedTextIds', type: 'csv' }
      ]
    },
    note: {
      collection: 'notes',
      label: 'Note',
      fields: [
        { label: 'ID', name: 'id', readOnly: true },
        { label: 'Movement ID', name: 'movementId' },
        { label: 'Target type', name: 'targetType' },
        { label: 'Target ID', name: 'targetId' },
        { label: 'Author', name: 'author', nullable: true },
        { label: 'Body', name: 'body', type: 'textarea', rows: 3 },
        { label: 'Context', name: 'context', type: 'textarea', rows: 2, nullable: true },
        { label: 'Tags (csv)', name: 'tags', type: 'csv' }
      ]
    }
  };

  function buildEntityIndex(entities) {
    const map = new Map();
    (entities || []).forEach(e => {
      if (e && e.id) map.set(e.id, e);
    });
    return map;
  }

  function getGraphDatasetForCurrentMovement() {
    const movementId = currentMovementId;

    const allEntities = normaliseArray(snapshot && snapshot.entities);

    const visibleEntities = allEntities.filter(
      e => e && e.movementId === movementId
    );

    const entityById = buildEntityIndex(visibleEntities);

    return { visibleEntities, entityById };
  }

  function ensureGraphWorkbenchDom() {
    const root = document.getElementById('graph-workbench-root');
    if (!root) return null;

    if (graphWorkbenchDom && graphWorkbenchDom.root === root) {
      return graphWorkbenchDom;
    }

    root.innerHTML = `
      <div id="graph-workbench" class="graph-workbench"
           style="--graph-left-width:${graphWorkbenchState.leftWidth}px; --graph-right-width:${graphWorkbenchState.rightWidth}px;">
        <div class="graph-pane">
          <div class="graph-resize-handle left" title="Drag to resize"></div>
          <div class="pane-inner">

            <details id="gw-create-entity" open>
              <summary>Add Entity</summary>
              <div class="details-body">
                <form id="gw-add-entity-form" class="graph-form">
                  <div class="form-row">
                    <label>Name *</label>
                    <input id="gw-add-entity-name" class="form-control" type="text" required />
                  </div>

                  <div class="form-row">
                    <label>Kind</label>
                    <input id="gw-add-entity-kind" class="form-control" list="gw-entity-kind-options" placeholder="e.g. being, place, object..." />
                    <datalist id="gw-entity-kind-options"></datalist>
                  </div>

                  <div class="form-row">
                    <label>Summary</label>
                    <textarea id="gw-add-entity-summary" class="form-control" rows="3"></textarea>
                  </div>

                  <div class="form-row">
                    <label>Tags (comma separated)</label>
                    <input id="gw-add-entity-tags" class="form-control" type="text" placeholder="tag1, tag2" />
                  </div>

                  <div class="form-row">
                    <label>Sources of truth (comma separated)</label>
                    <input id="gw-add-entity-sources" class="form-control" type="text" placeholder="book, tradition, archive..." />
                  </div>

                  <div class="form-row">
                    <label>Source entity IDs (comma separated)</label>
                    <input id="gw-add-entity-source-entities" class="form-control" type="text" placeholder="ent-123, ent-456" />
                    <div class="hint">Tip: use the Search pane to copy IDs.</div>
                  </div>

                  <div class="form-row">
                    <label>Notes</label>
                    <textarea id="gw-add-entity-notes" class="form-control" rows="3"></textarea>
                  </div>

                  <div class="form-row inline">
                    <button class="btn btn-primary" type="submit">Create Entity</button>
                  </div>
                </form>
              </div>
            </details>


          </div>
        </div>

        <div class="graph-pane">
          <div class="pane-inner">
            <div class="graph-toolbar">
              <span class="toolbar-spacer"></span>

              <button class="btn" type="button" id="gw-fit-btn">Fit</button>
              <button class="btn" type="button" id="gw-clear-selection-btn">Clear</button>
            </div>

            <div id="gw-canvas" class="graph-canvas card"></div>
          </div>
        </div>

        <div class="graph-pane">
          <div class="graph-resize-handle right" title="Drag to resize"></div>
          <div class="pane-inner">

            <details id="gw-filters" open>
              <summary>Filters</summary>
              <div class="details-body">
                <div class="card">
                  <div class="form-row">
                    <label>Center node</label>
                    <div id="gw-filter-center-label" class="hint">No center selected; showing full graph.</div>
                    <div class="form-row inline" style="margin-bottom:0;">
                      <button class="btn" type="button" id="gw-filter-use-selection">Use selected</button>
                      <button class="btn" type="button" id="gw-filter-clear-center">Clear</button>
                    </div>
                  </div>

                  <div class="form-row inline" style="align-items:flex-end;">
                    <div style="flex:1;">
                      <label>Hops</label>
                      <input id="gw-filter-depth" class="form-control" type="number" min="0" step="1" placeholder="∞ (no limit)" />
                    </div>
                    <button class="btn" type="button" id="gw-filter-depth-clear" title="No hop limit">∞</button>
                  </div>

                  <div class="form-row">
                    <label>Node types</label>
                    <div id="gw-filter-types" class="chip-row wrap"></div>
                    <div class="hint">Select none to show all node types.</div>
                  </div>

                  <div class="form-row inline">
                    <button class="btn" type="button" id="gw-filter-reset">Reset filters</button>
                  </div>
                </div>
              </div>
            </details>

            <details id="gw-search" open>
              <summary>Search</summary>
              <div class="details-body">
                <div class="search-panel card">
                  <div class="search-controls">
                    <select id="gw-search-kind" class="form-control"></select>
                    <input id="gw-search-query" class="form-control" type="text" placeholder="Search by name/summary..." />
                  </div>
                  <ul id="gw-search-results" class="graph-search-results"></ul>
                </div>
              </div>
            </details>

            <details id="gw-selected" open>
              <summary>Selected</summary>
              <div class="details-body">
                <div id="gw-selected-body" class="card graph-selected-body"></div>
              </div>
            </details>

          </div>
        </div>
      </div>
    `;

    const dom = {
      root,
      workbench: document.getElementById('graph-workbench'),
      canvas: document.getElementById('gw-canvas'),
      fitBtn: document.getElementById('gw-fit-btn'),
      clearBtn: document.getElementById('gw-clear-selection-btn'),

      filterCenterLabel: document.getElementById('gw-filter-center-label'),
      filterUseSelection: document.getElementById('gw-filter-use-selection'),
      filterClearCenter: document.getElementById('gw-filter-clear-center'),
      filterDepth: document.getElementById('gw-filter-depth'),
      filterDepthClear: document.getElementById('gw-filter-depth-clear'),
      filterTypes: document.getElementById('gw-filter-types'),
      filterReset: document.getElementById('gw-filter-reset'),

      searchKind: document.getElementById('gw-search-kind'),
      searchQuery: document.getElementById('gw-search-query'),
      searchResults: document.getElementById('gw-search-results'),

      selectedBody: document.getElementById('gw-selected-body'),

      createEntityForm: document.getElementById('gw-add-entity-form'),
      createEntityName: document.getElementById('gw-add-entity-name'),
      createEntityKind: document.getElementById('gw-add-entity-kind'),
      createEntitySummary: document.getElementById('gw-add-entity-summary'),
      createEntityTags: document.getElementById('gw-add-entity-tags'),
      createEntitySources: document.getElementById('gw-add-entity-sources'),
      createEntitySourceEntities: document.getElementById('gw-add-entity-source-entities'),
      createEntityNotes: document.getElementById('gw-add-entity-notes'),
      entityKindDatalist: document.getElementById('gw-entity-kind-options'),

      leftHandle: root.querySelector('.graph-resize-handle.left'),
      rightHandle: root.querySelector('.graph-resize-handle.right')
    };

    // resize handles
    function attachResize(handleEl, side) {
      if (!handleEl) return;
      handleEl.addEventListener('mousedown', e => {
        e.preventDefault();
        const startX = e.clientX;
        const startLeft = graphWorkbenchState.leftWidth;
        const startRight = graphWorkbenchState.rightWidth;

        function onMove(ev) {
          const dx = ev.clientX - startX;
          if (side === 'left') {
            const next = Math.max(240, startLeft + dx);
            graphWorkbenchState.leftWidth = next;
          } else {
            // dragging right handle left/right changes right pane width inversely
            const next = Math.max(260, startRight - dx);
            graphWorkbenchState.rightWidth = next;
          }
          if (dom.workbench) {
            dom.workbench.style.setProperty('--graph-left-width', graphWorkbenchState.leftWidth + 'px');
            dom.workbench.style.setProperty('--graph-right-width', graphWorkbenchState.rightWidth + 'px');
          }
        }

        function onUp() {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    }

    attachResize(dom.leftHandle, 'left');
    attachResize(dom.rightHandle, 'right');

    // wiring: filters + buttons
    dom.fitBtn.addEventListener('click', () => {
      if (workbenchGraphView) workbenchGraphView.fit();
    });

    dom.clearBtn.addEventListener('click', () => {
      setGraphWorkbenchSelection(null);
      renderGraphWorkbench();
    });

    dom.filterDepth.addEventListener('input', () => {
      const raw = dom.filterDepth.value;
      if (raw === '') {
        graphWorkbenchState.filterDepth = null;
      } else {
        const n = parseInt(raw, 10);
        graphWorkbenchState.filterDepth = Number.isFinite(n) && n >= 0 ? n : null;
      }
      renderGraphWorkbench();
    });

    dom.filterDepthClear.addEventListener('click', () => {
      graphWorkbenchState.filterDepth = null;
      dom.filterDepth.value = '';
      renderGraphWorkbench();
    });

    dom.filterUseSelection.addEventListener('click', () => {
      const sel = graphWorkbenchState.selection;
      if (!sel || !sel.id) return;
      const t = normaliseSelectionType(sel.type);
      if (t === 'relation' || t === 'edge') return;
      graphWorkbenchState.filterCenterId = sel.id;
      renderGraphWorkbench();
    });

    dom.filterClearCenter.addEventListener('click', () => {
      graphWorkbenchState.filterCenterId = null;
      renderGraphWorkbench();
    });

    dom.filterReset.addEventListener('click', () => {
      graphWorkbenchState.filterCenterId = null;
      graphWorkbenchState.filterDepth = null;
      graphWorkbenchState.filterNodeTypes = [];
      renderGraphWorkbench();
    });

    dom.searchKind.addEventListener('change', () => {
      graphWorkbenchState.searchKind = dom.searchKind.value || 'all';
      renderGraphWorkbench(); // cheap enough; also updates result list selection highlights
    });

    dom.searchQuery.addEventListener('input', () => {
      graphWorkbenchState.searchQuery = dom.searchQuery.value || '';
      renderGraphWorkbench();
    });

    // Create entity
    dom.createEntityForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!currentMovementId) return;

      const name = (dom.createEntityName.value || '').trim();
      if (!name) return;

      const kind = (dom.createEntityKind.value || '').trim() || null;
      const summary = (dom.createEntitySummary.value || '').trim() || null;
      const tags = parseCsvInput(dom.createEntityTags.value);
      const sourcesOfTruth = parseCsvInput(dom.createEntitySources.value);
      const sourceEntityIds = parseCsvInput(dom.createEntitySourceEntities.value);
      const notes = (dom.createEntityNotes.value || '').trim() || null;

      try {
        const entity = DomainService.addNewItem(snapshot, 'entities', currentMovementId);
        // Fill fields (data-model.js fields)
        entity.name = name;
        entity.kind = kind;
        entity.summary = summary;
        entity.tags = tags;
        entity.sourcesOfTruth = sourcesOfTruth;
        entity.sourceEntityIds = sourceEntityIds;
        entity.notes = notes;

        DomainService.upsertItem(snapshot, 'entities', entity);
        saveSnapshot({ show: false });
        setStatus('Entity created');

        // Reset form
        dom.createEntityName.value = '';
        dom.createEntityKind.value = '';
        dom.createEntitySummary.value = '';
        dom.createEntityTags.value = '';
        dom.createEntitySources.value = '';
        dom.createEntitySourceEntities.value = '';
        dom.createEntityNotes.value = '';

        setGraphWorkbenchSelection({ type: 'entity', id: entity.id });
        renderGraphWorkbench();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to create entity');
      }
    });


    graphWorkbenchDom = dom;
    return dom;
  }

  function renderGraphSearch(dom, baseGraphNodes) {
    const nodes = normaliseArray(baseGraphNodes);

    // Update type filter options
    const nodeTypes = uniqueSorted(nodes.map(n => n.type));
    const opts = [{ value: 'all', label: 'All types' }].concat(
      nodeTypes.map(t => ({ value: t, label: labelForNodeType(t) }))
    );

    const prev = dom.searchKind.value || graphWorkbenchState.searchKind || 'all';
    clearElement(dom.searchKind);
    opts.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      dom.searchKind.appendChild(opt);
    });
    dom.searchKind.value = opts.some(o => o.value === prev) ? prev : 'all';

    if (dom.searchQuery.value !== (graphWorkbenchState.searchQuery || '')) {
      dom.searchQuery.value = graphWorkbenchState.searchQuery || '';
    }

    const q = (graphWorkbenchState.searchQuery || '').trim().toLowerCase();
    const typeFilter = dom.searchKind.value || 'all';

    const filtered = nodes.filter(node => {
      const matchesType = typeFilter === 'all' || node.type === typeFilter;
      if (!matchesType) return false;
      if (!q) return true;
      const hay = `${node.name || ''} ${node.id || ''} ${(node.kind || '')}`.toLowerCase();
      return hay.includes(q);
    });

    clearElement(dom.searchResults);

    if (!filtered.length) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.style.padding = '10px';
      li.textContent = 'No matches.';
      dom.searchResults.appendChild(li);
      return;
    }

    const selType = normaliseSelectionType(graphWorkbenchState.selection?.type);
    const selectedNodeId =
      selType && selType !== 'relation' && selType !== 'edge'
        ? graphWorkbenchState.selection.id
        : null;

    filtered
      .slice(0, 300)
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
      .forEach(node => {
        const li = document.createElement('li');
        li.className =
          'graph-search-item' + (selectedNodeId === node.id ? ' selected' : '');
        const left = document.createElement('span');
        left.textContent = node.name || node.id;

        const right = document.createElement('span');
        right.className = 'meta';
        right.textContent = `${labelForNodeType(node.type)} · ${node.id}`;

        li.appendChild(left);
        li.appendChild(right);
        li.addEventListener('click', () => {
          const type = normaliseSelectionType(node.type) || 'node';
          setGraphWorkbenchSelection({ type, id: node.id });
          graphWorkbenchState.filterCenterId = node.id;
          renderGraphWorkbench();
        });

        dom.searchResults.appendChild(li);
      });
  }

  function renderGraphWorkbenchFilters(dom, baseGraph) {
    const nodes = normaliseArray(baseGraph?.nodes);
    const nodeTypes = uniqueSorted(nodes.map(n => n.type));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    graphWorkbenchState.filterNodeTypes = graphWorkbenchState.filterNodeTypes.filter(t =>
      nodeTypes.includes(t)
    );

    if (graphWorkbenchState.filterCenterId && !nodeMap.has(graphWorkbenchState.filterCenterId)) {
      graphWorkbenchState.filterCenterId = null;
    }

    const centerNode = graphWorkbenchState.filterCenterId
      ? nodeMap.get(graphWorkbenchState.filterCenterId)
      : null;

    if (dom.filterCenterLabel) {
      dom.filterCenterLabel.textContent = centerNode
        ? `${centerNode.name || centerNode.id} (${labelForNodeType(centerNode.type)}) [${centerNode.id}]`
        : 'No center selected; showing full graph.';
    }

    if (dom.filterDepth) {
      const desired =
        graphWorkbenchState.filterDepth === null || graphWorkbenchState.filterDepth === undefined
          ? ''
          : String(graphWorkbenchState.filterDepth);
      if (dom.filterDepth.value !== desired) {
        dom.filterDepth.value = desired;
      }
    }

    if (!dom.filterTypes) return;
    clearElement(dom.filterTypes);

    const selectedTypes = new Set(graphWorkbenchState.filterNodeTypes);

    nodeTypes.forEach(type => {
      const chip = document.createElement('label');
      chip.className = 'chip';
      const color = colorForNodeType(type);
      chip.style.backgroundColor = color;
      chip.style.borderColor = color;
      chip.style.color = '#fff';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = type;
      cb.checked = selectedTypes.has(type);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!graphWorkbenchState.filterNodeTypes.includes(type)) {
            graphWorkbenchState.filterNodeTypes = graphWorkbenchState.filterNodeTypes
              .concat(type)
              .filter(Boolean);
          }
        } else {
          graphWorkbenchState.filterNodeTypes = graphWorkbenchState.filterNodeTypes.filter(
            t => t !== type
          );
        }
        renderGraphWorkbench();
      });

      const label = document.createElement('span');
      label.textContent = labelForNodeType(type);

      chip.appendChild(cb);
      chip.appendChild(label);
      dom.filterTypes.appendChild(chip);
    });
  }

  function renderGenericNodeEditor(dom, node, config) {
    const item = (snapshot[config.collection] || []).find(it => it && it.id === node.id);

    if (!item) {
      dom.selectedBody.textContent = 'Selected item not found.';
      return;
    }

    const header = document.createElement('div');
    header.className = 'graph-selected-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'graph-selected-title';
    title.textContent = item.name || item.title || item.shortText || item.text || node.id;

    const subtitle = document.createElement('p');
    subtitle.className = 'graph-selected-subtitle';
    subtitle.textContent = `${config.label} · ${node.id}`;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const actions = document.createElement('div');
    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary';
    btnSave.type = 'button';
    btnSave.textContent = 'Save';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-danger';
    btnDelete.type = 'button';
    btnDelete.textContent = 'Delete';

    actions.appendChild(btnSave);
    actions.appendChild(btnDelete);

    header.appendChild(titleWrap);
    header.appendChild(actions);
    dom.selectedBody.appendChild(header);

    const form = document.createElement('form');
    form.className = 'form-stack';
    form.addEventListener('submit', ev => ev.preventDefault());

    const formatterCsv = value => normaliseArray(value).join(', ');

    config.fields.forEach(field => {
      const value = item[field.name];
      const initialValue =
        field.type === 'csv' ? formatterCsv(value) : value === null ? '' : value || '';

      if (field.name === 'content') {
        const row = document.createElement('div');
        row.className = 'form-row markdown-row';

        const header = document.createElement('div');
        header.className = 'markdown-row-header';
        const label = document.createElement('span');
        label.textContent = field.label;
        header.appendChild(label);

        const actions = document.createElement('div');
        actions.className = 'markdown-row-actions';
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.textContent = 'Open markdown editor';
        actions.appendChild(openBtn);
        header.appendChild(actions);

        const grid = document.createElement('div');
        grid.className = 'markdown-editor-grid';

        const control = document.createElement('textarea');
        control.className = 'markdown-input form-control';
        control.name = field.name;
        control.rows = field.rows || 6;
        control.value = initialValue;
        if (field.readOnly) control.readOnly = true;

        const preview = document.createElement('div');
        preview.className = 'markdown-preview-panel';
        renderMarkdownPreview(preview, control.value, { enabled: true });

        control.addEventListener('input', () => {
          renderMarkdownPreview(preview, control.value, { enabled: true });
        });

        openBtn.addEventListener('click', () => {
          if (control.readOnly) return;
          openMarkdownModal({
            title: 'Edit canon text',
            initial: control.value,
            onSave: value => {
              control.value = value;
              renderMarkdownPreview(preview, value, { enabled: true });
            },
            onClose: () => {
              renderMarkdownPreview(preview, control.value, { enabled: true });
            }
          });
        });

        grid.appendChild(control);
        grid.appendChild(preview);

        row.appendChild(header);
        row.appendChild(grid);
        form.appendChild(row);
        return;
      }

      const row = document.createElement('label');
      row.className = 'form-row';
      row.style.marginBottom = '10px';

      const label = document.createElement('span');
      label.textContent = field.label;
      label.style.display = 'block';
      label.style.fontWeight = '600';
      label.style.marginBottom = '4px';

      row.appendChild(label);

      let control;

      if (field.type === 'textarea') {
        control = document.createElement('textarea');
        control.className = 'form-control';
        control.name = field.name;
        control.rows = field.rows || 3;
        control.value = initialValue;
      } else if (field.type === 'checkbox') {
        control = document.createElement('input');
        control.type = 'checkbox';
        control.name = field.name;
        control.checked = Boolean(value);
      } else {
        control = document.createElement('input');
        control.type = 'text';
        control.className = 'form-control';
        control.name = field.name;
        control.value = initialValue;
      }

      if (field.readOnly) {
        control.readOnly = true;
      }

      row.appendChild(control);
      form.appendChild(row);
    });

    dom.selectedBody.appendChild(form);

    btnSave.addEventListener('click', () => {
      const fd = new FormData(form);
      const updated = { ...item };

      config.fields.forEach(field => {
        let rawValue;
        if (field.type === 'checkbox') {
          const el = form.querySelector(`[name="${field.name}"]`);
          rawValue = el && 'checked' in el ? el.checked : false;
        } else {
          rawValue = fd.get(field.name);
        }

        if (field.readOnly) return;

        const rawString = rawValue === null ? '' : rawValue.toString();
        let parsedValue;

        if (field.type === 'csv') {
          parsedValue = parseCsvInput(rawString);
        } else if (field.type === 'checkbox') {
          parsedValue = Boolean(rawValue);
        } else {
          parsedValue = rawString.trim();
        }

        if (field.nullable && parsedValue === '') {
          updated[field.name] = null;
        } else {
          updated[field.name] = parsedValue;
        }
      });

      try {
        DomainService.upsertItem(snapshot, config.collection, updated);
        saveSnapshot({ show: false });
        setStatus(`${config.label} saved`);
        renderGraphWorkbench();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save item');
      }
    });

    btnDelete.addEventListener('click', () => {
      const ok = window.confirm(
        `Delete this ${config.label.toLowerCase()}?\n\n${item.name || item.title || item.id}\n\nThis cannot be undone.`
      );
      if (!ok) return;

      try {
        DomainService.deleteItem(snapshot, config.collection, item.id);
        setGraphWorkbenchSelection(null);
        saveSnapshot({ show: false });
        setStatus(`${config.label} deleted`);
        renderGraphWorkbench();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete item');
      }
    });
  }


  function renderSelected(dom, visibleEntities, entityById, baseGraph) {
    clearElement(dom.selectedBody);

    const selection = graphWorkbenchState.selection;
    if (!selection) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Click a node or edge to view/edit details.';
      dom.selectedBody.appendChild(p);
      return;
    }

    const selectionType = normaliseSelectionType(selection.type);

    const allEntities = normaliseArray(snapshot.entities);
    const entityIndexAll = buildEntityIndex(allEntities);
    const nodes = normaliseArray(baseGraph?.nodes);
    const edges = normaliseArray(baseGraph?.edges);
    const nodeIndex = new Map(nodes.map(n => [n.id, n]));

    if (selectionType === 'edge') {
      const edgeCard = document.createElement('div');
      edgeCard.className = 'card';
      edgeCard.style.padding = '10px';
      edgeCard.style.marginBottom = '10px';

      const edge = edges.find(e => e.id === selection.id);
      if (!edge) {
        edgeCard.textContent = 'Selected edge not found in this graph.';
        dom.selectedBody.appendChild(edgeCard);
        return;
      }

      const from = nodeIndex.get(edge.fromId);
      const to = nodeIndex.get(edge.toId);

      const title = document.createElement('p');
      title.className = 'graph-selected-title';
      title.textContent = edge.relationType || 'Edge';

      const subtitle = document.createElement('p');
      subtitle.className = 'graph-selected-subtitle';
      const fromLabel = from ? from.name || from.id : edge.fromId;
      const toLabel = to ? to.name || to.id : edge.toId;
      subtitle.textContent = `${fromLabel} → ${edge.relationType || 'link'} → ${toLabel}`;

      edgeCard.appendChild(title);
      edgeCard.appendChild(subtitle);

      if (edge.source) {
        const info = document.createElement('p');
        info.className = 'hint';
        const fieldLabel = edge.source.field ? `.${edge.source.field}` : '';
        info.textContent = `Edge derived from ${edge.source.collection || 'record'}${fieldLabel} on ${edge.source.id || 'unknown'}.`;
        edgeCard.appendChild(info);

        if (edge.source.collection && edge.source.id) {
          const btn = document.createElement('button');
          btn.className = 'btn';
          btn.type = 'button';
          btn.textContent = 'Jump to source record';
          btn.addEventListener('click', () =>
            jumpToReferencedItem(edge.source.collection, edge.source.id)
          );
          edgeCard.appendChild(btn);
        }
      }

      dom.selectedBody.appendChild(edgeCard);
      return;
    }

    if (selectionType === 'entity') {
      const entity = entityIndexAll.get(selection.id);
      if (!entity) {
        dom.selectedBody.textContent = 'Selected entity not found.';
        return;
      }

      const header = document.createElement('div');
      header.className = 'graph-selected-header';

      const titleWrap = document.createElement('div');
      const title = document.createElement('p');
      title.className = 'graph-selected-title';
      title.textContent = entity.name || entity.id;
      const subtitle = document.createElement('p');
      subtitle.className = 'graph-selected-subtitle';
      subtitle.textContent = `Entity · ${entity.kind || '—'} · ${entity.id}`;
      titleWrap.appendChild(title);
      titleWrap.appendChild(subtitle);

      const actions = document.createElement('div');
      const btnSave = document.createElement('button');
      btnSave.className = 'btn btn-primary';
      btnSave.type = 'button';
      btnSave.textContent = 'Save';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-danger';
      btnDelete.type = 'button';
      btnDelete.textContent = 'Delete';

      actions.appendChild(btnSave);
      actions.appendChild(btnDelete);

      header.appendChild(titleWrap);
      header.appendChild(actions);
      dom.selectedBody.appendChild(header);

      const form = document.createElement('form');
      form.className = 'graph-form';

      function addInput(label, name, value, opts) {
        const row = document.createElement('div');
        row.className = 'form-row';
        const l = document.createElement('label');
        l.textContent = label;
        const input = document.createElement('input');
        input.className = 'form-control';
        input.name = name;
        input.value = value || '';
        if (opts && opts.readOnly) input.readOnly = true;
        row.appendChild(l);
        row.appendChild(input);
        form.appendChild(row);
      }

      function addTextarea(label, name, value, rows) {
        const row = document.createElement('div');
        row.className = 'form-row';
        const l = document.createElement('label');
        l.textContent = label;
        const ta = document.createElement('textarea');
        ta.className = 'form-control';
        ta.name = name;
        ta.rows = rows || 3;
        ta.value = value || '';
        row.appendChild(l);
        row.appendChild(ta);
        form.appendChild(row);
      }

      addInput('ID', 'id', entity.id, { readOnly: true });
      addInput('Movement ID', 'movementId', entity.movementId || '', {});
      addInput('Kind', 'kind', entity.kind || '', {});
      addInput('Name', 'name', entity.name || '', {});
      addTextarea('Summary', 'summary', entity.summary || '', 3);
      addInput('Tags (csv)', 'tags', normaliseArray(entity.tags).join(', '), {});
      addInput('Sources of truth (csv)', 'sourcesOfTruth', normaliseArray(entity.sourcesOfTruth).join(', '), {});
      addInput('Source entity IDs (csv)', 'sourceEntityIds', normaliseArray(entity.sourceEntityIds).join(', '), {});
      addTextarea('Notes', 'notes', entity.notes || '', 3);

      dom.selectedBody.appendChild(form);

      btnSave.addEventListener('click', () => {
        const fd = new FormData(form);
        const updated = {
          ...entity,
          movementId: (fd.get('movementId') || '').toString().trim() || null,
          kind: (fd.get('kind') || '').toString().trim() || null,
          name: (fd.get('name') || '').toString().trim() || entity.name,
          summary: (fd.get('summary') || '').toString().trim() || null,
          tags: parseCsvInput((fd.get('tags') || '').toString()),
          sourcesOfTruth: parseCsvInput((fd.get('sourcesOfTruth') || '').toString()),
          sourceEntityIds: parseCsvInput((fd.get('sourceEntityIds') || '').toString()),
          notes: (fd.get('notes') || '').toString().trim() || null
        };

        try {
          DomainService.upsertItem(snapshot, 'entities', updated);
          saveSnapshot({ show: false });
          setStatus('Entity saved');
          renderGraphWorkbench();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to save entity');
        }
      });

      btnDelete.addEventListener('click', () => {
        const ok = window.confirm(
          `Delete this entity?\n\n${entity.name || entity.id}\n\nThis cannot be undone.`
        );
        if (!ok) return;

        try {
          DomainService.deleteItem(snapshot, 'entities', entity.id);
          setGraphWorkbenchSelection(null);
          saveSnapshot({ show: false });
          setStatus('Entity deleted');
          renderGraphWorkbench();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete entity');
        }
      });

      return;
    }

    const node = nodeIndex.get(selection.id);

    if (node) {
      const config = GRAPH_NODE_EDIT_CONFIG[normaliseSelectionType(node.type)];

      if (config) {
        renderGenericNodeEditor(dom, node, config);
        return;
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '10px';
      card.style.marginBottom = '10px';

      const title = document.createElement('p');
      title.className = 'graph-selected-title';
      title.textContent = node.name || node.id;

      const subtitle = document.createElement('p');
      subtitle.className = 'graph-selected-subtitle';
      subtitle.textContent = `${labelForNodeType(node.type)} · ${node.id}`;

      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Editing is not available for this node type yet.';

      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(hint);

      dom.selectedBody.appendChild(card);
      return;
    }

    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Selected item not found in this graph.';
    dom.selectedBody.appendChild(p);
  }

  function renderGraphWorkbench() {
    const root = document.getElementById('graph-workbench-root');
    if (!root) return;

    // If no movement selected, show hint and bail (consistent with other tabs)
    if (!currentMovementId) {
      clearElement(root);
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Create or select a movement on the left to use the graph editor.';
      root.appendChild(p);
      return;
    }

    const dom = ensureGraphWorkbenchDom();
    if (!dom) return;

    // keep CSS widths in sync
    dom.workbench.style.setProperty('--graph-left-width', graphWorkbenchState.leftWidth + 'px');
    dom.workbench.style.setProperty('--graph-right-width', graphWorkbenchState.rightWidth + 'px');

    const baseGraph = ViewModels.buildMovementGraphModel(snapshot, {
      movementId: currentMovementId
    });

    const baseNodeIds = new Set(normaliseArray(baseGraph.nodes).map(n => n.id));
    const baseEdgeIds = new Set(normaliseArray(baseGraph.edges).map(e => e.id));

    const { visibleEntities, entityById } = getGraphDatasetForCurrentMovement();
    const entityIds = new Set(visibleEntities.map(e => e.id));

    if (graphWorkbenchState.selection) {
      const sel = graphWorkbenchState.selection;
      const selType = normaliseSelectionType(sel.type);

      if (selType === 'entity') {
        const exists = baseNodeIds.has(sel.id) && entityIds.has(sel.id);
        if (!exists) {
          setGraphWorkbenchSelection(null);
        }
      } else if (selType === 'edge') {
        const exists = baseEdgeIds.has(sel.id);
        if (!exists) {
          setGraphWorkbenchSelection(null);
        }
      } else if (sel && !baseNodeIds.has(sel.id)) {
        setGraphWorkbenchSelection(null);
      }
    }

    renderGraphWorkbenchFilters(dom, baseGraph);

    // Build datalist options (kinds)
    const kinds = uniqueSorted(visibleEntities.map(e => e.kind));
    clearElement(dom.entityKindDatalist);
    kinds.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      dom.entityKindDatalist.appendChild(opt);
    });

    // Render search + selected panels
    renderGraphSearch(dom, baseGraph.nodes);
    renderSelected(dom, visibleEntities, entityById, baseGraph);

    // Render graph
    if (!workbenchGraphView) {
      workbenchGraphView = new EntityGraphView({
        onNodeClick: (id, node) => {
          const type = normaliseSelectionType(node?.type) || 'node';
          setGraphWorkbenchSelection({ type, id });
          graphWorkbenchState.filterCenterId = id;
          renderGraphWorkbench();
        },
        onLinkClick: id => {
          setGraphWorkbenchSelection({ type: 'edge', id });
          renderGraphWorkbench();
        },
        onBackgroundClick: () => {
          setGraphWorkbenchSelection(null);
          renderGraphWorkbench();
        }
      });
    }

    const filteredGraph = ViewModels.filterGraphModel(baseGraph, {
      centerNodeId: graphWorkbenchState.filterCenterId,
      depth: graphWorkbenchState.filterDepth,
      nodeTypeFilter: graphWorkbenchState.filterNodeTypes
    });

    const selectedType = normaliseSelectionType(
      graphWorkbenchState.selection && graphWorkbenchState.selection.type
    );

    const selectedNodeIdForGraph =
      graphWorkbenchState.selection &&
      selectedType !== 'edge'
        ? graphWorkbenchState.selection.id
        : null;

    graphWorkbenchState.focusEntityId = graphWorkbenchState.filterCenterId;

    workbenchGraphView.render(dom.canvas, filteredGraph, {
      selectedEntityId: selectedNodeIdForGraph,
      selectedEdgeId: selectedType === 'edge' ? graphWorkbenchState.selection.id : null,
      focusEntityId: graphWorkbenchState.filterCenterId
    });
  }

  // ---- Notes (buildNotesViewModel) ----

  function renderNotesView() {
    const wrapper = document.getElementById('notes-table-wrapper');
    const typeSelect = document.getElementById('notes-target-type-filter');
    const idSelect = document.getElementById('notes-target-id-filter');
    if (!wrapper || !typeSelect || !idSelect) return;
    clearElement(wrapper);

    // First pass to build filters from all notes
    const baseVm = ViewModels.buildNotesViewModel(snapshot, {
      movementId: currentMovementId,
      targetTypeFilter: null,
      targetIdFilter: null
    });

    const notes = baseVm.notes || [];
    const targetTypes = Array.from(
      new Set(notes.map(n => n.targetType).filter(Boolean))
    ).sort();

    ensureSelectOptions(
      typeSelect,
      targetTypes.map(t => ({ value: t, label: t })),
      'All'
    );

    const selectedType = typeSelect.value || '';

    const idsForType = notes.filter(
      n => !selectedType || n.targetType === selectedType
    );

    const idOptionsMap = new Map();
    idsForType.forEach(n => {
      if (!idOptionsMap.has(n.targetId)) {
        idOptionsMap.set(n.targetId, n.targetLabel || n.targetId);
      }
    });

    const idOptions = Array.from(idOptionsMap.entries()).map(
      ([value, label]) => ({ value, label })
    );
    ensureSelectOptions(idSelect, idOptions, 'Any');

    const selectedId = idSelect.value || '';

    const vm = ViewModels.buildNotesViewModel(snapshot, {
      movementId: currentMovementId,
      targetTypeFilter: selectedType || null,
      targetIdFilter: selectedId || null
    });

    if (!vm.notes || vm.notes.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No notes match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    [
      'Target type',
      'Target',
      'Author',
      'Body',
      'Context',
      'Tags'
    ].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    vm.notes.forEach(n => {
      const tr = document.createElement('tr');

      const tdType = document.createElement('td');
      tdType.textContent = n.targetType;
      tr.appendChild(tdType);

      const tdTarget = document.createElement('td');
      tdTarget.textContent = n.targetLabel || n.targetId;
      tr.appendChild(tdTarget);

      const tdAuthor = document.createElement('td');
      tdAuthor.textContent = n.author || '';
      tr.appendChild(tdAuthor);

      const tdBody = document.createElement('td');
      tdBody.textContent = n.body;
      tr.appendChild(tdBody);

      const tdCtx = document.createElement('td');
      tdCtx.textContent = n.context || '';
      tr.appendChild(tdCtx);

      const tdTags = document.createElement('td');
      tdTags.textContent = (n.tags || []).join(', ');
      tr.appendChild(tdTags);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ---- Cross-navigation helpers ----

  function jumpToEntity(entityId) {
    if (!entityId) return;
    const entSelect = document.getElementById('entity-select');
    if (!entSelect) return;
    activateTab('entities');
    entSelect.value = entityId;
    renderEntitiesView();
  }

  function jumpToPractice(practiceId) {
    if (!practiceId) return;
    const prSelect = document.getElementById('practice-select');
    if (!prSelect) return;
    activateTab('practices');
    prSelect.value = practiceId;
    renderPracticesView();
  }

  function jumpToText(textId) {
    if (!textId) return;
    const text = (snapshot?.texts || []).find(t => t.id === textId);
    if (text?.movementId && text.movementId !== currentMovementId) {
      currentMovementId = text.movementId;
    }

    const movementId = currentMovementId || text?.movementId || null;

    activateTab('canon');
    if (!movementId) {
      renderLibraryView();
      return;
    }

    const vm = ViewModels.buildLibraryEditorViewModel(snapshot, {
      movementId,
      activeNodeId: textId
    });

    const bookId = vm.bookIdByNodeId[textId] || textId;
    const shelves = vm.shelvesByBookId[bookId] || [];

    currentBookId = bookId;
    currentTextId = textId;
    if (shelves.length) currentShelfId = shelves[0];

    renderLibraryView();
    scrollTocNodeIntoView(textId);
  }

  // ---- Dashboard (ViewModels) ----

  function renderDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    clearElement(container);

    if (!currentMovementId) {
      const p = document.createElement('p');
      p.textContent = 'Create a movement on the left to see a dashboard.';
      container.appendChild(p);
      return;
    }

    if (typeof ViewModels === 'undefined') {
      const p = document.createElement('p');
      p.textContent = 'ViewModels module not loaded.';
      container.appendChild(p);
      return;
    }

    const vm = ViewModels.buildMovementDashboardViewModel(snapshot, {
      movementId: currentMovementId
    });

    if (!vm.movement) {
      const p = document.createElement('p');
      p.textContent = 'Selected movement not found in dataset.';
      container.appendChild(p);
      return;
    }

    const title = document.createElement('h2');
    title.textContent =
      vm.movement.name +
      (vm.movement.shortName ? ` (${vm.movement.shortName})` : '');
    container.appendChild(title);

    const summary = document.createElement('p');
    summary.textContent = vm.movement.summary || 'No summary yet.';
    container.appendChild(summary);

    // Stats cards
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';

    // Text stats
    const textCard = document.createElement('div');
    textCard.className = 'stat-card';
    const textHeader = document.createElement('h3');
    textHeader.textContent = 'Texts';
    textCard.appendChild(textHeader);
    const totalText = document.createElement('p');
    totalText.textContent = `Total: ${vm.textStats.totalTexts}`;
    textCard.appendChild(totalText);
    const rootLine = document.createElement('p');
    const maxDepthText = Number.isFinite(vm.textStats.maxDepth)
      ? ` · Max depth: ${vm.textStats.maxDepth}`
      : '';
    rootLine.textContent = `Roots: ${vm.textStats.rootCount || 0}${maxDepthText}`;
    textCard.appendChild(rootLine);
    const depthList = document.createElement('ul');
    Object.entries(vm.textStats.byDepth || {})
      .sort(([a], [b]) => {
        const na = Number(a);
        const nb = Number(b);
        const aNum = Number.isFinite(na);
        const bNum = Number.isFinite(nb);
        if (aNum && bNum) return na - nb;
        if (aNum) return -1;
        if (bNum) return 1;
        return String(a).localeCompare(String(b));
      })
      .forEach(([depth, count]) => {
        const li = document.createElement('li');
        li.textContent = `Depth ${depth}: ${count}`;
        depthList.appendChild(li);
      });
    textCard.appendChild(depthList);
    statsGrid.appendChild(textCard);

    // Entity stats
    const entityCard = document.createElement('div');
    entityCard.className = 'stat-card';
    entityCard.innerHTML = `<h3>Entities</h3><p>Total: ${vm.entityStats.totalEntities}</p>`;
    if (vm.entityStats.byKind) {
      const ul = document.createElement('ul');
      Object.entries(vm.entityStats.byKind).forEach(([kind, count]) => {
        const li = document.createElement('li');
        li.textContent = `${kind}: ${count}`;
        ul.appendChild(li);
      });
      entityCard.appendChild(ul);
    }
    statsGrid.appendChild(entityCard);

    // Practice stats
    const practiceCard = document.createElement('div');
    practiceCard.className = 'stat-card';
    practiceCard.innerHTML = `<h3>Practices</h3><p>Total: ${vm.practiceStats.totalPractices}</p>`;
    if (vm.practiceStats.byKind) {
      const ul = document.createElement('ul');
      Object.entries(vm.practiceStats.byKind).forEach(([kind, count]) => {
        const li = document.createElement('li');
        li.textContent = `${kind}: ${count}`;
        ul.appendChild(li);
      });
      practiceCard.appendChild(ul);
    }
    statsGrid.appendChild(practiceCard);

    // Event stats
    const eventCard = document.createElement('div');
    eventCard.className = 'stat-card';
    eventCard.innerHTML = `<h3>Events</h3><p>Total: ${vm.eventStats.totalEvents}</p>`;
    if (vm.eventStats.byRecurrence) {
      const ul = document.createElement('ul');
      Object.entries(vm.eventStats.byRecurrence).forEach(
        ([rec, count]) => {
          const li = document.createElement('li');
          li.textContent = `${rec}: ${count}`;
          ul.appendChild(li);
        }
      );
      eventCard.appendChild(ul);
    }
    statsGrid.appendChild(eventCard);

    // Rule / claim / media counts
    const miscCard = document.createElement('div');
    miscCard.className = 'stat-card';
    miscCard.innerHTML =
      '<h3>Other</h3>' +
      `<p>Rules: ${vm.ruleCount}</p>` +
      `<p>Claims: ${vm.claimCount}</p>` +
      `<p>Media assets: ${vm.mediaCount}</p>`;
    statsGrid.appendChild(miscCard);

    container.appendChild(statsGrid);

    // Example nodes
    const exampleSectionTitle = document.createElement('div');
    exampleSectionTitle.className = 'section-heading';
    exampleSectionTitle.textContent = 'Example nodes';
    container.appendChild(exampleSectionTitle);

    const mkChipRow = (label, items, key) => {
      const heading = document.createElement('div');
      heading.className = 'section-heading';
      heading.style.fontSize = '0.85rem';
      heading.textContent = label;
      container.appendChild(heading);

      if (!items || !items.length) {
        const p = document.createElement('p');
        p.style.fontSize = '0.8rem';
        p.textContent = 'None yet.';
        container.appendChild(p);
        return;
      }

      const row = document.createElement('div');
      row.className = 'chip-row';
      items.forEach(item => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = item[key] || item.id;
        row.appendChild(chip);
      });
      container.appendChild(row);
    };

    mkChipRow('Key entities', vm.exampleNodes.keyEntities, 'name');
    mkChipRow('Key practices', vm.exampleNodes.keyPractices, 'name');
    mkChipRow('Key events', vm.exampleNodes.keyEvents, 'name');
  }

  // ---- Collections tab ----

  function getLabelForItem(item) {
    if (!item || typeof item !== 'object') return '';
    return (
      item.name ||
      item.title ||
      item.shortText ||
      item.text ||
      item.id ||
      '[no label]'
    );
  }

  function isMovementFilterEnabled() {
    const filterCheckbox = document.getElementById(
      'collection-filter-by-movement'
    );
    return Boolean(filterCheckbox && filterCheckbox.checked);
  }

  function renderCollectionList() {
    const list = document.getElementById('collection-items');
    if (!list) return;
    clearElement(list);

    const collName = currentCollectionName;
    const coll = snapshot[collName] || [];
    const filterByMovement = isMovementFilterEnabled();

    let items = coll;
    if (
      filterByMovement &&
      currentMovementId &&
      COLLECTIONS_WITH_MOVEMENT_ID.has(collName)
    ) {
      items = coll.filter(item => item.movementId === currentMovementId);
    }

    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = 'No items in this collection.';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      list.appendChild(li);
      document.getElementById('btn-delete-item').disabled = true;
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.dataset.id = item.id;
      if (item.id === currentItemId) li.classList.add('selected');
      const primary = document.createElement('span');
      primary.textContent = getLabelForItem(item);
      const secondary = document.createElement('span');
      secondary.className = 'secondary';
      secondary.textContent = item.id;
      li.appendChild(primary);
      li.appendChild(secondary);
      li.addEventListener('click', () => {
        setCollectionAndItem(collName, item.id);
      });
      list.appendChild(li);
    });

    document.getElementById('btn-delete-item').disabled = !currentItemId;
  }

  function mapIdToLabel(collectionName, id) {
    if (!id) return '—';
    if (collectionName === 'movements') {
      const movement = getMovementById(id);
      return movement ? movement.name || movement.id : id;
    }
    const coll = snapshot[collectionName] || [];
    const item = coll.find(it => it.id === id);
    return item ? getLabelForItem(item) : id;
  }

  function setCollectionAndItem(collectionName, itemId, options = {}) {
    const { addToHistory = true, fromHistory = false } = options;

    if (!COLLECTION_NAMES.includes(collectionName)) {
      setStatus('Unknown collection: ' + collectionName);
      return;
    }

    currentCollectionName = collectionName;
    const select = document.getElementById('collection-select');
    if (select && select.value !== collectionName) select.value = collectionName;

    const coll = snapshot[collectionName] || [];
    const foundItem = itemId ? coll.find(it => it.id === itemId) : null;

    const movementFilter = document.getElementById('collection-filter-by-movement');
    if (
      movementFilter &&
      movementFilter.checked &&
      foundItem &&
      COLLECTIONS_WITH_MOVEMENT_ID.has(collectionName) &&
      foundItem.movementId &&
      currentMovementId &&
      foundItem.movementId !== currentMovementId
    ) {
      movementFilter.checked = false;
    }

    currentItemId = foundItem ? foundItem.id : null;

    focusDataTab();

    renderCollectionList();
    renderItemDetail();

    if (addToHistory && currentItemId && !fromHistory) {
      pushNavigationState(collectionName, currentItemId);
    } else {
      updateNavigationButtons();
    }
  }

  function jumpToReferencedItem(collectionName, itemId) {
    if (!collectionName || !itemId) return;
    if (collectionName === 'movements') {
      selectMovement(itemId);
      activateTab('dashboard');
      return;
    }
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) {
      setStatus('Unknown collection: ' + collectionName);
      return;
    }
    const exists = coll.find(it => it.id === itemId);
    if (!exists) {
      setStatus('Referenced item not found');
      return;
    }
    setCollectionAndItem(collectionName, itemId);
  }

  function renderPreviewValue(container, value, type, refCollection) {
    const placeholder = () => {
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = '—';
      container.appendChild(span);
    };

    switch (type) {
      case 'chips': {
        const arr = Array.isArray(value) ? value.filter(Boolean) : [];
        if (!arr.length) return placeholder();
        const row = document.createElement('div');
        row.className = 'chip-row';
        arr.forEach(v => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = v;
          row.appendChild(chip);
        });
        container.appendChild(row);
        return;
      }
      case 'id': {
        if (!value) return placeholder();
        const chip = document.createElement('span');
        chip.className = 'chip clickable';
        chip.textContent = mapIdToLabel(refCollection, value);
        chip.title = 'Open ' + value;
        if (refCollection) {
          chip.addEventListener('click', () =>
            jumpToReferencedItem(refCollection, value)
          );
        }
        container.appendChild(chip);
        return;
      }
      case 'idList': {
        const ids = Array.isArray(value) ? value.filter(Boolean) : [];
        if (!ids.length) return placeholder();
        const row = document.createElement('div');
        row.className = 'chip-row';
        ids.forEach(id => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = mapIdToLabel(refCollection, id);
          chip.title = 'Open ' + id;
          if (refCollection) {
            chip.addEventListener('click', () =>
              jumpToReferencedItem(refCollection, id)
            );
          }
          row.appendChild(chip);
        });
        container.appendChild(row);
        return;
      }
      case 'paragraph': {
        if (!value) return placeholder();
        const p = document.createElement('p');
        p.textContent = value;
        container.appendChild(p);
        return;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') return placeholder();
        const span = document.createElement('span');
        span.textContent = value ? 'Yes' : 'No';
        container.appendChild(span);
        return;
      }
      case 'link': {
        if (!value) return placeholder();
        const a = document.createElement('a');
        a.href = value;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = value;
        container.appendChild(a);
        return;
      }
      case 'code': {
        if (!value) return placeholder();
        const pre = document.createElement('pre');
        pre.textContent = value;
        container.appendChild(pre);
        return;
      }
      default: {
        if (value === undefined || value === null || value === '')
          return placeholder();
        const span = document.createElement('span');
        span.textContent = value;
        container.appendChild(span);
      }
    }
  }

  function renderPreviewRow(container, label, value, type, refCollection) {
    const row = document.createElement('div');
    row.className = 'preview-row';
    const lbl = document.createElement('div');
    lbl.className = 'preview-label';
    lbl.textContent = label;
    const val = document.createElement('div');
    val.className = 'preview-value';
    renderPreviewValue(val, value, type, refCollection);
    row.appendChild(lbl);
    row.appendChild(val);
    container.appendChild(row);
  }

  const PREVIEW_FIELDS = {
    entities: [
      { label: 'Kind', key: 'kind' },
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Summary', key: 'summary', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
    ],
    practices: [
      { label: 'Kind', key: 'kind' },
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Frequency', key: 'frequency' },
      { label: 'Public', key: 'isPublic', type: 'boolean' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Involved entities', key: 'involvedEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Instructions texts', key: 'instructionsTextIds', type: 'idList', ref: 'texts' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
    ],
    events: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Recurrence', key: 'recurrence' },
      { label: 'Timing rule', key: 'timingRule' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Main practices', key: 'mainPracticeIds', type: 'idList', ref: 'practices' },
      { label: 'Main entities', key: 'mainEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Readings', key: 'readingTextIds', type: 'idList', ref: 'texts' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' }
    ],
    rules: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Kind', key: 'kind' },
      { label: 'Details', key: 'details', type: 'paragraph' },
      { label: 'Applies to', key: 'appliesTo', type: 'chips' },
      { label: 'Domain', key: 'domain', type: 'chips' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Supporting texts', key: 'supportingTextIds', type: 'idList', ref: 'texts' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
      { label: 'Related practices', key: 'relatedPracticeIds', type: 'idList', ref: 'practices' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' }
    ],
    claims: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Category', key: 'category' },
      { label: 'Text', key: 'text', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'About entities', key: 'aboutEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Source texts', key: 'sourceTextIds', type: 'idList', ref: 'texts' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
    ],
    textCollections: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Root texts', key: 'rootTextIds', type: 'idList', ref: 'texts' }
    ],
    texts: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Label', key: 'label' },
      { label: 'Parent text', key: 'parentId', type: 'id', ref: 'texts' },
      { label: 'Content', key: 'content', type: 'paragraph' },
      { label: 'Main function', key: 'mainFunction' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Mentions entities', key: 'mentionsEntityIds', type: 'idList', ref: 'entities' }
    ],
    media: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Kind', key: 'kind' },
      { label: 'URI', key: 'uri', type: 'link' },
      { label: 'Title', key: 'title' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Linked entities', key: 'linkedEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Linked practices', key: 'linkedPracticeIds', type: 'idList', ref: 'practices' },
      { label: 'Linked events', key: 'linkedEventIds', type: 'idList', ref: 'events' },
      { label: 'Linked texts', key: 'linkedTextIds', type: 'idList', ref: 'texts' }
    ],
    notes: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Target type', key: 'targetType' },
      { label: 'Target', key: 'targetId' },
      { label: 'Author', key: 'author' },
      { label: 'Context', key: 'context', type: 'paragraph' },
      { label: 'Body', key: 'body', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' }
    ]
  };

  function renderItemPreview() {
    const titleEl = document.getElementById('item-preview-title');
    const subtitleEl = document.getElementById('item-preview-subtitle');
    const body = document.getElementById('item-preview-body');
    const badge = document.getElementById('item-preview-collection');
    if (!titleEl || !subtitleEl || !body || !badge) return;

    clearElement(body);
    badge.textContent = currentCollectionName;

    if (!currentItemId) {
      titleEl.textContent = 'Select an item';
      subtitleEl.textContent = 'Preview will appear here';
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Pick an item on the left to see a human-friendly summary.';
      body.appendChild(p);
      return;
    }

    const coll = snapshot[currentCollectionName] || [];
    const item = coll.find(it => it.id === currentItemId);
    if (!item) {
      titleEl.textContent = 'Not found';
      subtitleEl.textContent = '';
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'The selected item could not be loaded.';
      body.appendChild(p);
      return;
    }

    titleEl.textContent = getLabelForItem(item);
    subtitleEl.textContent = `${currentCollectionName.slice(0, -1)} · ${item.id}`;

    const fields = PREVIEW_FIELDS[currentCollectionName];
    if (!fields) {
      renderPreviewRow(body, 'Details', JSON.stringify(item, null, 2), 'code');
      return;
    }

    fields.forEach(field => {
      const value = item[field.key];
      renderPreviewRow(body, field.label, value, field.type, field.ref);
    });

    if (currentCollectionName === 'texts') {
      const applyMovementFilter = isMovementFilterEnabled();
      const children = (snapshot.texts || [])
        .filter(text => text.parentId === item.id)
        .filter(text => {
          if (!applyMovementFilter || !currentMovementId) return true;
          return text.movementId === currentMovementId;
        })
        .sort((a, b) =>
          getLabelForItem(a).localeCompare(getLabelForItem(b), undefined, {
            sensitivity: 'base'
          })
        )
        .map(text => text.id);

      renderPreviewRow(body, 'Child texts', children, 'idList', 'texts');
    }
  }

  function renderItemEditor() {
    const collName = currentCollectionName;
    const coll = snapshot[collName] || [];
    const editor = document.getElementById('item-editor');
    const deleteBtn = document.getElementById('btn-delete-item');

    if (!currentItemId) {
      isPopulatingEditor = true;
      editor.value = '';
      isPopulatingEditor = false;
      editor.disabled = coll.length === 0;
      deleteBtn.disabled = true;
      renderItemPreview();
      return;
    }

    const item = coll.find(it => it.id === currentItemId);
    if (!item) {
      isPopulatingEditor = true;
      editor.value = '';
      isPopulatingEditor = false;
      editor.disabled = true;
      deleteBtn.disabled = true;
      renderItemPreview();
      return;
    }

    editor.disabled = false;
    deleteBtn.disabled = false;
    isPopulatingEditor = true;
    editor.value = JSON.stringify(item, null, 2);
    isPopulatingEditor = false;
    renderItemPreview();
  }

  function renderItemDetail() {
    renderItemPreview();
    renderItemEditor();
  }

  function saveItemFromEditor(options = {}) {
    const { persist = true } = options;
    const collName = currentCollectionName;
    const coll = snapshot[collName];
    if (!Array.isArray(coll)) {
      alert('Unknown collection: ' + collName);
      return false;
    }

    const editor = document.getElementById('item-editor');
    const raw = editor.value.trim();
    if (!raw) {
      alert('Editor is empty. Nothing to save.');
      return false;
    }

    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
      return false;
    }

    if (!obj.id) {
      alert('Object must have an "id" field.');
      return false;
    }

    try {
      DomainService.upsertItem(snapshot, collName, obj);
      currentItemId = obj.id;
      itemEditorDirty = false;
      snapshotDirty = true;
      updateDirtyState();
      if (persist) saveSnapshot({ clearItemDirty: true });
      pushNavigationState(collName, currentItemId);
    } catch (e) {
      alert(e.message);
      return false;
    }
    return true;
  }

  function addNewItem() {
    const collName = currentCollectionName;
    try {
      const skeleton = DomainService.addNewItem(
        snapshot,
        collName,
        currentMovementId
      );
      currentItemId = skeleton.id;
      saveSnapshot({ show: false }); // we'll call setStatus manually
      setStatus('New item created');
      setCollectionAndItem(collName, skeleton.id);
    } catch (e) {
      alert(e.message);
    }
  }

  function deleteCurrentItem() {
    const collName = currentCollectionName;
    const coll = snapshot[collName];
    if (!Array.isArray(coll) || !currentItemId) return;

    const item = coll.find(it => it.id === currentItemId);
    const label = getLabelForItem(item);
    const ok = window.confirm(
      `Delete this ${collName.slice(0, -1)}?\n\n${label}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      DomainService.deleteItem(snapshot, collName, currentItemId);
    } catch (e) {
      alert(e.message);
      return;
    }
    pruneNavigationState(collName, currentItemId);
    currentItemId = null;
    saveSnapshot();
  }

  // ---- Comparison tab ----

  function renderComparison() {
    const selector = document.getElementById('comparison-selector');
    const wrapper = document.getElementById('comparison-table-wrapper');
    if (!selector || !wrapper) return;
    clearElement(selector);
    clearElement(wrapper);

    if (!snapshot.movements.length) {
      const p = document.createElement('p');
      p.textContent = 'No movements to compare yet.';
      selector.appendChild(p);
      return;
    }

    snapshot.movements.forEach(rel => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = rel.id;
      cb.className = 'cmp-rel';
      cb.checked = true;
      cb.addEventListener('change', updateComparisonTable);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + (rel.name || rel.id)));
      selector.appendChild(label);
    });

    updateComparisonTable();
  }

  function updateComparisonTable() {
    const wrapper = document.getElementById('comparison-table-wrapper');
    if (!wrapper) return;
    clearElement(wrapper);

    if (typeof ViewModels === 'undefined') {
      const p = document.createElement('p');
      p.textContent = 'ViewModels module not loaded.';
      wrapper.appendChild(p);
      return;
    }

    const selectedIds = Array.from(
      document.querySelectorAll('.cmp-rel:checked')
    ).map(cb => cb.value);
    if (!selectedIds.length) {
      const p = document.createElement('p');
      p.textContent = 'Select at least one movement.';
      wrapper.appendChild(p);
      return;
    }

    const cmpVm = ViewModels.buildComparisonViewModel(snapshot, {
      movementIds: selectedIds
    });

    const rows = cmpVm.rows || [];
    if (!rows.length) {
      const p = document.createElement('p');
      p.textContent = 'No data available for comparison.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');

    const headerRow = document.createElement('tr');
    const metricTh = document.createElement('th');
    metricTh.textContent = 'Metric';
    headerRow.appendChild(metricTh);

    rows.forEach(row => {
      const th = document.createElement('th');
      th.textContent = row.movement?.name || row.movement?.id || '—';
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    function addMetricRow(label, getter) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = label;
      tr.appendChild(th);
      rows.forEach(row => {
        const td = document.createElement('td');
        td.textContent = getter(row);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    }

    addMetricRow('Total texts', r => r.textCounts.totalTexts ?? 0);
    addMetricRow('Roots (depth 0)', r => r.textCounts.rootCount ?? 0);
    addMetricRow('Max depth', r =>
      Number.isFinite(r.textCounts.maxDepth) ? r.textCounts.maxDepth : '—'
    );
    addMetricRow('Entities', r => r.entityCounts.total ?? 0);
    addMetricRow('Practices', r => r.practiceCounts.total ?? 0);
    addMetricRow('Events', r => r.eventCounts.total ?? 0);
    addMetricRow('Rules', r => r.ruleCount ?? 0);
    addMetricRow('Claims', r => r.claimCount ?? 0);

    // Compact histograms
    addMetricRow('Entities by kind', r =>
      r.entityCounts.byKind
        ? Object.entries(r.entityCounts.byKind)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    );

    addMetricRow('Practices by kind', r =>
      r.practiceCounts.byKind
        ? Object.entries(r.practiceCounts.byKind)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    );

    addMetricRow('Events by recurrence', r =>
      r.eventCounts.byRecurrence
        ? Object.entries(r.eventCounts.byRecurrence)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    );

    wrapper.appendChild(table);
  }

  // ---- Import / export / reset ----

  function ensureGithubImportModal() {
    if (githubImportModal) return githubImportModal;

    const overlay = document.createElement('div');
    overlay.className = 'markdown-modal-overlay github-import-overlay hidden';

    const modal = document.createElement('div');
    modal.className = 'markdown-modal github-import-modal';

    const title = document.createElement('h3');
    title.textContent = 'Load markdown repo';

    const description = document.createElement('p');
    description.className = 'muted';
    description.textContent = 'Paste a GitHub repo URL that follows the Markdown spec v2.3.';

    const inputRow = document.createElement('div');
    inputRow.className = 'form-row';
    const label = document.createElement('label');
    label.textContent = 'GitHub repo URL';
    const input = document.createElement('input');
    input.type = 'url';
    input.value = DEFAULT_GITHUB_REPO_URL;
    input.placeholder = 'https://github.com/owner/repo';
    label.appendChild(input);
    inputRow.appendChild(label);

    const status = document.createElement('div');
    status.className = 'import-status';

    const errorBox = document.createElement('div');
    errorBox.className = 'import-error hidden';

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Load';
    importBtn.type = 'button';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';
    actions.appendChild(importBtn);
    actions.appendChild(cancelBtn);

    modal.appendChild(title);
    modal.appendChild(description);
    modal.appendChild(inputRow);
    modal.appendChild(status);
    modal.appendChild(errorBox);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    githubImportModal = {
      overlay,
      modal,
      input,
      status,
      errorBox,
      importBtn,
      cancelBtn
    };

    importBtn.addEventListener('click', () => handleGithubImportSubmit());
    cancelBtn.addEventListener('click', () => closeGithubImportModal());

    return githubImportModal;
  }

  function openGithubImportModal() {
    const dom = ensureGithubImportModal();
    dom.input.value = DEFAULT_GITHUB_REPO_URL;
    dom.input.disabled = false;
    dom.importBtn.disabled = false;
    dom.status.textContent = '';
    dom.errorBox.textContent = '';
    dom.errorBox.classList.add('hidden');
    dom.overlay.classList.remove('hidden');
    dom.input.focus();
    clearFatalImportError();
  }

  function closeGithubImportModal() {
    if (!githubImportModal) return;
    githubImportModal.overlay.classList.add('hidden');
  }

  async function handleGithubImportSubmit() {
    const dom = ensureGithubImportModal();
    const url = (dom.input.value || '').trim();
    if (!url) {
      dom.errorBox.textContent = 'Please provide a GitHub repository URL.';
      dom.errorBox.classList.remove('hidden');
      return;
    }
    dom.errorBox.textContent = '';
    dom.errorBox.classList.add('hidden');
    dom.status.textContent = 'Loading markdown data...';
    dom.importBtn.disabled = true;
    dom.input.disabled = true;
    clearFatalImportError();

    try {
      await loadMarkdownRepoAndApply({ source: 'github', repoUrl: url });
      dom.status.textContent = 'Load succeeded.';
      setStatus('Loaded movement(s) from markdown repo');
    } catch (e) {
      dom.status.textContent = 'Import failed.';
      dom.errorBox.textContent = e.message || String(e);
      dom.errorBox.classList.remove('hidden');
      showFatalImportError(e);
    } finally {
      dom.importBtn.disabled = false;
      dom.input.disabled = false;
    }
  }

  function createMovementSnapshot(movementId, fullSnapshot) {
    const source = StorageService.ensureAllCollections(
      fullSnapshot || StorageService.createEmptySnapshot()
    );
    const movement = (source.movements || []).find(m => m.id === movementId);
    if (!movement) return null;

    const movementSnapshot = StorageService.createEmptySnapshot();
    if (source.version) movementSnapshot.version = source.version;
    movementSnapshot.movements = [movement];

    COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      movementSnapshot[collName] = (source[collName] || []).filter(
        item => item.movementId === movement.id
      );
    });

    return movementSnapshot;
  }

  function rememberRepoSource(config, compiled) {
    if (config && config.source === 'github') {
      lastRepoSourceConfig = {
        source: 'github',
        repoUrl: config.repoUrl,
        ref: compiled?.repoInfo?.ref || config.ref || null,
        subdir: compiled?.repoInfo?.subdir || config.subdir || ''
      };
      lastRepoInfo = compiled?.repoInfo || null;
    }
  }

  function deriveRepoFilename(result, config) {
    const repoInfo = result?.repoInfo || lastRepoInfo || null;
    const parsed =
      repoInfo && repoInfo.owner && repoInfo.repo
        ? { owner: repoInfo.owner, repo: repoInfo.repo }
        : (() => {
            try {
              if (config?.repoUrl && MarkdownDatasetLoader.parseGitHubRepoUrl) {
                return MarkdownDatasetLoader.parseGitHubRepoUrl(config.repoUrl);
              }
            } catch (e) {
              return null;
            }
            return null;
          })();
    const base =
      parsed && parsed.owner && parsed.repo
        ? `${parsed.owner}-${parsed.repo}`
        : 'movement-repo';
    const suffix = repoInfo?.commitSha || repoInfo?.ref || null;
    return suffix ? `${base}-${suffix}.zip` : `${base}.zip`;
  }

  async function exportCurrentRepoZip() {
    const exportBtn = document.getElementById('btn-export-repo');
    if (!window.MarkdownDatasetLoader || !MarkdownDatasetLoader.exportRepoToZip) {
      setStatus('Export not available in this build.');
      return;
    }
    if (!lastRepoSourceConfig) {
      lastRepoSourceConfig = { source: 'github', repoUrl: DEFAULT_GITHUB_REPO_URL };
    }
    const config = lastRepoSourceConfig;
    setStatus('Preparing repo zip...');
    if (exportBtn) exportBtn.disabled = true;
    try {
      const result = await MarkdownDatasetLoader.exportRepoToZip(config, {
        outputType: 'blob'
      });
      const filename = deriveRepoFilename(result, config);
      const url = URL.createObjectURL(result.archive);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }, 0);
      setStatus('Repo zip ready ✓');
    } catch (e) {
      console.error(e);
      setStatus('Export failed');
    } finally {
      if (exportBtn) exportBtn.disabled = false;
    }
  }

  function mergeMovementSnapshotIntoExisting(fullSnapshot, movementSnapshot) {
    const target = StorageService.ensureAllCollections(fullSnapshot || {});
    const incoming = StorageService.ensureAllCollections(movementSnapshot || {});
    const incomingMovements = incoming.movements || [];
    const incomingIds = new Set(incomingMovements.map(m => m.id));

    if (incoming.version) target.version = incoming.version;

    target.movements = (target.movements || [])
      .filter(m => !incomingIds.has(m.id))
      .concat(incomingMovements);

    COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      const existing = target[collName] || [];
      const filteredExisting = existing.filter(
        item => !incomingIds.has(item.movementId)
      );
      const incomingItems = (incoming[collName] || []).filter(item =>
        incomingIds.has(item.movementId)
      );
      target[collName] = filteredExisting.concat(incomingItems);
    });

    if (incoming.__repoInfo) {
      target.__repoInfo = incoming.__repoInfo;
    }
    if (incoming.__repoSource) {
      target.__repoSource = incoming.__repoSource;
    }

    return target;
  }

  function applyImportedSnapshot(movementSnapshot, { promptOnConflict = true } = {}) {
    const incoming = StorageService.ensureAllCollections(movementSnapshot || {});
    incoming.version = incoming.version || '2.3';
    incoming.specVersion = incoming.specVersion || '2.3';
    incoming.movements = normaliseArray(incoming.movements).map(movement => {
      const movementId = movement.id || movement.movementId;
      return { ...movement, movementId };
    });
    const incomingMovements = incoming.movements || [];
    if (!incomingMovements.length) {
      throw new Error('No movements found in the imported file.');
    }

    let fullSnapshot = StorageService.ensureAllCollections(
      snapshot || StorageService.createEmptySnapshot()
    );
    const incomingIds = new Set(incomingMovements.map(m => m.id));
    const conflicts = (fullSnapshot.movements || []).filter(m =>
      incomingIds.has(m.id)
    );

    if (conflicts.length) {
      const names = conflicts
        .map(m => m.name || m.id)
        .slice(0, 3)
        .join(', ');
      if (promptOnConflict) {
        const ok = window.confirm(
          `Replace existing movement data for: ${names}? This will overwrite matching IDs.`
        );
        if (!ok) return null;
      } else {
        console.warn(
          'Overwriting existing movement data for IDs:',
          Array.from(incomingIds).join(', ')
        );
      }
    }

    fullSnapshot = mergeMovementSnapshotIntoExisting(fullSnapshot, incoming);
    StorageService.saveSnapshot(fullSnapshot);
    snapshot = fullSnapshot;
    currentMovementId = incomingMovements[0]?.id || currentMovementId;
    currentItemId = null;
    resetNavigationHistory();
    renderMovementList();
    renderActiveTab();
    clearFatalImportError();
    markSaved({ movement: true, item: true });
    return currentMovementId;
  }

  async function loadMarkdownRepoAndApply(config) {
    const compiled = await MarkdownDatasetLoader.loadMovementDataset(config);
    rememberRepoSource(config, compiled);
    const snapshotLike = {
      ...compiled.data,
      version: compiled.specVersion,
      specVersion: compiled.specVersion,
      __repoInfo: compiled.repoInfo || null,
      __repoSource: config
    };
    applyImportedSnapshot(snapshotLike, { promptOnConflict: false });
    return compiled;
  }

  async function loadDefaultMarkdownDataset() {
    const compiled = await loadMarkdownRepoAndApply({
      source: 'github',
      repoUrl: DEFAULT_GITHUB_REPO_URL
    });
    setStatus('Loaded default markdown dataset');
    return compiled;
  }

  function resetToDefaults() {
    const ok = window.confirm(
      'Clear all data and reset to an empty workspace?\n\nThis will overwrite any changes.'
    );
    if (!ok) return;
    snapshot = StorageService.createEmptySnapshot();
    snapshot.__repoInfo = null;
    snapshot.__repoSource = null;
    lastRepoInfo = null;
    lastRepoSourceConfig = null;
    currentMovementId = null;
    currentItemId = null;
    currentTextId = null;
    resetNavigationHistory();
    clearFatalImportError();
    saveSnapshot({ clearMovementDirty: true, clearItemDirty: true });
    setStatus('Workspace cleared');
  }

  function addListenerById(id, event, handler) {
    const el = document.getElementById(id);
    if (!el) return null;
    el.addEventListener(event, handler);
    return el;
  }

  // ---- Init ----

  async function init() {
    snapshot = loadSnapshot();
    if (snapshot.__repoSource) {
      lastRepoSourceConfig = snapshot.__repoSource;
    }
    if (snapshot.__repoInfo) {
      lastRepoInfo = snapshot.__repoInfo;
    }
    currentMovementId = snapshot.movements[0]
      ? snapshot.movements[0].id
      : null;
    currentItemId = null;
    currentTextId = null;
    resetNavigationHistory();
    markSaved();

    // Sidebar
    addListenerById('btn-add-movement', 'click', () => addMovement());
    addListenerById('btn-toggle-sidebar', 'click', () => {
      const isOpen = document.body.classList.contains('sidebar-open');
      setSidebarOpen(!isOpen);
    });

    const sidebarScrim = document.getElementById('sidebar-scrim');
    if (sidebarScrim) {
      sidebarScrim.addEventListener('click', () => closeSidebarOnMobile());
    }

    window.addEventListener('resize', syncSidebarToViewport);
    syncSidebarToViewport();

    // Top bar actions
    addListenerById('btn-reset-defaults', 'click', resetToDefaults);

    // Movement form
    addListenerById('btn-save-movement', 'click', saveMovementFromForm);
    addListenerById('btn-delete-movement', 'click', () =>
      deleteMovement(currentMovementId)
    );
    addListenerById('btn-import-from-github', 'click', () => openGithubImportModal());
    addListenerById('btn-export-repo', 'click', exportCurrentRepoZip);

    ['movement-name', 'movement-shortName', 'movement-summary', 'movement-tags']
      .map(id => document.getElementById(id))
      .forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
          if (isPopulatingMovementForm) return;
          applyMovementFormToSnapshot();
          markDirty('movement');
        });
      });

    // Tabs
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.tab')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        document
          .querySelectorAll('.tab-panel')
          .forEach(panel => {
            panel.classList.toggle(
              'active',
              panel.id === 'tab-' + tabName
            );
          });
        renderActiveTab();
      });
    });

    // Entity graph refresh button
    const refreshGraphBtn = document.getElementById(
      'btn-refresh-entity-graph'
    );
    if (refreshGraphBtn) {
      refreshGraphBtn.addEventListener('click', () => {
        renderEntitiesView();
      });
    }

    // Calendar / claims / rules / media / notes filters react on change
    const calendarFilter = document.getElementById(
      'calendar-recurrence-filter'
    );
    if (calendarFilter) {
      calendarFilter.addEventListener('change', renderCalendarView);
    }
    const claimsCatFilter = document.getElementById(
      'claims-category-filter'
    );
    const claimsEntFilter = document.getElementById(
      'claims-entity-filter'
    );
    if (claimsCatFilter) {
      claimsCatFilter.addEventListener('change', renderClaimsView);
    }
    if (claimsEntFilter) {
      claimsEntFilter.addEventListener('change', renderClaimsView);
    }
    const rulesKindFilter = document.getElementById(
      'rules-kind-filter'
    );
    const rulesDomainFilter = document.getElementById(
      'rules-domain-filter'
    );
    if (rulesKindFilter) {
      rulesKindFilter.addEventListener('change', renderRulesView);
    }
    if (rulesDomainFilter) {
      rulesDomainFilter.addEventListener('input', renderRulesView);
    }

    const mediaFilters = [
      'media-entity-filter',
      'media-practice-filter',
      'media-event-filter',
      'media-text-filter'
    ];
    mediaFilters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', renderMediaView);
      }
    });

    const notesTypeFilter = document.getElementById(
      'notes-target-type-filter'
    );
    const notesIdFilter = document.getElementById(
      'notes-target-id-filter'
    );
    if (notesTypeFilter) {
      notesTypeFilter.addEventListener('change', renderNotesView);
    }
    if (notesIdFilter) {
      notesIdFilter.addEventListener('change', renderNotesView);
    }

    const entitySelect = document.getElementById('entity-select');
    if (entitySelect) {
      entitySelect.addEventListener('change', renderEntitiesView);
    }
    const practiceSelect = document.getElementById('practice-select');
    if (practiceSelect) {
      practiceSelect.addEventListener('change', renderPracticesView);
    }
    addListenerById('library-search', 'input', renderLibraryView);
    addListenerById('btn-add-text-collection', 'click', addTextCollection);
    addListenerById('btn-save-text-collection', 'click', saveTextCollection);
    addListenerById('btn-delete-text-collection', 'click', () => deleteTextCollection());
    addListenerById('btn-add-root-text', 'click', addNewBookToShelf);
    addListenerById('btn-add-existing-book', 'click', addExistingBookToShelf);

    // Collections tab
      addListenerById('collection-select', 'change', e => {
        setCollectionAndItem(e.target.value, null, { addToHistory: false });
      });

      addListenerById('collection-filter-by-movement', 'change', () => {
        renderCollectionList();
        renderItemDetail();
      });

      addListenerById('btn-add-item', 'click', addNewItem);
      addListenerById('btn-delete-item', 'click', deleteCurrentItem);
      addListenerById('btn-save-item', 'click', saveItemFromEditor);

    const navBack = document.getElementById('btn-preview-back');
    const navForward = document.getElementById('btn-preview-forward');
    if (navBack) navBack.addEventListener('click', () => navigateHistory(-1));
    if (navForward) navForward.addEventListener('click', () => navigateHistory(1));

      addListenerById('btn-save-banner', 'click', () => persistDirtyChanges());

    const itemEditor = document.getElementById('item-editor');
    if (itemEditor) {
      itemEditor.addEventListener('input', () => {
        if (isPopulatingEditor) return;
        markDirty('item');
      });
    }

    // Initial render
    renderMovementList();
    renderActiveTab();
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(showFatalImportError);
  });
})();
