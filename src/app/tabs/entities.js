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

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getEnsureSelectOptions(ctx) {
  return ctx?.dom?.ensureSelectOptions || fallbackEnsureSelectOptions;
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

function getEntityGraphViewCtor(ctx) {
  return (
    ctx?.services?.EntityGraphView ||
    ctx?.EntityGraphView ||
    (movementEngineerGlobal.services && movementEngineerGlobal.services.EntityGraphView) ||
    window.EntityGraphView
  );
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

const labelForNodeType = type => GRAPH_NODE_TYPE_LABELS[type] || type || 'Unknown';

function parseRelationTypes(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function renderEntitiesTab(ctx, tab) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const actions = getActions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const select = document.getElementById('entity-select');
  const detailContainer = document.getElementById('entity-detail');
  const graphDepthSelect = document.getElementById('entity-graph-depth');
  const graphContainer = document.getElementById('entity-graph');
  const relationTypeInput = document.getElementById('entity-graph-relation-types');
  const refreshButton = document.getElementById('btn-refresh-entity-graph');

  if (!select || !detailContainer || !graphDepthSelect || !graphContainer) return;

  clear(detailContainer);
  clear(graphContainer);

  const controls = [select, graphDepthSelect, relationTypeInput, refreshButton].filter(Boolean);

  if (!currentMovementId) {
    controls.forEach(control => (control.disabled = true));
    ensureSelectOptions(select, [], 'Choose entity');
    detailContainer.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    return;
  }

  controls.forEach(control => (control.disabled = false));

  const entities = (snapshot?.entities || []).filter(e => e.movementId === currentMovementId);
  const options = entities
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => ({ value: e.id, label: e.name || e.id }));
  ensureSelectOptions(select, options, 'Choose entity');

  const entityId = select.value || (options.length ? options[0].value : null);
  if (entityId) {
    select.value = entityId;
  }

  if (!entityId) {
    detailContainer.appendChild(hint('No entities found for this movement.'));
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildEntityDetailViewModel !== 'function') {
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

      vm.connections.forEach(conn => {
        const li = document.createElement('li');
        const arrow = conn.direction === 'incoming' ? '←' : '→';
        const otherLabel = conn.node.name || conn.node.id;
        const meta = conn.node.type ? ` (${labelForNodeType(conn.node.type)})` : '';
        li.textContent = `${arrow} ${conn.relationType || 'link'} ${arrow} ${otherLabel}${meta}`;

        const targetCollection = typeToCollection[conn.node.type];
        if (targetCollection && typeof actions.jumpToReferencedItem === 'function') {
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => actions.jumpToReferencedItem(targetCollection, conn.node.id));
        }

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

  const depth = parseInt(graphDepthSelect.value, 10);
  const relationTypeFilter = parseRelationTypes(relationTypeInput?.value);

  if (!ViewModels || typeof ViewModels.buildEntityGraphViewModel !== 'function') {
    graphContainer.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const graphVm = ViewModels.buildEntityGraphViewModel(snapshot, {
    movementId: currentMovementId,
    centerEntityId: entityId,
    depth: Number.isFinite(depth) ? depth : 1,
    relationTypeFilter
  });

  const GraphView = getEntityGraphViewCtor(ctx);
  if (!GraphView) {
    graphContainer.appendChild(hint('EntityGraphView module not loaded.'));
    return;
  }

  if (!tab.__graphView) {
    const rerender = tab?.__handlers?.rerender;
    tab.__graphView = new GraphView({
      onNodeClick: id => {
        if (!id || !select) return;
        select.value = id;
        if (typeof rerender === 'function') rerender();
      }
    });
  }

  tab.__graphView.render(graphContainer, graphVm, {
    centerEntityId: graphVm.centerEntityId,
    width: graphContainer.clientWidth || undefined,
    height: 440
  });
}

export function registerEntitiesTab(ctx) {
  const tab = {
    __handlers: null,
    __graphView: null,
    mount(context) {
      const listeners = [];
      const addListener = (el, event, handler) => {
        if (!el || typeof el.addEventListener !== 'function') return;
        el.addEventListener(event, handler);
        listeners.push({ el, event, handler });
      };

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'entities') return;
        rerender();
      };

      addListener(document.getElementById('entity-select'), 'change', rerender);
      addListener(document.getElementById('entity-graph-depth'), 'change', rerender);
      const relInput = document.getElementById('entity-graph-relation-types');
      addListener(relInput, 'change', rerender);
      addListener(relInput, 'input', rerender);
      addListener(document.getElementById('btn-refresh-entity-graph'), 'click', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { listeners, unsubscribe, rerender };
    },
    render(context) {
      renderEntitiesTab(context, tab);
    },
    unmount() {
      const h = this.__handlers;
      if (h) {
        (h.listeners || []).forEach(({ el, event, handler }) => {
          if (el && typeof el.removeEventListener === 'function') {
            el.removeEventListener(event, handler);
          }
        });
        if (typeof h.unsubscribe === 'function') h.unsubscribe();
      }
      this.__graphView = null;
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.entities = tab;
  if (ctx?.tabs) {
    ctx.tabs.entities = tab;
  }
  return tab;
}
