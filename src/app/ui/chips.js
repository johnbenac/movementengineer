// src/app/ui/chips.js

const DEFAULT_LABEL_KEYS = ['name', 'title', 'shortText', 'text', 'id'];

const CHIP_KIND_ITEM = 'item';
const CHIP_KIND_FACET = 'facet';

let globalHandlersAttached = false;
let handlerCtx = null;

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

function normaliseTarget(target, item, getTarget) {
  if (target) return target;
  if (typeof getTarget === 'function') return getTarget(item) || null;
  return null;
}

function applyTargetDataset(el, target) {
  if (!target || !target.kind) throw new Error('Chip target is required');
  const { kind } = target;
  if (kind === CHIP_KIND_ITEM) {
    if (!target.collection || !target.id) {
      throw new Error('Item chip requires collection and id');
    }
    el.dataset.chipKind = CHIP_KIND_ITEM;
    el.dataset.chipCollection = target.collection;
    el.dataset.chipId = target.id;
  } else if (kind === CHIP_KIND_FACET) {
    if (!target.facet || target.value === undefined || target.value === null) {
      throw new Error('Facet chip requires facet and value');
    }
    el.dataset.chipKind = CHIP_KIND_FACET;
    el.dataset.chipFacet = target.facet;
    el.dataset.chipValue = target.value;
    if (target.scope) el.dataset.chipScope = target.scope;
  } else {
    throw new Error(`Unknown chip kind: ${kind}`);
  }
  el.dataset.rowSelect = 'ignore';
}

export function readChipTargetFromEl(el) {
  if (!el) return null;
  const dataset = el.dataset || {};
  if (!dataset.chipKind) return null;
  if (dataset.chipKind === CHIP_KIND_ITEM) {
    const { chipCollection: collection, chipId: id } = dataset;
    if (!collection || !id) return null;
    return { kind: CHIP_KIND_ITEM, collection, id };
  }
  if (dataset.chipKind === CHIP_KIND_FACET) {
    const { chipFacet: facet, chipValue: value, chipScope: scope } = dataset;
    if (!facet || value === undefined) return null;
    return { kind: CHIP_KIND_FACET, facet, value, scope: scope || undefined };
  }
  return null;
}

function attachKeyboardActivation(el) {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
}

/**
 * Creates a single chip element.
 * - variant: 'default' | 'entity' | 'tag'
 */
export function createChip(item, opts = {}) {
  const {
    variant = 'default',
    className = '',
    label,
    getLabel = defaultChipLabel,
    title,
    getTitle,
    target,
    getTarget,
    attrs,
    tagName = 'button',
    type = 'button'
  } = opts;

  const el = document.createElement(tagName);

  const variantClass =
    variant === 'entity' ? 'chip-entity' : variant === 'tag' ? 'chip-tag' : '';

  el.className = ['chip', variantClass, className].filter(Boolean).join(' ').trim();
  el.classList.add('clickable');

  if (tagName === 'button') el.type = type;

  const text = label != null ? label : getLabel(item);
  el.textContent = text || '';

  const resolvedTitle =
    title != null ? title : typeof getTitle === 'function' ? getTitle(item) : null;
  if (resolvedTitle) el.title = resolvedTitle;

  const chipTarget = normaliseTarget(target, item, getTarget);
  applyTargetDataset(el, chipTarget);

  if (attrs && typeof attrs === 'object') {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      el.setAttribute(k, String(v));
    });
  }

  attachKeyboardActivation(el);

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

export function appendInlineLabel(container, text, opts = {}) {
  const { fontSize = '0.75rem', className = '' } = opts;
  const el = document.createElement('div');
  if (className) el.className = className;
  el.style.fontSize = fontSize;
  el.textContent = text;
  container.appendChild(el);
  return el;
}

export function attachGlobalChipHandlers(ctx) {
  if (ctx) handlerCtx = ctx;
  if (globalHandlersAttached) return;
  const handleClick = event => {
    const context = handlerCtx;
    const chip = event.target.closest?.('.chip');
    if (!chip) return;
    event.preventDefault();
    event.stopPropagation();
    const target = readChipTargetFromEl(chip);
    if (!target) {
      console.error('Chip missing target', chip);
      return;
    }
    if (typeof context?.actions?.openChipTarget === 'function') {
      context.actions.openChipTarget(target);
      return;
    }

    if (target.kind === CHIP_KINDS.FACET) {
      context?.actions?.openFacet?.(target.facet, target.value, target.scope);
      return;
    }

    if (target.kind === CHIP_KINDS.ITEM) {
      const jumpAction =
        (target.collection === 'practices' && context?.actions?.jumpToPractice) ||
        (target.collection === 'entities' && context?.actions?.jumpToEntity) ||
        (target.collection === 'texts' && context?.actions?.jumpToText);
      if (typeof jumpAction === 'function') {
        jumpAction(target.id);
        return;
      }
      context?.actions?.jumpToReferencedItem?.(target.collection, target.id);
    }
  };

  document.addEventListener('click', handleClick, true);
  globalHandlersAttached = true;
}

export function assertNoBareChips(root = document) {
  const chips = root?.querySelectorAll?.('.chip') || [];
  chips.forEach(chip => {
    const target = readChipTargetFromEl(chip);
    if (!target) {
      console.error('Bare chip found (missing target)', chip);
    }
  });
}

export const CHIP_KINDS = {
  ITEM: CHIP_KIND_ITEM,
  FACET: CHIP_KIND_FACET
};
