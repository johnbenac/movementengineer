import { parseCsvInput, normaliseArray, uniqueSorted } from '../../utils/values.js';
import { renderMarkdownPreview, openMarkdownModal } from '../../ui/markdown.js';
import { DEFAULT_GRAPH_WORKBENCH_STATE } from '../../store.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});

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

const GRAPH_NODE_EDIT_CONFIG = {
  textcollection: {
    collection: 'textCollections',
    label: 'Canon collection',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Name', name: 'name' },
      { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Root text IDs (csv)', name: 'rootTextIds', type: 'csv' }
    ]
  },
  textnode: {
    collection: 'texts',
    label: 'Canon text',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Parent ID', name: 'parentId', nullable: true },
      { label: 'Title', name: 'title' },
      { label: 'Label', name: 'label' },
      { label: 'Content', name: 'content', type: 'textarea', rows: 4, nullable: true },
      { label: 'Main function', name: 'mainFunction', nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Mentions entity IDs (csv)', name: 'mentionsEntityIds', type: 'csv' }
    ]
  },
  practice: {
    collection: 'practices',
    label: 'Practice',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Name', name: 'name' },
      { label: 'Kind', name: 'kind', nullable: true },
      { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
      { label: 'Frequency', name: 'frequency', nullable: true },
      { label: 'Is public', name: 'isPublic', type: 'checkbox' },
      { label: 'Notes', name: 'notes', type: 'textarea', rows: 3, nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Involved entity IDs (csv)', name: 'involvedEntityIds', type: 'csv' },
      { label: 'Instruction text IDs (csv)', name: 'instructionsTextIds', type: 'csv' },
      { label: 'Supporting claim IDs (csv)', name: 'supportingClaimIds', type: 'csv' },
      { label: 'Sources of truth (csv)', name: 'sourcesOfTruth', type: 'csv' },
      { label: 'Source entity IDs (csv)', name: 'sourceEntityIds', type: 'csv' }
    ]
  },
  event: {
    collection: 'events',
    label: 'Calendar event',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Name', name: 'name' },
      { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
      { label: 'Recurrence', name: 'recurrence', nullable: true },
      { label: 'Timing rule', name: 'timingRule', nullable: true },
      { label: 'Notes', name: 'notes', type: 'textarea', rows: 3, nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Main practice IDs (csv)', name: 'mainPracticeIds', type: 'csv' },
      { label: 'Main entity IDs (csv)', name: 'mainEntityIds', type: 'csv' },
      { label: 'Reading text IDs (csv)', name: 'readingTextIds', type: 'csv' },
      { label: 'Supporting claim IDs (csv)', name: 'supportingClaimIds', type: 'csv' }
    ]
  },
  rule: {
    collection: 'rules',
    label: 'Rule',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Short text', name: 'shortText' },
      { label: 'Kind', name: 'kind', nullable: true },
      { label: 'Details', name: 'details', type: 'textarea', rows: 3, nullable: true },
      { label: 'Applies to (csv)', name: 'appliesTo', type: 'csv' },
      { label: 'Domain (csv)', name: 'domain', type: 'csv' },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Supporting text IDs (csv)', name: 'supportingTextIds', type: 'csv' },
      { label: 'Supporting claim IDs (csv)', name: 'supportingClaimIds', type: 'csv' },
      { label: 'Related practice IDs (csv)', name: 'relatedPracticeIds', type: 'csv' },
      { label: 'Sources of truth (csv)', name: 'sourcesOfTruth', type: 'csv' },
      { label: 'Source entity IDs (csv)', name: 'sourceEntityIds', type: 'csv' }
    ]
  },
  claim: {
    collection: 'claims',
    label: 'Claim',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Text', name: 'text', type: 'textarea', rows: 3 },
      { label: 'Category', name: 'category', nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Source text IDs (csv)', name: 'sourceTextIds', type: 'csv' },
      { label: 'About entity IDs (csv)', name: 'aboutEntityIds', type: 'csv' },
      { label: 'Sources of truth (csv)', name: 'sourcesOfTruth', type: 'csv' },
      { label: 'Source entity IDs (csv)', name: 'sourceEntityIds', type: 'csv' },
      { label: 'Notes', name: 'notes', type: 'textarea', rows: 3, nullable: true }
    ]
  },
  mediaasset: {
    collection: 'media',
    label: 'Media',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Kind', name: 'kind', nullable: true },
      { label: 'URI', name: 'uri' },
      { label: 'Title', name: 'title' },
      { label: 'Description', name: 'description', type: 'textarea', rows: 3, nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Linked entity IDs (csv)', name: 'linkedEntityIds', type: 'csv' },
      { label: 'Linked practice IDs (csv)', name: 'linkedPracticeIds', type: 'csv' },
      { label: 'Linked event IDs (csv)', name: 'linkedEventIds', type: 'csv' },
      { label: 'Linked text IDs (csv)', name: 'linkedTextIds', type: 'csv' }
    ]
  },
  note: {
    collection: 'notes',
    label: 'Note',
    fields: [
      { label: 'ID', name: 'id', readOnly: true },
      { label: 'Movement ID', name: 'movementId' },
      { label: 'Target type', name: 'targetType' },
      { label: 'Target ID', name: 'targetId' },
      { label: 'Author', name: 'author', nullable: true },
      { label: 'Body', name: 'body', type: 'textarea', rows: 3 },
      { label: 'Context', name: 'context', type: 'textarea', rows: 2, nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' }
    ]
  }
};

let workbenchGraphView = null;
let graphWorkbenchDom = null;

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getWorkbenchState(ctx) {
  const state = getState(ctx);
  return state.graphWorkbenchState || { ...DEFAULT_GRAPH_WORKBENCH_STATE };
}

function patchWorkbenchState(ctx, patch) {
  if (!ctx?.store?.update) return;
  ctx.store.update(prev => ({
    ...prev,
    graphWorkbenchState: { ...(prev.graphWorkbenchState || {}), ...patch }
  }));
}

function clearElement(el) {
  if (!el) return;
  const helper = movementEngineerGlobal?.dom?.clearElement || ctxDomHelper();
  helper(el);
}

function ctxDomHelper() {
  return node => {
    while (node?.firstChild) node.removeChild(node.firstChild);
  };
}

function colorForNodeType(type) {
  if (typeof window !== 'undefined' && window.EntityGraphColors?.colorForNodeType) {
    return window.EntityGraphColors.colorForNodeType(type);
  }
  return '#1f2937';
}

function normaliseSelectionType(type) {
  return typeof type === 'string' ? type.toLowerCase() : null;
}

function buildEntityIndex(entities) {
  const map = new Map();
  (entities || []).forEach(e => {
    if (e && e.id) map.set(e.id, e);
  });
  return map;
}

function getGraphDatasetForMovement(snapshot, movementId) {
  const allEntities = normaliseArray(snapshot?.entities);
  const visibleEntities = allEntities.filter(e => e && e.movementId === movementId);
  const entityById = buildEntityIndex(visibleEntities);
  return { visibleEntities, entityById };
}

function setGraphWorkbenchSelection(ctx, selection) {
  if (!selection || !selection.id) {
    patchWorkbenchState(ctx, { selection: null });
    return null;
  }
  const type = normaliseSelectionType(selection.type) || 'entity';
  const next = { type, id: selection.id };
  patchWorkbenchState(ctx, { selection: next });
  return next;
}

function ensureGraphWorkbenchDom(ctx) {
  const root = document.getElementById('graph-workbench-root');
  if (!root) return null;

  const workbenchState = getWorkbenchState(ctx);

  if (graphWorkbenchDom && graphWorkbenchDom.root === root) {
    return graphWorkbenchDom;
  }

  root.innerHTML = `
      <div id="graph-workbench" class="graph-workbench"
           style="--graph-left-width:${workbenchState.leftWidth}px; --graph-right-width:${workbenchState.rightWidth}px;">
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

  function attachResize(handleEl, side) {
    if (!handleEl) return;
    handleEl.addEventListener('mousedown', e => {
      e.preventDefault();
      const startX = e.clientX;
      const startState = getWorkbenchState(ctx);
      const startLeft = startState.leftWidth;
      const startRight = startState.rightWidth;

      let nextLeft = startLeft;
      let nextRight = startRight;

      function onMove(ev) {
        const dx = ev.clientX - startX;
        if (side === 'left') {
          nextLeft = Math.max(240, startLeft + dx);
        } else {
          nextRight = Math.max(260, startRight - dx);
        }
        if (dom.workbench) {
          dom.workbench.style.setProperty('--graph-left-width', `${nextLeft}px`);
          dom.workbench.style.setProperty('--graph-right-width', `${nextRight}px`);
        }
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        patchWorkbenchState(ctx, { leftWidth: nextLeft, rightWidth: nextRight });
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  attachResize(dom.leftHandle, 'left');
  attachResize(dom.rightHandle, 'right');

  dom.fitBtn?.addEventListener('click', () => {
    if (workbenchGraphView) workbenchGraphView.fit();
  });

  dom.clearBtn?.addEventListener('click', () => {
    setGraphWorkbenchSelection(ctx, null);
    renderGraphWorkbench(ctx);
  });

  dom.filterDepth?.addEventListener('input', () => {
    const raw = dom.filterDepth.value;
    const nextDepth =
      raw === '' ? null : (() => {
        const n = parseInt(raw, 10);
        return Number.isFinite(n) && n >= 0 ? n : null;
      })();
    patchWorkbenchState(ctx, { filterDepth: nextDepth });
    renderGraphWorkbench(ctx);
  });

  dom.filterDepthClear?.addEventListener('click', () => {
    patchWorkbenchState(ctx, { filterDepth: null });
    if (dom.filterDepth) dom.filterDepth.value = '';
    renderGraphWorkbench(ctx);
  });

  dom.filterUseSelection?.addEventListener('click', () => {
    const sel = getWorkbenchState(ctx).selection;
    if (!sel || !sel.id) return;
    const t = normaliseSelectionType(sel.type);
    if (t === 'relation' || t === 'edge') return;
    patchWorkbenchState(ctx, { filterCenterId: sel.id, focusEntityId: sel.id });
    renderGraphWorkbench(ctx);
  });

  dom.filterClearCenter?.addEventListener('click', () => {
    patchWorkbenchState(ctx, { filterCenterId: null, focusEntityId: null });
    renderGraphWorkbench(ctx);
  });

  dom.filterReset?.addEventListener('click', () => {
    patchWorkbenchState(ctx, {
      filterCenterId: null,
      filterDepth: null,
      filterNodeTypes: [],
      focusEntityId: null
    });
    renderGraphWorkbench(ctx);
  });

  dom.searchKind?.addEventListener('change', () => {
    patchWorkbenchState(ctx, { searchKind: dom.searchKind.value || 'all' });
    renderGraphWorkbench(ctx);
  });

  dom.searchQuery?.addEventListener('input', () => {
    patchWorkbenchState(ctx, { searchQuery: dom.searchQuery.value || '' });
    renderGraphWorkbench(ctx);
  });

  dom.createEntityForm?.addEventListener('submit', e => {
    e.preventDefault();
    const state = getState(ctx);
    const snapshot = state.snapshot;
    const currentMovementId = state.currentMovementId;
    const services = ctx?.services || {};
    const DomainService = services.DomainService || window.DomainService;

    if (!currentMovementId || !DomainService) return;

    const name = (dom.createEntityName?.value || '').trim();
    if (!name) return;

    const kind = (dom.createEntityKind?.value || '').trim() || null;
    const summary = (dom.createEntitySummary?.value || '').trim() || null;
    const tags = parseCsvInput(dom.createEntityTags?.value);
    const sourcesOfTruth = parseCsvInput(dom.createEntitySources?.value);
    const sourceEntityIds = parseCsvInput(dom.createEntitySourceEntities?.value);
    const notes = (dom.createEntityNotes?.value || '').trim() || null;

    try {
      const entity = DomainService.addNewItem(snapshot, 'entities', currentMovementId);
      entity.name = name;
      entity.kind = kind;
      entity.summary = summary;
      entity.tags = tags;
      entity.sourcesOfTruth = sourcesOfTruth;
      entity.sourceEntityIds = sourceEntityIds;
      entity.notes = notes;

      DomainService.upsertItem(snapshot, 'entities', entity);
      ctx?.store?.saveSnapshot?.({ show: false });
      ctx?.ui?.setStatus?.('Entity created');

      if (dom.createEntityName) dom.createEntityName.value = '';
      if (dom.createEntityKind) dom.createEntityKind.value = '';
      if (dom.createEntitySummary) dom.createEntitySummary.value = '';
      if (dom.createEntityTags) dom.createEntityTags.value = '';
      if (dom.createEntitySources) dom.createEntitySources.value = '';
      if (dom.createEntitySourceEntities) dom.createEntitySourceEntities.value = '';
      if (dom.createEntityNotes) dom.createEntityNotes.value = '';

      patchWorkbenchState(ctx, {
        selection: { type: 'entity', id: entity.id },
        filterCenterId: entity.id,
        focusEntityId: entity.id
      });
      renderGraphWorkbench(ctx);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create entity');
    }
  });

  graphWorkbenchDom = dom;
  return dom;
}

function renderGraphSearch(ctx, dom, baseGraphNodes) {
  const workbenchState = getWorkbenchState(ctx);
  const nodes = normaliseArray(baseGraphNodes);
  const nodeTypes = uniqueSorted(nodes.map(n => n.type));
  const opts = [{ value: 'all', label: 'All types' }].concat(
    nodeTypes.map(t => ({ value: t, label: labelForNodeType(t) }))
  );

  const prev = dom.searchKind?.value || workbenchState.searchKind || 'all';
  clearElement(dom.searchKind);
  opts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    dom.searchKind.appendChild(opt);
  });
  dom.searchKind.value = opts.some(o => o.value === prev) ? prev : 'all';

  if (dom.searchQuery && dom.searchQuery.value !== (workbenchState.searchQuery || '')) {
    dom.searchQuery.value = workbenchState.searchQuery || '';
  }

  const q = (workbenchState.searchQuery || '').trim().toLowerCase();
  const typeFilter = dom.searchKind?.value || 'all';

  const filtered = nodes.filter(node => {
    const matchesType = typeFilter === 'all' || node.type === typeFilter;
    if (!matchesType) return false;
    if (!q) return true;
    const hay = `${node.name || ''} ${node.id || ''} ${(node.kind || '')}`.toLowerCase();
    return hay.includes(q);
  });

  clearElement(dom.searchResults);

  if (!filtered.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.style.padding = '10px';
    li.textContent = 'No matches.';
    dom.searchResults.appendChild(li);
    return;
  }

  const selType = normaliseSelectionType(workbenchState.selection?.type);
  const selectedNodeId =
    selType && selType !== 'relation' && selType !== 'edge'
      ? workbenchState.selection.id
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
        const type = normaliseSelectionType(node.type) || 'node';
        patchWorkbenchState(ctx, {
          selection: { type, id: node.id },
          filterCenterId: node.id,
          focusEntityId: node.id
        });
        renderGraphWorkbench(ctx);
      });

      dom.searchResults.appendChild(li);
    });
}

function renderGraphWorkbenchFilters(ctx, dom, baseGraph) {
  const workbenchState = getWorkbenchState(ctx);
  const nodes = normaliseArray(baseGraph?.nodes);
  const nodeTypes = uniqueSorted(nodes.map(n => n.type));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const validTypes = workbenchState.filterNodeTypes.filter(t => nodeTypes.includes(t));
  if (validTypes.length !== workbenchState.filterNodeTypes.length) {
    patchWorkbenchState(ctx, { filterNodeTypes: validTypes });
    return false;
  }

  if (workbenchState.filterCenterId && !nodeMap.has(workbenchState.filterCenterId)) {
    patchWorkbenchState(ctx, { filterCenterId: null, focusEntityId: null });
    return false;
  }

  const centerNode = workbenchState.filterCenterId
    ? nodeMap.get(workbenchState.filterCenterId)
    : null;

  if (dom.filterCenterLabel) {
    dom.filterCenterLabel.textContent = centerNode
      ? `${centerNode.name || centerNode.id} (${labelForNodeType(centerNode.type)}) [${centerNode.id}]`
      : 'No center selected; showing full graph.';
  }

  if (dom.filterDepth) {
    const desired =
      workbenchState.filterDepth === null || workbenchState.filterDepth === undefined
        ? ''
        : String(workbenchState.filterDepth);
    if (dom.filterDepth.value !== desired) {
      dom.filterDepth.value = desired;
    }
  }

  if (!dom.filterTypes) return true;
  clearElement(dom.filterTypes);

  const selectedTypes = new Set(workbenchState.filterNodeTypes);

  nodeTypes.forEach(type => {
    const chip = document.createElement('label');
    chip.className = 'chip';
    const color = colorForNodeType(type);
    chip.style.backgroundColor = color;
    chip.style.borderColor = color;
    chip.style.color = '#fff';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = type;
    cb.checked = selectedTypes.has(type);
    cb.addEventListener('change', () => {
      const nextTypes = cb.checked
        ? Array.from(new Set([...getWorkbenchState(ctx).filterNodeTypes, type]))
        : getWorkbenchState(ctx).filterNodeTypes.filter(t => t !== type);
      patchWorkbenchState(ctx, { filterNodeTypes: nextTypes });
      renderGraphWorkbench(ctx);
    });

    const label = document.createElement('span');
    label.textContent = labelForNodeType(type);

    chip.appendChild(cb);
    chip.appendChild(label);
    dom.filterTypes.appendChild(chip);
  });

  return true;
}

function renderGenericNodeEditor(ctx, dom, node, config, snapshot) {
  const item = (snapshot[config.collection] || []).find(it => it && it.id === node.id);

  if (!item) {
    dom.selectedBody.textContent = 'Selected item not found.';
    return;
  }

  const header = document.createElement('div');
  header.className = 'graph-selected-header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'graph-selected-title';
  title.textContent = item.name || item.title || item.shortText || item.text || node.id;

  const subtitle = document.createElement('p');
  subtitle.className = 'graph-selected-subtitle';
  subtitle.textContent = `${config.label} · ${node.id}`;
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const actions = document.createElement('div');
  const btnSave = document.createElement('button');
  btnSave.className = 'btn btn-primary';
  btnSave.type = 'button';
  btnSave.textContent = 'Save';

  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn btn-danger';
  btnDelete.type = 'button';
  btnDelete.textContent = 'Delete';

  actions.appendChild(btnSave);
  actions.appendChild(btnDelete);

  header.appendChild(titleWrap);
  header.appendChild(actions);
  dom.selectedBody.appendChild(header);

  const form = document.createElement('form');
  form.className = 'form-stack';
  form.addEventListener('submit', ev => ev.preventDefault());

  const formatterCsv = value => normaliseArray(value).join(', ');

  config.fields.forEach(field => {
    const value = item[field.name];
    const initialValue =
      field.type === 'csv' ? formatterCsv(value) : value === null ? '' : value || '';

    if (field.name === 'content') {
      const row = document.createElement('div');
      row.className = 'form-row markdown-row';

      const headerRow = document.createElement('div');
      headerRow.className = 'markdown-row-header';
      const label = document.createElement('span');
      label.textContent = field.label;
      headerRow.appendChild(label);

      const headerActions = document.createElement('div');
      headerActions.className = 'markdown-row-actions';
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.textContent = 'Open markdown editor';
      headerActions.appendChild(openBtn);
      headerRow.appendChild(headerActions);

      const grid = document.createElement('div');
      grid.className = 'markdown-editor-grid';

      const control = document.createElement('textarea');
      control.className = 'markdown-input form-control';
      control.name = field.name;
      control.rows = field.rows || 6;
      control.value = initialValue;
      if (field.readOnly) control.readOnly = true;

      const preview = document.createElement('div');
      preview.className = 'markdown-preview-panel';
      renderMarkdownPreview(preview, control.value, { enabled: true });

      control.addEventListener('input', () => {
        renderMarkdownPreview(preview, control.value, { enabled: true });
      });

      openBtn.addEventListener('click', () => {
        if (control.readOnly) return;
        openMarkdownModal({
          title: 'Edit canon text',
          initial: control.value,
          onSave: value => {
            control.value = value;
            renderMarkdownPreview(preview, value, { enabled: true });
          },
          onClose: () => {
            renderMarkdownPreview(preview, control.value, { enabled: true });
          }
        });
      });

      grid.appendChild(control);
      grid.appendChild(preview);

      row.appendChild(headerRow);
      row.appendChild(grid);
      form.appendChild(row);
      return;
    }

    const row = document.createElement('label');
    row.className = 'form-row';
    row.style.marginBottom = '10px';

    const label = document.createElement('span');
    label.textContent = field.label;
    label.style.display = 'block';
    label.style.fontWeight = '600';
    label.style.marginBottom = '4px';

    row.appendChild(label);

    let control;

    if (field.type === 'textarea') {
      control = document.createElement('textarea');
      control.className = 'form-control';
      control.name = field.name;
      control.rows = field.rows || 3;
      control.value = initialValue;
    } else if (field.type === 'checkbox') {
      control = document.createElement('input');
      control.type = 'checkbox';
      control.name = field.name;
      control.checked = Boolean(value);
    } else {
      control = document.createElement('input');
      control.type = 'text';
      control.className = 'form-control';
      control.name = field.name;
      control.value = initialValue;
    }

    if (field.readOnly) {
      control.readOnly = true;
    }

    row.appendChild(control);
    form.appendChild(row);
  });

  dom.selectedBody.appendChild(form);

  btnSave.addEventListener('click', () => {
    const fd = new FormData(form);
    const updated = { ...item };

    config.fields.forEach(field => {
      let rawValue;
      if (field.type === 'checkbox') {
        const el = form.querySelector(`[name="${field.name}"]`);
        rawValue = el && 'checked' in el ? el.checked : false;
      } else {
        rawValue = fd.get(field.name);
      }

      if (field.readOnly) return;

      const rawString = rawValue === null ? '' : rawValue.toString();
      let parsedValue;

      if (field.type === 'csv') {
        parsedValue = parseCsvInput(rawString);
      } else if (field.type === 'checkbox') {
        parsedValue = Boolean(rawValue);
      } else {
        parsedValue = rawString.trim();
      }

      if (field.nullable && parsedValue === '') {
        updated[field.name] = null;
      } else {
        updated[field.name] = parsedValue;
      }
    });

    try {
      const DomainService = ctx?.services?.DomainService || window.DomainService;
      DomainService.upsertItem(snapshot, config.collection, updated);
      ctx?.store?.saveSnapshot?.({ show: false });
      ctx?.ui?.setStatus?.(`${config.label} saved`);
      renderGraphWorkbench(ctx);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save item');
    }
  });

  btnDelete.addEventListener('click', () => {
    const ok = window.confirm(
      `Delete this ${config.label.toLowerCase()}?\n\n${item.name || item.title || item.id}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      const DomainService = ctx?.services?.DomainService || window.DomainService;
      DomainService.deleteItem(snapshot, config.collection, item.id);
      patchWorkbenchState(ctx, { selection: null });
      ctx?.store?.saveSnapshot?.({ show: false });
      ctx?.ui?.setStatus?.(`${config.label} deleted`);
      renderGraphWorkbench(ctx);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  });
}

