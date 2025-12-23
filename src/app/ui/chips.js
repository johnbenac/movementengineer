// src/app/ui/chips.js

const DEFAULT_LABEL_KEYS = ['name', 'title', 'shortText', 'text', 'id'];

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

/**
 * Creates a single chip element.
 * - variant: 'default' | 'entity' | 'tag'
 * - onClick: if provided, chip becomes keyboard-accessible and marked as role="button"
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
    attrs,
    tagName = 'span'
  } = opts;

  const el = document.createElement(tagName);

  const variantClass =
    variant === 'entity' ? 'chip-entity' : variant === 'tag' ? 'chip-tag' : '';

  el.className = ['chip', variantClass, className].filter(Boolean).join(' ').trim();

  const text = label != null ? label : getLabel(item);
  el.textContent = text || '';

  const resolvedTitle =
    title != null ? title : typeof getTitle === 'function' ? getTitle(item) : null;
  if (resolvedTitle) el.title = resolvedTitle;

  if (dataset && typeof dataset === 'object') {
    Object.entries(dataset).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      el.dataset[k] = String(v);
    });
  }

  if (attrs && typeof attrs === 'object') {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      el.setAttribute(k, String(v));
    });
  }

  if (typeof onClick === 'function') {
    el.classList.add('clickable');

    // Important: make chips count as "interactive targets" inside clickable table rows.
    // Your existing interactive guard checks [role="button"].
    el.setAttribute('role', 'button');
    el.tabIndex = 0;

    el.addEventListener('click', e => onClick(item, e));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
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
