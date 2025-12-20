function ensureFatalImportBanner() {
  let root = document.getElementById('fatal-import-error');
  let title = null;
  let body = null;

  if (!root) {
    root = document.createElement('div');
    root.id = 'fatal-import-error';
    root.className = 'fatal-error-banner hidden';
    title = document.createElement('div');
    title.className = 'fatal-error-title';
    title.textContent = 'Import failed';
    body = document.createElement('pre');
    body.className = 'fatal-error-body';
    root.appendChild(title);
    root.appendChild(body);
    document.body.appendChild(root);
  } else {
    title = root.querySelector('.fatal-error-title');
    body = root.querySelector('.fatal-error-body');
  }

  return { root, title, body };
}

function defaultSetStatus(text) {
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

function defaultShowFatalImportError(error) {
  console.error(error);
  const dom = ensureFatalImportBanner();
  const message =
    (error && (error.message || error.stack)) ?
      `${error.message || ''}\n${error.stack || ''}`.trim() :
      String(error || 'Unknown error');
  if (dom.body) dom.body.textContent = message;
  if (dom.root) dom.root.classList.remove('hidden');
}

function defaultClearFatalImportError() {
  const dom = ensureFatalImportBanner();
  if (dom.root) dom.root.classList.add('hidden');
  if (dom.body) dom.body.textContent = '';
}

export function createStatusApi({ legacy } = {}) {
  function setStatus(text) {
    if (legacy?.ui?.setStatus) {
      return legacy.ui.setStatus(text);
    }
    return defaultSetStatus(text);
  }

  function showFatalImportError(error) {
    if (legacy?.ui?.showFatalImportError) {
      return legacy.ui.showFatalImportError(error);
    }
    return defaultShowFatalImportError(error);
  }

  function clearFatalImportError() {
    if (legacy?.ui?.clearFatalImportError) {
      return legacy.ui.clearFatalImportError();
    }
    return defaultClearFatalImportError();
  }

  return {
    setStatus,
    showFatalImportError,
    clearFatalImportError,
    ensureFatalImportBanner
  };
}
