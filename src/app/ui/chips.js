// src/app/ui/chips.js

const DEFAULT_LABEL_KEYS = ['name', 'title', 'shortText', 'text', 'id'];
let globalChipHandlerInstalled = false;
const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
const colorScheme =
  globalScope?.MovementEngineerColors || globalScope?.EntityGraphColors || null;

export function defaultChipLabel(item) {
  if (item === undefined || item === null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);

  for (const k of DEFAULT_LABEL_KEYS) {
    if (item && item[k]) return String(item[k]);
  }
  if (item && item.id) return String(item.id);
  return '[no label]';
}

const variantClassName = variant =>
  variant === 'entity' ? 'chip-entity' : variant === 'tag' ? 'chip-tag' : '';

function isNode(value) {
  return value && typeof value === 'object' && typeof value.nodeType === 'number';
}

function shouldIgnoreChipEvent(event) {
  const actionEl = event?.target?.closest?.('[data-chip-action="true"]');
  if (actionEl && actionEl.closest?.('.chip')) return true;
  return false;
}

function normaliseChipTarget(target) {
  if (!target || typeof target !== 'object') return null;
  const kind = target.kind || target.type || target.targetKind || null;
  if (kind === 'item') {
    if (!target.collection || !target.id) return null;
    return {
      kind: 'item',
      collection: String(target.collection),
      id: String(target.id)
    };
  }
  if (kind === 'facet') {
    if (!target.facet || target.value === undefined || target.value === null) return null;
    return {
      kind: 'facet',
      facet: String(target.facet),
      value: String(target.value),
      scope: target.scope ? String(target.scope) : undefined
    };
  }
  return null;
}

function applyChipTargetDataset(el, target) {
  const normalised = normaliseChipTarget(target);
  if (!el || !normalised) return false;
  el.dataset.chipKind = normalised.kind;
  if (normalised.kind === 'item') {
    el.dataset.chipCollection = normalised.collection;
    el.dataset.chipId = normalised.id;
  } else if (normalised.kind === 'facet') {
    el.dataset.chipFacet = normalised.facet;
    el.dataset.chipValue = normalised.value;
    if (normalised.scope) el.dataset.chipScope = normalised.scope;
  }
  el.dataset.rowSelect = 'ignore';
  return true;
}

export function createChipDescriptor(item, opts = {}) {
  const {
    variant = 'default',
    className = '',
    label,
    getLabel = defaultChipLabel,
    title,
    getTitle,
    target,
    getTarget
  } = opts;

  return {
    label: label != null ? label : getLabel(item),
    title: title != null ? title : typeof getTitle === 'function' ? getTitle(item) : null,
    target: typeof getTarget === 'function' ? getTarget(item) : target,
    variant,
    className
  };
}

/**
 * Creates a single chip element as an interactive control (button by default).
 */
export function createChip(descriptor = {}) {
  const {
    variant = 'default',
    className = '',
    label = '',
    title = '',
    target = null,
    tagName = 'button',
    attrs
  } = descriptor;

  const normalizedTarget = normaliseChipTarget(target);
  const el = document.createElement(tagName || 'button');
  if (el.tagName === 'BUTTON') el.type = 'button';
  const classes = ['chip', variantClassName(variant), className];
  if (normalizedTarget?.kind === 'item') classes.push('clickable');
  el.className = classes.filter(Boolean).join(' ').trim();
  el.textContent = label || '';
  if (title) el.title = title;

  if (!applyChipTargetDataset(el, normalizedTarget || target)) {
    console.error('Chip created without a valid target', descriptor);
    el.dataset.chipInvalid = 'true';
  }
  el.dataset.rowSelect = 'ignore';

  const chipColor =
    colorScheme?.colorForChipTarget?.(normalizedTarget || target) ||
    (normalizedTarget?.kind === 'item' &&
      colorScheme?.colorForCollection?.(normalizedTarget.collection)) ||
    null;
  if (chipColor && colorScheme?.deriveSurfaceColors) {
    const surface = colorScheme.deriveSurfaceColors(chipColor);
    el.style.setProperty('--chip-accent', surface.base);
    el.style.setProperty('--chip-bg', surface.background);
    el.style.setProperty('--chip-border', surface.border);
    el.style.setProperty('--chip-text', surface.text);
    el.style.setProperty('--chip-hover', surface.hover);
    el.style.setProperty('--chip-border-hover', surface.borderHover);
  }

  if (attrs && typeof attrs === 'object') {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      el.setAttribute(k, String(v));
    });
  }

  // Ensure accessibility even if the tag is changed.
  if (el.tagName !== 'BUTTON' && !el.hasAttribute('role')) el.setAttribute('role', 'button');
  if (el.tabIndex < 0) el.tabIndex = 0;

  return el;
}

