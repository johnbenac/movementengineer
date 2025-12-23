import { createTab } from './tabKit.js';
import { HINT_TEXT, guardMissingViewModels, guardNoMovement, renderHint } from '../ui/hints.js';
import { appendChipRow } from '../ui/chips.js';

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function createStatCard(titleText) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  const heading = document.createElement('h3');
  heading.textContent = titleText;
  card.appendChild(heading);
  return card;
}

function appendExampleRow(container, label, items, key, collectionName) {
  const heading = document.createElement('div');
  heading.className = 'section-heading';
  heading.style.fontSize = '0.85rem';
  heading.textContent = label;
  container.appendChild(heading);

  if (!items || !items.length) {
    const none = document.createElement('p');
    none.style.fontSize = '0.8rem';
    none.textContent = 'None yet.';
    container.appendChild(none);
    return;
  }

  appendChipRow(container, items, {
    getLabel: item => item[key] || item.id,
    getTarget: item => ({ kind: 'item', collection: collectionName, id: item.id })
  });
}

function renderDashboardTab(ctx) {
  const clear = ctx.dom.clearElement;
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  clear(container);

  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [container],
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  )
    return;

  const ViewModels = getViewModels(ctx);
  if (
    guardMissingViewModels({
      ok: ViewModels && typeof ViewModels.buildMovementDashboardViewModel === 'function',
      wrappers: [container],
      dom: ctx.dom
    })
  )
    return;

  const vm = ViewModels.buildMovementDashboardViewModel(snapshot, {
    movementId: currentMovementId
  });

  if (!vm?.movement) {
    renderHint(container, 'Selected movement not found in dataset.');
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

  const textCard = createStatCard('Texts');
  const totalText = document.createElement('p');
  totalText.textContent = `Total: ${vm.textStats?.totalTexts ?? 0}`;
  textCard.appendChild(totalText);
  const rootLine = document.createElement('p');
  const maxDepthText = Number.isFinite(vm.textStats?.maxDepth)
    ? ` · Max depth: ${vm.textStats.maxDepth}`
    : '';
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

  const entityCard = createStatCard('Entities');
  const entityTotal = document.createElement('p');
  entityTotal.textContent = `Total: ${vm.entityStats?.totalEntities ?? 0}`;
  entityCard.appendChild(entityTotal);
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

  const practiceCard = createStatCard('Practices');
  const practiceTotal = document.createElement('p');
  practiceTotal.textContent = `Total: ${vm.practiceStats?.totalPractices ?? 0}`;
  practiceCard.appendChild(practiceTotal);
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

  const eventCard = createStatCard('Events');
  const eventTotal = document.createElement('p');
  eventTotal.textContent = `Total: ${vm.eventStats?.totalEvents ?? 0}`;
  eventCard.appendChild(eventTotal);
  if (vm.eventStats?.byRecurrence) {
    const ul = document.createElement('ul');
    Object.entries(vm.eventStats.byRecurrence).forEach(([recurrence, count]) => {
      const li = document.createElement('li');
      li.textContent = `${recurrence}: ${count}`;
      ul.appendChild(li);
    });
    eventCard.appendChild(ul);
  }
  statsGrid.appendChild(eventCard);

  const miscCard = createStatCard('Other');
  const rules = document.createElement('p');
  rules.textContent = `Rules: ${vm.ruleCount ?? 0}`;
  const claims = document.createElement('p');
  claims.textContent = `Claims: ${vm.claimCount ?? 0}`;
  const media = document.createElement('p');
  media.textContent = `Media assets: ${vm.mediaCount ?? 0}`;
  miscCard.appendChild(rules);
  miscCard.appendChild(claims);
  miscCard.appendChild(media);
  statsGrid.appendChild(miscCard);

  container.appendChild(statsGrid);

  const exampleSectionTitle = document.createElement('div');
  exampleSectionTitle.className = 'section-heading';
  exampleSectionTitle.textContent = 'Example nodes';
  container.appendChild(exampleSectionTitle);

  appendExampleRow(container, 'Key entities', vm.exampleNodes?.keyEntities, 'name', 'entities');
  appendExampleRow(container, 'Key practices', vm.exampleNodes?.keyPractices, 'name', 'practices');
  appendExampleRow(container, 'Key events', vm.exampleNodes?.keyEvents, 'name', 'events');
}

export function registerDashboardTab(ctx) {
  return createTab(ctx, {
    name: 'dashboard',
    render: renderDashboardTab
  });
}
