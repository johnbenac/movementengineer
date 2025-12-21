const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const EMPTY_NAVIGATION = { stack: [], index: -1 };

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
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

function getStorageService(ctx) {
  return ctx?.services?.StorageService || ctx?.StorageService || window.StorageService;
}

function getLegacy(ctx) {
  return ctx?.legacy || movementEngineerGlobal.legacy || {};
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
}

function getCollectionsMeta(ctx) {
  const DomainService = getDomainService(ctx);
  if (!DomainService) return { collectionNames: [], movementScoped: new Set() };
  return {
    collectionNames: DomainService.COLLECTION_NAMES || [],
    movementScoped: DomainService.COLLECTIONS_WITH_MOVEMENT_ID || new Set()
  };
}

function getLabelForItem(item) {
  if (!item || typeof item !== 'object') return '';
  return item.name || item.title || item.shortText || item.text || item.id || '[no label]';
}

function mapIdToLabel(snapshot, collectionName, id) {
  if (!id) return '—';
  if (collectionName === 'movements') {
    const movement = (snapshot.movements || []).find(m => m.id === id);
    return movement ? movement.name || movement.id : id;
  }
  const coll = snapshot[collectionName] || [];
  const item = coll.find(it => it.id === id);
  return item ? getLabelForItem(item) : id;
}

function isMovementFilterEnabled() {
  const filterCheckbox = document.getElementById('collection-filter-by-movement');
  return Boolean(filterCheckbox && filterCheckbox.checked);
}

function ensureNavigation(nav) {
  if (!nav || !Array.isArray(nav.stack) || typeof nav.index !== 'number') {
    return { ...EMPTY_NAVIGATION };
  }
  return { stack: [...nav.stack], index: nav.index };
}

function pushNavigationState(nav, collectionName, itemId) {
  const navigation = ensureNavigation(nav);
  if (!collectionName || !itemId) {
    return { navigation, changed: false };
  }
  const current = navigation.stack[navigation.index];
  if (current && current.collectionName === collectionName && current.itemId === itemId) {
    return { navigation, changed: false };
  }
  const trimmed = navigation.stack.slice(0, navigation.index + 1);
  const nextStack = [...trimmed, { collectionName, itemId }];
  return {
    navigation: { stack: nextStack, index: nextStack.length - 1 },
    changed: true
  };
}

function pruneNavigationState(nav, collectionName, itemId) {
  const navigation = ensureNavigation(nav);
  const previousLength = navigation.stack.length;
  const previousIndex = navigation.index;
  const filtered = [];
  navigation.stack.forEach((entry, idx) => {
    if (entry.collectionName === collectionName && entry.itemId === itemId) {
      if (idx <= navigation.index) navigation.index -= 1;
      return;
    }
    filtered.push(entry);
  });
  navigation.stack = filtered;
  if (!navigation.stack.length) {
    navigation.index = -1;
  } else {
    navigation.index = Math.max(Math.min(navigation.index, navigation.stack.length - 1), 0);
  }
  const changed =
    navigation.stack.length !== previousLength || navigation.index !== previousIndex;
  return { navigation, changed };
}

function navigateHistory(nav, direction) {
  const navigation = ensureNavigation(nav);
  if (!navigation.stack.length) return { navigation, target: null };
  const targetIndex = navigation.index + direction;
  if (targetIndex < 0 || targetIndex >= navigation.stack.length) {
    return { navigation, target: null };
  }
  const nextIndex = targetIndex;
  const target = navigation.stack[nextIndex];
  return { navigation: { ...navigation, index: nextIndex }, target };
}

function renderPreviewValue(container, snapshot, value, type, refCollection, jumpTo) {
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
      if (refCollection && jumpTo) {
        chip.addEventListener('click', () => jumpTo(refCollection, value));
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
        if (refCollection && jumpTo) {
          chip.addEventListener('click', () => jumpTo(refCollection, id));
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
      if (value === undefined || value === null || value === '') return placeholder();
      const span = document.createElement('span');
      span.textContent = value;
      container.appendChild(span);
    }
  }
}

