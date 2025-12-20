let fallbackFatalImportDom = null;

const legacyUi = () => (globalThis.ME && globalThis.ME.ui) || {};

function getBannerDom() {
  if (legacyUi().ensureFatalImportBanner && legacyUi().ensureFatalImportBanner !== ensureFatalImportBanner) {
    return legacyUi().ensureFatalImportBanner();
  }
  if (fallbackFatalImportDom) return fallbackFatalImportDom;
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
  fallbackFatalImportDom = { root, title, body };
  return fallbackFatalImportDom;
}

export function setStatus(text) {
  const ui = legacyUi();
  if (ui.setStatus && ui.setStatus !== setStatus) {
    return ui.setStatus(text);
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
  return getBannerDom();
}

export function showFatalImportError(error) {
  const ui = legacyUi();
  if (ui.showFatalImportError && ui.showFatalImportError !== showFatalImportError) {
    return ui.showFatalImportError(error);
  }
  console.error(error);
  const dom = getBannerDom();
  const message =
    error && (error.message || error.stack)
      ? `${error.message || ''}\n${error.stack || ''}`.trim()
      : String(error || 'Unknown error');
  dom.body.textContent = message;
  dom.root.classList.remove('hidden');
}

export function clearFatalImportError() {
  const ui = legacyUi();
  if (ui.clearFatalImportError && ui.clearFatalImportError !== clearFatalImportError) {
    return ui.clearFatalImportError();
  }
  if (!fallbackFatalImportDom) return;
  fallbackFatalImportDom.root.classList.add('hidden');
  fallbackFatalImportDom.body.textContent = '';
}