function renderSelected(ctx, dom, visibleEntities, entityById, baseGraph, snapshot) {
  clearElement(dom.selectedBody);

  const workbenchState = getWorkbenchState(ctx);
  const selection = workbenchState.selection;
  if (!selection) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Click a node or edge to view/edit details.';
    dom.selectedBody.appendChild(p);
    return;
  }

  const selectionType = normaliseSelectionType(selection.type);

  const nodes = normaliseArray(baseGraph?.nodes);
  const edges = normaliseArray(baseGraph?.edges);
  const nodeIndex = new Map(nodes.map(n => [n.id, n]));

  if (selectionType === 'edge') {
    const edgeCard = document.createElement('div');
    edgeCard.className = 'card';
    edgeCard.style.padding = '10px';
    edgeCard.style.marginBottom = '10px';

    const edge = edges.find(e => e.id === selection.id);
    if (!edge) {
      edgeCard.textContent = 'Selected edge not found in this graph.';
      dom.selectedBody.appendChild(edgeCard);
      return;
    }

    const from = nodeIndex.get(edge.fromId);
    const to = nodeIndex.get(edge.toId);

    const title = document.createElement('p');
    title.className = 'graph-selected-title';
    title.textContent = edge.relationType || 'Edge';

    const subtitle = document.createElement('p');
    subtitle.className = 'graph-selected-subtitle';
    const fromLabel = from ? from.name || from.id : edge.fromId;
    const toLabel = to ? to.name || to.id : edge.toId;
    subtitle.textContent = `${fromLabel} → ${edge.relationType || 'link'} → ${toLabel}`;

    edgeCard.appendChild(title);
    edgeCard.appendChild(subtitle);

    if (edge.source) {
      const info = document.createElement('p');
      info.className = 'hint';
      const fieldLabel = edge.source.field ? `.${edge.source.field}` : '';
      info.textContent = `Edge derived from ${edge.source.collection || 'record'}${fieldLabel} on ${edge.source.id || 'unknown'}.`;
      edgeCard.appendChild(info);

      if (edge.source.collection && edge.source.id) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.type = 'button';
        btn.textContent = 'Jump to source record';
        btn.addEventListener('click', () =>
          ctx?.actions?.jumpToReferencedItem?.(edge.source.collection, edge.source.id)
        );
        edgeCard.appendChild(btn);
      }
    }

    dom.selectedBody.appendChild(edgeCard);
    return;
  }

  if (selectionType === 'entity') {
    const entity = entityById.get(selection.id);
    if (!entity) {
      dom.selectedBody.textContent = 'Selected entity not found.';
      return;
    }

    const header = document.createElement('div');
    header.className = 'graph-selected-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'graph-selected-title';
    title.textContent = entity.name || entity.id;
    const subtitle = document.createElement('p');
    subtitle.className = 'graph-selected-subtitle';
    subtitle.textContent = `Entity · ${entity.kind || '—'} · ${entity.id}`;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const actions = document.createElement('div');
    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary';
    btnSave.type = 'button';
    btnSave.textContent = 'Save';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-danger';
    btnDelete.type = 'button';
    btnDelete.textContent = 'Delete';

    actions.appendChild(btnSave);
    actions.appendChild(btnDelete);

    header.appendChild(titleWrap);
    header.appendChild(actions);
    dom.selectedBody.appendChild(header);

    const form = document.createElement('form');
    form.className = 'graph-form';

    function addInput(label, name, value, opts) {
      const row = document.createElement('div');
      row.className = 'form-row';
      const l = document.createElement('label');
      l.textContent = label;
      const input = document.createElement('input');
      input.className = 'form-control';
      input.name = name;
      input.value = value || '';
      if (opts && opts.readOnly) input.readOnly = true;
      row.appendChild(l);
      row.appendChild(input);
      form.appendChild(row);
    }

    function addTextarea(label, name, value, rows) {
      const row = document.createElement('div');
      row.className = 'form-row';
      const l = document.createElement('label');
      l.textContent = label;
      const ta = document.createElement('textarea');
      ta.className = 'form-control';
      ta.name = name;
      ta.rows = rows || 3;
      ta.value = value || '';
      row.appendChild(l);
      row.appendChild(ta);
      form.appendChild(row);
    }

    addInput('ID', 'id', entity.id, { readOnly: true });
    addInput('Movement ID', 'movementId', entity.movementId || '', {});
    addInput('Kind', 'kind', entity.kind || '', {});
    addInput('Name', 'name', entity.name || '', {});
    addTextarea('Summary', 'summary', entity.summary || '', 3);
    addInput('Tags (csv)', 'tags', normaliseArray(entity.tags).join(', '), {});
    addInput('Sources of truth (csv)', 'sourcesOfTruth', normaliseArray(entity.sourcesOfTruth).join(', '), {});
    addInput('Source entity IDs (csv)', 'sourceEntityIds', normaliseArray(entity.sourceEntityIds).join(', '), {});
    addTextarea('Notes', 'notes', entity.notes || '', 3);

    dom.selectedBody.appendChild(form);

    btnSave.addEventListener('click', () => {
      const fd = new FormData(form);
      const updated = {
        ...entity,
        movementId: (fd.get('movementId') || '').toString().trim() || null,
        kind: (fd.get('kind') || '').toString().trim() || null,
        name: (fd.get('name') || '').toString().trim() || entity.name,
        summary: (fd.get('summary') || '').toString().trim() || null,
        tags: parseCsvInput((fd.get('tags') || '').toString()),
        sourcesOfTruth: parseCsvInput((fd.get('sourcesOfTruth') || '').toString()),
        sourceEntityIds: parseCsvInput((fd.get('sourceEntityIds') || '').toString()),
        notes: (fd.get('notes') || '').toString().trim() || null
      };

      try {
        const DomainService = ctx?.services?.DomainService || window.DomainService;
        DomainService.upsertItem(snapshot, 'entities', updated);
        ctx?.store?.saveSnapshot?.({ show: false });
        ctx?.ui?.setStatus?.('Entity saved');
        renderGraphWorkbench(ctx);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save entity');
      }
    });

    btnDelete.addEventListener('click', () => {
      const ok = window.confirm(
        `Delete this entity?\n\n${entity.name || entity.id}\n\nThis cannot be undone.`
      );
      if (!ok) return;

      try {
        const DomainService = ctx?.services?.DomainService || window.DomainService;
        DomainService.deleteItem(snapshot, 'entities', entity.id);
        patchWorkbenchState(ctx, { selection: null });
        ctx?.store?.saveSnapshot?.({ show: false });
        ctx?.ui?.setStatus?.('Entity deleted');
        renderGraphWorkbench(ctx);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete entity');
      }
    });

    return;
  }

  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  const node = nodesMap.get(selection.id);

  if (node) {
    const config = GRAPH_NODE_EDIT_CONFIG[normaliseSelectionType(node.type)];

    if (config) {
      renderGenericNodeEditor(ctx, dom, node, config, snapshot);
      return;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '10px';
    card.style.marginBottom = '10px';

    const title = document.createElement('p');
    title.className = 'graph-selected-title';
    title.textContent = node.name || node.id;

    const subtitle = document.createElement('p');
    subtitle.className = 'graph-selected-subtitle';
    subtitle.textContent = `${labelForNodeType(node.type)} · ${node.id}`;

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Editing is not available for this node type yet.';

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(hint);

    dom.selectedBody.appendChild(card);
    return;
  }

  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = 'Selected item not found in this graph.';
  dom.selectedBody.appendChild(p);
}

