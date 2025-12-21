const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function fallbackEnsureSelectOptions(selectEl, options = [], includeEmptyLabel) {
  if (!selectEl) return;
  const previous = selectEl.value;
  fallbackClear(selectEl);
  if (includeEmptyLabel) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = includeEmptyLabel;
    selectEl.appendChild(opt);
  }
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    selectEl.appendChild(opt);
  });
  if (previous && options.some(option => option.value === previous)) {
    selectEl.value = previous;
  }
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getEnsureSelectOptions(ctx) {
  return ctx?.dom?.ensureSelectOptions || fallbackEnsureSelectOptions;
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
}

function getEntityGraphViewClass(ctx) {
  return ctx?.services?.EntityGraphView || ctx?.EntityGraphView || window.EntityGraphView;
}

function mkSection(container, label, contentBuilder) {
  const heading = document.createElement('div');
  heading.className = 'section-heading small';
  heading.textContent = label;
  container.appendChild(heading);
  const section = document.createElement('div');
  section.style.fontSize = '0.8rem';
  contentBuilder(section);
  container.appendChild(section);
}

const GRAPH_NODE_TYPE_LABELS = {
  Entity: 'Entity',
  TextCollection: 'Canon collection',
  TextNode: 'Canon text',
  Practice: 'Practice',
  Event: 'Calendar event',
  Rule: 'Rule',
  Claim: 'Claim',
  MediaAsset: 'Media',
  Note: 'Note'
};

const typeToCollection = {
  Movement: 'movements',
  TextCollection: 'textCollections',
  TextNode: 'texts',
  Entity: 'entities',
  Practice: 'practices',
  Event: 'events',
  Rule: 'rules',
  Claim: 'claims',
  MediaAsset: 'media',
  Note: 'notes'
};

let entityGraphView = null;

