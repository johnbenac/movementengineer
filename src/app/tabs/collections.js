const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

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

function getDomainService(ctx) {
  return ctx?.services?.DomainService || window.DomainService;
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
}

function getFlags(state) {
  return state?.flags || {};
}

function setStatus(ctx, text) {
  if (typeof ctx?.setStatus === 'function') {
    ctx.setStatus(text);
  } else if (typeof ctx?.legacy?.setStatus === 'function') {
    ctx.legacy.setStatus(text);
  }
}

function cloneNavigation(nav = {}) {
  const stack = Array.isArray(nav.stack) ? [...nav.stack] : [];
  const index = typeof nav.index === 'number' ? nav.index : -1;
  return { stack, index };
}

function pushNavigationInPlace(nav, collectionName, itemId) {
  if (!collectionName || !itemId) return false;
  const previousIndex = nav.index;
  const previousLength = nav.stack.length;
  const current = nav.stack[nav.index];
  if (current && current.collectionName === collectionName && current.itemId === itemId) {
    return false;
  }
  nav.stack = nav.stack.slice(0, nav.index + 1);
  nav.stack.push({ collectionName, itemId });
  nav.index = nav.stack.length - 1;
  return nav.index !== previousIndex || nav.stack.length !== previousLength;
}

function pruneNavigationInPlace(nav, collectionName, itemId) {
  if (!nav.stack.length) return false;
  const previousLength = nav.stack.length;
  nav.stack = nav.stack.filter(entry => {
    return !(entry.collectionName === collectionName && entry.itemId === itemId);
  });
  if (nav.index >= nav.stack.length) {
    nav.index = nav.stack.length - 1;
  }
  return nav.stack.length !== previousLength;
}

function updateNavigationButtons(nav = {}) {
  const backBtn = document.getElementById('btn-preview-back');
  const fwdBtn = document.getElementById('btn-preview-forward');
  if (!backBtn || !fwdBtn) return;
  const index = typeof nav.index === 'number' ? nav.index : -1;
  const length = Array.isArray(nav.stack) ? nav.stack.length : 0;
  backBtn.disabled = index <= 0;
  fwdBtn.disabled = index < 0 || index >= length - 1;
}

function focusCollectionsTab(ctx) {
  const actions = getActions(ctx);
  if (typeof actions.activateTab === 'function') {
    actions.activateTab('collections');
  }
}

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
  const filterCheckbox = document.getElementById('collection-filter-by-movement');
  return Boolean(filterCheckbox && filterCheckbox.checked);
}

function mapIdToLabel(snapshot, collectionName, id) {
  if (!id) return '—';
  if (collectionName === 'movements') {
    const movement = (snapshot?.movements || []).find(m => m.id === id);
    return movement ? movement.name || movement.id : id;
  }
  const coll = snapshot?.[collectionName] || [];
  const item = coll.find(it => it.id === id);
  return item ? getLabelForItem(item) : id;
}

function renderPreviewValue(container, value, type, refCollection, snapshot, onJump) {
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
      chip.textContent = mapIdToLabel(snapshot, refCollection, value);
      chip.title = 'Open ' + value;
      if (refCollection && typeof onJump === 'function') {
        chip.addEventListener('click', () => onJump(refCollection, value));
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
        chip.textContent = mapIdToLabel(snapshot, refCollection, id);
        chip.title = 'Open ' + id;
        if (refCollection && typeof onJump === 'function') {
          chip.addEventListener('click', () => onJump(refCollection, id));
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
      if (value === undefined || value === null || value === '') {
        return placeholder();
      }
      const span = document.createElement('span');
      span.textContent = String(value);
      container.appendChild(span);
      return;
    }
  }
}

