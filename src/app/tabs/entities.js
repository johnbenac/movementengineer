import {
  HINT_TEXT,
  createHint,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../ui/hints.js';
import { appendSection } from '../ui/sections.js';
import { createTab } from './tabKit.js';

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

const DEFAULT_TAB_STATE = { selectedEntityId: null, lastMovementId: null };

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
  const tab = this;
  const tabState = tab?.__state || DEFAULT_TAB_STATE;
  const { clearElement: clear, ensureSelectOptions } = ctx.dom;
  const dom = ctx.dom;
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
  setDisabled(controls, false);

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [detailContainer],
      controls,
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
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

  const optionIds = new Set(options.map(opt => opt.value));
  let entityId = tabState.selectedEntityId;
  if (!optionIds.has(entityId)) entityId = select.value || null;
  if (!optionIds.has(entityId)) entityId = options.length ? options[0].value : null;
  if (entityId) {
    select.value = entityId;
  } else {
    select.value = '';
  }
  tabState.selectedEntityId = entityId || null;

  if (!entityId) {
    renderHint(detailContainer, 'No entities found for this movement.');
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (
    guardMissingViewModels({
      ok:
        ViewModels &&
        typeof ViewModels.buildEntityDetailViewModel === 'function' &&
        typeof ViewModels.buildEntityGraphViewModel === 'function',
      wrappers: [detailContainer],
      controls,
      dom: ctx.dom
    })
  )
    return;

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
    appendSection(detailContainer, 'Claims about this entity', section => {
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
    appendSection(detailContainer, 'Involved in practices', section => {
      dom.appendChipRow(section, vm.practices, {
        getLabel: p => p.name || p.id,
        getTitle: p => p.kind || '',
        getTarget: p => ({ kind: 'item', collection: 'practices', id: p.id })
      });
    });
  }

  if (vm.events && vm.events.length) {
    appendSection(detailContainer, 'Appears in events', section => {
      dom.appendChipRow(section, vm.events, {
        getLabel: ev => ev.name || ev.id,
        getTarget: ev => ({ kind: 'item', collection: 'events', id: ev.id })
      });
    });
  }

  if (vm.mentioningTexts && vm.mentioningTexts.length) {
    appendSection(detailContainer, 'Mentioned in texts', section => {
      dom.appendChipRow(section, vm.mentioningTexts, {
        getLabel: t => t.title || t.id,
        getTitle: t => (Number.isFinite(t.depth) ? `Depth ${t.depth}` : ''),
        getTarget: t => ({ kind: 'item', collection: 'texts', id: t.id })
      });
    });
  }

  if (vm.media && vm.media.length) {
    appendSection(detailContainer, 'Linked media', section => {
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
    appendSection(detailContainer, 'Connections (derived)', section => {
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
            actions.openItem?.(targetCollection, conn.node.id);
          }
        });

        if (conn.source) {
          const fieldLabel = conn.source.field ? `.${conn.source.field}` : '';
          const reason = createHint(
            `Edge derived from ${conn.source.collection || 'record'} ${conn.source.id || ''}${fieldLabel}`.trim(),
            { tag: 'div' }
          );
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
        const openItem = ctx?.actions?.openItem;
        if (typeof openItem === 'function') {
          openItem('entities', id);
        }
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
  ctx?.dom?.installGlobalChipHandler?.(ctx);
  return createTab(ctx, {
    name: 'entities',
    render: renderEntitiesTab,
    setup: ({ bucket, rerender }) => {
      const on = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) bucket.on(el, event, handler || (() => rerender({ immediate: true })));
      };

      on('entity-select', 'change', event => {
        const tab = ctx?.tabs?.entities || window.MovementEngineer?.tabs?.entities;
        if (tab?.__state) tab.__state.selectedEntityId = event.target?.value || null;
        rerender({ immediate: true });
      });
      on('entity-graph-depth', 'change');
      on('entity-graph-relation-types', 'input');
      on('btn-refresh-entity-graph', 'click');
    },
    reset: () => {
      entityGraphViewInstance = null;
    },
    extend: {
      __state: { ...DEFAULT_TAB_STATE },
      open(context, entityId) {
        this.__state.selectedEntityId = entityId || null;
        context?.actions?.activateTab?.('entities');
        return { entityId };
      }
    }
  });
}
