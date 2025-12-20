function createFallbackStatus() {
  return (text) => {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = text || '';
    if (!text) return;
    setTimeout(() => {
      if (el.textContent === text) {
        el.textContent = '';
      }
    }, 2500);
  };
}

function ensureFallbackFatalBanner(fatalImportErrorDom) {
  if (fatalImportErrorDom.current) return fatalImportErrorDom.current;
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
  fatalImportErrorDom.current = { root, title, body };
  return fatalImportErrorDom.current;
}

function createFallbackShowFatalImportError(fatalImportErrorDom) {
  return (error) => {
    console.error(error);
    const dom = ensureFallbackFatalBanner(fatalImportErrorDom);
    const message =
      (error && (error.message || error.stack)) ?
        `${error.message || ''}\n${error.stack || ''}`.trim() :
        String(error || 'Unknown error');
    dom.body.textContent = message;
    dom.root.classList.remove('hidden');
  };
}

function createFallbackClearFatalImportError(fatalImportErrorDom) {
  return () => {
    const dom = fatalImportErrorDom.current;
    if (!dom) return;
    dom.root.classList.add('hidden');
    dom.body.textContent = '';
  };
}

function createFallbackRenderSaveBanner() {
  return (isDirty = false) => {
    const banner = document.getElementById('save-banner');
    const text = document.getElementById('save-banner-text');
    const saveBtn = document.getElementById('btn-save-banner');
    if (!banner || !text || !saveBtn) return;

    banner.classList.toggle('saved', !isDirty);
    saveBtn.disabled = !isDirty;
    text.textContent = isDirty
      ? 'Changes have not been saved to disk.'
      : 'All changes are saved to this browser.';
  };
}

export function createStatusApi({ legacyApp } = {}) {
  const fatalImportErrorDom = { current: null };

  const setStatus =
    typeof legacyApp?.setStatus === 'function'
      ? (...args) => legacyApp.setStatus(...args)
      : createFallbackStatus();

  const showFatalImportError =
    typeof legacyApp?.showFatalImportError === 'function'
      ? (...args) => legacyApp.showFatalImportError(...args)
      : createFallbackShowFatalImportError(fatalImportErrorDom);

  const clearFatalImportError =
    typeof legacyApp?.clearFatalImportError === 'function'
      ? () => legacyApp.clearFatalImportError()
      : createFallbackClearFatalImportError(fatalImportErrorDom);

  const renderSaveBanner =
    typeof legacyApp?.renderSaveBanner === 'function'
      ? () => legacyApp.renderSaveBanner()
      : createFallbackRenderSaveBanner();

  return {
    setStatus,
    showFatalImportError,
    clearFatalImportError,
    renderSaveBanner
  };
}
