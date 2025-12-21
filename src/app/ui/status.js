export function createStatusUi() {
  let fatalImportErrorDom = null;

  function ensureFatalImportBanner() {
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

  function showFatalImportError(error) {
    console.error(error);
    const dom = ensureFatalImportBanner();
    const message =
      error && (error.message || error.stack)
        ? `${error.message || ''}\n${error.stack || ''}`.trim()
        : String(error || 'Unknown error');
    dom.body.textContent = message;
    dom.root.classList.remove('hidden');
  }

  function clearFatalImportError() {
    if (!fatalImportErrorDom) return;
    fatalImportErrorDom.root.classList.add('hidden');
    fatalImportErrorDom.body.textContent = '';
  }

  function setStatus(text) {
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

  return {
    setStatus,
    ensureFatalImportBanner,
    showFatalImportError,
    clearFatalImportError
  };
}
