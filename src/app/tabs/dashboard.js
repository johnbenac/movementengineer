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

function mkStatCard(title, bodyBuilder) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  const heading = document.createElement('h3');
  heading.textContent = title;
  card.appendChild(heading);
  bodyBuilder(card);
  return card;
}

function mkChipRow(container, label, items, key) {
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
}

function renderDashboardTab(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const container = document.getElementById('dashboard-content');
  if (!container) return;
  clear(container);

  if (!currentMovementId) {
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

  const vm = ViewModels.buildMovementDashboardViewModel(snapshot, {
    movementId: currentMovementId
  });

  if (!vm?.movement) {
    const p = document.createElement('p');
    p.textContent = 'Selected movement not found in dataset.';
    container.appendChild(p);
    return;
  }

  const title = document.createElement('h2');
  title.textContent =
    vm.movement.name + (vm.movement.shortName ? ` (${vm.movement.shortName})` : '');
  container.appendChild(title);

  const summary = document.createElement('p');
  summary.textContent = vm.movement.summary || 'No summary yet.';
  container.appendChild(summary);

  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const textCard = mkStatCard('Texts', card => {
    const totalText = document.createElement('p');
    totalText.textContent = `Total: ${vm.textStats.totalTexts}`;
    card.appendChild(totalText);

    const rootLine = document.createElement('p');
    const maxDepthText = Number.isFinite(vm.textStats.maxDepth)
      ? ` · Max depth: ${vm.textStats.maxDepth}`
      : '';
    rootLine.textContent = `Roots: ${vm.textStats.rootCount || 0}${maxDepthText}`;
    card.appendChild(rootLine);

    const depthList = document.createElement('ul');
    Object.entries(vm.textStats.byDepth || {})
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
    card.appendChild(depthList);
  });
  statsGrid.appendChild(textCard);

  const entityCard = mkStatCard('Entities', card => {
    const total = document.createElement('p');
    total.textContent = `Total: ${vm.entityStats.totalEntities}`;
    card.appendChild(total);
    if (vm.entityStats.byKind) {
      const ul = document.createElement('ul');
      Object.entries(vm.entityStats.byKind).forEach(([kind, count]) => {
        const li = document.createElement('li');
        li.textContent = `${kind}: ${count}`;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
  });
  statsGrid.appendChild(entityCard);

  const practiceCard = mkStatCard('Practices', card => {
    const total = document.createElement('p');
    total.textContent = `Total: ${vm.practiceStats.totalPractices}`;
    card.appendChild(total);
    if (vm.practiceStats.byKind) {
      const ul = document.createElement('ul');
      Object.entries(vm.practiceStats.byKind).forEach(([kind, count]) => {
        const li = document.createElement('li');
        li.textContent = `${kind}: ${count}`;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
  });
  statsGrid.appendChild(practiceCard);

  const eventCard = mkStatCard('Events', card => {
    const total = document.createElement('p');
    total.textContent = `Total: ${vm.eventStats.totalEvents}`;
    card.appendChild(total);
    if (vm.eventStats.byRecurrence) {
      const ul = document.createElement('ul');
      Object.entries(vm.eventStats.byRecurrence).forEach(([rec, count]) => {
        const li = document.createElement('li');
        li.textContent = `${rec}: ${count}`;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
  });
  statsGrid.appendChild(eventCard);

  const miscCard = mkStatCard('Other', card => {
    const rules = document.createElement('p');
    rules.textContent = `Rules: ${vm.ruleCount}`;
    card.appendChild(rules);
    const claims = document.createElement('p');
    claims.textContent = `Claims: ${vm.claimCount}`;
    card.appendChild(claims);
    const media = document.createElement('p');
    media.textContent = `Media assets: ${vm.mediaCount}`;
    card.appendChild(media);
  });
  statsGrid.appendChild(miscCard);

  container.appendChild(statsGrid);

  const exampleSectionTitle = document.createElement('div');
  exampleSectionTitle.className = 'section-heading';
  exampleSectionTitle.textContent = 'Example nodes';
  container.appendChild(exampleSectionTitle);

  const exampleNodes = vm.exampleNodes || {};
  mkChipRow(container, 'Key entities', exampleNodes.keyEntities, 'name');
  mkChipRow(container, 'Key practices', exampleNodes.keyPractices, 'name');
  mkChipRow(container, 'Key events', exampleNodes.keyEvents, 'name');
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
