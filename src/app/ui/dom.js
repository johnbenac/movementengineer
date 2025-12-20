function createFallbackQuery() {
  return (selector, root = document) => root.querySelector(selector);
}

function createFallbackClearElement() {
  return (el) => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
}

function createFallbackEnsureSelectOptions(clearElement) {
  return (selectEl, options, includeEmptyLabel) => {
    if (!selectEl) return;
    const previousValue = selectEl.value;
    clearElement(selectEl);
    if (includeEmptyLabel) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = includeEmptyLabel;
      selectEl.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      selectEl.appendChild(opt);
    });
    if (previousValue && options.some(o => o.value === previousValue)) {
      selectEl.value = previousValue;
    }
  };
}

function createFallbackAddListenerById() {
  return (id, event, handler) => {
    const el = document.getElementById(id);
    if (!el) return null;
    el.addEventListener(event, handler);
    return el;
  };
}

export function createDomUtils(legacyApp = {}) {
  const query = typeof legacyApp.$ === 'function' ? legacyApp.$ : createFallbackQuery();
  const clearElement =
    typeof legacyApp.clearElement === 'function'
      ? legacyApp.clearElement
      : createFallbackClearElement();
  const ensureSelectOptions =
    typeof legacyApp.ensureSelectOptions === 'function'
      ? legacyApp.ensureSelectOptions
      : createFallbackEnsureSelectOptions(clearElement);
  const addListenerById =
    typeof legacyApp.addListenerById === 'function'
      ? legacyApp.addListenerById
      : createFallbackAddListenerById();

  return {
    $: query,
    clearElement,
    ensureSelectOptions,
    addListenerById
  };
}
