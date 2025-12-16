/* app.js
 *
 * UI layer for Movement Engineer v3.
 * All domain logic lives in view-models.js & your data model.
 * This file just handles DOM, localStorage, import/export, and wiring.
 */

/* global DomainService, StorageService, ViewModels, EntityGraphView, JSZip, d3 */

(function () {
  'use strict';

  const { COLLECTION_NAMES, COLLECTIONS_WITH_MOVEMENT_ID } = DomainService;

  let snapshot = null;
  let currentMovementId = null;
  let currentCollectionName = 'entities';
  let currentItemId = null;
  let currentTextId = null;
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
  const movementAssetStore = new Map();
  function clearMovementAssetsForIds(movementIds) {
    if (!movementIds || !movementIds.size) return;
    for (const key of Array.from(movementAssetStore.keys())) {
      const [movementId] = key.split(':');
      if (movementIds.has(movementId)) {
        movementAssetStore.delete(key);
      }
    }
  }
  let isDirty = false;
  let snapshotDirty = false;
  let movementFormDirty = false;
  let itemEditorDirty = false;
  let isPopulatingMovementForm = false;
  let isPopulatingEditor = false;
  let isPopulatingCanonForms = false;

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
    clearMovementAssetsForIds(new Set([id]));
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

  function renderMarkdownPreview(previewEl, markdown) {
    if (!previewEl) return;
    const hasContent = Boolean(markdown && markdown.trim());
    previewEl.classList.toggle('muted', !hasContent);

    if (!hasContent) {
      previewEl.innerHTML =
        '<p class="muted">No content yet. Add markdown in the editor.</p>';
      return;
    }

    if (window.marked && typeof window.marked.parse === 'function') {
      previewEl.innerHTML = window.marked.parse(markdown);
      return;
    }

    previewEl.textContent = markdown;
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
      case 'relations':
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
        canon: $('#canon-tree'),
        entities: $('#entity-detail'),
        practices: $('#practice-detail'),
        calendar: $('#calendar-view'),
        claims: $('#claims-table-wrapper'),
        rules: $('#rules-table-wrapper'),
        authority: $('#authority-sources'),
        media: $('#media-gallery'),
        graph: $('#graph-workbench-root'),
        relations: $('#relations-table-wrapper'),
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
        renderCanonView();
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
      case 'relations':
        renderRelationsView();
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
    const levelSelect = document.getElementById('canon-text-level');
    const mainFunctionInput = document.getElementById(
      'canon-text-main-function'
    );
    const parentSelect = document.getElementById('canon-text-parent');
    const tagsField = document.getElementById('canon-text-tags');
    const mentionsField = document.getElementById('canon-text-mentions');
    const contentInput = document.getElementById('canon-text-content');
    const previewEl = document.getElementById('canon-text-preview');
    const rootCheckbox = document.getElementById('canon-text-root');
    const saveTextBtn = document.getElementById('btn-save-text');
    const deleteTextBtn = document.getElementById('btn-delete-text');
    const addChildBtn = document.getElementById('btn-add-child-text');

    if (
      !textHint ||
      !titleInput ||
      !labelInput ||
      !levelSelect ||
      !mainFunctionInput ||
      !parentSelect ||
      !tagsField ||
      !mentionsField ||
      !contentInput ||
      !previewEl ||
      !rootCheckbox
    )
      return;

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
        levelSelect,
        mainFunctionInput,
        parentSelect,
        tagsField,
        mentionsField,
        contentInput,
        previewEl
      ].forEach(el => (el.disabled = true));
      rootCheckbox.disabled = true;
      rootCheckbox.checked = false;
      if (saveTextBtn) saveTextBtn.disabled = true;
      if (deleteTextBtn) deleteTextBtn.disabled = true;
      if (addChildBtn) addChildBtn.disabled = true;
      contentInput.value = '';
      renderMarkdownPreview(previewEl, '');
      isPopulatingCanonForms = false;
      return;
    }

    textHint.textContent = `Editing ${activeText.title || activeText.id}`;
    [
      titleInput,
      labelInput,
      levelSelect,
      mainFunctionInput,
      parentSelect,
      tagsField,
      mentionsField,
      contentInput,
      previewEl
    ].forEach(el => (el.disabled = false));
    titleInput.value = activeText.title || '';
    labelInput.value = activeText.label || '';
    levelSelect.value = activeText.level || 'work';
    mainFunctionInput.value = activeText.mainFunction || '';
    parentSelect.value = activeText.parentId || '';
    tagsField.value = (activeText.tags || []).join(', ');
    mentionsField.value = (activeText.mentionsEntityIds || []).join(', ');
    contentInput.value = activeText.content || '';
    renderMarkdownPreview(previewEl, contentInput.value);

    if (!contentInput.dataset.previewBound) {
      contentInput.addEventListener('input', () => {
        renderMarkdownPreview(previewEl, contentInput.value);
      });
      contentInput.dataset.previewBound = 'true';
    }

    const collectionRoots = collection?.rootTextIds || [];
    rootCheckbox.disabled = !collection;
    rootCheckbox.checked = collection
      ? collectionRoots.includes(activeText.id)
      : false;

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

    if (!vm.roots || vm.roots.length === 0) {
      currentTextId = null;
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No texts found for this movement.';
      treeContainer.appendChild(p);
      renderCanonForms({ collection: activeCollection, roots: [], nodesById: {} });
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'text-tree';

    const renderNode = node => {
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
      if (node.level) bits.push(node.level);
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
          if (child) {
            childUl.appendChild(renderNode(child));
          }
        });
        li.appendChild(childUl);
      }

      return li;
    };

    vm.roots.forEach(root => {
      ul.appendChild(renderNode(root));
    });
    treeContainer.appendChild(ul);

    renderCanonForms({
      collection: activeCollection,
      roots: vm.roots,
      nodesById: vm.nodesById
    });
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
      const select = document.getElementById('canon-collection-select');
      if (select) {
        select.value = collection.id;
      }
      renderCanonView();
    } catch (e) {
      alert(e.message);
    }
  }

  function saveTextCollection() {
    if (isPopulatingCanonForms) return;
    const collection = getActiveTextCollection();
    if (!collection) return;

    const nameInput = document.getElementById('canon-collection-name');
    const descInput = document.getElementById('canon-collection-description');
    const tagsInput = document.getElementById('canon-collection-tags');

    const updated = {
      ...collection,
      name: nameInput.value.trim() || collection.name,
      description: descInput.value,
      tags: parseCsvInput(tagsInput.value)
    };

    DomainService.upsertItem(snapshot, 'textCollections', updated);
    saveSnapshot({ show: false });
    setStatus('Collection saved');
    renderCanonView();
  }

  function deleteTextCollection() {
    const collection = getActiveTextCollection();
    if (!collection) return;
    const ok = window.confirm(
      `Delete this text collection?\n\n${collection.name || collection.id}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    DomainService.deleteItem(snapshot, 'textCollections', collection.id);
    const select = document.getElementById('canon-collection-select');
    if (select) select.value = '';
    saveSnapshot();
    renderCanonView();
  }

  function addRootTextNode() {
    if (!currentMovementId) {
      alert('Select a movement first.');
      return;
    }
    try {
      const text = DomainService.addNewItem(snapshot, 'texts', currentMovementId);
      text.parentId = null;
      const collection = getActiveTextCollection();
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
    if (!currentTextId) return;
    const text = (snapshot.texts || []).find(t => t.id === currentTextId);
    if (!text) return;

    const titleInput = document.getElementById('canon-text-title');
    const labelInput = document.getElementById('canon-text-label');
    const levelSelect = document.getElementById('canon-text-level');
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

    const updated = {
      ...text,
      title: titleInput.value,
      label: labelInput.value,
      level: levelSelect.value,
      mainFunction: mainFunctionInput.value || null,
      parentId,
      tags: parseCsvInput(tagsField.value),
      mentionsEntityIds: parseCsvInput(mentionsField.value),
      content: contentInput.value
    };

    DomainService.upsertItem(snapshot, 'texts', updated);

    const collection = getActiveTextCollection();
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
          chip.title = t.level || '';
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

    if (
      (vm.relationsOut && vm.relationsOut.length) ||
      (vm.relationsIn && vm.relationsIn.length)
    ) {
      mkSection('Relations', section => {
        const ul = document.createElement('ul');
        vm.relationsOut.forEach(r => {
          const li = document.createElement('li');
          li.textContent = `→ ${r.relationType} → ${r.to.name}`;
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => jumpToEntity(r.to.id));
          ul.appendChild(li);
        });
        vm.relationsIn.forEach(r => {
          const li = document.createElement('li');
          li.textContent = `← ${r.relationType} ← ${r.from.name}`;
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => jumpToEntity(r.from.id));
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
          chip.title = t.level || '';
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
          `Entities: ${s.usedByEntities.length}`,
          `Relations: ${s.usedByRelations.length}`
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
          `Entities: ${e.usedAsSourceIn.entities.length}`,
          `Relations: ${e.usedAsSourceIn.relations.length}`
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

  // ---- Relations (buildRelationExplorerViewModel) ----

  function renderRelationsView() {
    const wrapper = document.getElementById('relations-table-wrapper');
    const typeSelect = document.getElementById('relations-type-filter');
    const entSelect = document.getElementById('relations-entity-filter');
    if (!wrapper || !typeSelect || !entSelect) return;
    clearElement(wrapper);

    const allRelations = (snapshot.relations || []).filter(
      r => r.movementId === currentMovementId
    );
    const relationTypes = Array.from(
      new Set(allRelations.map(r => r.relationType).filter(Boolean))
    ).sort();

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId
    );

    ensureSelectOptions(
      typeSelect,
      relationTypes.map(t => ({ value: t, label: t })),
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

    const typeVal = typeSelect.value || '';
    const entVal = entSelect.value || '';

    const vm = ViewModels.buildRelationExplorerViewModel(snapshot, {
      movementId: currentMovementId,
      relationTypeFilter: typeVal ? [typeVal] : [],
      entityIdFilter: entVal || null
    });

    if (!vm.relations || vm.relations.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No relations match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    ['Type', 'From', 'To', 'Tags', 'Supporting claims', 'Sources of truth'].forEach(
      h => {
        const th = document.createElement('th');
        th.textContent = h;
        headerRow.appendChild(th);
      }
    );
    table.appendChild(headerRow);

    vm.relations.forEach(r => {
      const tr = document.createElement('tr');

      const tdType = document.createElement('td');
      tdType.textContent = r.relationType;
      tr.appendChild(tdType);

      const tdFrom = document.createElement('td');
      const fromLink = document.createElement('a');
      fromLink.href = '#';
      fromLink.textContent = r.from.name || r.from.id;
      fromLink.className = 'entity-link';
      fromLink.addEventListener('click', ev => {
        ev.preventDefault();
        jumpToEntity(r.from.id);
      });
      tdFrom.appendChild(fromLink);
      tr.appendChild(tdFrom);

      const tdTo = document.createElement('td');
      const toLink = document.createElement('a');
      toLink.href = '#';
      toLink.textContent = r.to.name || r.to.id;
      toLink.className = 'entity-link';
      toLink.addEventListener('click', ev => {
        ev.preventDefault();
        jumpToEntity(r.to.id);
      });
      tdTo.appendChild(toLink);
      tr.appendChild(tdTo);

      const tdTags = document.createElement('td');
      tdTags.textContent = (r.tags || []).join(', ');
      tr.appendChild(tdTags);

      const tdClaims = document.createElement('td');
      if (r.supportingClaims && r.supportingClaims.length) {
        const ul = document.createElement('ul');
        r.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent = c.text;
          ul.appendChild(li);
        });
        tdClaims.appendChild(ul);
      }
      tr.appendChild(tdClaims);

      const tdSources = document.createElement('td');
      tdSources.textContent = (r.sourcesOfTruth || []).join(', ');
      tr.appendChild(tdSources);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ============================================================
  // Graph Workbench (Entities + Relations) — Ontorum-style panes
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
        { label: 'Level', name: 'level' },
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

  function buildRelationIndex(relations) {
    const map = new Map();
    (relations || []).forEach(r => {
      if (r && r.id) map.set(r.id, r);
    });
    return map;
  }

  function getGraphDatasetForCurrentMovement() {
    const movementId = currentMovementId;

    const allEntities = normaliseArray(snapshot && snapshot.entities);
    const allRelations = normaliseArray(snapshot && snapshot.relations);

    const visibleEntities = allEntities.filter(
      e => e && e.movementId === movementId
    );

    const entityById = buildEntityIndex(visibleEntities);

    const visibleRelations = allRelations.filter(r => {
      if (!r) return false;
      if (r.movementId !== movementId) return false;
      if (!r.fromEntityId || !r.toEntityId) return false;
      return entityById.has(r.fromEntityId) && entityById.has(r.toEntityId);
    });

    return { visibleEntities, visibleRelations, entityById };
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

            <details id="gw-create-relation">
              <summary>Add Relation</summary>
              <div class="details-body">
                <div id="gw-add-relation-hint" class="hint">
                  Select an entity in the graph to create a relation from/to it.
                </div>

                <form id="gw-add-relation-form" class="graph-form">
                  <div class="form-row">
                    <label>Direction</label>
                    <div class="form-row inline" style="margin-bottom:0;">
                      <label style="flex:none;">
                        <input type="radio" name="gw-rel-direction" value="outgoing" checked />
                        Outgoing (selected → target)
                      </label>
                      <label style="flex:none;">
                        <input type="radio" name="gw-rel-direction" value="incoming" />
                        Incoming (source → selected)
                      </label>
                    </div>
                  </div>

                  <div class="form-row">
                    <label>Relation type *</label>
                    <input id="gw-add-relation-type" class="form-control" list="gw-relation-type-options" required placeholder="e.g. inspired_by, teacher_of..." />
                    <datalist id="gw-relation-type-options"></datalist>
                  </div>

                  <div class="form-row">
                    <label>Target entity *</label>
                    <select id="gw-add-relation-target" class="form-control" required></select>
                  </div>

                  <div class="form-row">
                    <label>Tags (comma separated)</label>
                    <input id="gw-add-relation-tags" class="form-control" type="text" placeholder="tag1, tag2" />
                  </div>

                  <div class="form-row">
                    <label>Supporting claim IDs (comma separated)</label>
                    <input id="gw-add-relation-claims" class="form-control" type="text" placeholder="claim-1, claim-2" />
                  </div>

                  <div class="form-row">
                    <label>Sources of truth (comma separated)</label>
                    <input id="gw-add-relation-sources" class="form-control" type="text" placeholder="book, tradition, archive..." />
                  </div>

                  <div class="form-row">
                    <label>Source entity IDs (comma separated)</label>
                    <input id="gw-add-relation-source-entities" class="form-control" type="text" placeholder="ent-123, ent-456" />
                  </div>

                  <div class="form-row">
                    <label>Notes</label>
                    <textarea id="gw-add-relation-notes" class="form-control" rows="3"></textarea>
                  </div>

                  <div class="form-row inline">
                    <button class="btn btn-primary" type="submit" id="gw-add-relation-submit">Create Relation</button>
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

      createRelationHint: document.getElementById('gw-add-relation-hint'),
      createRelationForm: document.getElementById('gw-add-relation-form'),
      createRelationType: document.getElementById('gw-add-relation-type'),
      createRelationTarget: document.getElementById('gw-add-relation-target'),
      createRelationTags: document.getElementById('gw-add-relation-tags'),
      createRelationClaims: document.getElementById('gw-add-relation-claims'),
      createRelationSources: document.getElementById('gw-add-relation-sources'),
      createRelationSourceEntities: document.getElementById('gw-add-relation-source-entities'),
      createRelationNotes: document.getElementById('gw-add-relation-notes'),
      relationTypeDatalist: document.getElementById('gw-relation-type-options'),

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

    // Create relation
    dom.createRelationForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!currentMovementId) return;

      const sel = graphWorkbenchState.selection;
      if (!sel || sel.type !== 'entity') return;

      const selectedEntityId = sel.id;
      const relationType = (dom.createRelationType.value || '').trim();
      const targetId = dom.createRelationTarget.value;

      if (!relationType || !targetId) return;

      const direction = (dom.createRelationForm.querySelector('input[name="gw-rel-direction"]:checked') || {}).value || 'outgoing';
      const outgoing = direction === 'outgoing';

      const fromEntityId = outgoing ? selectedEntityId : targetId;
      const toEntityId = outgoing ? targetId : selectedEntityId;

      const tags = parseCsvInput(dom.createRelationTags.value);
      const supportingClaimIds = parseCsvInput(dom.createRelationClaims.value);
      const sourcesOfTruth = parseCsvInput(dom.createRelationSources.value);
      const sourceEntityIds = parseCsvInput(dom.createRelationSourceEntities.value);
      const notes = (dom.createRelationNotes.value || '').trim() || null;

      try {
        const rel = DomainService.addNewItem(snapshot, 'relations', currentMovementId);
        rel.fromEntityId = fromEntityId;
        rel.toEntityId = toEntityId;
        rel.relationType = relationType;
        rel.tags = tags;
        rel.supportingClaimIds = supportingClaimIds;
        rel.sourcesOfTruth = sourcesOfTruth;
        rel.sourceEntityIds = sourceEntityIds;
        rel.notes = notes;

        DomainService.upsertItem(snapshot, 'relations', rel);
        saveSnapshot({ show: false });
        setStatus('Relation created');

        dom.createRelationType.value = '';
        dom.createRelationTags.value = '';
        dom.createRelationClaims.value = '';
        dom.createRelationSources.value = '';
        dom.createRelationSourceEntities.value = '';
        dom.createRelationNotes.value = '';

        setGraphWorkbenchSelection({ type: 'relation', id: rel.id });
        renderGraphWorkbench();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to create relation');
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
      const value = item[field.name];
      const initialValue =
        field.type === 'csv' ? formatterCsv(value) : value === null ? '' : value || '';

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

  function renderSelected(dom, visibleEntities, visibleRelations, entityById, baseGraphNodes) {
    clearElement(dom.selectedBody);

    const selection = graphWorkbenchState.selection;
    if (!selection) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Click an entity or relation to view/edit details.';
      dom.selectedBody.appendChild(p);
      return;
    }

    const selectionType = normaliseSelectionType(selection.type);

    const allEntities = normaliseArray(snapshot.entities);
    const allRelations = normaliseArray(snapshot.relations);
    const entityIndexAll = buildEntityIndex(allEntities);
    const relationIndexAll = buildRelationIndex(allRelations);

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

      // form
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

      // relations list
      const out = visibleRelations.filter(r => r.fromEntityId === entity.id);
      const inc = visibleRelations.filter(r => r.toEntityId === entity.id);

      function renderRelList(label, rels, arrow) {
        const heading = document.createElement('div');
        heading.className = 'section-heading small';
        heading.textContent = `${label} (${rels.length})`;
        dom.selectedBody.appendChild(heading);

        if (!rels.length) {
          const p = document.createElement('p');
          p.className = 'muted';
          p.textContent = '—';
          dom.selectedBody.appendChild(p);
          return;
        }

        const ul = document.createElement('ul');
        ul.style.margin = '0';
        ul.style.paddingLeft = '18px';

        rels.forEach(r => {
          const li = document.createElement('li');
          const otherId = arrow === '→' ? r.toEntityId : r.fromEntityId;
          const other = entityById.get(otherId) || entityIndexAll.get(otherId);
          const otherLabel = other ? (other.name || other.id) : otherId;

          li.style.cursor = 'pointer';
          li.textContent = arrow === '→'
            ? `${r.relationType || 'rel'} → ${otherLabel}`
            : `${otherLabel} → ${r.relationType || 'rel'}`;

          li.addEventListener('click', () => {
            setGraphWorkbenchSelection({ type: 'relation', id: r.id });
            renderGraphWorkbench();
          });

          ul.appendChild(li);
        });

        dom.selectedBody.appendChild(ul);
      }

      renderRelList('Outgoing relations', out, '→');
      renderRelList('Incoming relations', inc, '←');

      // Save handler
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

      // Delete handler (also delete connected relations)
      btnDelete.addEventListener('click', () => {
        const ok = window.confirm(
          'Delete this entity AND all relations that reference it?\n\n' +
          (entity.name || entity.id) +
          '\n\nThis cannot be undone.'
        );
        if (!ok) return;

        try {
          // delete relations pointing to/from this entity
          const rels = normaliseArray(snapshot.relations).filter(r =>
            r && (r.fromEntityId === entity.id || r.toEntityId === entity.id)
          );
          rels.forEach(r => {
            DomainService.deleteItem(snapshot, 'relations', r.id);
          });

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

    // Relation selection
    if (selectionType === 'relation') {
      const rel = relationIndexAll.get(selection.id);
      if (!rel) {
        dom.selectedBody.textContent = 'Selected relation not found.';
        return;
      }

      const from = entityIndexAll.get(rel.fromEntityId);
      const to = entityIndexAll.get(rel.toEntityId);

      const header = document.createElement('div');
      header.className = 'graph-selected-header';

      const titleWrap = document.createElement('div');
      const title = document.createElement('p');
      title.className = 'graph-selected-title';
      title.textContent = rel.relationType || 'Relation';
      const subtitle = document.createElement('p');
      subtitle.className = 'graph-selected-subtitle';
      subtitle.textContent = `Relation · ${rel.id}`;
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

      // quick sandwich preview
      const preview = document.createElement('div');
      preview.className = 'card';
      preview.style.padding = '10px';
      preview.style.marginBottom = '10px';

      const line = document.createElement('div');
      line.style.display = 'flex';
      line.style.gap = '8px';
      line.style.flexWrap = 'wrap';
      line.style.alignItems = 'center';

      const fromChip = document.createElement('span');
      fromChip.className = 'chip clickable';
      fromChip.textContent = from ? (from.name || from.id) : rel.fromEntityId;
      fromChip.addEventListener('click', () => {
        setGraphWorkbenchSelection({ type: 'entity', id: rel.fromEntityId });
        renderGraphWorkbench();
      });

      const mid = document.createElement('span');
      mid.style.opacity = '0.8';
      mid.textContent = `→ ${rel.relationType || 'rel'} →`;

      const toChip = document.createElement('span');
      toChip.className = 'chip clickable';
      toChip.textContent = to ? (to.name || to.id) : rel.toEntityId;
      toChip.addEventListener('click', () => {
        setGraphWorkbenchSelection({ type: 'entity', id: rel.toEntityId });
        renderGraphWorkbench();
      });

      line.appendChild(fromChip);
      line.appendChild(mid);
      line.appendChild(toChip);

      preview.appendChild(line);
      dom.selectedBody.appendChild(preview);

      // form
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

      addInput('ID', 'id', rel.id, { readOnly: true });
      addInput('Movement ID', 'movementId', rel.movementId || '', {});
      addInput('From entity ID', 'fromEntityId', rel.fromEntityId || '', {});
      addInput('To entity ID', 'toEntityId', rel.toEntityId || '', {});
      addInput('Relation type', 'relationType', rel.relationType || '', {});
      addInput('Tags (csv)', 'tags', normaliseArray(rel.tags).join(', '), {});
      addInput('Supporting claim IDs (csv)', 'supportingClaimIds', normaliseArray(rel.supportingClaimIds).join(', '), {});
      addInput('Sources of truth (csv)', 'sourcesOfTruth', normaliseArray(rel.sourcesOfTruth).join(', '), {});
      addInput('Source entity IDs (csv)', 'sourceEntityIds', normaliseArray(rel.sourceEntityIds).join(', '), {});
      addTextarea('Notes', 'notes', rel.notes || '', 3);

      dom.selectedBody.appendChild(form);

      btnSave.addEventListener('click', () => {
        const fd = new FormData(form);

        const updated = {
          ...rel,
          movementId: (fd.get('movementId') || '').toString().trim() || null,
          fromEntityId: (fd.get('fromEntityId') || '').toString().trim(),
          toEntityId: (fd.get('toEntityId') || '').toString().trim(),
          relationType: (fd.get('relationType') || '').toString().trim() || rel.relationType,
          tags: parseCsvInput((fd.get('tags') || '').toString()),
          supportingClaimIds: parseCsvInput((fd.get('supportingClaimIds') || '').toString()),
          sourcesOfTruth: parseCsvInput((fd.get('sourcesOfTruth') || '').toString()),
          sourceEntityIds: parseCsvInput((fd.get('sourceEntityIds') || '').toString()),
          notes: (fd.get('notes') || '').toString().trim() || null
        };

        // basic validation: endpoints must exist in *current* graph dataset
        if (!updated.fromEntityId || !updated.toEntityId) {
          alert('Relation must have fromEntityId and toEntityId.');
          return;
        }

        try {
          DomainService.upsertItem(snapshot, 'relations', updated);
          saveSnapshot({ show: false });
          setStatus('Relation saved');
          renderGraphWorkbench();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to save relation');
        }
      });

      btnDelete.addEventListener('click', () => {
        const ok = window.confirm(
          'Delete this relation?\n\n' +
          (rel.relationType || rel.id) +
          '\n\nThis cannot be undone.'
        );
        if (!ok) return;

        try {
          DomainService.deleteItem(snapshot, 'relations', rel.id);
          setGraphWorkbenchSelection(null);
          saveSnapshot({ show: false });
          setStatus('Relation deleted');
          renderGraphWorkbench();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete relation');
        }
      });

      return;
    }

    // Other node types
    const nodeIndex = new Map(normaliseArray(baseGraphNodes).map(n => [n.id, n]));
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

    const { visibleEntities, visibleRelations, entityById } = getGraphDatasetForCurrentMovement();
    const entityIds = new Set(visibleEntities.map(e => e.id));
    const relationIds = new Set(visibleRelations.map(r => r.id));

    if (graphWorkbenchState.selection) {
      const sel = graphWorkbenchState.selection;
      const selType = normaliseSelectionType(sel.type);

      if (selType === 'entity') {
        const exists = baseNodeIds.has(sel.id) && entityIds.has(sel.id);
        if (!exists) {
          setGraphWorkbenchSelection(null);
        }
      } else if (selType === 'relation') {
        const exists = relationIds.has(sel.id) || baseEdgeIds.has(sel.id);
        if (!exists) {
          setGraphWorkbenchSelection(null);
        }
      } else if (sel && !baseNodeIds.has(sel.id)) {
        setGraphWorkbenchSelection(null);
      }
    }

    renderGraphWorkbenchFilters(dom, baseGraph);

    // Build datalist options (kinds + relation types)
    const kinds = uniqueSorted(visibleEntities.map(e => e.kind));
    clearElement(dom.entityKindDatalist);
    kinds.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      dom.entityKindDatalist.appendChild(opt);
    });

    const relTypes = uniqueSorted(visibleRelations.map(r => r.relationType));
    clearElement(dom.relationTypeDatalist);
    relTypes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      dom.relationTypeDatalist.appendChild(opt);
    });

    // Relation target dropdown
    const sel = graphWorkbenchState.selection;
    const selectedEntityId = sel && sel.type === 'entity' ? sel.id : null;

    clearElement(dom.createRelationTarget);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = selectedEntityId ? 'Select target entity…' : 'Select an entity first…';
    dom.createRelationTarget.appendChild(placeholder);

    if (selectedEntityId) {
      // group by kind for readability
      const byKind = new Map();
      visibleEntities.forEach(e => {
        if (!e || e.id === selectedEntityId) return;
        const k = e.kind || '—';
        if (!byKind.has(k)) byKind.set(k, []);
        byKind.get(k).push(e);
      });

      Array.from(byKind.keys()).sort().forEach(kind => {
        const og = document.createElement('optgroup');
        og.label = kind;
        byKind.get(kind)
          .slice()
          .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
          .forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            opt.textContent = (e.name || e.id) + ` (${e.id})`;
            og.appendChild(opt);
          });
        dom.createRelationTarget.appendChild(og);
      });

      dom.createRelationHint.textContent = 'Create a relation relative to the currently selected entity.';
      dom.createRelationForm.querySelectorAll('input,select,textarea,button').forEach(el => {
        el.disabled = false;
      });
    } else {
      dom.createRelationHint.textContent = 'Select an entity in the graph to create a relation from/to it.';
      dom.createRelationForm.querySelectorAll('input,select,textarea,button').forEach(el => {
        el.disabled = true;
      });
    }

    // Render search + selected panels
    renderGraphSearch(dom, baseGraph.nodes);
    renderSelected(dom, visibleEntities, visibleRelations, entityById, baseGraph.nodes);

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
          const relIndex = buildRelationIndex(normaliseArray(snapshot.relations));
          const type = relIndex.has(id) ? 'relation' : 'edge';
          setGraphWorkbenchSelection({ type, id });
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
      selectedType !== 'relation' &&
      selectedType !== 'edge'
        ? graphWorkbenchState.selection.id
        : null;

    const selectedRelationIdForGraph =
      selectedType === 'relation' ? graphWorkbenchState.selection.id : null;

    graphWorkbenchState.focusEntityId = graphWorkbenchState.filterCenterId;

    workbenchGraphView.render(dom.canvas, filteredGraph, {
      selectedEntityId: selectedNodeIdForGraph,
      selectedRelationId: selectedRelationIdForGraph,
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
    activateTab('canon');
    currentTextId = textId;
    renderCanonView();
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
    textCard.innerHTML =
      '<h3>Texts</h3>' +
      `<p>Total: ${vm.textStats.totalTexts}</p>` +
      `<p>Works: ${vm.textStats.works} · Sections: ${vm.textStats.sections}</p>` +
      `<p>Passages: ${vm.textStats.passages} · Lines: ${vm.textStats.lines}</p>`;
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
      { label: 'Level', key: 'level' },
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
    ],
    relations: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'From', key: 'fromEntityId', type: 'id', ref: 'entities' },
      { label: 'To', key: 'toEntityId', type: 'id', ref: 'entities' },
      { label: 'Type', key: 'relationType' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
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
    addMetricRow('Works', r => r.textCounts.works ?? 0);
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

    return target;
  }

  function importMovementSnapshot(movementSnapshot) {
    const incoming = StorageService.ensureAllCollections(movementSnapshot || {});
    const incomingMovements = incoming.movements || [];
    if (!incomingMovements.length) {
      alert('No movements found in the imported file.');
      return;
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
      const ok = window.confirm(
        `Replace existing movement data for: ${names}? This will overwrite matching IDs.`
      );
      if (!ok) return;
    }

    clearMovementAssetsForIds(incomingIds);
    fullSnapshot = mergeMovementSnapshotIntoExisting(fullSnapshot, incoming);
    StorageService.saveSnapshot(fullSnapshot);
    snapshot = fullSnapshot;
    currentMovementId = incomingMovements[0]?.id || currentMovementId;
    currentItemId = null;
    resetNavigationHistory();
    renderMovementList();
    renderActiveTab();
    markSaved({ movement: true, item: true });
  }

  function exportCurrentMovementAsJson() {
    if (!currentMovementId) {
      alert('Select a movement to export.');
      return;
    }
    const movementSnapshot = createMovementSnapshot(currentMovementId, snapshot);
    if (!movementSnapshot) {
      alert('Movement not found.');
      return;
    }

    const json = JSON.stringify(movementSnapshot, null, 2);
    const movement = movementSnapshot.movements[0];
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${movement.shortName || movement.id}-movement.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Exported movement JSON');
  }

  function importMovementFromJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        importMovementSnapshot(data);
        setStatus('Imported movement JSON');
      } catch (e) {
        alert('Failed to import: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  function buildAssetPathForMedia(media) {
    const base = 'media';
    const idPart = media.id || media.slug || 'asset';
    const mimeType = media.mimeType || '';

    if (mimeType.startsWith('audio/')) return `${base}/audio/${idPart}`;
    if (mimeType.startsWith('image/')) return `${base}/images/${idPart}`;
    if (mimeType === 'text/csv') return `${base}/csv/${idPart}.csv`;
    return `${base}/other/${idPart}`;
  }

  function buildZipManifest(movementSnapshot) {
    const clone = JSON.parse(JSON.stringify(movementSnapshot || {}));

    if (Array.isArray(clone.texts)) {
      clone.texts = clone.texts.map(text => {
        const { body, ...rest } = text;
        const id = text.id || text.slug || 'text';
        return {
          ...rest,
          bodyPath: `texts/${id}.md`
        };
      });
    }

    if (Array.isArray(clone.media)) {
      clone.media = clone.media.map(media => ({
        ...media,
        assetPath: media.assetPath || buildAssetPathForMedia(media)
      }));
    }

    return clone;
  }

  function addTextsToZip(zip, movementSnapshot) {
    if (!Array.isArray(movementSnapshot.texts)) return;
    movementSnapshot.texts.forEach(text => {
      const id = text.id || text.slug || 'text';
      const filePath = `texts/${id}.md`;
      zip.file(filePath, text.body || '');
    });
  }

  async function addAssetsToZip(zip, movementSnapshot) {
    if (!Array.isArray(movementSnapshot.media)) return;
    const movementId = movementSnapshot.movements?.[0]?.id;
    if (!movementId) return;

    for (const media of movementSnapshot.media) {
      const assetPath = media.assetPath || buildAssetPathForMedia(media);
      const key = `${movementId}:${assetPath}`;
      const blob = movementAssetStore.get(key);
      if (!blob) continue;
      zip.file(assetPath, blob);
    }
  }

  async function exportCurrentMovementAsZip() {
    if (!currentMovementId) {
      alert('Select a movement to export.');
      return;
    }
    const movementSnapshot = createMovementSnapshot(currentMovementId, snapshot);
    if (!movementSnapshot) {
      alert('Movement not found.');
      return;
    }

    const movement = movementSnapshot.movements[0];
    const zip = new JSZip();
    const manifest = buildZipManifest(movementSnapshot);
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    addTextsToZip(zip, movementSnapshot);
    await addAssetsToZip(zip, movementSnapshot);

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `${movement.shortName || movement.id}.movement.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Exported movement ZIP');
  }

  async function hydrateTextsFromZip(zip, movementSnapshot) {
    if (!Array.isArray(movementSnapshot.texts)) return;
    for (const text of movementSnapshot.texts) {
      if (!text.bodyPath) continue;
      const file = zip.file(text.bodyPath);
      if (!file) continue;
      text.body = await file.async('string');
    }
  }

  async function hydrateAssetsFromZip(zip, movementSnapshot) {
    if (!Array.isArray(movementSnapshot.media)) return;
    const movementId = movementSnapshot.movements?.[0]?.id;
    if (!movementId) return;

    for (const media of movementSnapshot.media) {
      const assetPath = media.assetPath;
      if (!assetPath) continue;
      const file = zip.file(assetPath);
      if (!file) continue;
      const blob = await file.async('blob');
      const key = `${movementId}:${assetPath}`;
      movementAssetStore.set(key, blob);
    }
  }

  async function importMovementFromZipFile(file) {
    try {
      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) throw new Error('manifest.json not found');

      const manifestText = await manifestFile.async('string');
      const manifest = JSON.parse(manifestText);
      await hydrateTextsFromZip(zip, manifest);
      await hydrateAssetsFromZip(zip, manifest);
      importMovementSnapshot(manifest);
      setStatus('Imported movement ZIP');
    } catch (e) {
      console.error(e);
      alert('Failed to import ZIP: ' + e.message);
    }
  }

  function resetToDefaults() {
    const ok = window.confirm(
      'Clear all data and reset to the default sample?\n\nThis will overwrite any changes.'
    );
    if (!ok) return;
    snapshot = StorageService.getDefaultSnapshot();
    currentMovementId = snapshot.movements[0]?.id || null;
    currentItemId = null;
    currentTextId = null;
    movementAssetStore.clear();
    resetNavigationHistory();
    saveSnapshot({ clearMovementDirty: true, clearItemDirty: true });
    setStatus('Reset to default');
  }

  function addListenerById(id, event, handler) {
    const el = document.getElementById(id);
    if (!el) return null;
    el.addEventListener(event, handler);
    return el;
  }

  // ---- Init ----

  function init() {
    snapshot = loadSnapshot();
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
    addListenerById(
      'btn-export-movement-json',
      'click',
      exportCurrentMovementAsJson
    );

    addListenerById('btn-import-movement-json', 'click', () => {
      const input = document.getElementById('file-input-json');
      if (!input) return;
      input.value = '';
      input.click();
    });

    addListenerById('file-input-json', 'change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      importMovementFromJsonFile(file);
    });

    addListenerById('btn-export-movement-zip', 'click', exportCurrentMovementAsZip);

    addListenerById('btn-import-movement-zip', 'click', () => {
      const input = document.getElementById('file-input-zip');
      if (!input) return;
      input.value = '';
      input.click();
    });

    addListenerById('file-input-zip', 'change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      importMovementFromZipFile(file);
    });

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

    // Calendar / claims / rules / media / relations / notes filters react on change
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

    const relTypeFilter = document.getElementById(
      'relations-type-filter'
    );
    const relEntFilter = document.getElementById(
      'relations-entity-filter'
    );
    if (relTypeFilter) {
      relTypeFilter.addEventListener('change', renderRelationsView);
    }
    if (relEntFilter) {
      relEntFilter.addEventListener('change', renderRelationsView);
    }

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
    const canonCollectionSelect = document.getElementById(
      'canon-collection-select'
    );
    if (canonCollectionSelect) {
      canonCollectionSelect.addEventListener(
        'change',
        renderCanonView
      );
    }
    addListenerById('btn-add-text-collection', 'click', addTextCollection);
    addListenerById('btn-save-text-collection', 'click', saveTextCollection);
    addListenerById('btn-delete-text-collection', 'click', deleteTextCollection);
    addListenerById('btn-add-root-text', 'click', addRootTextNode);
    addListenerById('btn-add-child-text', 'click', addChildTextNode);
    addListenerById('btn-save-text', 'click', saveCurrentTextNode);
    addListenerById('btn-delete-text', 'click', deleteCurrentTextNode);

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

  document.addEventListener('DOMContentLoaded', init);
})();

