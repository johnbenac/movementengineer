import { renderMarkdownPreview, openMarkdownModal } from '../ui/markdown.js';
import { parseCsvInput, normaliseArray, uniqueSorted } from '../utils/values.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

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

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function getServices(ctx) {
  return ctx?.services || {
    DomainService: window.DomainService,
    ViewModels: window.ViewModels,
    EntityGraphView: window.EntityGraphView
  };
}

function getActiveTabName() {
  const btn = document.querySelector('.tab.active');
  return btn ? btn.dataset.tab : 'dashboard';
}

function isGraphActive() {
  return getActiveTabName() === 'graph';
}

function ensureGraphWorkbenchDom(state) {
  const root = document.getElementById('graph-workbench-root');
  if (!root) return null;

  if (root.__graphDom && root.__graphDom.root === root) return root.__graphDom;

  root.innerHTML = `
      <div id="graph-workbench" class="graph-workbench"
           style="--graph-left-width:${state.graphWorkbenchState?.leftWidth || 360}px; --graph-right-width:${state.graphWorkbenchState?.rightWidth || 420}px;">
        <div class="graph-pane">
          <div class="graph-resize-handle left" title="Drag to resize"></div>
          <div class="pane-inner">

            <details id="gw-create-entity" open>
              <summary>Add Entity</summary>
              <div class="details-body">
                <form id="gw-add-entity-form" class="graph-form">
                  <div class="form-row">
                    <label>Name *</label>
                    <input id="gw-add-entity-name" class="form-control" type="text" required />
                  </div>

                  <div class="form-row">
                    <label>Kind</label>
                    <input id="gw-add-entity-kind" class="form-control" list="gw-entity-kind-options" placeholder="e.g. being, place, object..." />
                    <datalist id="gw-entity-kind-options"></datalist>
                  </div>

                  <div class="form-row">
                    <label>Summary</label>
                    <textarea id="gw-add-entity-summary" class="form-control" rows="3"></textarea>
                  </div>

                  <div class="form-row">
                    <label>Tags (comma separated)</label>
                    <input id="gw-add-entity-tags" class="form-control" type="text" placeholder="tag1, tag2" />
                  </div>

                  <div class="form-row">
                    <label>Sources of truth (comma separated)</label>
                    <input id="gw-add-entity-sources" class="form-control" type="text" placeholder="book, tradition, archive..." />
                  </div>

                  <div class="form-row">
                    <label>Source entity IDs (comma separated)</label>
                    <input id="gw-add-entity-source-entities" class="form-control" type="text" placeholder="ent-123, ent-456" />
                    <div class="hint">Tip: use the Search pane to copy IDs.</div>
                  </div>

                  <div class="form-row">
                    <label>Notes</label>
                    <textarea id="gw-add-entity-notes" class="form-control" rows="3"></textarea>
                  </div>

                  <div class="form-row inline">
                    <button class="btn btn-primary" type="submit">Create Entity</button>
                  </div>
                </form>
              </div>
            </details>


          </div>
        </div>

        <div class="graph-pane">
          <div class="pane-inner">
            <div class="graph-toolbar">
              <span class="toolbar-spacer"></span>

              <button class="btn" type="button" id="gw-fit-btn">Fit</button>
              <button class="btn" type="button" id="gw-clear-selection-btn">Clear</button>
            </div>

            <div id="gw-canvas" class="graph-canvas card"></div>
          </div>
        </div>

        <div class="graph-pane">
          <div class="graph-resize-handle right" title="Drag to resize"></div>
          <div class="pane-inner">

            <details id="gw-filters" open>
              <summary>Filters</summary>
              <div class="details-body">
                <div class="card">
                  <div class="form-row">
                    <label>Center node</label>
                    <div id="gw-filter-center-label" class="hint">No center selected; showing full graph.</div>
                    <div class="form-row inline" style="margin-bottom:0;">
                      <button class="btn" type="button" id="gw-filter-use-selection">Use selected</button>
                      <button class="btn" type="button" id="gw-filter-clear-center">Clear</button>
                    </div>
                  </div>

                  <div class="form-row inline" style="align-items:flex-end;">
                    <div style="flex:1;">
                      <label>Hops</label>
                      <input id="gw-filter-depth" class="form-control" type="number" min="0" step="1" placeholder="∞ (no limit)" />
                    </div>
                    <button class="btn" type="button" id="gw-filter-depth-clear" title="No hop limit">∞</button>
                  </div>

                  <div class="form-row">
                    <label>Node types</label>
                    <div id="gw-filter-types" class="chip-row wrap"></div>
                    <div class="hint">Select none to show all node types.</div>
                  </div>

                  <div class="form-row inline">
                    <button class="btn" type="button" id="gw-filter-reset">Reset filters</button>
                  </div>
                </div>
              </div>
            </details>

            <details id="gw-search" open>
              <summary>Search</summary>
              <div class="details-body">
                <div class="search-panel card">
                  <div class="search-controls">
                    <select id="gw-search-kind" class="form-control"></select>
                    <input id="gw-search-query" class="form-control" type="text" placeholder="Search by name/summary..." />
                  </div>
                  <ul id="gw-search-results" class="graph-search-results"></ul>
                </div>
              </div>
            </details>

            <details id="gw-selected" open>
              <summary>Selected</summary>
              <div class="details-body">
                <div id="gw-selected-body" class="card graph-selected-body"></div>
              </div>
            </details>

          </div>
        </div>
      </div>
    `;

  const dom = {
    root,
    workbench: document.getElementById('graph-workbench'),
    canvas: document.getElementById('gw-canvas'),
    fitBtn: document.getElementById('gw-fit-btn'),
    clearBtn: document.getElementById('gw-clear-selection-btn'),

    filterCenterLabel: document.getElementById('gw-filter-center-label'),
    filterUseSelection: document.getElementById('gw-filter-use-selection'),
    filterClearCenter: document.getElementById('gw-filter-clear-center'),
    filterDepth: document.getElementById('gw-filter-depth'),
    filterDepthClear: document.getElementById('gw-filter-depth-clear'),
    filterTypes: document.getElementById('gw-filter-types'),
    filterReset: document.getElementById('gw-filter-reset'),

    searchKind: document.getElementById('gw-search-kind'),
    searchQuery: document.getElementById('gw-search-query'),
    searchResults: document.getElementById('gw-search-results'),

    selectedBody: document.getElementById('gw-selected-body'),

    createEntityForm: document.getElementById('gw-add-entity-form'),
    createEntityName: document.getElementById('gw-add-entity-name'),
    createEntityKind: document.getElementById('gw-add-entity-kind'),
    createEntitySummary: document.getElementById('gw-add-entity-summary'),
    createEntityTags: document.getElementById('gw-add-entity-tags'),
    createEntitySources: document.getElementById('gw-add-entity-sources'),
    createEntitySourceEntities: document.getElementById('gw-add-entity-source-entities'),
    createEntityNotes: document.getElementById('gw-add-entity-notes'),
    entityKindDatalist: document.getElementById('gw-entity-kind-options'),

    leftHandle: root.querySelector('.graph-resize-handle.left'),
    rightHandle: root.querySelector('.graph-resize-handle.right')
  };

  root.__graphDom = dom;
  return dom;
}

