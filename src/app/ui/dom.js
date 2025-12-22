export function createDomUtils() {
  function $(selector, root = document) {
    return root ? root.querySelector(selector) : null;
  }

  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function ensureSelectOptions(selectEl, options = [], includeEmptyLabel) {
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
    if (previous && options.some(option => option.value === previous)) {
      selectEl.value = previous;
    }
  }

  function ensureMultiSelectOptions(selectEl, options = []) {
    if (!selectEl) return;
    const prev = new Set(Array.from(selectEl.selectedOptions || []).map(o => o.value));

    clearElement(selectEl);
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label || option.value;
      if (option.kind) opt.dataset.kind = option.kind;
      if (option.depth !== undefined && option.depth !== null) opt.dataset.depth = option.depth;
      selectEl.appendChild(opt);
    });

    Array.from(selectEl.options || []).forEach(opt => {
      opt.selected = prev.has(opt.value);
    });
  }

  function ensureDatalistOptions(datalistEl, values = []) {
    if (!datalistEl) return;
    clearElement(datalistEl);
    values.forEach(value => {
      const opt = document.createElement('option');
      opt.value = value;
      datalistEl.appendChild(opt);
    });
  }

  function addListenerById(id, event, handler, options) {
    const el = typeof id === 'string' ? document.getElementById(id) : null;
    if (!el) return null;
    el.addEventListener(event, handler, options);
    return el;
  }

  return {
    $,
    clearElement,
    ensureSelectOptions,
    ensureMultiSelectOptions,
    ensureDatalistOptions,
    addListenerById
  };
}
