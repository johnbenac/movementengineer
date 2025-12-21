const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getMovement(state) {
  if (!state?.snapshot || !state.currentMovementId) return null;
  return (state.snapshot.movements || []).find(m => m.id === state.currentMovementId) || null;
}

function renderMovementFormSection(ctx) {
  const state = getState(ctx);
  const movement = getMovement(state);

  const idLabel = document.getElementById('movement-id-label');
  const nameInput = document.getElementById('movement-name');
  const shortInput = document.getElementById('movement-shortName');
  const summaryInput = document.getElementById('movement-summary');
  const tagsInput = document.getElementById('movement-tags');
  const deleteBtn = document.getElementById('btn-delete-movement');
  const saveBtn = document.getElementById('btn-save-movement');

  const fields = [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn].filter(
    Boolean
  );

  if (!idLabel || fields.length !== 6) return;

  if (!state.currentMovementId) {
    idLabel.textContent = '—';
    fields.forEach(el => {
      el.value = '';
      el.disabled = true;
    });
    return;
  }

  if (!movement) {
    idLabel.textContent = '—';
    fields.forEach(el => {
      el.value = '';
      el.disabled = true;
    });
    if (typeof ctx?.update === 'function') {
      ctx.update(prev => ({ ...prev, currentMovementId: null }));
    }
    return;
  }

  fields.forEach(el => {
    el.disabled = false;
  });

  idLabel.textContent = movement.id;
  nameInput.value = movement.name || '';
  shortInput.value = movement.shortName || '';
  summaryInput.value = movement.summary || '';
  tagsInput.value = Array.isArray(movement.tags) ? movement.tags.join(', ') : '';
}

