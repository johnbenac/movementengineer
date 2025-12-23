const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
const MOVEMENTS_UI_KEY = '__movementsUI';

const raf =
  typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : cb => setTimeout(cb, 16);

function ensureSidebarMount() {
  let rootEl = document.getElementById('movement-sidebar');
  let listEl = document.getElementById('movement-list');

  if (!rootEl) {
    rootEl = document.createElement('aside');
    rootEl.id = 'movement-sidebar';
    rootEl.className = 'sidebar';

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
    rootEl.appendChild(header);
  }

  if (!listEl) {
    listEl = document.createElement('ul');
    listEl.id = 'movement-list';
    listEl.className = 'item-list';
    rootEl.appendChild(listEl);
  }

  if (!rootEl.contains(listEl)) {
    rootEl.appendChild(listEl);
  }

  const layout = document.querySelector('main.layout') || document.querySelector('main') || document.body;
  if (layout && !layout.contains(rootEl)) {
    layout.insertBefore(rootEl, layout.firstChild);
  } else if (!rootEl.parentElement) {
    document.body.appendChild(rootEl);
  }

  return { rootEl, listEl };
}

function ensureFormMount() {
  let formCard = document.getElementById('movement-form');
  const elements = {};

  if (!formCard) {
    const section = document.createElement('section');
    section.className = 'card movement-form-card';

    const heading = document.createElement('h2');
    heading.textContent = 'Movement details';
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Choose a movement in the sidebar, then edit its core fields here.';

    formCard = document.createElement('form');
    formCard.id = 'movement-form';
    formCard.autocomplete = 'off';

    const addRow = (labelText, child, options = {}) => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const label = document.createElement('label');
      if (options.for) {
        label.htmlFor = options.for;
      }
      label.textContent = labelText;
      row.appendChild(label);
      row.appendChild(child);
      formCard.appendChild(row);
    };

    const idPill = document.createElement('span');
    idPill.id = 'movement-id-label';
    idPill.className = 'code-pill';
    addRow('ID', idPill);

    const nameInput = document.createElement('input');
    nameInput.id = 'movement-name';
    nameInput.required = true;
    nameInput.type = 'text';
    addRow('Name', nameInput, { for: 'movement-name' });

    const shortInput = document.createElement('input');
    shortInput.id = 'movement-shortName';
    shortInput.type = 'text';
    addRow('Short name', shortInput, { for: 'movement-shortName' });

    const summaryInput = document.createElement('textarea');
    summaryInput.id = 'movement-summary';
    summaryInput.rows = 4;
    addRow('Summary', summaryInput, { for: 'movement-summary' });

    const tagsInput = document.createElement('input');
    tagsInput.id = 'movement-tags';
    tagsInput.type = 'text';
    tagsInput.placeholder = 'test, upside, etc.';
    addRow('Tags (comma‑separated)', tagsInput, { for: 'movement-tags' });

    const formActions = document.createElement('div');
    formActions.className = 'form-actions';
    const saveBtn = document.createElement('button');
    saveBtn.id = 'btn-save-movement';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save movement';
    const importBtn = document.createElement('button');
    importBtn.id = 'btn-import-from-github';
    importBtn.type = 'button';
    importBtn.textContent = 'Load markdown repo';
    const exportBtn = document.createElement('button');
    exportBtn.id = 'btn-export-repo';
    exportBtn.type = 'button';
    exportBtn.textContent = 'Export markdown zip';
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'btn-delete-movement';
    deleteBtn.type = 'button';
    deleteBtn.className = 'danger';
    deleteBtn.textContent = 'Delete movement & related data';
    formActions.appendChild(saveBtn);
    formActions.appendChild(importBtn);
    formActions.appendChild(exportBtn);
    formActions.appendChild(deleteBtn);

    formCard.appendChild(formActions);

    const importStatus = document.createElement('div');
    importStatus.id = 'import-status';
    importStatus.className = 'import-status hidden';
    importStatus.setAttribute('role', 'status');
    importStatus.setAttribute('aria-live', 'polite');

    formCard.appendChild(importStatus);

    section.appendChild(heading);
    section.appendChild(hint);
    section.appendChild(formCard);

    const content = document.querySelector('section.content .panel-body') || document.querySelector('section.content') || document.body;
    content.appendChild(section);
  }

  elements.idLabel = formCard.querySelector('#movement-id-label');
  elements.nameInput = formCard.querySelector('#movement-name');
  elements.shortInput = formCard.querySelector('#movement-shortName');
  elements.summaryInput = formCard.querySelector('#movement-summary');
  elements.tagsInput = formCard.querySelector('#movement-tags');
  elements.saveButton = formCard.querySelector('#btn-save-movement');
  elements.importButton = formCard.querySelector('#btn-import-from-github');
  elements.exportButton = formCard.querySelector('#btn-export-repo');
  elements.deleteButton = formCard.querySelector('#btn-delete-movement');
  let importStatus = formCard.querySelector('#import-status');
  if (!importStatus) {
    importStatus = document.createElement('div');
    importStatus.id = 'import-status';
    importStatus.className = 'import-status hidden';
    importStatus.setAttribute('role', 'status');
    importStatus.setAttribute('aria-live', 'polite');
    formCard.appendChild(importStatus);
  }
  elements.importStatus = importStatus;
  elements.addButton = document.getElementById('btn-add-movement');
  elements.form = formCard;
  return elements;
}

