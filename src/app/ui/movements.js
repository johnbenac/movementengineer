const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
const UI_KEY = '__movementsUI';

function fallbackClearElement(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function createSidebarFallback() {
  const layout = document.querySelector('.layout') || document.querySelector('main') || document.body;
  const sidebar = document.createElement('aside');
  sidebar.id = 'movement-sidebar';
  sidebar.className = 'sidebar';

  const header = document.createElement('div');
  header.className = 'sidebar-header';
  const title = document.createElement('h2');
  title.textContent = 'Movements';
  const addBtn = document.createElement('button');
  addBtn.id = 'btn-add-movement';
  addBtn.title = 'Create a new movement';
  addBtn.textContent = '+';
  header.appendChild(title);
  header.appendChild(addBtn);
  sidebar.appendChild(header);

  const list = document.createElement('ul');
  list.id = 'movement-list';
  list.className = 'item-list';
  sidebar.appendChild(list);

  layout.insertBefore(sidebar, layout.firstChild);

  return sidebar;
}

function createMovementFormFallback() {
  const content = document.querySelector('.content') || document.querySelector('main') || document.body;
  const card = document.createElement('section');
  card.className = 'card movement-form-card';

  const heading = document.createElement('h2');
  heading.textContent = 'Movement details';
  card.appendChild(heading);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Choose a movement in the sidebar, then edit its core fields here.';
  card.appendChild(hint);

  const form = document.createElement('form');
  form.id = 'movement-form';
  form.autocomplete = 'off';

  form.innerHTML = `
    <div class="form-row">
      <label>ID</label>
      <span id="movement-id-label" class="code-pill">—</span>
    </div>
    <div class="form-row">
      <label for="movement-name">Name</label>
      <input id="movement-name" type="text" required />
    </div>
    <div class="form-row">
      <label for="movement-shortName">Short name</label>
      <input id="movement-shortName" type="text" />
    </div>
    <div class="form-row">
      <label for="movement-summary">Summary</label>
      <textarea id="movement-summary" rows="4"></textarea>
    </div>
    <div class="form-row">
      <label for="movement-tags">Tags (comma‑separated)</label>
      <input id="movement-tags" type="text" placeholder="test, upside, etc." />
    </div>
    <div class="form-actions">
      <button id="btn-save-movement" type="button">Save movement</button>
      <button id="btn-import-from-github" type="button">Load markdown repo</button>
      <button id="btn-export-repo" type="button">Export markdown zip</button>
      <button id="btn-delete-movement" type="button" class="danger">Delete movement & related data</button>
    </div>
  `;

  card.appendChild(form);
  content.insertBefore(card, content.firstChild);

  return form;
}

function cloneSnapshot(prevSnapshot = {}) {
  const movements = Array.isArray(prevSnapshot.movements)
    ? prevSnapshot.movements.map(movement => ({ ...(movement || {}) }))
    : [];
  return { ...prevSnapshot, movements };
}

function ensureSnapshot(snapshot) {
  const movements = Array.isArray(snapshot?.movements) ? snapshot.movements : [];
  return { ...(snapshot || {}), movements };
}

function stripEventListeners(el) {
  if (!el || typeof el.cloneNode !== 'function') return el;
  const clone = el.cloneNode(true);
  el.replaceWith(clone);
  return clone;
}

function generateId(prefix = 'mov-') {
  const DomainService = getDomainService({});
  if (DomainService?.generateId) {
    try {
      const generated = DomainService.generateId(prefix);
      if (generated) return generated;
    } catch (err) {
      // ignore and fallback
    }
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

export function initMovements(ctx, options = {}) {
  if (movementEngineerGlobal[UI_KEY]) return movementEngineerGlobal[UI_KEY];

  const dom = ctx?.dom || {};
  const clearElement = dom.clearElement || fallbackClearElement;

  const selectors = {
    root: options.rootSelector || '#movement-sidebar',
    list: options.listSelector || '#movement-list',
    form: options.formSelector || '#movement-form'
  };

  let rootEl = document.querySelector(selectors.root);
  if (!rootEl) {
    rootEl = createSidebarFallback();
  }

  let listEl = rootEl ? rootEl.querySelector(selectors.list) : null;
  if (!listEl && rootEl) {
    listEl = document.createElement('ul');
    listEl.id = selectors.list.replace('#', '');
    listEl.className = 'item-list';
    rootEl.appendChild(listEl);
  }

  let formEl = document.querySelector(selectors.form);
  if (!formEl) {
    formEl = createMovementFormFallback();
  }

  listEl = stripEventListeners(listEl);

  const idLabel = document.getElementById('movement-id-label');
  let nameInput = document.getElementById('movement-name');
  let shortInput = document.getElementById('movement-shortName');
  let summaryInput = document.getElementById('movement-summary');
  let tagsInput = document.getElementById('movement-tags');
  let deleteBtn = document.getElementById('btn-delete-movement');
  let saveBtn = document.getElementById('btn-save-movement');
  let addBtn = document.getElementById('btn-add-movement');

  nameInput = stripEventListeners(nameInput);
  shortInput = stripEventListeners(shortInput);
  summaryInput = stripEventListeners(summaryInput);
  tagsInput = stripEventListeners(tagsInput);
  deleteBtn = stripEventListeners(deleteBtn);
  saveBtn = stripEventListeners(saveBtn);
  addBtn = stripEventListeners(addBtn);

  const movementFormNodes = [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn];

  let rafId = null;
  let latestState = ctx?.getState?.() || {};
  let lastRenderKey = null;
  let isPopulatingForm = false;

  function setInputsDisabled(isDisabled) {
    movementFormNodes.forEach(node => {
      if (!node) return;
      node.disabled = isDisabled;
    });
  }

  function sanitizeMovementFromForm() {
    const name = (nameInput?.value || '').trim() || 'Untitled movement';
    const shortName = (shortInput?.value || '').trim() || name;
    const summary = (summaryInput?.value || '').trim();
    const tags = (tagsInput?.value || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    return { name, shortName, summary, tags };
  }

  function renderMovementList(snapshot, currentMovementId) {
    if (!listEl) return;
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    clearElement(listEl);

    if (!movements.length) {
      const li = document.createElement('li');
      li.textContent = 'No movements yet. Click + to add one.';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      listEl.appendChild(li);
      return;
    }

    movements.forEach(movement => {
      const li = document.createElement('li');
      li.dataset.movementId = movement.id;
      li.dataset.id = movement.id;
      const isActive = movement.id === currentMovementId;
      li.className = isActive ? 'selected active' : '';
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
      const primary = document.createElement('span');
      primary.textContent = movement.name || movement.id;
      const secondary = document.createElement('span');
      secondary.className = 'secondary';
      secondary.textContent = movement.shortName || '';
      li.appendChild(primary);
      li.appendChild(secondary);
      listEl.appendChild(li);
    });
  }

  function renderMovementForm(snapshot, currentMovementId) {
    if (!formEl) return;

    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const movement = movements.find(m => m.id === currentMovementId) || null;

    if (!movement || !currentMovementId) {
      if (idLabel) idLabel.textContent = '—';
      if (nameInput) nameInput.value = '';
      if (shortInput) shortInput.value = '';
      if (summaryInput) summaryInput.value = '';
      if (tagsInput) tagsInput.value = '';
      setInputsDisabled(true);
      formEl.classList.toggle('empty', true);
      return;
    }

    setInputsDisabled(false);
    formEl.classList.toggle('empty', false);

    isPopulatingForm = true;
    if (idLabel) idLabel.textContent = movement.id || '—';
    if (nameInput) nameInput.value = movement.name || '';
    if (shortInput) shortInput.value = movement.shortName || '';
    if (summaryInput) summaryInput.value = movement.summary || '';
    if (tagsInput) tagsInput.value = Array.isArray(movement.tags) ? movement.tags.join(', ') : '';
    isPopulatingForm = false;
  }

  function render(state = ctx.getState?.()) {
    if (!state) return;
    const snapshot = ensureSnapshot(state.snapshot);
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const currentMovementId = state.currentMovementId || null;
    const selected = movements.find(m => m.id === currentMovementId) || null;
    const keyParts = [
      currentMovementId || '',
      movements.length,
      movements
        .map(m => `${m.id}:${m.name || ''}:${m.shortName || ''}:${(m.tags || []).join(',')}`)
        .join('|'),
      selected?.summary || '',
      state.flags?.movementFormDirty ? 'dirty' : 'clean'
    ];
    const renderKey = keyParts.join('||');
    if (renderKey === lastRenderKey) return;
    lastRenderKey = renderKey;

    renderMovementList(snapshot, currentMovementId);
    renderMovementForm(snapshot, currentMovementId);
  }

  function scheduleRender(nextState) {
    latestState = nextState || latestState;
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      render(latestState);
    });
  }

  function selectMovement(movementId) {
    if (!movementId) {
      ctx?.store?.setState?.(prev => ({ ...prev, currentMovementId: null }));
      return;
    }
    ctx?.actions?.selectMovement?.(movementId);
  }

  function updateMovementFromForm() {
    if (!ctx?.store?.setState) return;
    const updates = sanitizeMovementFromForm();
    const DomainService = getDomainService(ctx);

    let didUpdate = false;
    ctx.store.setState(prev => {
      const snapshot = cloneSnapshot(prev.snapshot);
      const currentMovementId = prev.currentMovementId;
      if (!currentMovementId) return prev;
      if (DomainService?.updateMovement) {
        const updated = DomainService.updateMovement(snapshot, currentMovementId, updates);
        if (!updated) return prev;
        didUpdate = true;
      } else {
        const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
        const idx = movements.findIndex(m => m?.id === currentMovementId);
        if (idx === -1) return prev;
        const nextMovement = { ...movements[idx], ...updates, movementId: movements[idx].id };
        snapshot.movements = movements.slice();
        snapshot.movements[idx] = nextMovement;
        didUpdate = true;
      }
      return { ...prev, snapshot };
    });
    if (didUpdate) {
      ctx?.store?.markDirty?.('movement');
    }
  }

  function handleInputChange() {
    if (isPopulatingForm) return;
    updateMovementFromForm();
  }

  function addMovement() {
    const DomainService = getDomainService(ctx);

    let newMovement = null;
    ctx?.store?.setState?.(prev => {
      const snapshot = cloneSnapshot(prev.snapshot);
      if (DomainService?.addMovement) {
        newMovement = DomainService.addMovement(snapshot);
      } else {
        const id = generateId('mov-');
        newMovement = {
          id,
          movementId: id,
          name: 'New Movement',
          shortName: 'New',
          summary: '',
          notes: null,
          tags: []
        };
        snapshot.movements = Array.isArray(snapshot.movements) ? snapshot.movements.slice() : [];
        snapshot.movements.push(newMovement);
      }
      return { ...prev, snapshot };
    });
    if (newMovement?.id) {
      ctx?.actions?.selectMovement?.(newMovement.id);
    }
    ctx?.store?.markDirty?.('movement');
    ctx?.store?.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
  }

  function deleteMovement() {
    const DomainService = getDomainService(ctx);
    const state = ctx?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const currentMovementId = state.currentMovementId;
    if (!currentMovementId) return;
    const movement =
      Array.isArray(snapshot.movements) && snapshot.movements.find(m => m.id === currentMovementId);
    if (!movement) return;

    const confirmed = window.confirm(
      'Delete this movement AND all data with this movementId?\n\n' +
        (movement.name || movement.id) +
        '\n\nThis cannot be undone.'
    );
    if (!confirmed) return;

    let nextMovementId = null;
    ctx?.store?.setState?.(prev => {
      const cloned = cloneSnapshot(prev.snapshot);
      if (DomainService?.deleteMovement) {
        nextMovementId = DomainService.deleteMovement(cloned, currentMovementId);
      } else {
        cloned.movements = (cloned.movements || []).filter(m => m.id !== currentMovementId);
        nextMovementId = cloned.movements[0] ? cloned.movements[0].id : null;
      }
      return {
        ...prev,
        snapshot: cloned,
        currentMovementId: nextMovementId || null,
        currentItemId: null,
        currentTextId: null,
        currentShelfId: null,
        currentBookId: null,
        navigation: { stack: [], index: -1 }
      };
    });

    if (nextMovementId) {
      ctx?.actions?.selectMovement?.(nextMovementId);
    } else {
      ctx?.actions?.selectMovement?.(null);
    }
    ctx?.store?.markDirty?.('movement');
    ctx?.store?.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
  }

  function saveMovement() {
    updateMovementFromForm();
    ctx?.store?.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
  }

  function onListClick(event) {
    const target = event.target?.closest?.('[data-movement-id]');
    if (!target) return;
    const movementId = target.dataset.movementId;
    if (!movementId) return;
    selectMovement(movementId);
  }

  function destroy() {
    if (rafId) window.cancelAnimationFrame(rafId);
    if (unsubscribe) unsubscribe();
    if (listEl) listEl.removeEventListener('click', onListClick);
    [nameInput, shortInput, summaryInput, tagsInput].forEach(input => {
      input?.removeEventListener('input', handleInputChange);
    });
    saveBtn?.removeEventListener('click', saveMovement);
    deleteBtn?.removeEventListener('click', deleteMovement);
    addBtn?.removeEventListener('click', addMovement);
    movementEngineerGlobal[UI_KEY] = null;
  }

  if (listEl) {
    listEl.addEventListener('click', onListClick);
  }

  [nameInput, shortInput, summaryInput, tagsInput].forEach(input => {
    input?.addEventListener('input', handleInputChange);
  });
  saveBtn?.addEventListener('click', saveMovement);
  deleteBtn?.addEventListener('click', deleteMovement);
  addBtn?.addEventListener('click', addMovement);

  const unsubscribe = ctx?.subscribe ? ctx.subscribe(scheduleRender) : null;
  scheduleRender(latestState);

  const api = { render, destroy, selectMovement, addMovement, deleteMovement };
  movementEngineerGlobal[UI_KEY] = api;
  if (ctx) ctx.movementsUI = api;
  return api;
}