function renderPreviewRow(container, snapshot, label, value, type, refCollection, jumpTo) {
  const row = document.createElement('div');
  row.className = 'preview-row';
  const lbl = document.createElement('div');
  lbl.className = 'preview-label';
  lbl.textContent = label;
  const val = document.createElement('div');
  val.className = 'preview-value';
  renderPreviewValue(val, snapshot, value, type, refCollection, jumpTo);
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

function renderItemPreview(ctx, jumpToReferencedItem) {
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const titleEl = document.getElementById('item-preview-title');
  const subtitleEl = document.getElementById('item-preview-subtitle');
  const body = document.getElementById('item-preview-body');
  const badge = document.getElementById('item-preview-collection');
  if (!titleEl || !subtitleEl || !body || !badge) return;

  getClear(ctx)(body);
  badge.textContent = state.currentCollectionName;

  if (!state.currentItemId) {
    titleEl.textContent = 'Select an item';
    subtitleEl.textContent = 'Preview will appear here';
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Pick an item on the left to see a human-friendly summary.';
    body.appendChild(p);
    return;
  }

  const coll = snapshot[state.currentCollectionName] || [];
  const item = coll.find(it => it.id === state.currentItemId);
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
  subtitleEl.textContent = `${state.currentCollectionName.slice(0, -1)} · ${item.id}`;

  const fields = PREVIEW_FIELDS[state.currentCollectionName];
  if (!fields) {
    renderPreviewRow(body, snapshot, 'Details', JSON.stringify(item, null, 2), 'code');
    return;
  }

  fields.forEach(field => {
    const value = item[field.key];
    renderPreviewRow(body, snapshot, field.label, value, field.type, field.ref, jumpToReferencedItem);
  });

  if (state.currentCollectionName === 'texts') {
    const applyMovementFilter = isMovementFilterEnabled();
    const children = (snapshot.texts || [])
      .filter(text => text.parentId === item.id)
      .filter(text => {
        if (!applyMovementFilter || !state.currentMovementId) return true;
        return text.movementId === state.currentMovementId;
      })
      .sort((a, b) =>
        getLabelForItem(a).localeCompare(getLabelForItem(b), undefined, { sensitivity: 'base' })
      )
      .map(text => text.id);

    renderPreviewRow(body, snapshot, 'Child texts', children, 'idList', 'texts', jumpToReferencedItem);
  }
}

function renderItemEditor(ctx) {
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName] || [];
  const editor = document.getElementById('item-editor');
  const deleteBtn = document.getElementById('btn-delete-item');

  if (!editor || !deleteBtn) return;

  if (!state.currentItemId) {
    editor.value = '';
    editor.disabled = coll.length === 0;
    deleteBtn.disabled = true;
    renderItemPreview(ctx, null);
    return;
  }

  const item = coll.find(it => it.id === state.currentItemId);
  if (!item) {
    editor.value = '';
    editor.disabled = true;
    deleteBtn.disabled = true;
    renderItemPreview(ctx, null);
    return;
  }

  editor.disabled = false;
  deleteBtn.disabled = false;
  editor.value = JSON.stringify(item, null, 2);
  renderItemPreview(ctx, (collName, id) => jumpToReferencedItem(ctx, collName, id));
}

function renderCollectionList(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const { movementScoped } = getCollectionsMeta(ctx);

  const list = document.getElementById('collection-items');
  if (!list) return;
  clear(list);

  const collName = state.currentCollectionName;
  const coll = snapshot[collName] || [];
  const filterByMovement = isMovementFilterEnabled();

  let items = coll;
  if (filterByMovement && state.currentMovementId && movementScoped.has(collName)) {
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
      setCollectionAndItem(ctx, collName, item.id);
    });
    list.appendChild(li);
  });

  const deleteBtn = document.getElementById('btn-delete-item');
  if (deleteBtn) deleteBtn.disabled = !state.currentItemId;
}

function renderItemDetail(ctx) {
  renderItemPreview(ctx, (collName, id) => jumpToReferencedItem(ctx, collName, id));
  renderItemEditor(ctx);
}

function updateNavigationButtons(nav) {
  const navigation = ensureNavigation(nav);
  const backBtn = document.getElementById('btn-preview-back');
  const fwdBtn = document.getElementById('btn-preview-forward');
  if (!backBtn || !fwdBtn) return;
  backBtn.disabled = navigation.index <= 0;
  fwdBtn.disabled = navigation.index < 0 || navigation.index >= navigation.stack.length - 1;
}

