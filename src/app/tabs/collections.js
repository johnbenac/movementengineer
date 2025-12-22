const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

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
  return ctx.services.DomainService;
}

function getStorageService(ctx) {
  return ctx?.services?.StorageService || ctx?.StorageService || window.StorageService;
}

function getStore(ctx) {
  return ctx?.store || null;
}

function getActions(ctx) {
  return ctx?.actions || {};
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

function getCollectionNames(ctx) {
  const DomainService = getDomainService(ctx);
  return Array.isArray(DomainService?.COLLECTION_NAMES)
    ? DomainService.COLLECTION_NAMES
    : [];
}

function getCollectionsWithMovementId(ctx) {
  const DomainService = getDomainService(ctx);
  return DomainService?.COLLECTIONS_WITH_MOVEMENT_ID || new Set();
}

function getNavigation(state) {
  const nav = state?.navigation || {};
  const stack = Array.isArray(nav.stack) ? [...nav.stack] : [];
  if (!stack.length) return { stack: [], index: -1 };
  const idx = typeof nav.index === 'number' ? nav.index : stack.length - 1;
  const index = Math.max(Math.min(idx, stack.length - 1), 0);
  return { stack, index };
}

function pushNavigation(nav, collectionName, itemId) {
  if (!collectionName || !itemId) return getNavigation(nav);
  const base = getNavigation({ navigation: nav });
  const current = base.stack[base.index];
  if (current && current.collectionName === collectionName && current.itemId === itemId) {
    return base;
  }
  const stack = base.stack.slice(0, base.index + 1);
  stack.push({ collectionName, itemId });
  return { stack, index: stack.length - 1 };
}

function pruneNavigation(nav, collectionName, itemId) {
  const base = getNavigation({ navigation: nav });
  if (!base.stack.length) return base;
  const trimmed = [];
  let index = base.index;
  base.stack.forEach((entry, idx) => {
    if (entry.collectionName === collectionName && entry.itemId === itemId) {
      if (idx <= index) index -= 1;
      return;
    }
    trimmed.push(entry);
  });
  if (!trimmed.length) {
    return { stack: [], index: -1 };
  }
  return {
    stack: trimmed,
    index: Math.max(Math.min(index, trimmed.length - 1), 0)
  };
}

function updateNavigationButtons(nav) {
  const backBtn = document.getElementById('btn-preview-back');
  const fwdBtn = document.getElementById('btn-preview-forward');
  if (!backBtn || !fwdBtn) return;
  backBtn.disabled = nav.index <= 0;
  fwdBtn.disabled = nav.index < 0 || nav.index >= nav.stack.length - 1;
}

function isMovementFilterEnabled() {
  const filterCheckbox = document.getElementById('collection-filter-by-movement');
  return Boolean(filterCheckbox && filterCheckbox.checked);
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

function renderPreviewValue(ctx, container, snapshot, value, type, refCollection) {
  const actions = getActions(ctx);
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
      if (refCollection) {
        chip.addEventListener('click', () =>
          actions.jumpToReferencedItem?.(refCollection, value)
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
        chip.textContent = mapIdToLabel(snapshot, refCollection, id);
        chip.title = 'Open ' + id;
        if (refCollection) {
          chip.addEventListener('click', () =>
            actions.jumpToReferencedItem?.(refCollection, id)
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
      if (value === undefined || value === null || value === '') return placeholder();
      const span = document.createElement('span');
      span.textContent = value;
      container.appendChild(span);
    }
  }
}

function renderPreviewRow(ctx, container, snapshot, label, value, type, refCollection) {
  const row = document.createElement('div');
  row.className = 'preview-row';
  const lbl = document.createElement('div');
  lbl.className = 'preview-label';
  lbl.textContent = label;
  const val = document.createElement('div');
  val.className = 'preview-value';
  renderPreviewValue(ctx, val, snapshot, value, type, refCollection);
  row.appendChild(lbl);
  row.appendChild(val);
  container.appendChild(row);
}

function renderCollectionList(ctx, tab, state) {
  const list = document.getElementById('collection-items');
  const deleteBtn = document.getElementById('btn-delete-item');
  if (!list) return;
  const clear = getClear(ctx);
  clear(list);

  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName] || [];
  const collectionsWithMovementId = getCollectionsWithMovementId(ctx);
  const filterByMovement = isMovementFilterEnabled();

  let items = coll;
  if (
    filterByMovement &&
    state.currentMovementId &&
    collectionsWithMovementId.has(collName)
  ) {
    items = coll.filter(item => item.movementId === state.currentMovementId);
  }

  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = 'No items in this collection.';
    li.style.fontStyle = 'italic';
    li.style.cursor = 'default';
    list.appendChild(li);
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
      tab.setCollectionAndItem?.(ctx, collName, item.id);
    });
    list.appendChild(li);
  });

  if (deleteBtn) deleteBtn.disabled = !state.currentItemId;
}

