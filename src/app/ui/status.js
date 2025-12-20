let fatalImportErrorDom = null;

function getLegacyUi() {
  return window.MovementEngineerLegacy || null;
}

export function setStatus(text) {
  const legacyUi = getLegacyUi();
  if (legacyUi && typeof legacyUi.setStatus === 'function') {
    return legacyUi.setStatus(text);
  }
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = text || '';
  if (!text) return;
  setTimeout(() => {
    if (el.textContent === text) {
      el.textContent = '';
    }
  }, 2500);
}

export function ensureFatalImportBanner() {
  const legacyUi = getLegacyUi();
  if (legacyUi && typeof legacyUi.ensureFatalImportBanner === 'function') {
    return legacyUi.ensureFatalImportBanner();
  }
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

export function showFatalImportError(error) {
  const legacyUi = getLegacyUi();
  if (legacyUi && typeof legacyUi.showFatalImportError === 'function') {
    return legacyUi.showFatalImportError(error);
  }
  console.error(error);
  const dom = ensureFatalImportBanner();
  const message =
    error && (error.message || error.stack)
      ? `${error.message || ''}\n${error.stack || ''}`.trim()
      : String(error || 'Unknown error');
  dom.body.textContent = message;
  dom.root.classList.remove('hidden');
}

export function clearFatalImportError() {
  const legacyUi = getLegacyUi();
  if (legacyUi && typeof legacyUi.clearFatalImportError === 'function') {
    return legacyUi.clearFatalImportError();
  }
  if (!fatalImportErrorDom) return;
  fatalImportErrorDom.root.classList.add('hidden');
  fatalImportErrorDom.body.textContent = '';
}

export function renderSaveBanner() {
  const legacyUi = getLegacyUi();
  if (legacyUi && typeof legacyUi.renderSaveBanner === 'function') {
    return legacyUi.renderSaveBanner();
  }
  const state = legacyUi && typeof legacyUi.getState === 'function'
    ? legacyUi.getState()
    : null;
  const dirtyFlags = state && state.dirty ? state.dirty : null;
  const isDirty = dirtyFlags
    ? dirtyFlags.snapshotDirty ||
      dirtyFlags.movementFormDirty ||
      dirtyFlags.itemEditorDirty
    : false;
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
