// src/app/ui/chips.js

const DEFAULT_LABEL_KEYS = ['name', 'title', 'shortText', 'text', 'id'];

export const CHIP_KINDS = {
  ITEM: 'item',
  FACET: 'facet'
};

export function defaultChipLabel(item) {
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

function applyDataset(el, dataset = {}) {
  Object.entries(dataset).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    el.dataset[k] = String(v);
  });
}

function applyAttributes(el, attrs = {}) {
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    el.setAttribute(k, String(v));
  });
}

export function applyChipTargetDataset(el, target) {
  if (!el || !target) return;
  el.dataset.rowSelect = 'ignore';
  if (target.kind === CHIP_KINDS.ITEM) {
    if (target.collection) el.dataset.chipCollection = String(target.collection);
    if (target.id) el.dataset.chipId = String(target.id);
    el.dataset.chipKind = CHIP_KINDS.ITEM;
  } else if (target.kind === CHIP_KINDS.FACET) {
    if (target.facet) el.dataset.chipFacet = String(target.facet);
    if (target.value !== undefined && target.value !== null) {
      el.dataset.chipValue = String(target.value);
    }
    if (target.scope) el.dataset.chipScope = String(target.scope);
    el.dataset.chipKind = CHIP_KINDS.FACET;
  }
}

export function readChipTargetFromEl(el) {
  if (!el || !el.dataset) return null;
  const { chipKind, chipCollection, chipId, chipFacet, chipValue, chipScope } = el.dataset;
  if (!chipKind) return null;
  if (chipKind === CHIP_KINDS.ITEM) {
    if (!chipCollection || !chipId) return null;
    return { kind: CHIP_KINDS.ITEM, collection: chipCollection, id: chipId };
  }
  if (chipKind === CHIP_KINDS.FACET) {
    if (!chipFacet || chipValue === undefined) return null;
    return { kind: CHIP_KINDS.FACET, facet: chipFacet, value: chipValue, scope: chipScope || null };
  }
  return null;
}

export function assertNoBareChips(root = document) {
  if (!root?.querySelectorAll) return { total: 0, invalid: 0 };
  const chips = Array.from(root.querySelectorAll('.chip'));
  let invalid = 0;
  chips.forEach(chip => {
    if (!readChipTargetFromEl(chip)) {
      invalid += 1;
      console.error('Chip missing target dataset', chip);
    }
  });
  return { total: chips.length, invalid };
}

/**
 * Creates a single chip element.
 * - variant: 'default' | 'entity' | 'tag'
 * - onClick: if provided, chip becomes keyboard-accessible and marked as role="button"
 * - target: { kind: 'item'|'facet', ... }
 */
export function createChip(item, opts = {}) {
  const {
    variant = 'default',
    className = '',
    label,
    getLabel = defaultChipLabel,
    title,
    getTitle,
    onClick,
    dataset,
    target,
    getTarget,
    attrs,
    tagName = 'button'
  } = opts;

  const el = document.createElement(tagName);
  if (tagName === 'button') {
    el.type = 'button';
  }

  const variantClass =
    variant === 'entity' ? 'chip-entity' : variant === 'tag' ? 'chip-tag' : '';

  el.className = ['chip', variantClass, className].filter(Boolean).join(' ').trim();
  el.dataset.rowSelect = 'ignore';

  const text = label != null ? label : getLabel(item);
  el.textContent = text || '';

  const resolvedTitle =
    title != null ? title : typeof getTitle === 'function' ? getTitle(item) : null;
  if (resolvedTitle) el.title = resolvedTitle;

  const resolvedTarget = typeof getTarget === 'function' ? getTarget(item) : target;
  if (resolvedTarget) applyChipTargetDataset(el, resolvedTarget);

  applyDataset(el, dataset);
  applyAttributes(el, attrs);

  if (typeof onClick === 'function') {
    el.classList.add('clickable');

    if (tagName !== 'button') {
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
    }

    el.addEventListener('click', e => onClick(item, e));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  } else {
    el.classList.add('clickable');
  }

  return el;
}

/**
 * Creates a chip row.
 * - items: array (strings or objects)
 * - wrap: adds `wrap` class
 */
export function createChipRow(items, opts = {}) {
  const { className = '', wrap = false, filter = Boolean, ...chipOpts } = opts;

  const row = document.createElement('div');
  row.className = ['chip-row', wrap ? 'wrap' : '', className].filter(Boolean).join(' ');

  const arr = Array.isArray(items) ? items.filter(filter) : [];
  arr.forEach(item => row.appendChild(createChip(item, chipOpts)));

  return row;
}

export function appendChipRow(container, items, opts = {}) {
  if (!container) return null;
  const row = createChipRow(items, opts);
  container.appendChild(row);
  return row;
}

/**
 * Small label used throughout existing tabs (Calendar/Media use inline headings like "Entities:")
 */
export function appendInlineLabel(container, text, opts = {}) {
  const { fontSize = '0.75rem', className = '' } = opts;
  const el = document.createElement('div');
  if (className) el.className = className;
  el.style.fontSize = fontSize;
  el.textContent = text;
  container.appendChild(el);
  return el;
}

let installed = false;

let handlerCtx = null;

export function installGlobalChipHandlers(ctx, options = {}) {
  handlerCtx = ctx || handlerCtx;
  const doc = options.document || document;
  if (installed) return;
  const onChipActivate = event => {
    const chip = event.target?.closest?.('.chip');
    if (!chip) return;
    const target = readChipTargetFromEl(chip);
    event.preventDefault();
    event.stopPropagation();

    if (!target) {
      console.error('Chip has no target', chip);
      handlerCtx?.setStatus?.('Cannot open chip target');
      return;
    }
    handlerCtx?.actions?.openChipTarget?.(target);
  };

  const onKeyDown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const chip = event.target?.closest?.('.chip');
    if (!chip) return;
    event.preventDefault();
    event.stopPropagation();
    chip.click();
  };

  doc.addEventListener('click', onChipActivate, true);
  doc.addEventListener('keydown', onKeyDown, true);
  installed = true;
}