const PREVIEW_FIELDS = {
  entities: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Kind', key: 'kind' },
    { label: 'Tags', key: 'tags', type: 'chips' },
    { label: 'Summary', key: 'summary', type: 'paragraph' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Authority', key: 'authority', type: 'paragraph' },
    { label: 'Steward or organization', key: 'steward' },
    { label: 'Official source of truth', key: 'sourceOfTruth', type: 'paragraph' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  practices: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Kind', key: 'kind' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips' },
    { label: 'Main entities', key: 'mainEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Supporting entities', key: 'supportingEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Schedule', key: 'schedule', type: 'paragraph' },
    { label: 'Notes', key: 'notes', type: 'paragraph' },
    { label: 'Instruction texts', key: 'instructionTextIds', type: 'idList', ref: 'texts' },
    { label: 'Support texts', key: 'supportingTextIds', type: 'idList', ref: 'texts' },
    { label: 'Teaching texts', key: 'teachingTextIds', type: 'idList', ref: 'texts' }
  ],
  events: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Recurrence', key: 'recurrence' },
    { label: 'Timing rule', key: 'timingRule', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Main entities', key: 'mainEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Supporting entities', key: 'supportingEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Main practices', key: 'mainPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Supporting practices', key: 'supportingPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Readings', key: 'readingIds', type: 'idList', ref: 'texts' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  rules: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Kind', key: 'kind' },
    { label: 'Details', key: 'details', type: 'paragraph' },
    { label: 'Applies to', key: 'appliesTo', type: 'chips' },
    { label: 'Domain', key: 'domain', type: 'chips' },
    { label: 'Tags', key: 'tags', type: 'chips' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
    { label: 'Supporting texts', key: 'supportingTextIds', type: 'idList', ref: 'texts' },
    { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
    { label: 'Related practices', key: 'relatedPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' }
  ],
  claims: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Category', key: 'category' },
    { label: 'Strength', key: 'strength' },
    { label: 'Tags', key: 'tags', type: 'chips' },
    { label: 'Source of truth', key: 'sourceOfTruth' },
    { label: 'Entities', key: 'entityIds', type: 'idList', ref: 'entities' },
    { label: 'Practices', key: 'practiceIds', type: 'idList', ref: 'practices' },
    { label: 'Referenced texts', key: 'textIds', type: 'idList', ref: 'texts' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  texts: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Collection(s)', key: 'collectionIds', type: 'idList', ref: 'textCollections' },
    { label: 'Parent', key: 'parentId', type: 'id', ref: 'texts' },
    { label: 'Depth', key: 'depth' },
    { label: 'Tags', key: 'tags', type: 'chips' },
    { label: 'Notes', key: 'notes', type: 'paragraph' },
    { label: 'Body', key: 'body', type: 'paragraph' }
  ],
  textCollections: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips' },
    { label: 'Root texts', key: 'rootTextIds', type: 'idList', ref: 'texts' }
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

function renderPreviewRow(container, label, value, type, refCollection, snapshot, onJump) {
  const row = document.createElement('div');
  row.className = 'preview-row';
  const heading = document.createElement('div');
  heading.className = 'muted';
  heading.textContent = label;
  row.appendChild(heading);
  const body = document.createElement('div');
  body.className = 'preview-value';
  renderPreviewValue(body, value, type, refCollection, snapshot, onJump);
  row.appendChild(body);
  container.appendChild(row);
}

function renderItemPreview(ctx, tab, state) {
  const snapshot = state.snapshot || {};
  const currentCollectionName = state.currentCollectionName;
  const currentMovementId = state.currentMovementId;
  const currentItemId = state.currentItemId;
  const titleEl = document.getElementById('item-preview-title');
  const subtitleEl = document.getElementById('item-preview-subtitle');
  const body = document.getElementById('item-preview-body');
  const badge = document.getElementById('item-preview-collection');
  if (!titleEl || !subtitleEl || !body || !badge) return;

  const clear = getClear(ctx);
  clear(body);
  badge.textContent = currentCollectionName || '—';

  if (!currentItemId || !currentCollectionName) {
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
    renderPreviewRow(body, 'Details', JSON.stringify(item, null, 2), 'code', null, snapshot);
  } else {
    fields.forEach(field => {
      const value = item[field.key];
      renderPreviewRow(
        body,
        field.label,
        value,
        field.type,
        field.ref,
        snapshot,
        (collection, id) => tab.jumpToReferencedItem(collection, id)
      );
    });
  }

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

    renderPreviewRow(body, 'Child texts', children, 'idList', 'texts', snapshot, (collection, id) =>
      tab.jumpToReferencedItem(collection, id)
    );
  }
}

function renderItemEditor(ctx, tab, state) {
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName] || [];
  const editor = document.getElementById('item-editor');
  const deleteBtn = document.getElementById('btn-delete-item');
  if (!editor || !deleteBtn) return;

  if (!state.currentItemId) {
    tab.__editorState.isPopulating = true;
    editor.value = '';
    tab.__editorState.isPopulating = false;
    editor.disabled = coll.length === 0;
    deleteBtn.disabled = true;
    renderItemPreview(ctx, tab, state);
    return;
  }

  const item = coll.find(it => it.id === state.currentItemId);
  if (!item) {
    tab.__editorState.isPopulating = true;
    editor.value = '';
    tab.__editorState.isPopulating = false;
    editor.disabled = true;
    deleteBtn.disabled = true;
    renderItemPreview(ctx, tab, state);
    return;
  }

  editor.disabled = false;
  deleteBtn.disabled = false;
  tab.__editorState.isPopulating = true;
  editor.value = JSON.stringify(item, null, 2);
  tab.__editorState.isPopulating = false;
  renderItemPreview(ctx, tab, state);
}