function renderItemPreview(ctx, state) {
  const titleEl = document.getElementById('item-preview-title');
  const subtitleEl = document.getElementById('item-preview-subtitle');
  const body = document.getElementById('item-preview-body');
  const badge = document.getElementById('item-preview-collection');
  if (!titleEl || !subtitleEl || !body || !badge) return;

  const snapshot = state.snapshot || {};
  const clear = getClear(ctx);
  clear(body);
  badge.textContent = state.currentCollectionName || '—';

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
  subtitleEl.textContent = `${(state.currentCollectionName || '').slice(0, -1)} · ${item.id}`;

  const fields = PREVIEW_FIELDS[state.currentCollectionName];
  if (!fields) {
    renderPreviewRow(ctx, body, snapshot, 'Details', JSON.stringify(item, null, 2), 'code');
    return;
  }

  fields.forEach(field => {
    const value = item[field.key];
    renderPreviewRow(ctx, body, snapshot, field.label, value, field.type, field.ref);
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
        getLabelForItem(a).localeCompare(getLabelForItem(b), undefined, {
          sensitivity: 'base'
        })
      )
      .map(text => text.id);

    renderPreviewRow(ctx, body, snapshot, 'Child texts', children, 'idList', 'texts');
  }
}

function renderItemEditor(ctx, tab, state) {
  const collName = state.currentCollectionName;
  const snapshot = state.snapshot || {};
  const coll = snapshot[collName] || [];
  const editor = document.getElementById('item-editor');
  const deleteBtn = document.getElementById('btn-delete-item');

  if (!editor) return;

  if (!state.currentItemId) {
    tab.__state.isPopulatingEditor = true;
    editor.value = '';
    tab.__state.isPopulatingEditor = false;
    editor.disabled = coll.length === 0;
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  const item = coll.find(it => it.id === state.currentItemId);
  if (!item) {
    tab.__state.isPopulatingEditor = true;
    editor.value = '';
    tab.__state.isPopulatingEditor = false;
    editor.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  editor.disabled = false;
  if (deleteBtn) deleteBtn.disabled = false;
  tab.__state.isPopulatingEditor = true;
  editor.value = JSON.stringify(item, null, 2);
  tab.__state.isPopulatingEditor = false;
}

function renderCollectionsTab(ctx, tab) {
  const state = getState(ctx);
  const collectionNames = getCollectionNames(ctx);
  const collectionName =
    collectionNames.includes(state.currentCollectionName) && state.currentCollectionName
      ? state.currentCollectionName
      : collectionNames[0] || state.currentCollectionName || 'entities';

  if (collectionName !== state.currentCollectionName) {
    applyState(ctx, prev => ({ ...prev, currentCollectionName: collectionName }));
  }

  const select = document.getElementById('collection-select');
  if (select && select.value !== collectionName) {
    select.value = collectionName;
  }

  renderCollectionList(ctx, tab, { ...state, currentCollectionName: collectionName });
  renderItemPreview(ctx, { ...state, currentCollectionName: collectionName });
  renderItemEditor(ctx, tab, { ...state, currentCollectionName: collectionName });
  updateNavigationButtons(getNavigation(state));
}

function ensureCollectionsTabActive(ctx) {
  const actions = getActions(ctx);
  if (typeof actions.activateTab === 'function') {
    actions.activateTab('collections');
    return;
  }
  const btn = document.querySelector('.tab[data-tab="collections"]');
  if (btn) btn.click();
}

function setCollectionAndItem(ctx, tab, collectionName, itemId, options = {}) {
  const { addToHistory = true, fromHistory = false } = options;
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const DomainService = getDomainService(ctx);
  const collectionNames = getCollectionNames(ctx);

  if (!collectionNames.includes(collectionName)) {
    ctx.setStatus?.('Unknown collection: ' + collectionName);
    return null;
  }

  const coll = snapshot[collectionName] || [];
  const foundItem = itemId ? coll.find(it => it.id === itemId) : null;
  const collectionsWithMovementId = getCollectionsWithMovementId(ctx);
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

  const navigation = getNavigation(state);
  const nextNavigation =
    addToHistory && foundItem && !fromHistory
      ? pushNavigation(navigation, collectionName, foundItem.id)
      : navigation;

  const nextState = {
    ...state,
    snapshot,
    currentCollectionName: collectionName,
    currentItemId: foundItem ? foundItem.id : null,
    navigation: nextNavigation
  };

  applyState(ctx, nextState);
  if (DomainService && typeof DomainService.ensureAllCollections === 'function') {
    DomainService.ensureAllCollections(snapshot);
  }
  tab.render?.(ctx);
  return nextState;
}

function jumpToReferencedItem(ctx, tab, collectionName, itemId) {
  if (!collectionName || !itemId) return null;
  const actions = getActions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};

  if (collectionName === 'movements') {
    actions.selectMovement?.(itemId);
    actions.activateTab?.('dashboard');
    return null;
  }

  const coll = snapshot[collectionName];
  if (!Array.isArray(coll)) {
    ctx.setStatus?.('Unknown collection: ' + collectionName);
    return null;
  }
  const exists = coll.find(it => it.id === itemId);
  if (!exists) {
    ctx.setStatus?.('Referenced item not found');
    return null;
  }
  ensureCollectionsTabActive(ctx);
  return tab.setCollectionAndItem?.(ctx, collectionName, itemId);
}

function addNewItem(ctx, tab) {
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;

  if (!DomainService?.addNewItem) {
    ctx.setStatus?.('Collections domain service unavailable');
    return;
  }

  let skeleton = null;
  try {
    skeleton = DomainService.addNewItem(snapshot, collName, state.currentMovementId);
  } catch (err) {
    window.alert?.(err?.message || String(err));
    return;
  }
  if (!skeleton) return;

  const navigation = pushNavigation(state.navigation, collName, skeleton.id);
  const nextState = {
    ...state,
    snapshot,
    currentItemId: skeleton.id,
    navigation
  };
  applyState(ctx, nextState);
  const store = getStore(ctx);
  store?.markDirty?.('snapshot');
  store?.saveSnapshot?.({ show: false, clearMovementDirty: false, clearItemDirty: true });
  ctx.setStatus?.('New item created');
  tab.render?.(ctx);
}

function saveCurrentItem(ctx, tab, options = {}) {
  const { persist = true } = options;
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName];
  const editor = document.getElementById('item-editor');

  if (!Array.isArray(coll)) {
    window.alert?.('Unknown collection: ' + collName);
    return false;
  }
  if (!DomainService?.upsertItem) {
    ctx.setStatus?.('Collections domain service unavailable');
    return false;
  }
  if (!editor) return false;

  const raw = editor.value.trim();
  if (!raw) {
    window.alert?.('Editor is empty. Nothing to save.');
    return false;
  }

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    window.alert?.('Invalid JSON: ' + e.message);
    return false;
  }

  if (!obj.id) {
    window.alert?.('Object must have an "id" field.');
    return false;
  }

  try {
    DomainService?.upsertItem(snapshot, collName, obj);
  } catch (e) {
    window.alert?.(e?.message || String(e));
    return false;
  }

  const navigation = pushNavigation(state.navigation, collName, obj.id);
  const nextState = {
    ...state,
    snapshot,
    currentItemId: obj.id,
    navigation
  };
  applyState(ctx, nextState);
  if (persist) {
    const store = getStore(ctx);
    store?.saveSnapshot?.({ clearItemDirty: true, clearMovementDirty: false });
  } else {
    const store = getStore(ctx);
    store?.markSaved?.({ item: true });
    store?.markDirty?.('snapshot');
  }
  tab.render?.(ctx);
  return true;
}

