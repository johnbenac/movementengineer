const DEFAULT_LABEL_KEYS = ['name', 'title', 'shortText', 'text', 'id'];

function defaultChipLabel(item) {
  if (item === undefined || item === null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);

  for (const k of DEFAULT_LABEL_KEYS) {
    if (item && item[k]) return String(item[k]);
  }
  if (item && item.id) return String(item.id);
  return '[no label]';
}

function isNode(value) {
  return value && typeof value === 'object' && typeof value.nodeType === 'number';
}

function normaliseChipTarget(target, fallbackItem) {
  if (!target) return null;
  if (target.kind === 'item') {
    if (!target.collection || !target.id) return null;
    return {
      chipKind: 'item',
      chipCollection: target.collection,
      chipId: target.id
    };
  }
  if (target.kind === 'facet') {
    if (!target.facet || target.value === undefined || target.value === null) return null;
    const dataset = {
      chipKind: 'facet',
      chipFacet: target.facet,
      chipValue: target.value
    };
    if (target.scope) dataset.chipScope = target.scope;
    return dataset;
  }
  if (fallbackItem && target === 'item') {
    if (fallbackItem.collection && fallbackItem.id) {
      return {
        chipKind: 'item',
        chipCollection: fallbackItem.collection,
        chipId: fallbackItem.id
      };
    }
  }
  return null;
}

function readChipTargetFromEl(el) {
  if (!el || !el.dataset) return null;
  const { chipKind, chipCollection, chipId, chipFacet, chipValue, chipScope } = el.dataset;
  if (chipKind === 'item' && chipCollection && chipId) {
    return { kind: 'item', collection: chipCollection, id: chipId };
  }
  if (chipKind === 'facet' && chipFacet && chipValue !== undefined) {
    return { kind: 'facet', facet: chipFacet, value: chipValue, scope: chipScope || null };
  }
  return null;
}

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

  function ensureMultiSelectOptions(selectEl, options = [], selectedValues = null) {
    if (!selectEl) return;
    const prev =
      selectedValues && Array.isArray(selectedValues)
        ? new Set(selectedValues.filter(Boolean))
        : new Set(Array.from(selectEl.selectedOptions || []).map(o => o.value));

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

  function addListenerById(id, eventName, handler, options) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el || !eventName || !handler) return () => {};
    el.addEventListener(eventName, handler, options);
    return () => el.removeEventListener(eventName, handler, options);
  }

  function createChip(item, opts = {}) {
    const {
      className = '',
      label,
      getLabel = defaultChipLabel,
      title,
      getTitle,
      onClick,
      dataset,
      attrs,
      tagName = 'button',
      variant,
      target,
      getTarget
    } = opts;

    const el = document.createElement(tagName);
    if (el.tagName === 'BUTTON') el.type = 'button';

    const variantClass =
      variant === 'entity' ? 'chip-entity' : variant === 'tag' ? 'chip-tag' : '';

    el.className = ['chip', variantClass, className].filter(Boolean).join(' ').trim();

    const text = label != null ? label : getLabel(item);
    el.textContent = text || '';

    const resolvedTitle =
      title != null ? title : typeof getTitle === 'function' ? getTitle(item) : null;
    if (resolvedTitle) el.title = resolvedTitle;

    const targetDataset =
      typeof getTarget === 'function' ? normaliseChipTarget(getTarget(item), item) : null;
    const normalizedDataset = targetDataset || normaliseChipTarget(target, item);

    if (normalizedDataset) {
      Object.entries(normalizedDataset).forEach(([k, v]) => {
        el.dataset[k] = String(v);
      });
    }

    if (dataset && typeof dataset === 'object') {
      Object.entries(dataset).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        el.dataset[k] = String(v);
      });
    }

    el.dataset.rowSelect = el.dataset.rowSelect || 'ignore';
    if (normalizedDataset || onClick) {
      el.classList.add('clickable');
    }

    if (attrs && typeof attrs === 'object') {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        el.setAttribute(k, String(v));
      });
    }

    // Buttons are already keyboard accessible; anchor/span fallback should be too.
    if (el.tagName !== 'BUTTON' && !el.getAttribute('role')) {
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
    }

    if (typeof onClick === 'function') {
      el.addEventListener('click', event => onClick(item, event));
      el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          el.click();
        }
      });
    }

    return el;
  }

  function createChipRow(items, opts = {}) {
    const { className = '', wrap = false, filter = Boolean, ...chipOpts } = opts;

    const row = document.createElement('div');
    row.className = ['chip-row', wrap ? 'wrap' : '', className].filter(Boolean).join(' ');

    const arr = Array.isArray(items) ? items.filter(filter) : [];
    arr.forEach(item => row.appendChild(createChip(item, chipOpts)));

    return row;
  }

  function appendChipRow(container, items, opts = {}) {
    if (!container) return null;
    const row = createChipRow(items, opts);
    container.appendChild(row);
    return row;
  }

  function assertNoBareChips(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const chips = Array.from(root.querySelectorAll('.chip'));
    chips.forEach(chip => {
      const target = readChipTargetFromEl(chip);
      if (!target) {
        console.error('Bare chip found without target dataset', chip);
      }
    });
  }

  let chipHandlerInstalled = false;
  function installChipNavigation(actions = {}) {
    if (chipHandlerInstalled) return () => {};
    const handleChipActivate = event => {
      const chip = event.target?.closest?.('.chip[data-chip-kind]');
      if (!chip) return;
      const target = readChipTargetFromEl(chip);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      actions.openChipTarget?.(target, { event });
    };
    const handleKeydown = event => {
      const chip = event.target?.closest?.('.chip[data-chip-kind]');
      if (!chip) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        chip.click();
      }
    };

    document.addEventListener('click', handleChipActivate, true);
    document.addEventListener('keydown', handleKeydown, true);
    chipHandlerInstalled = true;
    return () => {
      document.removeEventListener('click', handleChipActivate, true);
      document.removeEventListener('keydown', handleKeydown, true);
      chipHandlerInstalled = false;
    };
  }

  return {
    clearElement,
    ensureSelectOptions,
    ensureMultiSelectOptions,
    ensureDatalistOptions,
    addListenerById,
    createChip,
    createChipRow,
    appendChipRow,
    readChipTargetFromEl,
    assertNoBareChips,
    installChipNavigation
  };
}