function renderItemDetail(ctx, tab, state) {
  renderItemPreview(ctx, tab, state);
  renderItemEditor(ctx, tab, state);
}

function renderCollectionList(ctx, tab, state) {
  const list = document.getElementById('collection-items');
  if (!list) return;
  const clear = getClear(ctx);
  clear(list);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName] || [];
  const filterByMovement = isMovementFilterEnabled();
  const domain = getDomainService(ctx);
  const collectionsWithMovementId =
    domain?.COLLECTIONS_WITH_MOVEMENT_ID || domain?.collectionsWithMovementId || new Set();

  let items = coll;
  if (filterByMovement && state.currentMovementId && collectionsWithMovementId.has(collName)) {
    items = coll.filter(item => item.movementId === state.currentMovementId);
  }

  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = 'No items in this collection.';
    li.style.fontStyle = 'italic';
    li.style.cursor = 'default';
    list.appendChild(li);
    const deleteBtn = document.getElementById('btn-delete-item');
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    if (item.id === state.currentItemId) li.classList.add('selected');
    const primary = document.createElement('span');
    primary.textContent = getLabelForItem(item);
    const secondary = document.createElement('span');
    secondary.className = 'secondary';
    secondary.textContent = item.id;
    li.appendChild(primary);
    li.appendChild(secondary);
    li.addEventListener('click', () => {
      tab.setCollectionAndItem(collName, item.id);
    });
    list.appendChild(li);
  });

  const deleteBtn = document.getElementById('btn-delete-item');
  if (deleteBtn) deleteBtn.disabled = !state.currentItemId;
}

function renderCollectionsTab(ctx, tab) {
  const state = getState(ctx);
  const select = document.getElementById('collection-select');
  if (select && state.currentCollectionName) {
    select.value = state.currentCollectionName;
  }
  renderCollectionList(ctx, tab, state);
  renderItemDetail(ctx, tab, state);
  updateNavigationButtons(state.navigation);
}

function setCollectionAndItem(ctx, tab, collectionName, itemId, options = {}) {
  const domain = getDomainService(ctx);
  const collectionNames = domain?.COLLECTION_NAMES || domain?.collectionNames || [];
  if (!collectionNames.includes(collectionName)) {
    setStatus(ctx, 'Unknown collection: ' + collectionName);
    return getState(ctx);
  }

  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const coll = snapshot[collectionName] || [];
  const foundItem = itemId ? coll.find(it => it.id === itemId) : null;
  const collectionsWithMovementId =
    domain?.COLLECTIONS_WITH_MOVEMENT_ID || domain?.collectionsWithMovementId || new Set();

  const movementFilter = document.getElementById('collection-filter-by-movement');
  if (
    movementFilter &&
    movementFilter.checked &&
    foundItem &&
    collectionsWithMovementId.has(collectionName) &&
    foundItem.movementId &&
    state.currentMovementId &&
    foundItem.movementId !== state.currentMovementId
  ) {
    movementFilter.checked = false;
  }

  const nav = options.navigationState ? cloneNavigation(options.navigationState) : cloneNavigation(state.navigation);
  if (options.addToHistory !== false && foundItem && !options.fromHistory) {
    pushNavigationInPlace(nav, collectionName, foundItem.id);
  }

  const nextState = {
    ...state,
    currentCollectionName: collectionName,
    currentItemId: foundItem ? foundItem.id : null,
    navigation: nav
  };

  if (typeof ctx?.setState === 'function') {
    ctx.setState(nextState);
  }
  tab.render?.(ctx);
  return nextState;
}

