const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});

function ensureDomUtils(ctx) {
  if (ctx?.dom) return ctx.dom;
  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }
  return {
    clearElement
  };
}

function normalizeMovementFields(formState) {
  const name = formState.name?.trim() || 'Untitled movement';
  const shortName = formState.shortName?.trim() || name;
  const summary = formState.summary?.trim() || '';
  const tags = Array.isArray(formState.tags)
    ? formState.tags
    : (formState.tags || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
  return { name, shortName, summary, tags };
}

export function initMovements(ctx, options = {}) {
  if (movementEngineerGlobal.__movementsUI && !options.force) {
    return movementEngineerGlobal.__movementsUI;
  }
  if (movementEngineerGlobal.__movementsUI && options.force) {
    movementEngineerGlobal.__movementsUI.destroy?.();
    movementEngineerGlobal.__movementsUI = null;
  }

  const dom = ensureDomUtils(ctx);
  const DomainService = ctx?.services?.DomainService || window.DomainService || {};
  const confirmDelete =
    options.confirmDelete ||
    (movement =>
      window.confirm?.(
        'Delete this movement AND all data with this movementId?\n\n' +
          (movement?.name || movement?.id || '') +
          '\n\nThis cannot be undone.'
      ) ?? false);

  let sidebarEl = null;
  let listEl = null;
  let formEl = null;
  let idLabelEl = null;
  let nameInput = null;
  let shortNameInput = null;
  let summaryInput = null;
  let tagsInput = null;
  let deleteBtn = null;
  let saveBtn = null;
  let addBtn = null;
  let pendingState = null;
  let rafId = null;
  let lastRenderKey = '';
  let isPopulatingForm = false;

  function ensureSidebar() {
    if (sidebarEl && document.contains(sidebarEl)) return sidebarEl;
    sidebarEl = document.getElementById('movement-sidebar');
    if (!sidebarEl) {
      sidebarEl = document.createElement('aside');
      sidebarEl.id = 'movement-sidebar';
      sidebarEl.className = 'sidebar';
      const header = document.createElement('div');
      header.className = 'sidebar-header';
      const title = document.createElement('h2');
      title.textContent = 'Movements';
      addBtn = document.createElement('button');
      addBtn.id = 'btn-add-movement';
      addBtn.title = 'Create a new movement';
      addBtn.textContent = '+';
      header.appendChild(title);
      header.appendChild(addBtn);
      sidebarEl.appendChild(header);
      const main = document.querySelector('main.layout') || document.body;
      main.prepend(sidebarEl);
    } else {
      addBtn = document.getElementById('btn-add-movement');
    }
    return sidebarEl;
  }

  function ensureList() {
    ensureSidebar();
    if (listEl && document.contains(listEl)) return listEl;
    listEl = document.getElementById('movement-list');
    if (!listEl) {
      listEl = document.createElement('ul');
      listEl.id = 'movement-list';
      listEl.className = 'item-list';
      sidebarEl.appendChild(listEl);
    }
    return listEl;
  }

  function ensureForm() {
    if (formEl && document.contains(formEl)) return formEl;
    formEl = document.getElementById('movement-form');
    if (!formEl) {
      formEl = document.createElement('form');
      formEl.id = 'movement-form';
      formEl.autocomplete = 'off';
      const labelRow = document.createElement('div');
      labelRow.className = 'form-row';
      const label = document.createElement('label');
      label.textContent = 'ID';
      idLabelEl = document.createElement('span');
      idLabelEl.id = 'movement-id-label';
      idLabelEl.className = 'code-pill';
      labelRow.appendChild(label);
      labelRow.appendChild(idLabelEl);
      formEl.appendChild(labelRow);
      const nameRow = document.createElement('div');
      nameRow.className = 'form-row';
      const nameLabel = document.createElement('label');
      nameLabel.htmlFor = 'movement-name';
      nameLabel.textContent = 'Name';
      nameInput = document.createElement('input');
      nameInput.id = 'movement-name';
      nameInput.required = true;
      nameInput.type = 'text';
      nameRow.appendChild(nameLabel);
      nameRow.appendChild(nameInput);
      formEl.appendChild(nameRow);
      const shortRow = document.createElement('div');
      shortRow.className = 'form-row';
      const shortLabel = document.createElement('label');
      shortLabel.htmlFor = 'movement-shortName';
      shortLabel.textContent = 'Short name';
      shortNameInput = document.createElement('input');
      shortNameInput.id = 'movement-shortName';
      shortNameInput.type = 'text';
      shortRow.appendChild(shortLabel);
      shortRow.appendChild(shortNameInput);
      formEl.appendChild(shortRow);
      const summaryRow = document.createElement('div');
      summaryRow.className = 'form-row';
      const summaryLabel = document.createElement('label');
      summaryLabel.htmlFor = 'movement-summary';
      summaryLabel.textContent = 'Summary';
      summaryInput = document.createElement('textarea');
      summaryInput.id = 'movement-summary';
      summaryInput.rows = 4;
      summaryRow.appendChild(summaryLabel);
      summaryRow.appendChild(summaryInput);
      formEl.appendChild(summaryRow);
      const tagsRow = document.createElement('div');
      tagsRow.className = 'form-row';
      const tagsLabel = document.createElement('label');
      tagsLabel.htmlFor = 'movement-tags';
      tagsLabel.textContent = 'Tags (comma‑separated)';
      tagsInput = document.createElement('input');
      tagsInput.id = 'movement-tags';
      tagsInput.type = 'text';
      tagsRow.appendChild(tagsLabel);
      tagsRow.appendChild(tagsInput);
      formEl.appendChild(tagsRow);
      const actions = document.createElement('div');
      actions.className = 'form-actions';
      saveBtn = document.createElement('button');
      saveBtn.id = 'btn-save-movement';
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save movement';
      deleteBtn = document.createElement('button');
      deleteBtn.id = 'btn-delete-movement';
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger';
      deleteBtn.textContent = 'Delete movement & related data';
      actions.appendChild(saveBtn);
      actions.appendChild(deleteBtn);
      formEl.appendChild(actions);
      const formCard = document.querySelector('.movement-form-card');
      const destination =
        formCard || document.querySelector('#tab-dashboard .panel-body') || document.body;
      destination.appendChild(formEl);
    } else {
      idLabelEl = document.getElementById('movement-id-label');
      nameInput = document.getElementById('movement-name');
      shortNameInput = document.getElementById('movement-shortName');
      summaryInput = document.getElementById('movement-summary');
      tagsInput = document.getElementById('movement-tags');
      deleteBtn = document.getElementById('btn-delete-movement');
      saveBtn = document.getElementById('btn-save-movement');
    }
    return formEl;
  }

  function computeRenderKey(state) {
    const snapshot = state?.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const parts = movements.map(movement => {
      const tags = Array.isArray(movement?.tags) ? movement.tags.join('|') : '';
      return `${movement?.id || ''}:${movement?.name || ''}:${movement?.shortName || ''}:${
        movement?.summary || ''
      }:${tags}`;
    });
    return [movements.length, state?.currentMovementId || '', parts.join(';')].join('|');
  }

  function handleListClick(event) {
    const target = event.target.closest('[data-movement-id]');
    if (!target) return;
    selectMovement(target.dataset.movementId);
  }

  function selectMovement(id) {
    if (typeof ctx?.actions?.selectMovement === 'function') {
      ctx.actions.selectMovement(id);
    }
  }

  function addMovement(overrides = {}) {
    if (typeof ctx?.actions?.addMovement === 'function') {
      return ctx.actions.addMovement(overrides);
    }
    const state = ctx?.getState?.() || ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const nextSnapshot = { ...snapshot, movements: [...movements] };
    const id =
      overrides.id ||
      DomainService.generateId?.('mov-') ||
      window.crypto?.randomUUID?.() ||
      `mov-${Date.now()}`;
    const movement = {
      id,
      movementId: overrides.movementId || id,
      name: overrides.name || 'New Movement',
      shortName: overrides.shortName || 'New',
      summary: overrides.summary || '',
      notes: overrides.notes ?? null,
      tags: overrides.tags || []
    };
    nextSnapshot.movements.push(movement);
    ctx?.store?.update?.(prev => ({
      ...prev,
      snapshot: nextSnapshot,
      currentMovementId: movement.id,
      currentItemId: null,
      currentTextId: null,
      currentShelfId: null,
      currentBookId: null,
      navigation: { stack: [], index: -1 }
    }));
    ctx?.store?.markDirty?.('movement');
    ctx?.store?.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
    return movement;
  }

  function deleteMovement(movementId) {
    if (typeof ctx?.actions?.deleteMovement === 'function') {
      return ctx.actions.deleteMovement(movementId, { confirmDelete });
    }
    const state = ctx?.getState?.() || ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const targetId = movementId || state.currentMovementId;
    if (!targetId) return null;
    const movement = movements.find(m => m?.id === targetId);
    if (!movement) return null;
    const ok = typeof confirmDelete === 'function' ? confirmDelete(movement) : true;
    if (!ok) return null;

    const nextSnapshot = { ...snapshot, movements: [...movements] };
    const collections = DomainService?.COLLECTIONS_WITH_MOVEMENT_ID || [];
    collections.forEach(name => {
      if (Array.isArray(snapshot[name])) {
        nextSnapshot[name] = [...snapshot[name]];
      }
    });

    const fallbackId = DomainService.deleteMovement
      ? DomainService.deleteMovement(nextSnapshot, targetId)
      : (() => {
          nextSnapshot.movements = nextSnapshot.movements.filter(m => m.id !== targetId);
          return nextSnapshot.movements[0]?.id || null;
        })();

    ctx?.store?.update?.(prev => ({
      ...prev,
      snapshot: nextSnapshot,
      currentMovementId: fallbackId,
      currentItemId: null,
      currentTextId: null,
      currentShelfId: null,
      currentBookId: null,
      navigation: { stack: [], index: -1 }
    }));
    ctx?.store?.markDirty?.('movement');
    ctx?.store?.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
    return fallbackId;
  }

  function handleFormChange() {
    if (isPopulatingForm) return;
    const state = ctx?.getState?.() || ctx?.store?.getState?.() || {};
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const movement = movements.find(m => m?.id === state.currentMovementId);
    if (!movement) return;
    const updated = normalizeMovementFields({
      name: nameInput?.value,
      shortName: shortNameInput?.value,
      summary: summaryInput?.value,
      tags: tagsInput?.value
    });
    const nextMovements = movements.map(m =>
      m?.id === movement.id ? { ...m, ...updated, movementId: m.id } : m
    );
    const nextSnapshot = { ...snapshot, movements: nextMovements };
    ctx?.store?.update?.(prev => ({ ...prev, snapshot: nextSnapshot }));
    ctx?.store?.markDirty?.('movement');
  }

  function handleSave() {
    ctx?.store?.saveSnapshot?.({ clearMovementDirty: true, clearItemDirty: false, show: true });
  }

  function render(state = ctx?.getState?.()) {
    if (!state) return;
    ensureSidebar();
    ensureList();
    ensureForm();
    const snapshot = state.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const currentMovementId = state.currentMovementId;
    const renderKey = computeRenderKey(state);
    if (renderKey === lastRenderKey) return;
    lastRenderKey = renderKey;

    dom.clearElement(listEl);
    if (!movements.length) {
      const li = document.createElement('li');
      li.textContent = 'No movements yet. Click + to add one.';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      listEl.appendChild(li);
    } else {
      movements.forEach(movement => {
        const li = document.createElement('li');
        li.dataset.movementId = movement.id;
        li.className = movement.id === currentMovementId ? 'selected active' : '';
        li.setAttribute('aria-selected', movement.id === currentMovementId ? 'true' : 'false');
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

    if (!currentMovementId || !movements.length) {
      if (idLabelEl) idLabelEl.textContent = '—';
      [nameInput, shortNameInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(el => {
        if (el) el.disabled = true;
        if (el && 'value' in el) el.value = '';
      });
      return;
    }

    const movement = movements.find(m => m.id === currentMovementId);
    if (!movement) {
      ctx?.actions?.selectMovement?.(movements[0]?.id);
      return;
    }

    [nameInput, shortNameInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(el => {
      if (el) el.disabled = false;
    });

    isPopulatingForm = true;
    if (idLabelEl) idLabelEl.textContent = movement.id || '—';
    if (nameInput) nameInput.value = movement.name || '';
    if (shortNameInput) shortNameInput.value = movement.shortName || '';
    if (summaryInput) summaryInput.value = movement.summary || '';
    if (tagsInput) tagsInput.value = Array.isArray(movement.tags) ? movement.tags.join(', ') : '';
    isPopulatingForm = false;
  }

  function scheduleRender(nextState) {
    pendingState = nextState || pendingState || ctx?.getState?.();
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      render(pendingState || ctx?.getState?.());
      pendingState = null;
    });
  }

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    if (unsubscribe) unsubscribe();
    if (listEl) listEl.removeEventListener('click', handleListClick);
    if (addBtn) addBtn.removeEventListener('click', handleAddClick);
    if (formEl) formEl.removeEventListener('submit', preventSubmit);
    [nameInput, shortNameInput, summaryInput, tagsInput].forEach(el => {
      if (el) el.removeEventListener('input', handleFormChange);
    });
    if (deleteBtn) deleteBtn.removeEventListener('click', handleDeleteClick);
    if (saveBtn) saveBtn.removeEventListener('click', handleSave);
  }

  function preventSubmit(event) {
    event.preventDefault();
  }

  function handleAddClick() {
    addMovement();
  }

  function handleDeleteClick() {
    deleteMovement();
  }

  ensureSidebar();
  ensureList();
  ensureForm();

  const unsubscribe = ctx?.subscribe ? ctx.subscribe(scheduleRender) : null;
  listEl?.addEventListener('click', handleListClick);
  addBtn = addBtn || document.getElementById('btn-add-movement');
  addBtn?.addEventListener('click', handleAddClick);
  formEl?.addEventListener('submit', preventSubmit);
  [nameInput, shortNameInput, summaryInput, tagsInput].forEach(el => {
    el?.addEventListener('input', handleFormChange);
  });
  deleteBtn = deleteBtn || document.getElementById('btn-delete-movement');
  saveBtn = saveBtn || document.getElementById('btn-save-movement');
  deleteBtn?.addEventListener('click', handleDeleteClick);
  saveBtn?.addEventListener('click', handleSave);

  scheduleRender(ctx?.getState?.());

  const api = {
    render: scheduleRender,
    destroy,
    selectMovement,
    addMovement,
    deleteMovement
  };

  movementEngineerGlobal.__movementsUI = api;
  return api;
}
