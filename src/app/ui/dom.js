export function createDomUtils() {
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

  return {
    clearElement,
    ensureSelectOptions
  };
}
