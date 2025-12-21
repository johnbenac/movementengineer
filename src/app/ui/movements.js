const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
const UI_KEY = '__movementsUI';

function ensureRaf() {
  return window.requestAnimationFrame || (fn => setTimeout(fn, 16));
}

function clearElement(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function ensureSnapshot(prevSnapshot) {
  const snapshot = { ...(prevSnapshot || {}) };
  snapshot.movements = Array.isArray(snapshot.movements) ? [...snapshot.movements] : [];
  return snapshot;
}

function parseTags(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getMovementById(snapshot, id) {
  if (!id) return null;
  const movements = Array.isArray(snapshot?.movements) ? snapshot.movements : [];
  return movements.find(movement => movement?.id === id) || null;
}

function createFallbackMovement(overrides = {}, services = {}) {
  const DomainService = services.DomainService || window.DomainService;
  const generateId =
    DomainService?.generateId ||
    services.DomainService?.generateId ||
    window.crypto?.randomUUID ||
    (() => `mov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  const idGenerator = generateId;
  let id =
    overrides.id ||
    (typeof idGenerator === 'function'
      ? idGenerator === window.crypto?.randomUUID
        ? idGenerator()
        : idGenerator('mov-')
      : idGenerator);
  return {
    id,
    movementId: overrides.movementId || id,
    name: overrides.name || 'New Movement',
    shortName: overrides.shortName || 'New',
    summary: overrides.summary || '',
    notes: overrides.notes || null,
    tags: Array.isArray(overrides.tags) ? overrides.tags : []
  };
}

function findOrCreateSidebarRoot() {
  const existing = document.getElementById('movement-sidebar');
  if (existing) return existing;

  const layout = document.querySelector('main.layout') || document.body;
  const sidebar = document.createElement('aside');
  sidebar.id = 'movement-sidebar';
  sidebar.className = 'sidebar';
  const header = document.createElement('div');
  header.className = 'sidebar-header';
  const h2 = document.createElement('h2');
  h2.textContent = 'Movements';
  const addBtn = document.createElement('button');
  addBtn.id = 'btn-add-movement';
  addBtn.title = 'Create a new movement';
  addBtn.textContent = '+';
  header.appendChild(h2);
  header.appendChild(addBtn);
  const list = document.createElement('ul');
  list.id = 'movement-list';
  list.className = 'item-list';
  sidebar.appendChild(header);
  sidebar.appendChild(list);
  layout.prepend(sidebar);
  return sidebar;
}

function findOrCreateMovementFormRoot() {
  const existing = document.getElementById('movement-form');
  if (existing) return existing;

  const dashboard = document.getElementById('tab-dashboard') || document.body;
  const card = document.createElement('section');
  card.className = 'card movement-form-card';
  const heading = document.createElement('h2');
  heading.textContent = 'Movement details';
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Choose a movement in the sidebar, then edit its core fields here.';
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
      <button id="btn-delete-movement" type="button" class="danger">
        Delete movement & related data
      </button>
    </div>
  `;
  card.appendChild(heading);
  card.appendChild(hint);
  card.appendChild(form);
  dashboard.prepend(card);
  return form;
}

export function initMovements(ctx, options = {}) {
  if (movementEngineerGlobal[UI_KEY]) return movementEngineerGlobal[UI_KEY];
  if (!ctx?.store) throw new Error('Movement UI requires a store on ctx.');

  const raf = ensureRaf();
  const rootEl = findOrCreateSidebarRoot();
  const listEl =
    rootEl.querySelector('#movement-list') ||
    rootEl.querySelector(options.listSelector || '#movement-list');
  const formEl =
    document.querySelector(options.formSelector || '#movement-form') ||
    findOrCreateMovementFormRoot();

  const formRefs = {
    idLabel: formEl.querySelector('#movement-id-label'),
    name: formEl.querySelector('#movement-name'),
    shortName: formEl.querySelector('#movement-shortName'),
    summary: formEl.querySelector('#movement-summary'),
    tags: formEl.querySelector('#movement-tags'),
    deleteBtn: formEl.querySelector('#btn-delete-movement'),
    saveBtn: formEl.querySelector('#btn-save-movement')
  };

  let isPopulatingForm = false;
  let rafId = null;
  let lastRenderKey = null;
  let latestState = ctx.getState?.() || ctx.store.getState?.() || {};

  function setSidebarOpen(open) {
    const body = document.body;
    const toggle = document.getElementById('btn-toggle-sidebar');
    if (!body) return;

    body.classList.toggle('sidebar-open', !!open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function isMobileViewport() {
    return window.matchMedia?.('(max-width: 960px)').matches;
  }

  function syncSidebarToViewport() {
    setSidebarOpen(!isMobileViewport());
  }

  function closeSidebarOnMobile() {
    if (isMobileViewport()) setSidebarOpen(false);
  }

  function renderList(state) {
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const currentMovementId = state.currentMovementId || null;

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
      li.dataset.id = movement.id;
      li.dataset.movementId = movement.id;
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

  function populateForm(state) {
    const snapshot = state.snapshot || {};
    const movement = getMovementById(snapshot, state.currentMovementId);
    const inputs = [
      formRefs.name,
      formRefs.shortName,
      formRefs.summary,
      formRefs.tags,
      formRefs.deleteBtn,
      formRefs.saveBtn
    ].filter(Boolean);

    if (!movement) {
      if (formRefs.idLabel) formRefs.idLabel.textContent = '—';
      inputs.forEach(el => {
        el.value = '';
        el.disabled = true;
      });
      return;
    }

    inputs.forEach(el => {
      el.disabled = false;
    });

    isPopulatingForm = true;
    if (formRefs.idLabel) formRefs.idLabel.textContent = movement.id || '—';
    if (formRefs.name) formRefs.name.value = movement.name || '';
    if (formRefs.shortName) formRefs.shortName.value = movement.shortName || '';
    if (formRefs.summary) formRefs.summary.value = movement.summary || '';
    if (formRefs.tags) formRefs.tags.value = Array.isArray(movement.tags) ? movement.tags.join(', ') : '';
    isPopulatingForm = false;
  }

  function computeRenderKey(state) {
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const movementVersion = movements
      .map(m => `${m?.id}:${m?.name ?? ''}:${m?.shortName ?? ''}:${(m?.tags || []).join(',')}`)
      .join('|');
    return `${movements.length}:${state.currentMovementId || ''}:${movementVersion}:${state.flags?.movementFormDirty ? 'd' : 'c'}`;
  }

  function render(state) {
    const key = computeRenderKey(state);
    if (key === lastRenderKey) return;
    lastRenderKey = key;
    renderList(state);
    populateForm(state);
  }

  function scheduleRender(nextState) {
    latestState = nextState || latestState;
    if (rafId) return;
    rafId = raf(() => {
      rafId = null;
      render(latestState || ctx.getState?.() || {});
    });
  }

  function updateMovementFromForm() {
    if (isPopulatingForm) return;
    const currentState = ctx.getState();
    const snapshot = ensureSnapshot(currentState.snapshot);
    const movementId = currentState.currentMovementId;
    const idx = snapshot.movements.findIndex(m => m?.id === movementId);
    if (idx === -1) return;

    const name = formRefs.name?.value?.trim() || 'Untitled movement';
    const shortName = formRefs.shortName?.value?.trim() || name;
    const summary = formRefs.summary?.value?.trim() || '';
    const tags = parseTags(formRefs.tags?.value);

    const nextMovement = {
      ...snapshot.movements[idx],
      id: movementId,
      movementId: movementId,
      name,
      shortName,
      summary,
      tags
    };

    snapshot.movements[idx] = nextMovement;

    ctx.store.update(prev => ({
      ...prev,
      snapshot
    }));
    ctx.store.markDirty?.('movement');
  }

  function handleSave() {
    updateMovementFromForm();
    ctx.store.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
  }

  function addMovement(overrides = {}) {
    let newMovement = null;
    ctx.store.update(prev => {
      const snapshot = ensureSnapshot(prev.snapshot);
      const DomainService = ctx.services?.DomainService || window.DomainService;
      if (DomainService?.addMovement) {
        newMovement = DomainService.addMovement(snapshot, overrides);
      } else {
        newMovement = createFallbackMovement(overrides, ctx.services || {});
        snapshot.movements.push(newMovement);
      }
      return { ...prev, snapshot };
    });
    if (!newMovement) return null;
    ctx.actions?.selectMovement?.(newMovement.id);
    ctx.store.markDirty?.('movement');
    ctx.store.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
    return newMovement;
  }

  function deleteMovement(movementId) {
    const state = ctx.getState();
    const snapshot = state.snapshot || {};
    const movement = getMovementById(snapshot, movementId);
    if (!movement) return null;

    const confirmed = window.confirm(
      'Delete this movement AND all data with this movementId?\n\n' +
        (movement.name || movement.id) +
        '\n\nThis cannot be undone.'
    );
    if (!confirmed) return null;

    let fallbackId = null;
    ctx.store.update(prev => {
      const nextSnapshot = ensureSnapshot(prev.snapshot);
      const DomainService = ctx.services?.DomainService || window.DomainService;
      if (DomainService?.deleteMovement) {
        fallbackId = DomainService.deleteMovement(nextSnapshot, movementId);
      } else {
        nextSnapshot.movements = nextSnapshot.movements.filter(m => m?.id !== movementId);
        fallbackId = nextSnapshot.movements[0]?.id || null;
      }
      return {
        ...prev,
        snapshot: nextSnapshot,
        currentMovementId: fallbackId,
        currentItemId: null,
        currentTextId: null,
        currentShelfId: null,
        currentBookId: null,
        navigation: { stack: [], index: -1 }
      };
    });

    if (fallbackId) {
      ctx.actions?.selectMovement?.(fallbackId);
    } else {
      scheduleRender(ctx.getState());
    }

    ctx.store.markDirty?.('movement');
    ctx.store.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
    return fallbackId;
  }

  function handleListClick(event) {
    const target = event.target?.closest?.('[data-movement-id]');
    if (!target) return;
    const movementId = target.dataset.movementId || target.dataset.id;
    if (!movementId) return;
    ctx.actions?.selectMovement?.(movementId);
    closeSidebarOnMobile();
  }

  function handleInputChange() {
    if (isPopulatingForm) return;
    updateMovementFromForm();
  }

  function bindEvents() {
    listEl?.addEventListener('click', handleListClick);
    formRefs.name?.addEventListener('input', handleInputChange);
    formRefs.shortName?.addEventListener('input', handleInputChange);
    formRefs.summary?.addEventListener('input', handleInputChange);
    formRefs.tags?.addEventListener('input', handleInputChange);
    formRefs.saveBtn?.addEventListener('click', handleSave);
    formRefs.deleteBtn?.addEventListener('click', () => {
      const state = ctx.getState();
      deleteMovement(state.currentMovementId);
    });

    const addBtn = document.getElementById('btn-add-movement');
    addBtn?.addEventListener('click', () => addMovement());

    const toggleSidebar = document.getElementById('btn-toggle-sidebar');
    toggleSidebar?.addEventListener('click', () => {
      const isOpen = document.body.classList.contains('sidebar-open');
      setSidebarOpen(!isOpen);
    });

    const sidebarScrim = document.getElementById('sidebar-scrim');
    sidebarScrim?.addEventListener('click', () => closeSidebarOnMobile());
    window.addEventListener('resize', syncSidebarToViewport);
    syncSidebarToViewport();
  }

  function destroy() {
    unsubscribe?.();
    listEl?.removeEventListener('click', handleListClick);
    formRefs.name?.removeEventListener('input', handleInputChange);
    formRefs.shortName?.removeEventListener('input', handleInputChange);
    formRefs.summary?.removeEventListener('input', handleInputChange);
    formRefs.tags?.removeEventListener('input', handleInputChange);
    formRefs.saveBtn?.removeEventListener('click', handleSave);
    window.removeEventListener('resize', syncSidebarToViewport);
    movementEngineerGlobal[UI_KEY] = null;
  }

  const unsubscribe = ctx.subscribe ? ctx.subscribe(scheduleRender) : null;
  bindEvents();
  scheduleRender(latestState);

  const api = {
    render: () => render(ctx.getState?.() || {}),
    destroy,
    selectMovement: id => ctx.actions?.selectMovement?.(id),
    addMovement,
    deleteMovement
  };

  movementEngineerGlobal[UI_KEY] = api;
  if (ctx) {
    ctx.movementsUI = api;
  }
  return api;
}