function deleteCurrentItem(ctx, tab) {
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName];

  if (!Array.isArray(coll) || !state.currentItemId) return;

  const item = coll.find(it => it.id === state.currentItemId);
  const label = getLabelForItem(item);
  const ok = window.confirm(
    `Delete this ${collName.slice(0, -1)}?\n\n${label}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  try {
    if (DomainService?.deleteItem) {
      DomainService.deleteItem(snapshot, collName, state.currentItemId);
    } else {
      snapshot[collName] = coll.filter(it => it.id !== state.currentItemId);
    }
  } catch (e) {
    window.alert?.(e?.message || String(e));
    return;
  }

  const navigation = pruneNavigation(state.navigation, collName, state.currentItemId);
  const nextState = {
    ...state,
    snapshot,
    currentItemId: null,
    navigation
  };
  applyState(ctx, nextState);
  const store = getStore(ctx);
  store?.markDirty?.('snapshot');
  store?.saveSnapshot?.({ clearItemDirty: true, clearMovementDirty: false });
  tab.render?.(ctx);
}

function navigateHistory(ctx, tab, direction) {
  const state = getState(ctx);
  const nav = getNavigation(state);
  if (!nav.stack.length) return;
  const target = nav.index + direction;
  if (target < 0 || target >= nav.stack.length) return;
  const destination = nav.stack[target];
  const nextNav = { ...nav, index: target };
  applyState(ctx, { ...state, navigation: nextNav });
  tab.setCollectionAndItem?.(ctx, destination.collectionName, destination.itemId, {
    addToHistory: false,
    fromHistory: true
  });
}

export function registerCollectionsTab(ctx) {
  const tab = {
    __handlers: null,
    __state: { isPopulatingEditor: false },
    mount(context) {
      const select = document.getElementById('collection-select');
      const filterCheckbox = document.getElementById('collection-filter-by-movement');
      const addBtn = document.getElementById('btn-add-item');
      const deleteBtn = document.getElementById('btn-delete-item');
      const saveBtn = document.getElementById('btn-save-item');
      const navBack = document.getElementById('btn-preview-back');
      const navForward = document.getElementById('btn-preview-forward');
      const editor = document.getElementById('item-editor');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'collections') return;
        rerender();
      };

      const handleSelectChange = e =>
        tab.setCollectionAndItem?.(context, e.target.value, null, { addToHistory: false });
      const handleFilterChange = rerender;
      const handleAdd = () => tab.addNewItem?.(context);
      const handleDelete = () => tab.deleteCurrentItem?.(context);
      const handleSave = () => tab.saveCurrentItem?.(context);
      const handleNavBack = () => tab.navigateHistory?.(context, -1);
      const handleNavForward = () => tab.navigateHistory?.(context, 1);
      const handleEditorInput = () => {
        if (tab.__state.isPopulatingEditor) return;
        context.store?.markDirty?.('item');
      };

      if (select) select.addEventListener('change', handleSelectChange);
      if (filterCheckbox) filterCheckbox.addEventListener('change', handleFilterChange);
      if (addBtn) addBtn.addEventListener('click', handleAdd);
      if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
      if (saveBtn) saveBtn.addEventListener('click', handleSave);
      if (navBack) navBack.addEventListener('click', handleNavBack);
      if (navForward) navForward.addEventListener('click', handleNavForward);
      if (editor) editor.addEventListener('input', handleEditorInput);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        select,
        filterCheckbox,
        addBtn,
        deleteBtn,
        saveBtn,
        navBack,
        navForward,
        editor,
        handleSelectChange,
        handleFilterChange,
        handleAdd,
        handleDelete,
        handleSave,
        handleNavBack,
        handleNavForward,
        handleEditorInput,
        rerender,
        unsubscribe
      };
    },
    render(context) {
      renderCollectionsTab(context, tab);
    },
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.select) h.select.removeEventListener('change', h.handleSelectChange);
      if (h.filterCheckbox) h.filterCheckbox.removeEventListener('change', h.handleFilterChange);
      if (h.addBtn) h.addBtn.removeEventListener('click', h.handleAdd);
      if (h.deleteBtn) h.deleteBtn.removeEventListener('click', h.handleDelete);
      if (h.saveBtn) h.saveBtn.removeEventListener('click', h.handleSave);
      if (h.navBack) h.navBack.removeEventListener('click', h.handleNavBack);
      if (h.navForward) h.navForward.removeEventListener('click', h.handleNavForward);
      if (h.editor) h.editor.removeEventListener('input', h.handleEditorInput);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
      this.__state.isPopulatingEditor = false;
    },
    setCollectionAndItem: (context, collectionName, itemId, options) =>
      setCollectionAndItem(context, tab, collectionName, itemId, options),
    jumpToReferencedItem: (context, collectionName, itemId) =>
      jumpToReferencedItem(context, tab, collectionName, itemId),
    addNewItem: context => addNewItem(context, tab),
    saveCurrentItem: (context, options) => saveCurrentItem(context, tab, options),
    deleteCurrentItem: context => deleteCurrentItem(context, tab),
    navigateHistory: (context, direction) => navigateHistory(context, tab, direction)
  };

  movementEngineerGlobal.tabs.collections = tab;
  if (ctx?.tabs) {
    ctx.tabs.collections = tab;
  }
  if (ctx) {
    ctx.actions = ctx.actions || {};
    ctx.actions.setCollectionAndItem = (collectionName, itemId, options) =>
      tab.setCollectionAndItem(ctx, collectionName, itemId, options);
    ctx.actions.jumpToReferencedItem = (collectionName, itemId) =>
      tab.jumpToReferencedItem(ctx, collectionName, itemId);
    ctx.actions.navigateCollectionHistory = direction =>
      tab.navigateHistory(ctx, direction);
  }

  return tab;
}