function renderEntitiesTab(ctx, tab) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;
  const actions = getActions(ctx);
  const ViewModels = getViewModels(ctx);

  const select = document.getElementById('entity-select');
  const detailContainer = document.getElementById('entity-detail');
  const graphDepthSelect = document.getElementById('entity-graph-depth');
  const relationInput = document.getElementById('entity-graph-relation-types');
  const graphContainer = document.getElementById('entity-graph');
  const refreshButton = document.getElementById('btn-refresh-entity-graph');
  if (!select || !detailContainer || !graphDepthSelect || !relationInput || !graphContainer) {
    return;
  }

  clear(detailContainer);
  clear(graphContainer);

  if (!currentMovementId) {
    select.disabled = true;
    graphDepthSelect.disabled = true;
    relationInput.disabled = true;
    if (refreshButton) refreshButton.disabled = true;
    ensureSelectOptions(select, [], 'Choose entity');
    detailContainer.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    return;
  }

  select.disabled = false;
  graphDepthSelect.disabled = false;
  relationInput.disabled = false;
  if (refreshButton) refreshButton.disabled = false;

  if (!ViewModels) {
    detailContainer.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const entities = (snapshot?.entities || []).filter(e => e.movementId === currentMovementId);
  const options = entities
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => ({ value: e.id, label: e.name || e.id }));
  ensureSelectOptions(select, options, 'Choose entity');

  const entityId = select.value || (options.length ? options[0].value : null);
  if (entityId) select.value = entityId;

  if (!entityId) {
    detailContainer.appendChild(hint('No entities found for this movement.'));
    return;
  }

  if (typeof ViewModels.buildEntityDetailViewModel !== 'function') {
    detailContainer.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const vm = ViewModels.buildEntityDetailViewModel(snapshot, {
    entityId
  });

  if (!vm?.entity) {
    detailContainer.appendChild(hint('Entity not found.'));
    return;
  }

  const title = document.createElement('h3');
  title.textContent = vm.entity.name + (vm.entity.kind ? ` (${vm.entity.kind})` : '');
  detailContainer.appendChild(title);

  if (vm.entity.summary) {
    const summary = document.createElement('p');
    summary.textContent = vm.entity.summary;
    detailContainer.appendChild(summary);
  }

  if (vm.claims && vm.claims.length) {
    mkSection(detailContainer, 'Claims about this entity', section => {
      const ul = document.createElement('ul');
      vm.claims.forEach(c => {
        const li = document.createElement('li');
        li.textContent = (c.category ? '[' + c.category + '] ' : '') + c.text;
        ul.appendChild(li);
      });
      section.appendChild(ul);
    });
  }

  if (vm.practices && vm.practices.length) {
    mkSection(detailContainer, 'Involved in practices', section => {
      const row = document.createElement('div');
      row.className = 'chip-row';
      vm.practices.forEach(p => {
        const chip = document.createElement('span');
        chip.className = 'chip clickable';
        chip.textContent = p.name || p.id;
        chip.title = p.kind || '';
        chip.addEventListener('click', () => actions.jumpToPractice?.(p.id));
        row.appendChild(chip);
      });
      section.appendChild(row);
    });
  }

  if (vm.events && vm.events.length) {
    mkSection(detailContainer, 'Appears in events', section => {
      const row = document.createElement('div');
      row.className = 'chip-row';
      vm.events.forEach(ev => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = ev.name || ev.id;
        row.appendChild(chip);
      });
      section.appendChild(row);
    });
  }

  if (vm.mentioningTexts && vm.mentioningTexts.length) {
    mkSection(detailContainer, 'Mentioned in texts', section => {
      const row = document.createElement('div');
      row.className = 'chip-row';
      vm.mentioningTexts.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip clickable';
        chip.textContent = t.title || t.id;
        chip.title = Number.isFinite(t.depth) ? `Depth ${t.depth}` : '';
        chip.addEventListener('click', () => actions.jumpToText?.(t.id));
        row.appendChild(chip);
      });
      section.appendChild(row);
    });
  }

  if (vm.media && vm.media.length) {
    mkSection(detailContainer, 'Linked media', section => {
      const ul = document.createElement('ul');
      vm.media.forEach(m => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = m.uri;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `${m.title} (${m.kind})`;
        li.appendChild(a);
        ul.appendChild(li);
      });
      section.appendChild(ul);
    });
  }

  if (vm.connections && vm.connections.length) {
    mkSection(detailContainer, 'Connections (derived)', section => {
      const ul = document.createElement('ul');
      vm.connections.forEach(conn => {
        const li = document.createElement('li');
        const arrow = conn.direction === 'incoming' ? '←' : '→';
        const otherLabel = conn.node.name || conn.node.id;
        const label = GRAPH_NODE_TYPE_LABELS[conn.node.type] || conn.node.type || 'Unknown';
        const meta = conn.node.type ? ` (${label})` : '';
        li.textContent = `${arrow} ${conn.relationType || 'link'} ${arrow} ${otherLabel}${meta}`;
        li.style.cursor = 'pointer';

        const targetCollection = typeToCollection[conn.node.type];
        li.addEventListener('click', () => {
          if (targetCollection) {
            actions.jumpToReferencedItem?.(targetCollection, conn.node.id);
          }
        });

        if (conn.source) {
          const reason = document.createElement('div');
          reason.className = 'hint';
          const fieldLabel = conn.source.field ? `.${conn.source.field}` : '';
          reason.textContent = `Edge derived from ${conn.source.collection || 'record'} ${conn.source.id || ''}${fieldLabel}`.trim();
          li.appendChild(reason);
        }

        ul.appendChild(li);
      });
      section.appendChild(ul);
    });
  }

  if (typeof ViewModels.buildEntityGraphViewModel !== 'function') {
    graphContainer.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const depth = parseInt(graphDepthSelect.value, 10);
  const relationTypeFilter = (relationInput.value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const graphVm = ViewModels.buildEntityGraphViewModel(snapshot, {
    movementId: currentMovementId,
    centerEntityId: entityId,
    depth: Number.isFinite(depth) ? depth : 1,
    relationTypeFilter
  });

  const GraphView = getEntityGraphViewClass(ctx);
  if (!GraphView || typeof GraphView !== 'function') {
    graphContainer.appendChild(hint('Graph renderer not available.'));
    return;
  }

  if (!entityGraphView) {
    const rerender = () => tab?.render?.(ctx);
    entityGraphView = new GraphView({
      onNodeClick: id => {
        if (!id) return;
        select.value = id;
        rerender();
      }
    });
  }

  entityGraphView.render(graphContainer, graphVm, {
    centerEntityId: graphVm.centerEntityId,
    width: graphContainer.clientWidth || undefined,
    height: 440
  });
}

export function registerEntitiesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const select = document.getElementById('entity-select');
      const refresh = document.getElementById('btn-refresh-entity-graph');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'entities') return;
        rerender();
      };

      if (select) select.addEventListener('change', rerender);
      if (refresh) refresh.addEventListener('click', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { select, refresh, rerender, unsubscribe };
    },
    render(context) {
      renderEntitiesTab(context, tab);
    },
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.select) h.select.removeEventListener('change', h.rerender);
      if (h.refresh) h.refresh.removeEventListener('click', h.rerender);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.entities = tab;
  if (ctx?.tabs) {
    ctx.tabs.entities = tab;
  }
  return tab;
}