export function renderGraphWorkbench(ctx) {
  const root = document.getElementById('graph-workbench-root');
  if (!root) return;

  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;
  const ViewModels = ctx?.services?.ViewModels || window.ViewModels;
  const EntityGraphView = ctx?.services?.EntityGraphView || window.EntityGraphView;

  if (!currentMovementId) {
    clearElement(root);
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Create or select a movement on the left to use the graph editor.';
    root.appendChild(p);
    return;
  }

  if (!ViewModels || typeof ViewModels.buildMovementGraphModel !== 'function') {
    clearElement(root);
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'ViewModels module not loaded.';
    root.appendChild(p);
    return;
  }

  const dom = ensureGraphWorkbenchDom(ctx);
  if (!dom) return;

  const workbenchState = getWorkbenchState(ctx);
  dom.workbench?.style.setProperty('--graph-left-width', `${workbenchState.leftWidth}px`);
  dom.workbench?.style.setProperty('--graph-right-width', `${workbenchState.rightWidth}px`);

  const baseGraph = ViewModels.buildMovementGraphModel(snapshot, {
    movementId: currentMovementId
  });

  const baseNodeIds = new Set(normaliseArray(baseGraph.nodes).map(n => n.id));
  const baseEdgeIds = new Set(normaliseArray(baseGraph.edges).map(e => e.id));

  const { visibleEntities, entityById } = getGraphDatasetForMovement(snapshot, currentMovementId);
  const entityIds = new Set(visibleEntities.map(e => e.id));

  if (workbenchState.selection) {
    const sel = workbenchState.selection;
    const selType = normaliseSelectionType(sel.type);

    if (selType === 'entity') {
      const exists = baseNodeIds.has(sel.id) && entityIds.has(sel.id);
      if (!exists) {
        patchWorkbenchState(ctx, { selection: null });
        return;
      }
    } else if (selType === 'edge') {
      const exists = baseEdgeIds.has(sel.id);
      if (!exists) {
        patchWorkbenchState(ctx, { selection: null });
        return;
      }
    } else if (sel && !baseNodeIds.has(sel.id)) {
      patchWorkbenchState(ctx, { selection: null });
      return;
    }
  }

  const filtersOk = renderGraphWorkbenchFilters(ctx, dom, baseGraph);
  if (!filtersOk) return;

  const kinds = uniqueSorted(visibleEntities.map(e => e.kind));
  clearElement(dom.entityKindDatalist);
  kinds.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    dom.entityKindDatalist.appendChild(opt);
  });

  renderGraphSearch(ctx, dom, baseGraph.nodes);
  renderSelected(ctx, dom, visibleEntities, entityById, baseGraph, snapshot);

  if (!workbenchGraphView && EntityGraphView) {
    workbenchGraphView = new EntityGraphView({
      onNodeClick: (id, node) => {
        const type = normaliseSelectionType(node?.type) || 'node';
        patchWorkbenchState(ctx, {
          selection: { type, id },
          filterCenterId: id,
          focusEntityId: id
        });
        renderGraphWorkbench(ctx);
      },
      onLinkClick: id => {
        patchWorkbenchState(ctx, { selection: { type: 'edge', id } });
        renderGraphWorkbench(ctx);
      },
      onBackgroundClick: () => {
        patchWorkbenchState(ctx, { selection: null });
        renderGraphWorkbench(ctx);
      }
    });
  }

  if (!workbenchGraphView) {
    clearElement(dom.canvas);
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'EntityGraphView module not available.';
    dom.canvas.appendChild(p);
    return;
  }

  const filteredGraph = ViewModels.filterGraphModel(baseGraph, {
    centerNodeId: workbenchState.filterCenterId,
    depth: workbenchState.filterDepth,
    nodeTypeFilter: workbenchState.filterNodeTypes
  });

  const selectedType = normaliseSelectionType(workbenchState.selection?.type);
  const selectedNodeIdForGraph =
    workbenchState.selection && selectedType !== 'edge'
      ? workbenchState.selection.id
      : null;

  workbenchGraphView.render(dom.canvas, filteredGraph, {
    selectedEntityId: selectedNodeIdForGraph,
    selectedEdgeId: selectedType === 'edge' ? workbenchState.selection.id : null,
    focusEntityId: workbenchState.filterCenterId
  });
}

export function mountGraphWorkbench(ctx) {
  graphWorkbenchDom = null;
  workbenchGraphView = null;
  patchWorkbenchState(ctx, { ...DEFAULT_GRAPH_WORKBENCH_STATE, ...getWorkbenchState(ctx) });
}

export function unmountGraphWorkbench(ctx) {
  if (graphWorkbenchDom?.root) {
    clearElement(graphWorkbenchDom.root);
  }
  graphWorkbenchDom = null;
  workbenchGraphView = null;
}

export function getGraphWorkbenchDom() {
  return graphWorkbenchDom;
}
