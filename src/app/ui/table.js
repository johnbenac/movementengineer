// src/app/ui/table.js

export const DEFAULT_INTERACTIVE_TARGET_SELECTOR =
  'a[href], button, input, select, textarea, option, label, [role="button"], [data-row-select="ignore"]';

export function isInteractiveTarget(target, selector = DEFAULT_INTERACTIVE_TARGET_SELECTOR) {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest(selector));
}

function clearElement(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function isNode(value) {
  return value && typeof value === 'object' && typeof value.nodeType === 'number';
}

function appendCellContent(cell, content) {
  if (content === undefined || content === null) return;

  if (isNode(content)) {
    cell.appendChild(content);
    return;
  }

  if (Array.isArray(content)) {
    content.forEach(part => appendCellContent(cell, part));
    return;
  }

  cell.textContent = String(content);
}

function dataKeyToAttr(key) {
  // dataset key -> attribute name
  // rowId => data-row-id
  return (
    'data-' +
    String(key)
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
  );
}

/**
 * Generic table renderer:
 * - columns: [{ header, render(row), tdClassName?, thClassName?, cellTag? }]
 * - rows: array
 * - getRowId(row) -> string
 * - selectedId: sets `selected` class initially
 * - onRowSelect(id, row, event): called when a row is clicked (non-interactive target)
 * - renderEmpty(wrapper): use this to call renderHint(wrapper, ...)
 */
export function renderTable(wrapper, config = {}) {
  const {
    columns = [],
    rows = [],
    getRowId = row => row?.id,
    selectedId = null,
    onRowSelect = null,

    // classes/attributes
    tableClassName = '',
    rowClassName = 'clickable-row',
    selectedClassName = 'selected',
    rowIdDataKey = 'rowId',

    // clearing/empty state
    clear = clearElement,
    renderEmpty = null,
    emptyMessage = null,

    // click guard
    interactiveTargetSelector = DEFAULT_INTERACTIVE_TARGET_SELECTOR
  } = config;

  if (!wrapper) return null;

  clear(wrapper);

  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    if (typeof renderEmpty === 'function') {
      renderEmpty(wrapper);
    } else if (emptyMessage) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = emptyMessage;
      wrapper.appendChild(p);
    }
    return null;
  }

  const table = document.createElement('table');
  if (tableClassName) table.className = tableClassName;

  // Header row (match existing structure: <tr> directly under <table>)
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.header || '';
    if (col.thClassName) th.className = col.thClassName;
    if (col.width) th.style.width = col.width;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  const idAttr = dataKeyToAttr(rowIdDataKey);

  // Build row index for O(1) lookup in click handler
  const rowById = new Map();
  safeRows.forEach(r => {
    const id = getRowId(r);
    if (id !== undefined && id !== null) rowById.set(String(id), r);
  });

  safeRows.forEach(row => {
    const tr = document.createElement('tr');
    const id = getRowId(row);

    if (rowClassName) {
      rowClassName
        .split(' ')
        .filter(Boolean)
        .forEach(cls => tr.classList.add(cls));
    }

    if (id !== undefined && id !== null) {
      tr.dataset[rowIdDataKey] = String(id);
      if (selectedId !== null && String(selectedId) === String(id)) {
        tr.classList.add(selectedClassName);
      }
    }

    columns.forEach(col => {
      const cellTag = col.cellTag || 'td';
      const cell = document.createElement(cellTag);

      if (col.tdClassName) cell.className = col.tdClassName;

      const content = typeof col.render === 'function' ? col.render(row) : '';
      appendCellContent(cell, content);

      tr.appendChild(cell);
    });

    table.appendChild(tr);
  });

  if (typeof onRowSelect === 'function') {
    table.addEventListener('click', event => {
      if (isInteractiveTarget(event.target, interactiveTargetSelector)) return;

      const tr = event.target.closest(`tr[${idAttr}]`);
      if (!tr) return;

      const id = tr.dataset[rowIdDataKey];
      if (!id) return;

      // Toggle selected class in DOM (so callers don’t have to manually)
      const prev = table.querySelector(`tr.${selectedClassName}`);
      if (prev && prev !== tr) prev.classList.remove(selectedClassName);
      tr.classList.add(selectedClassName);

      const row = rowById.get(String(id)) || null;
      onRowSelect(id, row, event);
    });
  }

  wrapper.appendChild(table);
  return table;
}

/**
 * Small helper for tables that need a list in a cell (Rules supporting claims)
 */
export function createTextList(items, getText) {
  const ul = document.createElement('ul');
  (Array.isArray(items) ? items : []).forEach(it => {
    const li = document.createElement('li');
    li.textContent = typeof getText === 'function' ? getText(it) : String(it);
    ul.appendChild(li);
  });
  return ul;
}