function renderDashboardContent(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  clear(container);

  if (!state.currentMovementId) {
    const p = document.createElement('p');
    p.textContent = 'Create a movement on the left to see a dashboard.';
    container.appendChild(p);
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildMovementDashboardViewModel !== 'function') {
    const p = document.createElement('p');
    p.textContent = 'ViewModels module not loaded.';
    container.appendChild(p);
    return;
  }

  const vm = ViewModels.buildMovementDashboardViewModel(state.snapshot, {
    movementId: state.currentMovementId
  });

  if (!vm?.movement) {
    const p = document.createElement('p');
    p.textContent = 'Selected movement not found in dataset.';
    container.appendChild(p);
    return;
  }

  const title = document.createElement('h2');
  title.textContent = vm.movement.name + (vm.movement.shortName ? ` (${vm.movement.shortName})` : '');
  container.appendChild(title);

  const summary = document.createElement('p');
  summary.textContent = vm.movement.summary || 'No summary yet.';
  container.appendChild(summary);

  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const textCard = document.createElement('div');
  textCard.className = 'stat-card';
  const textHeader = document.createElement('h3');
  textHeader.textContent = 'Texts';
  textCard.appendChild(textHeader);
  const totalText = document.createElement('p');
  totalText.textContent = `Total: ${vm.textStats?.totalTexts ?? 0}`;
  textCard.appendChild(totalText);
  const rootLine = document.createElement('p');
  const maxDepthText =
    vm.textStats && Number.isFinite(vm.textStats.maxDepth) ? ` · Max depth: ${vm.textStats.maxDepth}` : '';
  rootLine.textContent = `Roots: ${vm.textStats?.rootCount || 0}${maxDepthText}`;
  textCard.appendChild(rootLine);
  const depthList = document.createElement('ul');
  Object.entries(vm.textStats?.byDepth || {})
    .sort(([a], [b]) => {
      const na = Number(a);
      const nb = Number(b);
      const aNum = Number.isFinite(na);
      const bNum = Number.isFinite(nb);
      if (aNum && bNum) return na - nb;
      if (aNum) return -1;
      if (bNum) return 1;
      return String(a).localeCompare(String(b));
    })
    .forEach(([depth, count]) => {
      const li = document.createElement('li');
      li.textContent = `Depth ${depth}: ${count}`;
      depthList.appendChild(li);
    });
  textCard.appendChild(depthList);
  statsGrid.appendChild(textCard);

  const entityCard = document.createElement('div');
  entityCard.className = 'stat-card';
  entityCard.innerHTML = `<h3>Entities</h3><p>Total: ${vm.entityStats?.totalEntities ?? 0}</p>`;
  if (vm.entityStats?.byKind) {
    const ul = document.createElement('ul');
    Object.entries(vm.entityStats.byKind).forEach(([kind, count]) => {
      const li = document.createElement('li');
      li.textContent = `${kind}: ${count}`;
      ul.appendChild(li);
    });
    entityCard.appendChild(ul);
  }
  statsGrid.appendChild(entityCard);

  const practiceCard = document.createElement('div');
  practiceCard.className = 'stat-card';
  practiceCard.innerHTML = `<h3>Practices</h3><p>Total: ${vm.practiceStats?.totalPractices ?? 0}</p>`;
  if (vm.practiceStats?.byKind) {
    const ul = document.createElement('ul');
    Object.entries(vm.practiceStats.byKind).forEach(([kind, count]) => {
      const li = document.createElement('li');
      li.textContent = `${kind}: ${count}`;
      ul.appendChild(li);
    });
    practiceCard.appendChild(ul);
  }
  statsGrid.appendChild(practiceCard);

  const eventCard = document.createElement('div');
  eventCard.className = 'stat-card';
  eventCard.innerHTML = `<h3>Events</h3><p>Total: ${vm.eventStats?.totalEvents ?? 0}</p>`;
  if (vm.eventStats?.byRecurrence) {
    const ul = document.createElement('ul');
    Object.entries(vm.eventStats.byRecurrence).forEach(([rec, count]) => {
      const li = document.createElement('li');
      li.textContent = `${rec}: ${count}`;
      ul.appendChild(li);
    });
    eventCard.appendChild(ul);
  }
  statsGrid.appendChild(eventCard);

  const miscCard = document.createElement('div');
  miscCard.className = 'stat-card';
  miscCard.innerHTML =
    '<h3>Other</h3>' +
    `<p>Rules: ${vm.ruleCount ?? 0}</p>` +
    `<p>Claims: ${vm.claimCount ?? 0}</p>` +
    `<p>Media assets: ${vm.mediaCount ?? 0}</p>`;
  statsGrid.appendChild(miscCard);

  container.appendChild(statsGrid);

  const exampleSectionTitle = document.createElement('div');
  exampleSectionTitle.className = 'section-heading';
  exampleSectionTitle.textContent = 'Example nodes';
  container.appendChild(exampleSectionTitle);

  const mkChipRow = (label, items, key) => {
    const heading = document.createElement('div');
    heading.className = 'section-heading';
    heading.style.fontSize = '0.85rem';
    heading.textContent = label;
    container.appendChild(heading);

    if (!items || !items.length) {
      const p = document.createElement('p');
      p.style.fontSize = '0.8rem';
      p.textContent = 'None yet.';
      container.appendChild(p);
      return;
    }

    const row = document.createElement('div');
    row.className = 'chip-row';
    items.forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = item[key] || item.id;
      row.appendChild(chip);
    });
    container.appendChild(row);
  };

  mkChipRow('Key entities', vm.exampleNodes?.keyEntities, 'name');
  mkChipRow('Key practices', vm.exampleNodes?.keyPractices, 'name');
  mkChipRow('Key events', vm.exampleNodes?.keyEvents, 'name');
}

function renderDashboardTab(ctx) {
  renderMovementFormSection(ctx);
  renderDashboardContent(ctx);
}

export function registerDashboardTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'dashboard') return;
        rerender();
      };

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { rerender, unsubscribe };
    },
    render: renderDashboardTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.dashboard = tab;
  if (ctx?.tabs) {
    ctx.tabs.dashboard = tab;
  }
  return tab;
}