function setCollectionAndItem(ctx, collectionName, itemId, options = {}) {
  const { addToHistory = true, fromHistory = false, navigationChangedExternally = false } = options;
  const { collectionNames, movementScoped } = getCollectionsMeta(ctx);
  const legacy = getLegacy(ctx);
  const currentState = getState(ctx);
  const snapshot = currentState.snapshot || {};

  const previousCollectionName = currentState.currentCollectionName;
  const previousItemId = currentState.currentItemId;
  const previousNav = ensureNavigation(currentState.navigation);

  if (!collectionNames.includes(collectionName)) {
    legacy.setStatus?.('Unknown collection: ' + collectionName);
    return;
  }

  const coll = snapshot[collectionName] || [];
  const foundItem = itemId ? coll.find(it => it.id === itemId) : null;

  const movementFilter = document.getElementById('collection-filter-by-movement');
  if (
    movementFilter &&
    movementFilter.checked &&
    foundItem &&
    movementScoped.has(collectionName) &&
    foundItem.movementId &&
    currentState.currentMovementId &&
    foundItem.movementId !== currentState.currentMovementId
  ) {
    movementFilter.checked = false;
  }

  const nextItemId = foundItem ? foundItem.id : null;

  let navigation = previousNav;
  let navigationChanged = false;
  if (addToHistory && nextItemId && !fromHistory) {
    const result = pushNavigationState(previousNav, collectionName, nextItemId);
    navigation = result.navigation;
    navigationChanged = result.changed;
  }

  const selectionChanged =
    previousCollectionName !== collectionName || previousItemId !== nextItemId;

  const nextState = {
    ...currentState,
    currentCollectionName: collectionName,
    currentItemId: nextItemId,
    navigation
  };

  ctx.update(() => nextState);
  updateNavigationButtons(navigation);

  if (selectionChanged || navigationChanged || navigationChangedExternally) {
    legacy.notify?.();
  }
}

function jumpToReferencedItem(ctx, collectionName, itemId) {
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const legacy = getLegacy(ctx);
  const { collectionNames } = getCollectionsMeta(ctx);

  if (!collectionName || !itemId) return;
  if (collectionName === 'movements') {
    const actions = getActions(ctx);
    actions.selectMovement?.(itemId);
    actions.activateTab?.('dashboard');
    return;
  }
  if (!collectionNames.includes(collectionName)) {
    legacy.setStatus?.('Unknown collection: ' + collectionName);
    return;
  }
  const coll = snapshot[collectionName];
  if (!Array.isArray(coll)) {
    legacy.setStatus?.('Unknown collection: ' + collectionName);
    return;
  }
  const exists = coll.find(it => it.id === itemId);
  if (!exists) {
    legacy.setStatus?.('Referenced item not found');
    return;
  }
  setCollectionAndItem(ctx, collectionName, itemId);
}

function saveItemFromEditor(ctx, options = {}) {
  const { persist = true } = options;
  const state = getState(ctx);
  const legacy = getLegacy(ctx);
  const DomainService = getDomainService(ctx);
  const snapshot = state.snapshot;
  const collName = state.currentCollectionName;
  const coll = snapshot?.[collName];
  if (!Array.isArray(coll)) {
    window.alert('Unknown collection: ' + collName);
    return false;
  }

  const editor = document.getElementById('item-editor');
  if (!editor) return false;
  const raw = editor.value.trim();
  if (!raw) {
    window.alert('Editor is empty. Nothing to save.');
    return false;
  }

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    window.alert('Invalid JSON: ' + e.message);
    return false;
  }

  if (!obj.id) {
    window.alert('Object must have an "id" field.');
    return false;
  }

  try {
    DomainService.upsertItem(snapshot, collName, obj);
    const nextState = { ...state, snapshot, currentItemId: obj.id };
    ctx.update(() => nextState);
    legacy.markDirty?.('item');
    if (persist) legacy.saveSnapshot?.({ clearItemDirty: true });
    const result = pushNavigationState(nextState.navigation, collName, obj.id);
    if (result.changed) {
      ctx.update(prev => ({ ...prev, navigation: result.navigation }));
      legacy.notify?.();
    }
  } catch (e) {
    window.alert(e.message);
    return false;
  }
  return true;
}

function addNewItem(ctx) {
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const legacy = getLegacy(ctx);
  const snapshot = state.snapshot;
  const collName = state.currentCollectionName;
  try {
    const skeleton = DomainService.addNewItem(snapshot, collName, state.currentMovementId);
    const nextState = { ...state, snapshot, currentItemId: skeleton.id };
    ctx.update(() => nextState);
    legacy.saveSnapshot?.({ show: false });
    legacy.setStatus?.('New item created');
    setCollectionAndItem(ctx, collName, skeleton.id);
  } catch (e) {
    window.alert(e.message);
  }
}

