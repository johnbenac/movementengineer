const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

let selectedMovementIds = null;

function getMovementIds(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.movements)) return [];
  return snapshot.movements.map(movement => movement.id).filter(Boolean);
}

function getSelectedMovementIds(snapshot) {
  const available = getMovementIds(snapshot);
  if (selectedMovementIds === null) {
    return available;
  }
  const normalizedSelection = selectedMovementIds.filter(Boolean);
  const filtered = available.filter(id => normalizedSelection.includes(id));
  return filtered;
}

function setSelectedMovementId(snapshot, movementId, checked) {
  const available = getMovementIds(snapshot);
  const currentSelection =
    selectedMovementIds === null ? available : selectedMovementIds.filter(Boolean);
  const desired = new Set(
    currentSelection.filter(id => id !== movementId && available.includes(id))
  );
  if (checked) desired.add(movementId);
  selectedMovementIds = available.filter(id => desired.has(id));
}

function renderMessage(target, text) {
  const p = document.createElement('p');
  p.textContent = text;
  target.appendChild(p);
}

function renderComparisonTable({ wrapper, snapshot, viewModels, movementIds, clear }) {
  clear(wrapper);

  if (!movementIds.length) {
    renderMessage(wrapper, 'Select at least one movement.');
    return;
  }

  const cmpVm = viewModels.buildComparisonViewModel(snapshot, { movementIds });
  const rows = cmpVm?.rows || [];
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

  function addMetricRow(label, getter) {
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

  addMetricRow('Total texts', r => r.textCounts?.totalTexts ?? 0);
  addMetricRow('Roots (depth 0)', r => r.textCounts?.rootCount ?? 0);
  addMetricRow('Max depth', r =>
    Number.isFinite(r.textCounts?.maxDepth) ? r.textCounts.maxDepth : '—'
  );
  addMetricRow('Entities', r => r.entityCounts?.total ?? 0);
  addMetricRow('Practices', r => r.practiceCounts?.total ?? 0);
  addMetricRow('Events', r => r.eventCounts?.total ?? 0);
  addMetricRow('Rules', r => r.ruleCount ?? 0);
  addMetricRow('Claims', r => r.claimCount ?? 0);

  addMetricRow('Entities by kind', r =>
    r.entityCounts?.byKind
      ? Object.entries(r.entityCounts.byKind)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : ''
  );

  addMetricRow('Practices by kind', r =>
    r.practiceCounts?.byKind
      ? Object.entries(r.practiceCounts.byKind)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : ''
  );

  addMetricRow('Events by recurrence', r =>
    r.eventCounts?.byRecurrence
      ? Object.entries(r.eventCounts.byRecurrence)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : ''
  );

  wrapper.appendChild(table);
}

function renderComparisonTab(ctx) {
  const clear = ctx.dom.clearElement;
  const selector = document.getElementById('comparison-selector');
  const wrapper = document.getElementById('comparison-table-wrapper');
  if (!selector || !wrapper) return;

  clear(selector);
  clear(wrapper);

  const state = ctx.store.getState();
  const snapshot = state.snapshot;
  const movements = Array.isArray(snapshot?.movements) ? snapshot.movements : [];
  if (!movements.length) {
    renderMessage(selector, 'No movements to compare yet.');
    return;
  }

  const movementIds = getSelectedMovementIds(snapshot);

  movements.forEach(movement => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = movement.id;
    checkbox.className = 'cmp-rel';
    checkbox.checked = movementIds.includes(movement.id);
    checkbox.addEventListener('change', () => {
      setSelectedMovementId(snapshot, movement.id, checkbox.checked);
      renderComparisonTab(ctx);
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${movement.name || movement.id}`));
    selector.appendChild(label);
  });

  renderComparisonTable({
    wrapper,
    snapshot,
    viewModels: ctx.services.ViewModels,
    movementIds,
    clear
  });
}

export function registerComparisonTab(ctx) {
  const tab = {
    mount(context) {
      selectedMovementIds = null;
    },
    render: renderComparisonTab,
    unmount() {
      selectedMovementIds = null;
    }
  };

  movementEngineerGlobal.tabs.comparison = tab;
  if (ctx?.tabs) {
    ctx.tabs.comparison = tab;
  }
  return tab;
}
