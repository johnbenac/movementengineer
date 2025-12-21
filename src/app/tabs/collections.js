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

function getServices(ctx) {
  const services = ctx?.services || {};
  return {
    DomainService: services.DomainService || window.DomainService,
    StorageService: services.StorageService || window.StorageService
  };
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
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

function isMovementFilterEnabled() {
  const filterCheckbox = document.getElementById('collection-filter-by-movement');
  return Boolean(filterCheckbox && filterCheckbox.checked);
}

function renderPreviewValue(container, value, type, refCollection, snapshot, jumpAction) {
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
      if (refCollection && jumpAction) {
        chip.addEventListener('click', () => jumpAction(refCollection, value));
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
        if (refCollection && jumpAction) {
          chip.addEventListener('click', () => jumpAction(refCollection, id));
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

function renderPreviewRow(container, label, value, type, refCollection, snapshot, jumpAction) {
  const row = document.createElement('div');
  row.className = 'preview-row';
  const lbl = document.createElement('div');
  lbl.className = 'preview-label';
  lbl.textContent = label;
  const val = document.createElement('div');
  val.className = 'preview-value';
  renderPreviewValue(val, value, type, refCollection, snapshot, jumpAction);
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

let isPopulatingEditor = false;

function renderCollectionList(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const currentMovementId = state.currentMovementId;
  const currentCollectionName = state.currentCollectionName || 'entities';
  const currentItemId = state.currentItemId;
  const collectionsWithMovement = window.DomainService?.COLLECTIONS_WITH_MOVEMENT_ID;

  const select = document.getElementById('collection-select');
  const list = document.getElementById('collection-items');
  const deleteBtn = document.getElementById('btn-delete-item');
  if (select && select.value !== currentCollectionName) {
    select.value = currentCollectionName;
  }
  if (!list) return;

  clear(list);

  const coll = snapshot[currentCollectionName] || [];
  const filterByMovement =
    isMovementFilterEnabled() &&
    currentMovementId &&
    collectionsWithMovement &&
    collectionsWithMovement.has(currentCollectionName);

  const items = filterByMovement
    ? coll.filter(item => item.movementId === currentMovementId)
    : coll;

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
    if (item.id === currentItemId) li.classList.add('selected');
    const primary = document.createElement('span');
    primary.textContent = getLabelForItem(item);
    const secondary = document.createElement('span');
    secondary.className = 'secondary';
    secondary.textContent = item.id;
    li.appendChild(primary);
    li.appendChild(secondary);
    list.appendChild(li);
  });

  if (deleteBtn) deleteBtn.disabled = !currentItemId;
}

function renderItemPreview(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const currentCollectionName = state.currentCollectionName || 'entities';
  const currentMovementId = state.currentMovementId;
  const currentItemId = state.currentItemId;
  const navigation = state.navigation || {};
  const navigationStack = Array.isArray(navigation.stack) ? navigation.stack : [];
  const navigationIndex = typeof navigation.index === 'number' ? navigation.index : -1;
  const actions = getActions(ctx);

  const titleEl = document.getElementById('item-preview-title');
  const subtitleEl = document.getElementById('item-preview-subtitle');
  const body = document.getElementById('item-preview-body');
  const badge = document.getElementById('item-preview-collection');
  const backBtn = document.getElementById('btn-preview-back');
  const fwdBtn = document.getElementById('btn-preview-forward');

  if (!titleEl || !subtitleEl || !body || !badge) return;

  clear(body);
  badge.textContent = currentCollectionName;

  if (backBtn) backBtn.disabled = navigationIndex <= 0;
  if (fwdBtn) fwdBtn.disabled = navigationIndex < 0 || navigationIndex >= navigationStack.length - 1;

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

  const jumpAction =
    typeof actions.jumpToReferencedItem === 'function'
      ? actions.jumpToReferencedItem
      : null;

  fields.forEach(field => {
    const value = item[field.key];
    renderPreviewRow(body, field.label, value, field.type, field.ref, snapshot, jumpAction);
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

    renderPreviewRow(body, 'Child texts', children, 'idList', 'texts', snapshot, jumpAction);
  }
}

function renderItemEditor(ctx) {
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const currentCollectionName = state.currentCollectionName || 'entities';
  const currentItemId = state.currentItemId;
  const editor = document.getElementById('item-editor');
  const deleteBtn = document.getElementById('btn-delete-item');

  if (!editor) return;

  const coll = snapshot[currentCollectionName] || [];
  if (!currentItemId) {
    isPopulatingEditor = true;
    editor.value = '';
    isPopulatingEditor = false;
    editor.disabled = coll.length === 0;
    if (deleteBtn) deleteBtn.disabled = true;
    renderItemPreview(ctx);
    return;
  }

  const item = coll.find(it => it.id === currentItemId);
  if (!item) {
    isPopulatingEditor = true;
    editor.value = '';
    isPopulatingEditor = false;
    editor.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    renderItemPreview(ctx);
    return;
  }

  editor.disabled = false;
  if (deleteBtn) deleteBtn.disabled = false;
  isPopulatingEditor = true;
  editor.value = JSON.stringify(item, null, 2);
  isPopulatingEditor = false;
  renderItemPreview(ctx);
}

function renderCollectionsTab(ctx) {
  renderCollectionList(ctx);
  renderItemEditor(ctx);
}

function selectCollection(ctx, collectionName) {
  const actions = getActions(ctx);
  if (typeof actions.setCollectionAndItem === 'function') {
    actions.setCollectionAndItem(collectionName, null, { addToHistory: false });
    return;
  }
  const state = getState(ctx);
  if (!state) return;
  const nextState = { ...state, currentCollectionName: collectionName, currentItemId: null };
  if (typeof ctx.setState === 'function') {
    ctx.setState(nextState);
  } else if (ctx.store?.setState) {
    ctx.store.setState(nextState);
  }
}

function selectItem(ctx, collectionName, itemId) {
  const actions = getActions(ctx);
  if (typeof actions.setCollectionAndItem === 'function') {
    actions.setCollectionAndItem(collectionName, itemId);
    return;
  }
  const state = getState(ctx);
  if (!state) return;
  const nextState = { ...state, currentCollectionName: collectionName, currentItemId: itemId };
  if (typeof ctx.setState === 'function') {
    ctx.setState(nextState);
  } else if (ctx.store?.setState) {
    ctx.store.setState(nextState);
  }
}

function handleAddItem(ctx) {
  const actions = getActions(ctx);
  if (typeof actions.addCollectionItem === 'function') {
    actions.addCollectionItem();
    return;
  }
  const { DomainService, StorageService } = getServices(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  if (!DomainService || !DomainService.addNewItem || !snapshot) return;
  try {
    const skeleton = DomainService.addNewItem(
      snapshot,
      state.currentCollectionName,
      state.currentMovementId
    );
    if (typeof ctx.setState === 'function') {
      ctx.setState({ ...state, snapshot, currentItemId: skeleton.id });
    } else if (ctx.store?.setState) {
      ctx.store.setState({ ...state, snapshot, currentItemId: skeleton.id });
    }
    if (typeof actions.setCollectionAndItem === 'function') {
      actions.setCollectionAndItem(state.currentCollectionName, skeleton.id);
    }
    actions.saveSnapshot?.({ show: false });
    if (!actions.saveSnapshot && StorageService?.saveSnapshot) {
      StorageService.saveSnapshot(snapshot);
      ctx?.legacy?.markSaved?.({ item: true });
    }
    ctx.setStatus?.('New item created');
  } catch (err) {
    window.alert(err?.message || 'Failed to add item');
  }
}

function handleDeleteItem(ctx) {
  const actions = getActions(ctx);
  if (typeof actions.deleteCollectionItem === 'function') {
    actions.deleteCollectionItem();
    return;
  }
  const { DomainService, StorageService } = getServices(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const collName = state.currentCollectionName;
  const currentItemId = state.currentItemId;
  if (!DomainService?.deleteItem || !snapshot || !collName || !currentItemId) return;
  const coll = snapshot[collName] || [];
  const item = coll.find(it => it.id === currentItemId);
  const label = getLabelForItem(item);
  const ok = window.confirm(
    `Delete this ${collName.slice(0, -1)}?\n\n${label}\n\nThis cannot be undone.`
  );
  if (!ok) return;
  try {
    DomainService.deleteItem(snapshot, collName, currentItemId);
  } catch (err) {
    window.alert(err?.message || 'Delete failed');
    return;
  }
  if (typeof ctx.setState === 'function') {
    ctx.setState({ ...state, snapshot, currentItemId: null });
  } else if (ctx.store?.setState) {
    ctx.store.setState({ ...state, snapshot, currentItemId: null });
  }
  actions.saveSnapshot?.();
  if (!actions.saveSnapshot && StorageService?.saveSnapshot) {
    StorageService.saveSnapshot(snapshot);
    ctx?.legacy?.markSaved?.({ item: true });
  }
  ctx.setStatus?.('Item deleted');
}

function handleSaveItem(ctx) {
  const actions = getActions(ctx);
  if (typeof actions.saveCollectionItem === 'function') {
    actions.saveCollectionItem();
    return;
  }
  const { DomainService, StorageService } = getServices(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const collName = state.currentCollectionName;
  if (!DomainService?.upsertItem || !snapshot || !collName) return;

  const editor = document.getElementById('item-editor');
  if (!editor) return;
  const raw = editor.value.trim();
  if (!raw) {
    window.alert('Editor is empty. Nothing to save.');
    return;
  }

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (err) {
    window.alert('Invalid JSON: ' + (err?.message || err));
    return;
  }

  if (!obj.id) {
    window.alert('Object must have an "id" field.');
    return;
  }

  try {
    DomainService.upsertItem(snapshot, collName, obj);
  } catch (err) {
    window.alert(err?.message || 'Save failed');
    return;
  }

  const nextState = { ...state, snapshot, currentItemId: obj.id };
  if (typeof ctx.setState === 'function') {
    ctx.setState(nextState);
  } else if (ctx.store?.setState) {
    ctx.store.setState(nextState);
  }

  if (typeof actions.setCollectionAndItem === 'function') {
    actions.setCollectionAndItem(collName, obj.id);
  }
  actions.saveSnapshot?.({ clearItemDirty: true });
  if (!actions.saveSnapshot && StorageService?.saveSnapshot) {
    StorageService.saveSnapshot(snapshot);
    ctx?.legacy?.markSaved?.({ item: true });
  }
  ctx.setStatus?.('Item saved');
}

export function registerCollectionsTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const select = document.getElementById('collection-select');
      const movementFilter = document.getElementById('collection-filter-by-movement');
      const list = document.getElementById('collection-items');
      const addBtn = document.getElementById('btn-add-item');
      const deleteBtn = document.getElementById('btn-delete-item');
      const saveBtn = document.getElementById('btn-save-item');
      const navBack = document.getElementById('btn-preview-back');
      const navForward = document.getElementById('btn-preview-forward');
      const itemEditor = document.getElementById('item-editor');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'collections') return;
        rerender();
      };

      const handleSelectChange = event => {
        selectCollection(context, event.target.value);
      };

      const handleListClick = event => {
        const target = event.target?.closest('li[data-id]');
        if (!target) return;
        const state = getState(context);
        const collectionName = state.currentCollectionName || 'entities';
        selectItem(context, collectionName, target.dataset.id);
      };

      const handleMovementFilterChange = () => rerender();

      const handleNav = direction => {
        const actions = getActions(context);
        if (typeof actions.navigateCollectionHistory === 'function') {
          actions.navigateCollectionHistory(direction);
        }
      };

      const handleEditorInput = () => {
        if (isPopulatingEditor) return;
        context?.legacy?.markDirty?.('item');
      };

      const handleAdd = () => handleAddItem(context);
      const handleDelete = () => handleDeleteItem(context);
      const handleSave = () => handleSaveItem(context);
      const handleNavBack = () => handleNav(-1);
      const handleNavForward = () => handleNav(1);

      if (select) select.addEventListener('change', handleSelectChange);
      if (movementFilter) movementFilter.addEventListener('change', handleMovementFilterChange);
      if (list) list.addEventListener('click', handleListClick);
      if (addBtn) addBtn.addEventListener('click', handleAdd);
      if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
      if (saveBtn) saveBtn.addEventListener('click', handleSave);
      if (navBack) navBack.addEventListener('click', handleNavBack);
      if (navForward) navForward.addEventListener('click', handleNavForward);
      if (itemEditor) itemEditor.addEventListener('input', handleEditorInput);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        select,
        movementFilter,
        list,
        addBtn,
        deleteBtn,
        saveBtn,
        navBack,
        navForward,
        itemEditor,
        handleSelectChange,
        handleMovementFilterChange,
        handleListClick,
        handleNavBack,
        handleNavForward,
        handleAdd,
        handleDelete,
        handleSave,
        handleEditorInput,
        rerender,
        unsubscribe
      };
    },
    render: renderCollectionsTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.select) h.select.removeEventListener('change', h.handleSelectChange);
      if (h.movementFilter) {
        h.movementFilter.removeEventListener('change', h.handleMovementFilterChange);
      }
      if (h.list) h.list.removeEventListener('click', h.handleListClick);
      if (h.addBtn && h.handleAdd) h.addBtn.removeEventListener('click', h.handleAdd);
      if (h.deleteBtn && h.handleDelete) h.deleteBtn.removeEventListener('click', h.handleDelete);
      if (h.saveBtn && h.handleSave) h.saveBtn.removeEventListener('click', h.handleSave);
      if (h.navBack && h.handleNavBack) h.navBack.removeEventListener('click', h.handleNavBack);
      if (h.navForward && h.handleNavForward) {
        h.navForward.removeEventListener('click', h.handleNavForward);
      }
      if (h.itemEditor) h.itemEditor.removeEventListener('input', h.handleEditorInput);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      isPopulatingEditor = false;
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.collections = tab;
  if (ctx?.tabs) {
    ctx.tabs.collections = tab;
  }
  return tab;
}