function getMovementLabel(movement) {
  if (!movement) return '';
  return movement.name || movement.id || movement.movementId || '';
}

function readFormValues(inputs) {
  const name = inputs.nameInput?.value?.trim() || 'Untitled movement';
  const shortName = inputs.shortInput?.value?.trim() || name;
  const summary = inputs.summaryInput?.value?.trim() || '';
  const tags = (inputs.tagsInput?.value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return { name, shortName, summary, tags };
}

function movementsEqual(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const keys = ['id', 'movementId', 'name', 'shortName', 'summary'];
  const baseEqual = keys.every(k => (a[k] || '') === (b[k] || ''));
  if (!baseEqual) return false;
  const tagsA = Array.isArray(a.tags) ? a.tags.join('|') : '';
  const tagsB = Array.isArray(b.tags) ? b.tags.join('|') : '';
  return tagsA === tagsB;
}

export function initMovements(ctx, options = {}) {
  if (movementEngineerGlobal[MOVEMENTS_UI_KEY]) {
    return movementEngineerGlobal[MOVEMENTS_UI_KEY];
  }

  const { clearElement } = ctx.dom;
  const { rootEl, listEl } = ensureSidebarMount();
  const inputs = ensureFormMount();

  let lastRenderKey = null;
  let rafId = null;
  let queuedState = null;
  let isPopulatingForm = false;
  let isImportingRepo = false;
  let importStatusTimeoutId = null;

  function getState() {
    return ctx.store.getState() || {};
  }

  function getCurrentMovementId() {
    return getState()?.currentMovementId || null;
  }

  function getSnapshot() {
    return getState()?.snapshot || {};
  }

  function getLastRepoUrl() {
    try {
      return localStorage?.getItem?.('me:lastRepoUrl') || '';
    } catch (err) {
      console.warn('Unable to read last repo URL', err);
      return '';
    }
  }

  function setLastRepoUrl(url) {
    try {
      localStorage?.setItem?.('me:lastRepoUrl', url);
    } catch (err) {
      console.warn('Unable to persist last repo URL', err);
    }
  }

  function renderImportStatus(message, { isError = false, isLoading = false, persist = false } = {}) {
    if (!inputs.importStatus) return;
    if (importStatusTimeoutId) {
      clearTimeout(importStatusTimeoutId);
      importStatusTimeoutId = null;
    }

    const shouldHide = !message && !isLoading;
    inputs.importStatus.classList.toggle('hidden', shouldHide);
    inputs.importStatus.classList.toggle('import-error', !!isError);
    inputs.importStatus.replaceChildren();

    if (shouldHide) return;

    if (isLoading) {
      const spinner = document.createElement('span');
      spinner.className = 'inline-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      inputs.importStatus.appendChild(spinner);
    }

    if (message) {
      const text = document.createElement('span');
      text.textContent = message;
      inputs.importStatus.appendChild(text);
    }

    if (!persist && !isError && !isLoading && message) {
      importStatusTimeoutId = setTimeout(() => {
        inputs.importStatus.classList.add('hidden');
        inputs.importStatus.textContent = '';
      }, 2500);
    }
  }

  function setImportBusyState(isBusy) {
    isImportingRepo = !!isBusy;
    if (inputs.importButton) {
      inputs.importButton.disabled = !!isBusy;
      if (isBusy) {
        inputs.importButton.setAttribute('aria-busy', 'true');
      } else {
        inputs.importButton.removeAttribute('aria-busy');
      }
    }
  }

  function normalizeRepoUrl(rawInput) {
    if (!rawInput || !rawInput.trim()) {
      return { error: 'Please provide a GitHub repo URL.' };
    }
    const trimmed = rawInput.trim();
    const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
    let url;
    try {
      url = new URL(candidate);
    } catch (err) {
      return { error: 'Enter a valid URL like https://github.com/owner/repo.' };
    }
    const host = (url.hostname || '').toLowerCase();
    const isGithubHost = host === 'github.com' || host.endsWith('.github.com');
    if (!isGithubHost) {
      return { error: 'The repo URL must point to github.com.' };
    }
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (!owner || !repo) {
      return { error: 'Include both the owner and repository name in the URL.' };
    }
    return { repoUrl: `https://github.com/${owner}/${repo}` };
  }

  function markDirty() {
    if (ctx?.store?.markDirty) {
      ctx.store.markDirty('movement');
    }
  }

  function saveSnapshot() {
    if (ctx?.store?.saveSnapshot) {
      ctx.store.saveSnapshot({ clearMovementDirty: true, clearItemDirty: false, show: true });
    }
  }

  function computeRenderKey(state) {
    const snapshot = state?.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const selected =
      movements.find(m => m?.id === state?.currentMovementId || m?.movementId === state?.currentMovementId) || null;
    const tagsKey = Array.isArray(selected?.tags) ? selected.tags.join('|') : '';
    const importKey = isImportingRepo ? 'importing' : 'idle';
    return [
      movements.length,
      state?.currentMovementId || 'none',
      selected?.name || '',
      selected?.shortName || '',
      selected?.summary || '',
      tagsKey,
      importKey
    ].join('|');
  }

  function renderList(state) {
    const snapshot = state?.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const currentId = state?.currentMovementId || null;

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
      const isActive = movement?.id === currentId || movement?.movementId === currentId;
      li.dataset.movementId = movement?.id || movement?.movementId || '';
      li.dataset.id = movement?.id || movement?.movementId || '';
      li.className = isActive ? 'selected active' : '';
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');

      const primary = document.createElement('span');
      primary.textContent = getMovementLabel(movement);
      const secondary = document.createElement('span');
      secondary.className = 'secondary';
      secondary.textContent = movement?.shortName || '';
      li.appendChild(primary);
      li.appendChild(secondary);

      listEl.appendChild(li);
    });
  }

  function setFormDisabled(isDisabled) {
    [
      inputs.nameInput,
      inputs.shortInput,
      inputs.summaryInput,
      inputs.tagsInput,
      inputs.deleteButton,
      inputs.saveButton,
      inputs.importButton,
      inputs.exportButton
    ].forEach(el => {
      if (el) el.disabled = !!isDisabled;
    });
  }

  function populateForm(movement) {
    isPopulatingForm = true;
    if (inputs.idLabel) inputs.idLabel.textContent = movement?.id || '—';
    if (inputs.nameInput) inputs.nameInput.value = movement?.name || '';
    if (inputs.shortInput) inputs.shortInput.value = movement?.shortName || '';
    if (inputs.summaryInput) inputs.summaryInput.value = movement?.summary || '';
    if (inputs.tagsInput) inputs.tagsInput.value = Array.isArray(movement?.tags) ? movement.tags.join(', ') : '';
    isPopulatingForm = false;
  }

  function renderForm(state) {
    const snapshot = state?.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const currentId = state?.currentMovementId || null;
    const movement =
      movements.find(m => m?.id === currentId || m?.movementId === currentId) || null;

    if (!movement) {
      populateForm(null);
      setFormDisabled(true);
      if (inputs.importButton) inputs.importButton.disabled = !!isImportingRepo;
      if (inputs.exportButton) inputs.exportButton.disabled = true;
      return;
    }

    populateForm(movement);

    if (isImportingRepo) {
      setFormDisabled(true);
      if (inputs.importButton) inputs.importButton.disabled = true;
      if (inputs.exportButton) inputs.exportButton.disabled = true;
      return;
    }

    setFormDisabled(false);
    if (inputs.importButton) inputs.importButton.disabled = false;
  }

  function render(state = getState()) {
    const key = computeRenderKey(state);
    if (key === lastRenderKey) return;
    lastRenderKey = key;

    renderList(state);
    renderForm(state);
  }

  function scheduleRender(nextState) {
    queuedState = nextState || getState();
    if (rafId) return;
    rafId = raf(() => {
      rafId = null;
      const state = queuedState || getState();
      queuedState = null;
      render(state);
    });
  }

  function applyFormToSnapshot() {
    const state = getState();
    const snapshot = state?.snapshot || {};
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const targetId = state?.currentMovementId || null;
    const idx = movements.findIndex(m => m?.id === targetId || m?.movementId === targetId);
    if (idx < 0) return;

    const values = readFormValues(inputs);
    const current = movements[idx] || {};
    const nextMovement = {
      ...current,
      ...values,
      movementId: current.id || current.movementId || values.id || targetId
    };

    if (movementsEqual(current, nextMovement)) return;

    const nextMovements = movements.map((movement, mIdx) =>
      mIdx === idx ? nextMovement : movement
    );
    const nextSnapshot = { ...snapshot, movements: nextMovements };

    if (ctx?.store?.setState) {
      ctx.store.setState(prev => ({ ...prev, snapshot: nextSnapshot }));
    }
  }

  function handleInputChange() {
    if (isPopulatingForm) return;
    applyFormToSnapshot();
    markDirty();
    scheduleRender();
  }

  function selectMovement(movementId) {
    if (ctx?.actions?.selectMovement) {
      ctx.actions.selectMovement(movementId);
    }
  }

  function addMovement(overrides = {}) {
    const { DomainService } = ctx.services;
    const snapshot = getSnapshot();
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const nextSnapshot = { ...snapshot, movements: [...movements] };
    let movement = null;

    if (DomainService?.addMovement) {
      movement = DomainService.addMovement(nextSnapshot, overrides);
    } else {
      const generateId =
        DomainService?.generateId ||
        ((prefix = 'mov-') => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            const uuid = crypto.randomUUID();
            return prefix ? `${prefix}${uuid}` : uuid;
          }
          return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        });
      const id = overrides.id || generateId('mov-');
      movement = {
        id,
        movementId: overrides.movementId || id,
        name: 'New Movement',
        shortName: 'New',
        summary: '',
        notes: null,
        tags: [],
        ...overrides
      };
      nextSnapshot.movements.push(movement);
    }

    if (!movement) return null;

    if (ctx?.store?.setState) {
      ctx.store.setState(prev => ({ ...prev, snapshot: nextSnapshot }));
    }

    selectMovement(movement.id || movement.movementId);
    markDirty();
    saveSnapshot();
    scheduleRender();
    return movement;
  }

  function deleteMovement(movementId) {
    if (!movementId) return;
    const { DomainService } = ctx.services;
    const snapshot = getSnapshot();
    const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];
    const target = movements.find(m => m?.id === movementId || m?.movementId === movementId);
    if (!target) return;

    const confirmed = window.confirm(
      'Delete this movement AND all data with this movementId?\n\n' +
        getMovementLabel(target) +
        '\n\nThis cannot be undone.'
    );
    if (!confirmed) return;

    const nextSnapshot = { ...snapshot, movements: [...movements] };
    const fallbackId = DomainService?.deleteMovement
      ? DomainService.deleteMovement(nextSnapshot, target.id || movementId)
      : (nextSnapshot.movements = nextSnapshot.movements.filter(
          m => m?.id !== target.id && m?.movementId !== movementId
        )) && nextSnapshot.movements[0]
        ? nextSnapshot.movements[0].id
        : null;

    if (ctx?.store?.setState) {
      ctx.store.setState(prev => ({
        ...prev,
        snapshot: nextSnapshot,
        currentMovementId: fallbackId || null,
        currentItemId: null,
        currentTextId: null,
        currentShelfId: null,
        currentBookId: null
      }));
    }

    selectMovement(fallbackId || null);
    markDirty();
    saveSnapshot();
    scheduleRender();
  }

  async function handleImportRepoClick() {
    const loader = ctx?.services?.MarkdownDatasetLoader;
    if (!loader?.importMovementRepo) {
      window.alert?.('MarkdownDatasetLoader.importMovementRepo is not available.');
      return;
    }

    const rawUrl = window.prompt?.(
      'GitHub repo URL to load (e.g. https://github.com/owner/repo):',
      getLastRepoUrl()
    );
    if (!rawUrl) return;

    const { repoUrl, error } = normalizeRepoUrl(rawUrl);
    if (error) {
      renderImportStatus(error, { isError: true, persist: true });
      ctx.ui?.setStatus?.('Import cancelled');
      return;
    }

    setLastRepoUrl(repoUrl);

    try {
      setImportBusyState(true);
      renderImportStatus('Importing markdown repo…', { isLoading: true });
      scheduleRender();
      ctx.ui?.setStatus?.('Importing markdown repo…');
      const importedSnapshot = await loader.importMovementRepo(repoUrl);
      const movements = Array.isArray(importedSnapshot?.movements)
        ? importedSnapshot.movements
        : [];
      const currentId = getCurrentMovementId();
      const nextMovement =
        movements.find(m => m?.id === currentId || m?.movementId === currentId) ||
        movements[0] ||
        null;
      const nextMovementId = nextMovement?.id || nextMovement?.movementId || null;

      ctx.store.setState(prev => ({
        ...prev,
        snapshot: importedSnapshot,
        currentMovementId: nextMovementId,
        currentItemId: null,
        currentTextId: null,
        currentShelfId: null,
        currentBookId: null,
        navigation: { stack: [], index: -1 }
      }));

      ctx.store?.markSaved?.({ movement: true, item: true });

      if (ctx.actions?.selectMovement && nextMovementId) {
        ctx.actions.selectMovement(nextMovementId);
      } else {
        ctx.shell?.renderActiveTab?.();
      }

      ctx.ui?.setStatus?.('Repo imported ✓');
      renderImportStatus('Repo imported ✓');
      scheduleRender();
    } catch (err) {
      console.error(err);
      renderImportStatus(err?.message || 'Import failed', { isError: true, persist: true });
      window.alert?.(err?.message || String(err));
      ctx.ui?.setStatus?.('Import failed');
    } finally {
      setImportBusyState(false);
      scheduleRender();
    }
  }

  function ensureExportableSnapshot(snapshot) {
    const loader = ctx?.services?.MarkdownDatasetLoader;
    if (!loader?.buildBaselineByMovement) return snapshot;
    const nextSnapshot = { ...snapshot };
    if (!nextSnapshot.__repoBaselineByMovement) {
      nextSnapshot.__repoBaselineByMovement = loader.buildBaselineByMovement(snapshot);
      nextSnapshot.__repoFileIndex = nextSnapshot.__repoFileIndex || {};
      nextSnapshot.__repoRawMarkdownByPath = nextSnapshot.__repoRawMarkdownByPath || {};
      ctx.store?.setState?.(prev => ({ ...prev, snapshot: nextSnapshot }));
    }
    return nextSnapshot;
  }

  async function handleExportZipClick() {
    const loader = ctx?.services?.MarkdownDatasetLoader;
    if (!loader?.exportMovementToZip || !loader?.buildBaselineByMovement) {
      window.alert?.('MarkdownDatasetLoader export helpers are not available.');
      return;
    }

    const movementId = getCurrentMovementId();
    if (!movementId) {
      window.alert?.('Select a movement first.');
      return;
    }

    try {
      ctx.ui?.setStatus?.('Building export…');
      const snapshot = ensureExportableSnapshot(getSnapshot());
      const result = await loader.exportMovementToZip(snapshot, movementId, {
        outputType: 'blob'
      });
      const blob = result?.archive || result;
      const filename = `movement-${movementId}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const fileCount = typeof result?.fileCount === 'number' ? result.fileCount : null;
      const status = fileCount != null ? `Exported ${fileCount} file(s) ✓` : 'Exported ✓';
      ctx.ui?.setStatus?.(status);
    } catch (err) {
      console.error(err);
      window.alert?.(err?.message || String(err));
      ctx.ui?.setStatus?.('Export failed');
    }
  }

  function destroy() {
    if (importStatusTimeoutId) {
      clearTimeout(importStatusTimeoutId);
      importStatusTimeoutId = null;
    }
    if (rafId) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (unsubscribe) {
      unsubscribe();
    }
    listeners.forEach(({ el, type, handler }) => {
      if (el) el.removeEventListener(type, handler);
    });
    movementEngineerGlobal[MOVEMENTS_UI_KEY] = null;
  }

  const listeners = [];

  function addListener(el, type, handler) {
    if (!el || !handler) return;
    el.addEventListener(type, handler);
    listeners.push({ el, type, handler });
  }

  const handleListClick = event => {
    const target = event.target?.closest?.('[data-movement-id]');
    if (!target) return;
    const movementId = target.dataset.movementId || target.dataset.id;
    if (movementId) {
      selectMovement(movementId);
    }
  };

  addListener(listEl, 'click', handleListClick);
  addListener(inputs.addButton, 'click', () => addMovement());
  addListener(inputs.deleteButton, 'click', () =>
    deleteMovement(getCurrentMovementId())
  );
  addListener(inputs.importButton, 'click', () => handleImportRepoClick());
  addListener(inputs.exportButton, 'click', () => handleExportZipClick());
  addListener(inputs.saveButton, 'click', () => {
    applyFormToSnapshot();
    markDirty();
    saveSnapshot();
    scheduleRender();
  });

  [inputs.nameInput, inputs.shortInput, inputs.summaryInput, inputs.tagsInput].forEach(input => {
    addListener(input, 'input', handleInputChange);
  });

  const unsubscribe = ctx?.subscribe ? ctx.subscribe(scheduleRender) : null;

  render(getState());

  const api = { render, destroy, selectMovement, addMovement, deleteMovement };
  movementEngineerGlobal[MOVEMENTS_UI_KEY] = api;
  if (ctx) {
    ctx.movementsUI = api;
  }
  return api;
}