function appendNodeOrText(parent, value, className) {
  if (value === undefined || value === null) return null;
  if (isNode(value)) {
    if (className && value.classList) value.classList.add(className);
    parent.appendChild(value);
    return value;
  }
  const el = document.createElement('div');
  if (className) el.className = className;
  el.textContent = String(value);
  parent.appendChild(el);
  return el;
}

export function createChipTile(descriptor = {}) {
  const {
    className = '',
    title = '',
    meta = null,
    actions = null,
    children = null,
    tagName = 'div'
  } = descriptor;

  const chip = createChip({
    ...descriptor,
    tagName: tagName || 'div',
    className: ['chip-tile', className].filter(Boolean).join(' '),
    label: descriptor.label ?? '',
    title: descriptor.title ?? title
  });

  chip.textContent = '';

  appendNodeOrText(chip, title, 'chip-title');
  appendNodeOrText(chip, meta, 'meta');

  const kids = Array.isArray(children) ? children : children ? [children] : [];
  kids.forEach(child => {
    if (child) chip.appendChild(child);
  });

  const actionEls = Array.isArray(actions) ? actions.filter(Boolean) : [];
  if (actionEls.length) {
    const actionsRow = document.createElement('div');
    actionsRow.className = 'inline-actions';
    actionEls.forEach(actionEl => actionsRow.appendChild(actionEl));
    chip.appendChild(actionsRow);
  }

  return chip;
}

/**
 * Creates a chip row.
 * - items: array (strings or objects)
 * - wrap: adds `wrap` class
 * - getTarget: derive the chip target from an item
 */
export function createChipRow(items, opts = {}) {
  const { className = '', wrap = false, filter = Boolean, ...chipOpts } = opts;

  const row = document.createElement('div');
  row.className = ['chip-row', wrap ? 'wrap' : '', className].filter(Boolean).join(' ');

  const arr = Array.isArray(items) ? items.filter(filter) : [];
  arr.forEach(item => row.appendChild(createChip(createChipDescriptor(item, chipOpts))));

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

export function readChipTargetFromEl(el) {
  if (!el || !el.dataset) return null;
  const kind = el.dataset.chipKind;
  if (!kind) return null;
  if (kind === 'item') {
    const collection = el.dataset.chipCollection;
    const id = el.dataset.chipId;
    if (!collection || !id) return null;
    return { kind: 'item', collection, id };
  }
  if (kind === 'facet') {
    const facet = el.dataset.chipFacet;
    const value = el.dataset.chipValue;
    if (!facet || value === undefined) return null;
    return {
      kind: 'facet',
      facet,
      value,
      scope: el.dataset.chipScope || undefined
    };
  }
  return null;
}

export function assertNoBareChips(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return true;
  const chips = Array.from(root.querySelectorAll('.chip'));
  const bare = chips.filter(chip => !readChipTargetFromEl(chip));
  if (bare.length) {
    console.error('Bare chips detected (missing data-chip-* target)', bare);
    return false;
  }
  return true;
}

function activateChip(event, ctx) {
  if (shouldIgnoreChipEvent(event)) return;
  const chip = event.target?.closest?.('.chip');
  if (!chip) return;
  const target = readChipTargetFromEl(chip);
  const actions = ctx?.actions || {};

  event.preventDefault();
  event.stopPropagation();

  if (!target) {
    console.error('Chip missing target dataset', chip);
    ctx?.setStatus?.('Chip is missing its target');
    return;
  }

  let handled = false;

  if (typeof actions.openChipTarget === 'function') {
    const result = actions.openChipTarget(target);
    handled = result !== false;
  } else if (target.kind === 'facet' && typeof actions.openFacet === 'function') {
    actions.openFacet(target.facet, target.value, target.scope);
    handled = true;
  } else if (target.kind === 'item') {
    if (target.collection === 'practices' && typeof actions.jumpToPractice === 'function') {
      actions.jumpToPractice(target.id);
      handled = true;
    } else if (target.collection === 'entities' && typeof actions.jumpToEntity === 'function') {
      actions.jumpToEntity(target.id);
      handled = true;
    } else if (target.collection === 'texts' && typeof actions.jumpToText === 'function') {
      actions.jumpToText(target.id);
      handled = true;
    } else if (typeof actions.jumpToReferencedItem === 'function') {
      actions.jumpToReferencedItem(target.collection, target.id);
      handled = true;
    }
  }

  if (!handled) {
    console.warn('Chip target did not navigate', target);
  }
}

export function installGlobalChipHandler(ctx) {
  if (globalChipHandlerInstalled || typeof document === 'undefined') return () => {};
  const onClick = event => activateChip(event, ctx);
  const onKeyDown = event => {
    if (!event.target?.closest?.('.chip')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      activateChip(event, ctx);
    }
  };
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  globalChipHandlerInstalled = true;
  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    globalChipHandlerInstalled = false;
  };
}