function setWorkbenchState(ctx, state, patch) {
  const next = { ...(state.graphWorkbenchState || {}), ...(patch || {}) };
  ctx.legacy?.setState?.({ graphWorkbenchState: next });
}

function renderGraphSearch(ctx, dom, state, baseGraphNodes) {
  const nodes = normaliseArray(baseGraphNodes);

  const nodeTypes = uniqueSorted(nodes.map(n => n.type));
  const opts = [{ value: 'all', label: 'All types' }].concat(
    nodeTypes.map(t => ({ value: t, label: labelForNodeType(t) }))
  );

  const prev = dom.searchKind.value || state.graphWorkbenchState?.searchKind || 'all';
  fallbackClear(dom.searchKind);
  opts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    dom.searchKind.appendChild(opt);
  });
  dom.searchKind.value = opts.some(o => o.value === prev) ? prev : 'all';

  if (dom.searchQuery.value !== (state.graphWorkbenchState?.searchQuery || '')) {
    dom.searchQuery.value = state.graphWorkbenchState?.searchQuery || '';
  }

  const q = (state.graphWorkbenchState?.searchQuery || '').trim().toLowerCase();
  const typeFilter = dom.searchKind.value || 'all';

  const filtered = nodes.filter(node => {
    const matchesType = typeFilter === 'all' || node.type === typeFilter;
    if (!matchesType) return false;
    if (!q) return true;
    const hay = `${node.name || ''} ${node.id || ''} ${(node.kind || '')}`.toLowerCase();
    return hay.includes(q);
  });

  fallbackClear(dom.searchResults);

  if (!filtered.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.style.padding = '10px';
    li.textContent = 'No matches.';
    dom.searchResults.appendChild(li);
    return;
  }

  const selType = (state.graphWorkbenchState?.selection?.type || '').toLowerCase();
  const selectedNodeId =
    selType && selType !== 'relation' && selType !== 'edge'
      ? state.graphWorkbenchState.selection.id
      : null;

  filtered
    .slice(0, 300)
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
    .forEach(node => {
      const li = document.createElement('li');
      li.className = 'graph-search-item' + (selectedNodeId === node.id ? ' selected' : '');
      const left = document.createElement('span');
      left.textContent = node.name || node.id;

      const right = document.createElement('span');
      right.className = 'meta';
      right.textContent = `${labelForNodeType(node.type)} · ${node.id}`;

      li.appendChild(left);
      li.appendChild(right);
      li.addEventListener('click', () => {
        setWorkbenchState(ctx, state, {
          selection: { type: node.type || 'node', id: node.id },
          filterCenterId: node.id
        });
      });

      dom.searchResults.appendChild(li);
    });
}

