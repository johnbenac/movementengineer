let selectedMovementIds = null;

function getSelectedMovementIds(snapshot) {
  const movements = Array.isArray(snapshot?.movements) ? snapshot.movements : [];
  const movementIds = movements.map(m => m.id).filter(Boolean);
  if (!movementIds.length) {
    selectedMovementIds = null;
    return [];
  }
  if (!Array.isArray(selectedMovementIds) || !selectedMovementIds.length) {
    return movementIds;
  }
  const allowed = new Set(movementIds);
  const filtered = selectedMovementIds.filter(id => allowed.has(id));
  return filtered.length ? filtered : movementIds;
}

function renderComparisonSelector(snapshot, selectedIds, ctx, onSelectionChange) {
  const selector = document.getElementById('comparison-selector');
  if (!selector) return;

  ctx.dom.clearElement(selector);

  const movements = Array.isArray(snapshot.movements) ? snapshot.movements : [];

  if (!movements.length) {
    const p = document.createElement('p');
    p.textContent = 'No movements to compare yet.';
    selector.appendChild(p);
    return;
  }

  movements.forEach(rel => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = rel.id;
    cb.className = 'cmp-rel';
    cb.checked = selectedIds.includes(rel.id);
    cb.addEventListener('change', () => {
      const nextSelected = Array.from(
        selector.querySelectorAll('.cmp-rel:checked')
      ).map(input => input.value);
      selectedMovementIds = nextSelected;
      onSelectionChange(selectedMovementIds);
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + (rel.name || rel.id)));
    selector.appendChild(label);
  });
}

function renderComparisonTable(snapshot, selectedIds, ctx) {
  const wrapper = document.getElementById('comparison-table-wrapper');
  if (!wrapper) return;

  ctx.dom.clearElement(wrapper);

  if (!ctx.services?.ViewModels) {
    const p = document.createElement('p');
    p.textContent = 'ViewModels module not loaded.';
    wrapper.appendChild(p);
    return;
  }

  const effectiveSelection = Array.isArray(selectedIds) ? selectedIds : [];
  if (!effectiveSelection.length) {
    const p = document.createElement('p');
    p.textContent = 'Select at least one movement.';
    wrapper.appendChild(p);
    return;
  }

  const cmpVm = ctx.services.ViewModels.buildComparisonViewModel(snapshot, {
    movementIds: effectiveSelection
  });

  const rows = cmpVm?.rows || [];
  if (!rows.length) {
    const p = document.createElement('p');
    p.textContent = 'No data available for comparison.';
    wrapper.appendChild(p);
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

export function registerComparisonTab(ctx) {
  selectedMovementIds = null;
  const tab = {
    render(renderCtx = ctx) {
      const state = renderCtx.store.getState();
      const snapshot = state.snapshot || { movements: [] };
      const selectedIds = getSelectedMovementIds(snapshot);

      selectedMovementIds = selectedIds;

      renderComparisonSelector(snapshot, selectedIds, renderCtx, nextIds => {
        const updatedSelection = nextIds && nextIds.length ? nextIds : [];
        renderComparisonTable(snapshot, updatedSelection, renderCtx);
      });
      renderComparisonTable(snapshot, selectedIds, renderCtx);
    }
  };

  window.MovementEngineer.tabs.comparison = tab;
  return tab;
}
