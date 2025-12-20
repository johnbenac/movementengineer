function getLegacyDom() {
  return window.MovementEngineerLegacy && window.MovementEngineerLegacy.dom
    ? window.MovementEngineerLegacy.dom
    : null;
}

export function $(selector) {
  const legacyDom = getLegacyDom();
  if (legacyDom && typeof legacyDom.query === 'function') {
    return legacyDom.query(selector);
  }
  return document.querySelector(selector);
}

export function clearElement(el) {
  const legacyDom = getLegacyDom();
  if (legacyDom && typeof legacyDom.clearElement === 'function') {
    return legacyDom.clearElement(el);
  }
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export function ensureSelectOptions(selectEl, options = [], includeEmptyLabel) {
  const legacyDom = getLegacyDom();
  if (legacyDom && typeof legacyDom.ensureSelectOptions === 'function') {
    return legacyDom.ensureSelectOptions(selectEl, options, includeEmptyLabel);
  }
  if (!selectEl) return;
  const previous = selectEl.value;
  clearElement(selectEl);
  if (includeEmptyLabel) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = includeEmptyLabel;
    selectEl.appendChild(opt);
  }
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    selectEl.appendChild(opt);
  });
  if (previous && options.some(opt => opt.value === previous)) {
    selectEl.value = previous;
  } else if (selectEl.options.length) {
    selectEl.value = selectEl.options[0].value;
  }
}

export function addListenerById(id, event, handler) {
  const legacyDom = getLegacyDom();
  if (legacyDom && typeof legacyDom.addListenerById === 'function') {
    return legacyDom.addListenerById(id, event, handler);
  }
  const el = document.getElementById(id);
  if (!el) return null;
  el.addEventListener(event, handler);
  return el;
}
