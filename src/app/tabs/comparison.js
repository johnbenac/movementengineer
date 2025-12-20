const SELECTOR_ID = 'comparison-selector';
const TABLE_WRAPPER_ID = 'comparison-table-wrapper';

let selectedMovementIds = null;

function ensureTabRegistry() {
  const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
  movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};
  return movementEngineerGlobal.tabs;
}

function renderMessage(target, text) {
  if (!target) return;
  const p = document.createElement('p');
  p.textContent = text;
  target.appendChild(p);
}

function filterSelectedIds(snapshot) {
  const movements = Array.isArray(snapshot?.movements) ? snapshot.movements : [];
  if (selectedMovementIds === null) {
    selectedMovementIds = movements.map(movement => movement.id).filter(Boolean);
  } else {
    const availableIds = new Set(movements.map(movement => movement.id).filter(Boolean));
    selectedMovementIds = selectedMovementIds.filter(id => availableIds.has(id));
  }
  return selectedMovementIds;
}

function handleMovementSelectionChange(ctx) {
  selectedMovementIds = Array.from(
    document.querySelectorAll(`#${SELECTOR_ID} .cmp-rel:checked`)
  ).map(cb => cb.value);
  renderComparisonTab(ctx);
}

function renderSelector(snapshot, ctx, selectedIds) {
  const selector = document.getElementById(SELECTOR_ID);
  if (!selector) return;
  ctx.dom.clearElement(selector);

  snapshot.movements.forEach(movement => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = movement.id;
    checkbox.className = 'cmp-rel';
    checkbox.checked = selectedIds.includes(movement.id);
    checkbox.addEventListener('change', () => handleMovementSelectionChange(ctx));
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${movement.name || movement.id}`));
    selector.appendChild(label);
  });
}

function renderMetricRow(label, rows, getter) {
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.textContent = label;
  tr.appendChild(th);
  rows.forEach(row => {
    const td = document.createElement('td');
    td.textContent = getter(row);
    tr.appendChild(td);
  });
  return tr;
}

function renderComparisonTable(snapshot, ctx, selectedIds) {
  const wrapper = document.getElementById(TABLE_WRAPPER_ID);
  if (!wrapper) return;
  ctx.dom.clearElement(wrapper);

  const viewModels = ctx.services?.ViewModels;
  if (!viewModels || typeof viewModels.buildComparisonViewModel !== 'function') {
    renderMessage(wrapper, 'ViewModels module not loaded.');
    return;
  }

  if (!selectedIds.length) {
    renderMessage(wrapper, 'Select at least one movement.');
    return;
  }

  const comparisonVm = viewModels.buildComparisonViewModel(snapshot, {
    movementIds: selectedIds
  });

  const rows = comparisonVm?.rows || [];
  if (!rows.length) {
    renderMessage(wrapper, 'No data available for comparison.');
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

  table.appendChild(renderMetricRow('Total texts', rows, r => r.textCounts.totalTexts ?? 0));
  table.appendChild(renderMetricRow('Roots (depth 0)', rows, r => r.textCounts.rootCount ?? 0));
  table.appendChild(
    renderMetricRow('Max depth', rows, r =>
      Number.isFinite(r.textCounts.maxDepth) ? r.textCounts.maxDepth : '—'
    )
  );
  table.appendChild(renderMetricRow('Entities', rows, r => r.entityCounts.total ?? 0));
  table.appendChild(renderMetricRow('Practices', rows, r => r.practiceCounts.total ?? 0));
  table.appendChild(renderMetricRow('Events', rows, r => r.eventCounts.total ?? 0));
  table.appendChild(renderMetricRow('Rules', rows, r => r.ruleCount ?? 0));
  table.appendChild(renderMetricRow('Claims', rows, r => r.claimCount ?? 0));
  table.appendChild(
    renderMetricRow('Entities by kind', rows, r =>
      r.entityCounts.byKind
        ? Object.entries(r.entityCounts.byKind)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    )
  );
  table.appendChild(
    renderMetricRow('Practices by kind', rows, r =>
      r.practiceCounts.byKind
        ? Object.entries(r.practiceCounts.byKind)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    )
  );
  table.appendChild(
    renderMetricRow('Events by recurrence', rows, r =>
      r.eventCounts.byRecurrence
        ? Object.entries(r.eventCounts.byRecurrence)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    )
  );

  wrapper.appendChild(table);
}

export function renderComparisonTab(ctx) {
  if (!ctx) return;
  const state = ctx.store?.getState ? ctx.store.getState() : {};
  const snapshot = state?.snapshot;
  const selector = document.getElementById(SELECTOR_ID);
  const wrapper = document.getElementById(TABLE_WRAPPER_ID);
  if (!selector || !wrapper) return;

  ctx.dom.clearElement(selector);
  ctx.dom.clearElement(wrapper);

  if (!snapshot || !Array.isArray(snapshot.movements) || snapshot.movements.length === 0) {
    selectedMovementIds = null;
    renderMessage(selector, 'No movements to compare yet.');
    return;
  }

  const selectedIds = filterSelectedIds(snapshot);
  renderSelector(snapshot, ctx, selectedIds);
  renderComparisonTable(snapshot, ctx, selectedIds);
}

export function registerComparisonTab(ctx) {
  selectedMovementIds = null;
  const tabs = ensureTabRegistry();
  tabs.comparison = {
    mount: currentCtx => {
      if (!selectedMovementIds) {
        filterSelectedIds(currentCtx.store?.getState()?.snapshot);
      }
    },
    render: renderComparisonTab
  };
}
