import { openMarkdownModal, renderMarkdownPreview } from '../ui/markdown.js';
import { normaliseArray, parseCsvInput, uniqueSorted } from '../utils/values.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const DEFAULT_GRAPH_STATE = {
  leftWidth: 360,
  rightWidth: 420,
  searchKind: 'all',
  searchQuery: '',
  selection: null,
  focusEntityId: null,
  filterCenterId: null,
  filterDepth: null,
  filterNodeTypes: []
};

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

const movementColorForNodeType = type => {
  if (typeof window !== 'undefined' && window.EntityGraphColors?.colorForNodeType) {
    return window.EntityGraphColors.colorForNodeType(type);
  }
  return '#1f2937';
};

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

let graphWorkbenchDom = null;
let workbenchGraphView = null;

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getServices(ctx) {
  const services = ctx?.services || movementEngineerGlobal.services || {};
  return {
    DomainService: services.DomainService || window.DomainService,
    ViewModels: services.ViewModels || window.ViewModels,
    EntityGraphView: services.EntityGraphView || window.EntityGraphView
  };
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
}

function getLegacy(ctx) {
  return ctx?.legacy || movementEngineerGlobal.legacy || {};
}

function getState(ctx) {
  return ctx?.getState?.() || {};
}

function labelForNodeType(type) {
  return GRAPH_NODE_TYPE_LABELS[type] || type || 'Unknown';
}

function normaliseSelectionType(type) {
  return typeof type === 'string' ? type.toLowerCase() : null;
}

function getGraphState(ctx) {
  const state = getState(ctx);
  return { ...DEFAULT_GRAPH_STATE, ...(state.graphWorkbenchState || {}) };
}

function updateGraphState(ctx, updater) {
  const current = getGraphState(ctx);
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  getLegacy(ctx)?.setState?.({ graphWorkbenchState: next });
  return next;
}

function setGraphSelection(ctx, selection) {
  updateGraphState(ctx, state => ({ ...state, selection: selection || null }));
}

function getGraphDatasetForMovement(state) {
  const movementId = state.currentMovementId;
  const visibleEntities = normaliseArray(state.snapshot?.entities).filter(
    e => e && e.movementId === movementId
  );
  const entityById = new Map(visibleEntities.map(e => [e.id, e]));
  return { visibleEntities, entityById };
}

