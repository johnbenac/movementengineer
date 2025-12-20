function query(selector, root = document) {
  return root.querySelector(selector);
}

function clearElement(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function ensureSelectOptions(selectEl, options, includeEmptyLabel) {
  if (!selectEl) return;
  const prev = selectEl.value;
  clearElement(selectEl);
  if (includeEmptyLabel) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = includeEmptyLabel;
    selectEl.appendChild(opt);
  }
  (options || []).forEach(optData => {
    const opt = document.createElement('option');
    opt.value = optData.value;
    opt.textContent = optData.label;
    selectEl.appendChild(opt);
  });
  if (prev && (options || []).some(o => o.value === prev)) {
    selectEl.value = prev;
  }
}

function addListenerById(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) return null;
  el.addEventListener(event, handler);
  return el;
}

export function createDomApi() {
  return {
    $: query,
    clearElement,
    ensureSelectOptions,
    addListenerById
  };
}