function deleteCurrentItem(ctx) {
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const legacy = getLegacy(ctx);
  const snapshot = state.snapshot;
  const collName = state.currentCollectionName;
  const coll = snapshot?.[collName];
  if (!Array.isArray(coll) || !state.currentItemId) return;

  const item = coll.find(it => it.id === state.currentItemId);
  const label = getLabelForItem(item);
  const ok = window.confirm(
    `Delete this ${collName.slice(0, -1)}?\n\n${label}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  try {
    DomainService.deleteItem(snapshot, collName, state.currentItemId);
  } catch (e) {
    window.alert(e.message);
    return;
  }

  const { navigation, changed } = pruneNavigationState(
    state.navigation,
    collName,
    state.currentItemId
  );

  const nextState = { ...state, snapshot, currentItemId: null, navigation };
  ctx.update(() => nextState);
  legacy.saveSnapshot?.();
  if (changed) legacy.notify?.();
}

function handleTabRender(ctx) {
  const select = document.getElementById('collection-select');
  if (select && select.value !== getState(ctx).currentCollectionName) {
    select.value = getState(ctx).currentCollectionName;
  }
  renderCollectionList(ctx);
  renderItemDetail(ctx);
  updateNavigationButtons(getState(ctx).navigation);
}

export function registerCollectionsTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const listeners = [];
      const rerender = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'collections') return;
        handleTabRender(context);
      };

      const select = document.getElementById('collection-select');
      if (select) {
        const handler = e => setCollectionAndItem(context, e.target.value, null, { addToHistory: false });
        select.addEventListener('change', handler);
        listeners.push({ el: select, event: 'change', handler });
      }

      const movementFilter = document.getElementById('collection-filter-by-movement');
      if (movementFilter) {
        const handler = () => handleTabRender(context);
        movementFilter.addEventListener('change', handler);
        listeners.push({ el: movementFilter, event: 'change', handler });
      }

      const addBtn = document.getElementById('btn-add-item');
      if (addBtn) {
        const handler = () => addNewItem(context);
        addBtn.addEventListener('click', handler);
        listeners.push({ el: addBtn, event: 'click', handler });
      }

      const deleteBtn = document.getElementById('btn-delete-item');
      if (deleteBtn) {
        const handler = () => deleteCurrentItem(context);
        deleteBtn.addEventListener('click', handler);
        listeners.push({ el: deleteBtn, event: 'click', handler });
      }

      const saveBtn = document.getElementById('btn-save-item');
      if (saveBtn) {
        const handler = () => saveItemFromEditor(context);
        saveBtn.addEventListener('click', handler);
        listeners.push({ el: saveBtn, event: 'click', handler });
      }

      const navBack = document.getElementById('btn-preview-back');
      if (navBack) {
        const handler = () => {
          const { navigation, target } = navigateHistory(getState(context).navigation, -1);
          if (target) {
            context.update(prev => ({ ...prev, navigation }));
            setCollectionAndItem(context, target.collectionName, target.itemId, {
              addToHistory: false,
              fromHistory: true,
              navigationChangedExternally: true
            });
          }
          updateNavigationButtons(navigation);
        };
        navBack.addEventListener('click', handler);
        listeners.push({ el: navBack, event: 'click', handler });
      }

      const navForward = document.getElementById('btn-preview-forward');
      if (navForward) {
        const handler = () => {
          const { navigation, target } = navigateHistory(getState(context).navigation, 1);
          if (target) {
            context.update(prev => ({ ...prev, navigation }));
            setCollectionAndItem(context, target.collectionName, target.itemId, {
              addToHistory: false,
              fromHistory: true,
              navigationChangedExternally: true
            });
          }
          updateNavigationButtons(navigation);
        };
        navForward.addEventListener('click', handler);
        listeners.push({ el: navForward, event: 'click', handler });
      }

      const itemEditor = document.getElementById('item-editor');
      if (itemEditor) {
        const handler = () => {
          getLegacy(context).markDirty?.('item');
        };
        itemEditor.addEventListener('input', handler);
        listeners.push({ el: itemEditor, event: 'input', handler });
      }

      const unsubscribe = context?.subscribe ? context.subscribe(rerender) : null;
      this.__handlers = { listeners, unsubscribe, rerender };
    },
    render: handleTabRender,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      h.listeners?.forEach(({ el, event, handler }) => {
        if (el) el.removeEventListener(event, handler);
      });
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    },
    setCollectionAndItem: (...args) => setCollectionAndItem(ctx, ...args),
    jumpToReferencedItem: (...args) => jumpToReferencedItem(ctx, ...args)
  };

  movementEngineerGlobal.tabs.collections = tab;
  if (ctx?.tabs) {
    ctx.tabs.collections = tab;
  }

  movementEngineerGlobal.actions = Object.assign(movementEngineerGlobal.actions || {}, {
    setCollectionAndItem: (...args) => setCollectionAndItem(ctx, ...args),
    jumpToReferencedItem: (...args) => jumpToReferencedItem(ctx, ...args)
  });

  return tab;
}