function ensureGraphWorkbenchDom(ctx, render) {
  const graphState = getGraphState(ctx);
  const root = document.getElementById('graph-workbench-root');
  if (!root) return null;

  if (graphWorkbenchDom && graphWorkbenchDom.root === root) {
    return graphWorkbenchDom;
  }

  root.innerHTML = `
      <div id="graph-workbench" class="graph-workbench"
           style="--graph-left-width:${graphState.leftWidth}px; --graph-right-width:${graphState.rightWidth}px;">
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

  const services = getServices(ctx);
  const legacy = getLegacy(ctx);

  function attachResize(handleEl, side) {
    if (!handleEl) return;
    handleEl.addEventListener('mousedown', e => {
      e.preventDefault();
      const startX = e.clientX;
      const startLeft = graphState.leftWidth;
      const startRight = graphState.rightWidth;

      function onMove(ev) {
        const dx = ev.clientX - startX;
        if (side === 'left') {
          const next = Math.max(240, startLeft + dx);
          dom.workbench.style.setProperty('--graph-left-width', next + 'px');
        } else {
          const next = Math.max(260, startRight - dx);
          dom.workbench.style.setProperty('--graph-right-width', next + 'px');
        }
      }

      function onUp(ev) {
        const dx = ev.clientX - startX;
        if (side === 'left') {
          const next = Math.max(240, startLeft + dx);
          updateGraphState(ctx, { leftWidth: next });
        } else {
          const next = Math.max(260, startRight - dx);
          updateGraphState(ctx, { rightWidth: next });
        }
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        render();
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  attachResize(dom.leftHandle, 'left');
  attachResize(dom.rightHandle, 'right');

  if (dom.fitBtn) {
    dom.fitBtn.addEventListener('click', () => {
      if (workbenchGraphView) workbenchGraphView.fit();
    });
  }

  if (dom.clearBtn) {
    dom.clearBtn.addEventListener('click', () => {
      setGraphSelection(ctx, null);
      render();
    });
  }

  if (dom.filterDepth) {
    dom.filterDepth.addEventListener('input', () => {
      const raw = dom.filterDepth.value;
      const nextDepth =
        raw === '' ? null : Number.isFinite(parseInt(raw, 10)) ? Math.max(0, parseInt(raw, 10)) : null;
      updateGraphState(ctx, { filterDepth: nextDepth });
      render();
    });
  }

  if (dom.filterDepthClear) {
    dom.filterDepthClear.addEventListener('click', () => {
      dom.filterDepth.value = '';
      updateGraphState(ctx, { filterDepth: null });
      render();
    });
  }

  if (dom.filterUseSelection) {
    dom.filterUseSelection.addEventListener('click', () => {
      const sel = getGraphState(ctx).selection;
      if (!sel || !sel.id) return;
      const t = normaliseSelectionType(sel.type);
      if (t === 'relation' || t === 'edge') return;
      updateGraphState(ctx, { filterCenterId: sel.id });
      render();
    });
  }

  if (dom.filterClearCenter) {
    dom.filterClearCenter.addEventListener('click', () => {
      updateGraphState(ctx, { filterCenterId: null });
      render();
    });
  }

  if (dom.filterReset) {
    dom.filterReset.addEventListener('click', () => {
      updateGraphState(ctx, {
        filterCenterId: null,
        filterDepth: null,
        filterNodeTypes: []
      });
      render();
    });
  }

  if (dom.searchKind) {
    dom.searchKind.addEventListener('change', () => {
      updateGraphState(ctx, { searchKind: dom.searchKind.value || 'all' });
      render();
    });
  }

  if (dom.searchQuery) {
    dom.searchQuery.addEventListener('input', () => {
      updateGraphState(ctx, { searchQuery: dom.searchQuery.value || '' });
      render();
    });
  }

  if (dom.createEntityForm) {
    dom.createEntityForm.addEventListener('submit', e => {
      e.preventDefault();
      const state = getState(ctx);
      if (!state.currentMovementId) return;
      const name = (dom.createEntityName.value || '').trim();
      if (!name) return;
      const kind = (dom.createEntityKind.value || '').trim() || null;
      const summary = (dom.createEntitySummary.value || '').trim() || null;
      const tags = parseCsvInput(dom.createEntityTags.value);
      const sourcesOfTruth = parseCsvInput(dom.createEntitySources.value);
      const sourceEntityIds = parseCsvInput(dom.createEntitySourceEntities.value);
      const notes = (dom.createEntityNotes.value || '').trim() || null;

      try {
        const entity = services.DomainService.addNewItem(
          state.snapshot,
          'entities',
          state.currentMovementId
        );
        entity.name = name;
        entity.kind = kind;
        entity.summary = summary;
        entity.tags = tags;
        entity.sourcesOfTruth = sourcesOfTruth;
        entity.sourceEntityIds = sourceEntityIds;
        entity.notes = notes;

        services.DomainService.upsertItem(state.snapshot, 'entities', entity);
        getLegacy(ctx)?.saveSnapshot?.({ show: false });
        ctx?.setStatus?.('Entity created');

        dom.createEntityName.value = '';
        dom.createEntityKind.value = '';
        dom.createEntitySummary.value = '';
        dom.createEntityTags.value = '';
        dom.createEntitySources.value = '';
        dom.createEntitySourceEntities.value = '';
        dom.createEntityNotes.value = '';

        setGraphSelection(ctx, { type: 'entity', id: entity.id });
        render();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to create entity');
      }
    });
  }

  graphWorkbenchDom = dom;
  return dom;
}

function renderGraphSearch(ctx, dom, baseGraphNodes) {
  const graphState = getGraphState(ctx);
  const nodes = normaliseArray(baseGraphNodes);

  const nodeTypes = uniqueSorted(nodes.map(n => n.type));
  const opts = [{ value: 'all', label: 'All types' }].concat(
    nodeTypes.map(t => ({ value: t, label: labelForNodeType(t) }))
  );

  const prev = dom.searchKind.value || graphState.searchKind || 'all';
  fallbackClear(dom.searchKind);
  opts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    dom.searchKind.appendChild(opt);
  });
  dom.searchKind.value = opts.some(o => o.value === prev) ? prev : 'all';

  if (dom.searchQuery.value !== (graphState.searchQuery || '')) {
    dom.searchQuery.value = graphState.searchQuery || '';
  }

  const q = (graphState.searchQuery || '').trim().toLowerCase();
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

  const selType = normaliseSelectionType(graphState.selection?.type);
  const selectedNodeId =
    selType && selType !== 'relation' && selType !== 'edge'
      ? graphState.selection.id
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
        setGraphSelection(ctx, { type, id: node.id });
        updateGraphState(ctx, { filterCenterId: node.id });
        renderGraphTab(ctx);
      });

      dom.searchResults.appendChild(li);
    });
}

function renderGraphWorkbenchFilters(ctx, dom, baseGraph) {
  const graphState = getGraphState(ctx);
  const nodes = normaliseArray(baseGraph?.nodes);
  const nodeTypes = uniqueSorted(nodes.map(n => n.type));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const nextState = {
    ...graphState,
    filterNodeTypes: graphState.filterNodeTypes.filter(t => nodeTypes.includes(t)),
    filterCenterId: graphState.filterCenterId && nodeMap.has(graphState.filterCenterId)
      ? graphState.filterCenterId
      : null
  };
  if (nextState.filterCenterId !== graphState.filterCenterId) {
    updateGraphState(ctx, { filterCenterId: nextState.filterCenterId });
  }

  const centerNode = nextState.filterCenterId ? nodeMap.get(nextState.filterCenterId) : null;

  if (dom.filterCenterLabel) {
    dom.filterCenterLabel.textContent = centerNode
      ? `${centerNode.name || centerNode.id} (${labelForNodeType(centerNode.type)}) [${centerNode.id}]`
      : 'No center selected; showing full graph.';
  }

  if (dom.filterDepth) {
    const desired =
      nextState.filterDepth === null || nextState.filterDepth === undefined
        ? ''
        : String(nextState.filterDepth);
    if (dom.filterDepth.value !== desired) {
      dom.filterDepth.value = desired;
    }
  }

  if (!dom.filterTypes) return;
  fallbackClear(dom.filterTypes);

  const selectedTypes = new Set(nextState.filterNodeTypes);

  nodeTypes.forEach(type => {
    const chip = document.createElement('label');
    chip.className = 'chip';
    const color = movementColorForNodeType(type);
    chip.style.backgroundColor = color;
    chip.style.borderColor = color;
    chip.style.color = '#fff';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = type;
    cb.checked = selectedTypes.has(type);
    cb.addEventListener('change', () => {
      const updatedTypes = cb.checked
        ? uniqueSorted(nextState.filterNodeTypes.concat(type))
        : nextState.filterNodeTypes.filter(t => t !== type);
      updateGraphState(ctx, { filterNodeTypes: updatedTypes });
      renderGraphTab(ctx);
    });

    const label = document.createElement('span');
    label.textContent = labelForNodeType(type);

    chip.appendChild(cb);
    chip.appendChild(label);
    dom.filterTypes.appendChild(chip);
  });
}

function renderGenericNodeEditor(ctx, dom, node, config) {
  const state = getState(ctx);
  const services = getServices(ctx);
  const snapshot = state.snapshot;
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

      const header = document.createElement('div');
      header.className = 'markdown-row-header';
      const label = document.createElement('span');
      label.textContent = field.label;
      header.appendChild(label);

      const actions = document.createElement('div');
      actions.className = 'markdown-row-actions';
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.textContent = 'Open markdown editor';
      actions.appendChild(openBtn);
      header.appendChild(actions);

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

      row.appendChild(header);
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
      services.DomainService.upsertItem(snapshot, config.collection, updated);
      getLegacy(ctx)?.saveSnapshot?.({ show: false });
      ctx?.setStatus?.(`${config.label} saved`);
      renderGraphTab(ctx);
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
      services.DomainService.deleteItem(snapshot, config.collection, item.id);
      setGraphSelection(ctx, null);
      getLegacy(ctx)?.saveSnapshot?.({ show: false });
      ctx?.setStatus?.(`${config.label} deleted`);
      renderGraphTab(ctx);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  });
}

function renderSelected(ctx, dom, baseGraph) {
  const clear = getClear(ctx);
  clear(dom.selectedBody);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const graphState = getGraphState(ctx);
  const services = getServices(ctx);
  const actions = getActions(ctx);

  if (!graphState.selection) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Click a node or edge to view/edit details.';
    dom.selectedBody.appendChild(p);
    return;
  }

  const selectionType = normaliseSelectionType(graphState.selection.type);

  const allEntities = normaliseArray(snapshot.entities);
  const entityIndexAll = new Map(allEntities.map(e => [e.id, e]));
  const nodes = normaliseArray(baseGraph?.nodes);
  const edges = normaliseArray(baseGraph?.edges);
  const nodeIndex = new Map(nodes.map(n => [n.id, n]));

  if (selectionType === 'edge') {
    const edgeCard = document.createElement('div');
    edgeCard.className = 'card';
    edgeCard.style.padding = '10px';
    edgeCard.style.marginBottom = '10px';

    const edge = edges.find(e => e.id === graphState.selection.id);
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
        btn.addEventListener('click', () => {
          if (actions.jumpToReferencedItem) {
            actions.jumpToReferencedItem(edge.source.collection, edge.source.id);
          } else {
            getLegacy(ctx)?.jumpToReferencedItem?.(edge.source.collection, edge.source.id);
          }
        });
        edgeCard.appendChild(btn);
      }
    }

    dom.selectedBody.appendChild(edgeCard);
    return;
  }

  if (selectionType === 'entity') {
    const entity = entityIndexAll.get(graphState.selection.id);
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
        services.DomainService.upsertItem(snapshot, 'entities', updated);
        getLegacy(ctx)?.saveSnapshot?.({ show: false });
        ctx?.setStatus?.('Entity saved');
        renderGraphTab(ctx);
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
        services.DomainService.deleteItem(snapshot, 'entities', entity.id);
        setGraphSelection(ctx, null);
        getLegacy(ctx)?.saveSnapshot?.({ show: false });
        ctx?.setStatus?.('Entity deleted');
        renderGraphTab(ctx);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete entity');
      }
    });

    return;
  }

  const node = nodeIndex.get(graphState.selection.id);

  if (node) {
    const config = GRAPH_NODE_EDIT_CONFIG[normaliseSelectionType(node.type)];

    if (config) {
      renderGenericNodeEditor(ctx, dom, node, config);
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

function renderGraphTab(ctx) {
  const state = getState(ctx);
  const graphState = getGraphState(ctx);
  const services = getServices(ctx);
  const clear = getClear(ctx);

  const root = document.getElementById('graph-workbench-root');
  if (!root) return;

  if (!state.currentMovementId) {
    clear(root);
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Create or select a movement on the left to use the graph editor.';
    root.appendChild(p);
    return;
  }

  const dom = ensureGraphWorkbenchDom(ctx, () => renderGraphTab(ctx));
  if (!dom) return;

  dom.workbench.style.setProperty('--graph-left-width', graphState.leftWidth + 'px');
  dom.workbench.style.setProperty('--graph-right-width', graphState.rightWidth + 'px');

  const baseGraph = services.ViewModels.buildMovementGraphModel(state.snapshot, {
    movementId: state.currentMovementId
  });

  const baseNodeIds = new Set(normaliseArray(baseGraph.nodes).map(n => n.id));
  const baseEdgeIds = new Set(normaliseArray(baseGraph.edges).map(e => e.id));

  const { visibleEntities, entityById } = getGraphDatasetForMovement(state);
  const entityIds = new Set(visibleEntities.map(e => e.id));

  if (graphState.selection) {
    const sel = graphState.selection;
    const selType = normaliseSelectionType(sel.type);

    if (selType === 'entity') {
      const exists = baseNodeIds.has(sel.id) && entityIds.has(sel.id);
      if (!exists) {
        setGraphSelection(ctx, null);
      }
    } else if (selType === 'edge') {
      const exists = baseEdgeIds.has(sel.id);
      if (!exists) {
        setGraphSelection(ctx, null);
      }
    } else if (sel && !baseNodeIds.has(sel.id)) {
      setGraphSelection(ctx, null);
    }
  }

  renderGraphWorkbenchFilters(ctx, dom, baseGraph);

  const kinds = uniqueSorted(visibleEntities.map(e => e.kind));
  fallbackClear(dom.entityKindDatalist);
  kinds.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    dom.entityKindDatalist.appendChild(opt);
  });

  renderGraphSearch(ctx, dom, baseGraph.nodes);
  renderSelected(ctx, dom, baseGraph);

  if (!workbenchGraphView) {
    workbenchGraphView = new services.EntityGraphView({
      onNodeClick: (id, node) => {
        const type = normaliseSelectionType(node?.type) || 'node';
        setGraphSelection(ctx, { type, id });
        updateGraphState(ctx, { filterCenterId: id });
        renderGraphTab(ctx);
      },
      onLinkClick: id => {
        setGraphSelection(ctx, { type: 'edge', id });
        renderGraphTab(ctx);
      },
      onBackgroundClick: () => {
        setGraphSelection(ctx, null);
        renderGraphTab(ctx);
      }
    });
  }

  const filteredGraph = services.ViewModels.filterGraphModel(baseGraph, {
    centerNodeId: graphState.filterCenterId,
    depth: graphState.filterDepth,
    nodeTypeFilter: graphState.filterNodeTypes
  });

  const selectedType = normaliseSelectionType(graphState.selection && graphState.selection.type);

  const selectedNodeIdForGraph =
    graphState.selection && selectedType !== 'edge' ? graphState.selection.id : null;

  const nextGraphState = getGraphState(ctx);
  nextGraphState.focusEntityId = nextGraphState.filterCenterId;
  workbenchGraphView.render(dom.canvas, filteredGraph, {
    selectedEntityId: selectedNodeIdForGraph,
    selectedEdgeId: selectedType === 'edge' ? graphState.selection?.id : null,
    focusEntityId: nextGraphState.filterCenterId
  });
}

export function registerGraphTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'graph') return;
        rerender();
      };

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { unsubscribe };
    },
    render: renderGraphTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.graph = tab;
  if (ctx?.tabs) {
    ctx.tabs.graph = tab;
  }
  return tab;
}
