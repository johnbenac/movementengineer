export function createStatusUi() {
  let fatalImportErrorDom = null;
  let hideTimer = null;

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

  function setStatus(text, options = {}) {
    const el = document.getElementById('status');
    if (!el) return;

    const { busy = false, persist = false, duration = 2500 } = options || {};
    const statusText = text || '';

    clearTimeout(hideTimer);

    let textEl = el.querySelector('.status-text');
    if (!textEl) {
      el.textContent = '';
      textEl = document.createElement('span');
      textEl.className = 'status-text';
      el.appendChild(textEl);
    }

    let spinner = el.querySelector('.status-spinner');
    if (busy) {
      if (!spinner) {
        spinner = document.createElement('span');
        spinner.className = 'status-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        el.insertBefore(spinner, textEl);
      }
      el.classList.add('is-busy');
    } else {
      spinner?.remove();
      el.classList.remove('is-busy');
    }

    textEl.textContent = statusText;

    if (!statusText) {
      if (!persist) {
        spinner?.remove();
        el.classList.remove('is-busy');
      }
      return;
    }

    if (persist) return;

    hideTimer = setTimeout(() => {
      if (textEl.textContent === statusText) {
        textEl.textContent = '';
        spinner?.remove();
        el.classList.remove('is-busy');
      }
    }, duration);
  }

  return {
    setStatus,
    ensureFatalImportBanner,
    showFatalImportError,
    clearFatalImportError
  };
}