function navigateHistory(ctx, tab, direction) {
  const state = getState(ctx);
  const nav = cloneNavigation(state.navigation);
  if (!nav.stack.length) return;
  const target = nav.index + direction;
  if (target < 0 || target >= nav.stack.length) return;
  nav.index = target;
  const entry = nav.stack[target];
  setCollectionAndItem(ctx, tab, entry.collectionName, entry.itemId, {
    addToHistory: false,
    fromHistory: true,
    navigationState: nav
  });
}

function addNewItem(ctx, tab) {
  const domain = getDomainService(ctx);
  if (!domain || typeof domain.addNewItem !== 'function') {
    setStatus(ctx, 'DomainService unavailable');
    return;
  }
  const state = getState(ctx);
  const collName = state.currentCollectionName;
  const snapshot = state.snapshot;
  try {
    const skeleton = domain.addNewItem(snapshot, collName, state.currentMovementId);
    const nav = cloneNavigation(state.navigation);
    pushNavigationInPlace(nav, collName, skeleton.id);
    const nextState = {
      ...state,
      snapshot,
      currentItemId: skeleton.id,
      navigation: nav
    };
    if (typeof ctx?.setState === 'function') ctx.setState(nextState);
    if (ctx?.legacy?.saveSnapshot) ctx.legacy.saveSnapshot({ show: false });
    setStatus(ctx, 'New item created');
    tab.render?.(ctx);
  } catch (e) {
    alert(e.message);
  }
}