function renderSelectedPanel(ctx, dom, state, nodeMap) {
  fallbackClear(dom.selectedBody);
  const selection = state.graphWorkbenchState?.selection;
  if (!selection || !selection.id) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Select a node to edit details.';
    dom.selectedBody.appendChild(p);
    return;
  }

  const node = nodeMap.get(selection.id);
  if (!node) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Selected item not found.';
    dom.selectedBody.appendChild(p);
    return;
  }

  const header = document.createElement('div');
  header.className = 'graph-selected-header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'graph-selected-title';
  title.textContent = node.name || node.id;

  const subtitle = document.createElement('p');
  subtitle.className = 'graph-selected-subtitle';
  subtitle.textContent = `${labelForNodeType(node.type)} · ${node.id}`;
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  header.appendChild(titleWrap);
  dom.selectedBody.appendChild(header);
}

function applyFilters(state, baseGraph) {
  const nodeTypes = uniqueSorted(normaliseArray(baseGraph?.nodes).map(n => n.type));
  const selectedTypes = (state.graphWorkbenchState?.filterNodeTypes || []).filter(t =>
    nodeTypes.includes(t)
  );
  const centerId = state.graphWorkbenchState?.filterCenterId || null;
  const depth = state.graphWorkbenchState?.filterDepth;

  if (!centerId && (!selectedTypes.length && (depth === null || depth === undefined))) {
    return baseGraph;
  }

  if (!baseGraph) return baseGraph;
  const nodes = normaliseArray(baseGraph.nodes);
  const edges = normaliseArray(baseGraph.edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const allowedTypes = new Set(selectedTypes.length ? selectedTypes : nodeTypes);

  const allowed = new Set();
  const queue = centerId ? [centerId] : nodes.map(n => n.id);
  const depthMap = new Map();
  if (centerId) depthMap.set(centerId, 0);

  while (queue.length) {
    const id = queue.shift();
    if (allowed.has(id)) continue;
    const node = nodeMap.get(id);
    if (!node || !allowedTypes.has(node.type)) continue;
    const currentDepth = depthMap.get(id) ?? 0;
    if (depth !== null && depth !== undefined && Number.isFinite(depth) && currentDepth > depth) {
      continue;
    }
    allowed.add(id);
    edges.forEach(e => {
      if (e.source === id) {
        const nextDepth = currentDepth + 1;
        if (!depthMap.has(e.target)) depthMap.set(e.target, nextDepth);
        queue.push(e.target);
      }
      if (e.target === id) {
        const nextDepth = currentDepth + 1;
        if (!depthMap.has(e.source)) depthMap.set(e.source, nextDepth);
        queue.push(e.source);
      }
    });
  }

  return {
    nodes: nodes.filter(n => allowed.has(n.id)),
    edges: edges.filter(e => allowed.has(e.source) && allowed.has(e.target))
  };
}

function renderGraphWorkbench(ctx) {
  const state = ctx.getState?.() || {};
  const snapshot = state.snapshot;
  const dom = ensureGraphWorkbenchDom(state);
  if (!dom) return;
  const clear = ctx?.dom?.clearElement || fallbackClear;

  if (!state.currentMovementId) {
    clear(dom.canvas);
    dom.canvas.appendChild((() => {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Create or select a movement first.';
      return p;
    })());
    return;
  }

  const { ViewModels, EntityGraphView, DomainService } = getServices(ctx);
  const baseGraph = ViewModels.buildMovementGraphModel(snapshot, {
    movementId: state.currentMovementId
  });

  const graph = applyFilters(state, baseGraph);

  const nodeMap = new Map(normaliseArray(graph?.nodes).map(n => [n.id, n]));

  if (!ctx.__workbenchGraphView) {
    ctx.__workbenchGraphView = new EntityGraphView({
      onNodeClick: id => {
        if (!id) return;
        setWorkbenchState(ctx, state, { selection: { type: 'entity', id } });
      }
    });
  }

  ctx.__workbenchGraphView.render(dom.canvas, graph, {
    selectedEntityId:
      state.graphWorkbenchState?.selection?.type === 'entity'
        ? state.graphWorkbenchState.selection.id
        : null,
    selectedEdgeId:
      state.graphWorkbenchState?.selection?.type === 'edge'
        ? state.graphWorkbenchState.selection.id
        : null,
    focusEntityId: state.graphWorkbenchState?.filterCenterId
  });

  renderGraphSearch(ctx, dom, state, graph?.nodes || []);
  renderSelectedPanel(ctx, dom, state, nodeMap);

  if (dom.filterDepth) {
    const desired =
      state.graphWorkbenchState?.filterDepth === null ||
      state.graphWorkbenchState?.filterDepth === undefined
        ? ''
        : String(state.graphWorkbenchState.filterDepth);
    if (dom.filterDepth.value !== desired) dom.filterDepth.value = desired;
  }

  if (dom.filterTypes) {
    fallbackClear(dom.filterTypes);
    const selectedTypes = new Set(state.graphWorkbenchState?.filterNodeTypes || []);
    const nodeTypes = uniqueSorted(normaliseArray(graph?.nodes).map(n => n.type));
    nodeTypes.forEach(type => {
      const chip = document.createElement('label');
      chip.className = 'chip';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = type;
      cb.checked = selectedTypes.has(type);
      cb.addEventListener('change', () => {
        const next = new Set(state.graphWorkbenchState?.filterNodeTypes || []);
        if (cb.checked) next.add(type);
        else next.delete(type);
        setWorkbenchState(ctx, state, { filterNodeTypes: Array.from(next) });
      });

      const label = document.createElement('span');
      label.textContent = labelForNodeType(type);

      chip.appendChild(cb);
      chip.appendChild(label);
      dom.filterTypes.appendChild(chip);
    });
  }

  if (dom.filterCenterLabel) {
    const centerNode = state.graphWorkbenchState?.filterCenterId
      ? nodeMap.get(state.graphWorkbenchState.filterCenterId)
      : null;
    dom.filterCenterLabel.textContent = centerNode
      ? `${centerNode.name || centerNode.id} (${labelForNodeType(centerNode.type)}) [${centerNode.id}]`
      : 'No center selected; showing full graph.';
  }

  if (dom.entityKindDatalist) {
    fallbackClear(dom.entityKindDatalist);
    const kinds = uniqueSorted(normaliseArray(snapshot.entities).map(e => e.kind));
    kinds.forEach(kind => {
      const opt = document.createElement('option');
      opt.value = kind;
      dom.entityKindDatalist.appendChild(opt);
    });
  }

  // Buttons
  if (dom.fitBtn) {
    dom.fitBtn.onclick = () => ctx.__workbenchGraphView?.fit?.();
  }

  if (dom.clearBtn) {
    dom.clearBtn.onclick = () => setWorkbenchState(ctx, state, { selection: null });
  }

  if (dom.filterDepthClear) {
    dom.filterDepthClear.onclick = () => setWorkbenchState(ctx, state, { filterDepth: null });
  }

  if (dom.filterDepth) {
    dom.filterDepth.oninput = () => {
      const raw = dom.filterDepth.value;
      if (raw === '') {
        setWorkbenchState(ctx, state, { filterDepth: null });
      } else {
        const n = parseInt(raw, 10);
        setWorkbenchState(ctx, state, {
          filterDepth: Number.isFinite(n) && n >= 0 ? n : null
        });
      }
    };
  }

  if (dom.filterUseSelection) {
    dom.filterUseSelection.onclick = () => {
      const sel = state.graphWorkbenchState?.selection;
      if (!sel || !sel.id) return;
      setWorkbenchState(ctx, state, { filterCenterId: sel.id });
    };
  }

  if (dom.filterClearCenter) {
    dom.filterClearCenter.onclick = () => setWorkbenchState(ctx, state, { filterCenterId: null });
  }

  if (dom.filterReset) {
    dom.filterReset.onclick = () =>
      setWorkbenchState(ctx, state, {
        filterCenterId: null,
        filterDepth: null,
        filterNodeTypes: []
      });
  }

  if (dom.searchKind) {
    dom.searchKind.onchange = () =>
      setWorkbenchState(ctx, state, { searchKind: dom.searchKind.value || 'all' });
  }

  if (dom.searchQuery) {
    dom.searchQuery.oninput = () =>
      setWorkbenchState(ctx, state, { searchQuery: dom.searchQuery.value || '' });
  }

  if (dom.createEntityForm) {
    dom.createEntityForm.onsubmit = e => {
      e.preventDefault();
      const name = (dom.createEntityName?.value || '').trim();
      if (!name || !state.currentMovementId) return;

      const kind = (dom.createEntityKind?.value || '').trim() || null;
      const summary = (dom.createEntitySummary?.value || '').trim() || null;
      const tags = parseCsvInput(dom.createEntityTags?.value);
      const sourcesOfTruth = parseCsvInput(dom.createEntitySources?.value);
      const sourceEntityIds = parseCsvInput(dom.createEntitySourceEntities?.value);
      const notes = (dom.createEntityNotes?.value || '').trim() || null;

      try {
        const entity = DomainService.addNewItem(snapshot, 'entities', state.currentMovementId);
        entity.name = name;
        entity.kind = kind;
        entity.summary = summary;
        entity.tags = tags;
        entity.sourcesOfTruth = sourcesOfTruth;
        entity.sourceEntityIds = sourceEntityIds;
        entity.notes = notes;

        DomainService.upsertItem(snapshot, 'entities', entity);
        ctx.legacy?.saveSnapshot?.({ show: false });
        ctx.ui?.setStatus?.('Entity created');

        if (dom.createEntityName) dom.createEntityName.value = '';
        if (dom.createEntityKind) dom.createEntityKind.value = '';
        if (dom.createEntitySummary) dom.createEntitySummary.value = '';
        if (dom.createEntityTags) dom.createEntityTags.value = '';
        if (dom.createEntitySources) dom.createEntitySources.value = '';
        if (dom.createEntitySourceEntities) dom.createEntitySourceEntities.value = '';
        if (dom.createEntityNotes) dom.createEntityNotes.value = '';

        setWorkbenchState(ctx, state, { selection: { type: 'entity', id: entity.id } });
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to create entity');
      }
    };
  }
}

const graphTab = {
  __handlers: null,
  mount(ctx) {
    const rerender = () => {
      if (!isGraphActive()) return;
      renderGraphWorkbench(ctx);
    };
    const unsubscribe = ctx?.subscribe ? ctx.subscribe(rerender) : null;
    this.__handlers = { rerender, unsubscribe };
  },
  render(ctx) {
    if (!isGraphActive()) return;
    renderGraphWorkbench(ctx);
  },
  unmount() {
    const h = this.__handlers;
    if (!h) return;
    if (typeof h.unsubscribe === 'function') h.unsubscribe();
    this.__handlers = null;
  }
};

export function registerGraphTab(ctx) {
  movementEngineerGlobal.tabs.graph = graphTab;
  if (ctx?.tabs) {
    ctx.tabs.graph = graphTab;
  }
  return graphTab;
}
