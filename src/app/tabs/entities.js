const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

import {
  createHint,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../ui/hints.js';

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function getEntityGraphView(ctx) {
  return ctx.services.EntityGraphView;
}

function getActions(ctx) {
  return ctx.actions;
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

let entityGraphViewInstance = null;

function renderEntitiesTab(ctx) {
  const { clearElement: clear, ensureSelectOptions } = ctx.dom;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const select = document.getElementById('entity-select');
  const detailContainer = document.getElementById('entity-detail');
  const graphDepthSelect = document.getElementById('entity-graph-depth');
  const graphContainer = document.getElementById('entity-graph');
  const relTypeInput = document.getElementById('entity-graph-relation-types');
  if (!select || !detailContainer || !graphDepthSelect || !graphContainer) return;

  clear(detailContainer);
  clear(graphContainer);

  const controls = [select, graphDepthSelect, relTypeInput];

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [detailContainer, graphContainer],
      controls,
      dom: ctx.dom
    })
  ) {
    ensureSelectOptions(select, [], 'Choose entity');
    return;
  }

  setDisabled(controls, false);

  const entities = (snapshot?.entities || []).filter(e => e.movementId === currentMovementId);
  const options = entities
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => ({ value: e.id, label: e.name || e.id }));
  ensureSelectOptions(select, options, 'Choose entity');

  const entityId = select.value || (options.length ? options[0].value : null);
  if (entityId) select.value = entityId;

  if (!entityId) {
    renderHint(detailContainer, 'No entities found for this movement.');
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (
    !ViewModels ||
    typeof ViewModels.buildEntityDetailViewModel !== 'function' ||
    typeof ViewModels.buildEntityGraphViewModel !== 'function'
  ) {
    guardMissingViewModels({
      ok: false,
      wrappers: [detailContainer],
      controls,
      dom: ctx.dom
    });
    return;
  }

  const vm = ViewModels.buildEntityDetailViewModel(snapshot, { entityId });

  if (!vm?.entity) {
    renderHint(detailContainer, 'Entity not found.');
    return;
  }

  const actions = getActions(ctx);

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
        return li;
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
        li.style.cursor = 'pointer';

        const targetCollection = typeToCollection[conn.node.type];
        li.addEventListener('click', () => {
          if (targetCollection) {
            actions.jumpToReferencedItem?.(targetCollection, conn.node.id);
          }
        });

        if (conn.source) {
          const reason = createHint('', { tag: 'div' });
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
  const relTypesRaw = relTypeInput?.value || '';
  const relationTypeFilter = relTypesRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const graphVm = ViewModels.buildEntityGraphViewModel(snapshot, {
    movementId: currentMovementId,
    centerEntityId: entityId,
    depth: Number.isFinite(depth) ? depth : 1,
    relationTypeFilter
  });

  const EntityGraphView = getEntityGraphView(ctx);
  if (!EntityGraphView) {
    renderHint(graphContainer, 'EntityGraphView module not available.');
    return;
  }

  if (!entityGraphViewInstance) {
    entityGraphViewInstance = new EntityGraphView({
      onNodeClick: id => {
        if (!id) return;
        const targetSelect = document.getElementById('entity-select');
        if (targetSelect) targetSelect.value = id;
        renderEntitiesTab(ctx);
      }
    });
  }

  entityGraphViewInstance.render(graphContainer, graphVm, {
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
      const depthSelect = document.getElementById('entity-graph-depth');
      const relTypeInput = document.getElementById('entity-graph-relation-types');
      const refreshBtn = document.getElementById('btn-refresh-entity-graph');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'entities') return;
        rerender();
      };

      if (select) select.addEventListener('change', rerender);
      if (depthSelect) depthSelect.addEventListener('change', rerender);
      if (relTypeInput) relTypeInput.addEventListener('input', rerender);
      if (refreshBtn) refreshBtn.addEventListener('click', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { select, depthSelect, relTypeInput, refreshBtn, rerender, unsubscribe };
    },
    render: renderEntitiesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.select) h.select.removeEventListener('change', h.rerender);
      if (h.depthSelect) h.depthSelect.removeEventListener('change', h.rerender);
      if (h.relTypeInput) h.relTypeInput.removeEventListener('input', h.rerender);
      if (h.refreshBtn) h.refreshBtn.removeEventListener('click', h.rerender);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
      entityGraphViewInstance = null;
    }
  };

  movementEngineerGlobal.tabs.entities = tab;
  if (ctx?.tabs) {
    ctx.tabs.entities = tab;
  }
  return tab;
}