function deleteCurrentItem(ctx, tab) {
  const state = getState(ctx);
  const collName = state.currentCollectionName;
  const snapshot = state.snapshot;
  const domain = getDomainService(ctx);
  if (!domain || typeof domain.deleteItem !== 'function') return;
  const coll = snapshot?.[collName];
  if (!Array.isArray(coll) || !state.currentItemId) return;

  const item = coll.find(it => it.id === state.currentItemId);
  const label = getLabelForItem(item);
  const ok = window.confirm(
    `Delete this ${collName.slice(0, -1)}?\n\n${label}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  try {
    domain.deleteItem(snapshot, collName, state.currentItemId);
  } catch (e) {
    alert(e.message);
    return;
  }

  const nav = cloneNavigation(state.navigation);
  pruneNavigationInPlace(nav, collName, state.currentItemId);
  const nextState = {
    ...state,
    snapshot,
    currentItemId: null,
    navigation: nav
  };
  if (typeof ctx?.setState === 'function') ctx.setState(nextState);
  if (ctx?.legacy?.saveSnapshot) ctx.legacy.saveSnapshot();
  tab.render?.(ctx);
}

function saveItemFromEditor(ctx, tab, options = {}) {
  const { persist = true } = options;
  const state = getState(ctx);
  const collName = state.currentCollectionName;
  const snapshot = state.snapshot;
  const domain = getDomainService(ctx);
  if (!domain || typeof domain.upsertItem !== 'function') {
    alert('DomainService unavailable.');
    return false;
  }

  const coll = snapshot?.[collName];
  if (!Array.isArray(coll)) {
    alert('Unknown collection: ' + collName);
    return false;
  }

  const editor = document.getElementById('item-editor');
  const raw = (editor?.value || '').trim();
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
    domain.upsertItem(snapshot, collName, obj);
  } catch (e) {
    alert(e.message);
    return false;
  }

  const nav = cloneNavigation(state.navigation);
  pushNavigationInPlace(nav, collName, obj.id);

  const flags = getFlags(state);
  const nextFlags = { ...flags, snapshotDirty: true, itemEditorDirty: false };
  const nextState = {
    ...state,
    snapshot,
    currentCollectionName: collName,
    currentItemId: obj.id,
    navigation: nav,
    flags: nextFlags
  };

  if (typeof ctx?.setState === 'function') ctx.setState(nextState);
  if (persist && ctx?.legacy?.saveSnapshot) {
    ctx.legacy.saveSnapshot({ clearItemDirty: true });
  }
  tab.render?.(ctx);
  return true;
}

function jumpToReferencedItem(ctx, tab, collectionName, itemId) {
  if (!collectionName || !itemId) return;
  const actions = getActions(ctx);
  if (collectionName === 'movements') {
    if (typeof actions.selectMovement === 'function') {
      actions.selectMovement(itemId);
    }
    if (typeof actions.activateTab === 'function') {
      actions.activateTab('dashboard');
    }
    return;
  }
  focusCollectionsTab(ctx);
  setCollectionAndItem(ctx, tab, collectionName, itemId);
}

export function registerCollectionsTab(ctx) {
  const tab = {
    __handlers: null,
    __editorState: { isPopulating: false },
    setCollectionAndItem(collectionName, itemId, options) {
      return setCollectionAndItem(ctx, tab, collectionName, itemId, options);
    },
    saveItemFromEditor(options) {
      return saveItemFromEditor(ctx, tab, options);
    },
    addNewItem() {
      return addNewItem(ctx, tab);
    },
    deleteCurrentItem() {
      return deleteCurrentItem(ctx, tab);
    },
    navigateHistory(direction) {
      return navigateHistory(ctx, tab, direction);
    },
    jumpToReferencedItem(collectionName, itemId) {
      return jumpToReferencedItem(ctx, tab, collectionName, itemId);
    },
    mount(context) {
      const listeners = [];
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'collections') return;
        rerender();
      };

      const select = document.getElementById('collection-select');
      if (select) {
        const handler = e => tab.setCollectionAndItem(e.target.value, null, { addToHistory: false });
        select.addEventListener('change', handler);
        listeners.push({ el: select, event: 'change', handler });
      }

      const filterCheckbox = document.getElementById('collection-filter-by-movement');
      if (filterCheckbox) {
        filterCheckbox.addEventListener('change', rerender);
        listeners.push({ el: filterCheckbox, event: 'change', handler: rerender });
      }

      const addBtn = document.getElementById('btn-add-item');
      if (addBtn) {
        const handler = () => tab.addNewItem();
        addBtn.addEventListener('click', handler);
        listeners.push({ el: addBtn, event: 'click', handler });
      }

      const deleteBtn = document.getElementById('btn-delete-item');
      if (deleteBtn) {
        const handler = () => tab.deleteCurrentItem();
        deleteBtn.addEventListener('click', handler);
        listeners.push({ el: deleteBtn, event: 'click', handler });
      }

      const saveBtn = document.getElementById('btn-save-item');
      if (saveBtn) {
        const handler = () => tab.saveItemFromEditor();
        saveBtn.addEventListener('click', handler);
        listeners.push({ el: saveBtn, event: 'click', handler });
      }

      const navBack = document.getElementById('btn-preview-back');
      if (navBack) {
        const handler = () => tab.navigateHistory(-1);
        navBack.addEventListener('click', handler);
        listeners.push({ el: navBack, event: 'click', handler });
      }

      const navForward = document.getElementById('btn-preview-forward');
      if (navForward) {
        const handler = () => tab.navigateHistory(1);
        navForward.addEventListener('click', handler);
        listeners.push({ el: navForward, event: 'click', handler });
      }

      const itemEditor = document.getElementById('item-editor');
      if (itemEditor) {
        const handler = () => {
          if (tab.__editorState.isPopulating) return;
          context?.legacy?.markDirty?.('item');
        };
        itemEditor.addEventListener('input', handler);
        listeners.push({ el: itemEditor, event: 'input', handler });
      }

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { listeners, unsubscribe };
    },
    render(context) {
      renderCollectionsTab(context, tab);
    },
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      (h.listeners || []).forEach(({ el, event, handler }) => {
        if (el?.removeEventListener) {
          el.removeEventListener(event, handler);
        }
      });
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.collections = tab;
  if (ctx?.tabs) {
    ctx.tabs.collections = tab;
  }
  return tab;
}
