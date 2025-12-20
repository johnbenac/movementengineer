const selectedMovementIds = {
  current: null
};

function getMovementId(movement) {
  return movement?.id || movement?.movementId || null;
}

function getClearElement(dom) {
  if (dom && typeof dom.clearElement === 'function') {
    return dom.clearElement;
  }
  return el => {
    if (!el) return;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  };
}

function getMovements(snapshot) {
  const movements = snapshot?.movements;
  if (!Array.isArray(movements)) return [];
  return movements;
}

function getSelectedIds(snapshot) {
  const movements = getMovements(snapshot);
  if (!movements.length) return [];
  const allowedIds = new Set(movements.map(getMovementId).filter(Boolean));
  if (Array.isArray(selectedMovementIds.current) && selectedMovementIds.current.length) {
    const filtered = selectedMovementIds.current.filter(id => allowedIds.has(id));
    if (filtered.length) return filtered;
  }
  return movements.map(getMovementId).filter(Boolean);
}

function renderSelector({ selectorEl, movements, selectedIds, onChange }) {
  movements.forEach(movement => {
    const id = getMovementId(movement);
    if (!id) return;
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = id;
    cb.className = 'cmp-rel';
    cb.checked = selectedIds.includes(id);
    cb.addEventListener('change', () => {
      const checkboxes = Array.from(
        selectorEl.querySelectorAll('input[type="checkbox"]')
      );
      const nextIds = checkboxes.filter(box => box.checked).map(box => box.value);
      onChange(nextIds);
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + (movement.name || id)));
    selectorEl.appendChild(label);
  });
}

function appendMetricRow(table, label, rows, getter) {
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.textContent = label;
  tr.appendChild(th);
  rows.forEach(row => {
    const td = document.createElement('td');
    td.textContent = getter(row);
    tr.appendChild(td);
  });
  table.appendChild(tr);
}

function renderComparisonTable({ wrapperEl, snapshot, selectedIds, viewModels }) {
  const comparisonBuilder = viewModels?.buildComparisonViewModel;
  if (typeof comparisonBuilder !== 'function') {
    const p = document.createElement('p');
    p.textContent = 'ViewModels module not loaded.';
    wrapperEl.appendChild(p);
    return;
  }

  if (!selectedIds.length) {
    const p = document.createElement('p');
    p.textContent = 'Select at least one movement.';
    wrapperEl.appendChild(p);
    return;
  }

  const cmpVm = comparisonBuilder(snapshot, { movementIds: selectedIds });
  const rows = Array.isArray(cmpVm?.rows) ? cmpVm.rows : [];
  if (!rows.length) {
    const p = document.createElement('p');
    p.textContent = 'No data available for comparison.';
    wrapperEl.appendChild(p);
    return;
  }

  const table = document.createElement('table');

  const headerRow = document.createElement('tr');
  const metricTh = document.createElement('th');
  metricTh.textContent = 'Metric';
  headerRow.appendChild(metricTh);

  rows.forEach(row => {
    const th = document.createElement('th');
    th.textContent = row.movement?.name || row.movement?.id || '—';
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  appendMetricRow(table, 'Total texts', rows, r => r.textCounts?.totalTexts ?? 0);
  appendMetricRow(table, 'Roots (depth 0)', rows, r => r.textCounts?.rootCount ?? 0);
  appendMetricRow(table, 'Max depth', rows, r =>
    Number.isFinite(r.textCounts?.maxDepth) ? r.textCounts.maxDepth : '—'
  );
  appendMetricRow(table, 'Entities', rows, r => r.entityCounts?.total ?? 0);
  appendMetricRow(table, 'Practices', rows, r => r.practiceCounts?.total ?? 0);
  appendMetricRow(table, 'Events', rows, r => r.eventCounts?.total ?? 0);
  appendMetricRow(table, 'Rules', rows, r => r.ruleCount ?? 0);
  appendMetricRow(table, 'Claims', rows, r => r.claimCount ?? 0);

  appendMetricRow(table, 'Entities by kind', rows, r =>
    r.entityCounts?.byKind
      ? Object.entries(r.entityCounts.byKind)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : ''
  );

  appendMetricRow(table, 'Practices by kind', rows, r =>
    r.practiceCounts?.byKind
      ? Object.entries(r.practiceCounts.byKind)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : ''
  );

  appendMetricRow(table, 'Events by recurrence', rows, r =>
    r.eventCounts?.byRecurrence
      ? Object.entries(r.eventCounts.byRecurrence)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : ''
  );

  wrapperEl.appendChild(table);
}

function renderComparisonTab(ctx) {
  const selectorEl = document.getElementById('comparison-selector');
  const wrapperEl = document.getElementById('comparison-table-wrapper');
  if (!selectorEl || !wrapperEl) return;
  const clearElement = getClearElement(ctx?.dom);
  clearElement(selectorEl);
  clearElement(wrapperEl);

  const state = ctx?.store?.getState ? ctx.store.getState() : {};
  const snapshot = state?.snapshot || { movements: [] };
  const movements = getMovements(snapshot);
  if (!movements.length) {
    const p = document.createElement('p');
    p.textContent = 'No movements to compare yet.';
    selectorEl.appendChild(p);
    return;
  }

  const selectedIds = getSelectedIds(snapshot);
  renderSelector({
    selectorEl,
    movements,
    selectedIds,
    onChange: ids => {
      selectedMovementIds.current = ids;
      renderComparisonTab(ctx);
    }
  });

  renderComparisonTable({
    wrapperEl,
    snapshot,
    selectedIds,
    viewModels: ctx?.services?.ViewModels
  });
}

const comparisonTab = {
  render: renderComparisonTab
};

export function registerComparisonTab(ctx) {
  const movementEngineer = window.MovementEngineer || (window.MovementEngineer = {});
  movementEngineer.tabs = movementEngineer.tabs || {};
  selectedMovementIds.current = null;
  movementEngineer.tabs.comparison = comparisonTab;
  if (typeof comparisonTab.mount === 'function') {
    comparisonTab.mount(ctx);
  }
}
