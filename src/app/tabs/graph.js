import { renderMarkdownPreview, openMarkdownModal } from '../ui/markdown.js';
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
      { label: 'Label', name: 'label', nullable: true },
      { label: 'Title', name: 'title' },
      { label: 'Main function', name: 'mainFunction', nullable: true },
      { label: 'Tags (csv)', name: 'tags', type: 'csv' },
      { label: 'Mentions entity IDs (csv)', name: 'mentionsEntityIds', type: 'csv' },
      { label: 'Content (markdown)', name: 'content', type: 'markdown' }
    ]
  }
};

const movementEngineerCtxTabs = movementEngineerGlobal.tabs;

function getState(ctx) {
  if (ctx?.getState) return ctx.getState();
  if (ctx?.store?.getState) return ctx.store.getState();
  return {};
}

function getGraphState(state) {
  return { ...DEFAULT_GRAPH_STATE, ...(state?.graphWorkbenchState || {}) };
}

function getActions(ctx) {
  const legacy = ctx?.legacy || {};
  const actions = ctx?.actions || movementEngineerGlobal.actions || {};
  return {
    saveSnapshot: actions.saveSnapshot || legacy.saveSnapshot || (() => {}),
    setState: legacy.setState || ctx?.setState || (() => {}),
    jumpToReferencedItem:
      actions.jumpToReferencedItem || legacy.jumpToReferencedItem || (() => {}),
    notify: legacy.notify || (() => {})
  };
}

function labelForNodeType(type) {
  return GRAPH_NODE_TYPE_LABELS[type] || type || 'Unknown';
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
  normaliseArray(entities).forEach(e => {
    if (!e || !e.id) return;
    map.set(e.id, e);
  });
  return map;
}

let graphDom = null;
let workbenchGraphView = null;
let unsubscribeStore = null;

function setGraphState(ctx, patch) {
  const setter = getActions(ctx).setState;
  setter({ graphWorkbenchState: { ...getGraphState(getState(ctx)), ...patch } });
}

function setGraphWorkbenchSelection(ctx, selection) {
  setGraphState(ctx, { selection });
}

function ensureGraphWorkbenchDom(ctx) {
  const state = getState(ctx);
  const graphState = getGraphState(state);
  const root = document.getElementById('graph-workbench-root');
  if (!root) return null;

  if (graphDom && graphDom.root === root) {
    return graphDom;
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

  graphDom = dom;
  return dom;
}

function getGraphDatasetForCurrentMovement(state) {
  const movementId = state.currentMovementId;
  const allEntities = normaliseArray(state?.snapshot?.entities);
  const visibleEntities = allEntities.filter(e => e && e.movementId === movementId);
  const entityById = buildEntityIndex(visibleEntities);
  return { visibleEntities, entityById };
}

function attachDomHandlers(ctx, dom) {
  if (!dom || dom.__wired) return;
  dom.__wired = true;

  const { DomainService } = ctx.services || {};

  function attachResize(handleEl, side) {
    if (!handleEl) return;
    handleEl.addEventListener('mousedown', e => {
      e.preventDefault();
      const startX = e.clientX;
      const state = getGraphState(getState(ctx));
      const startLeft = state.leftWidth;
      const startRight = state.rightWidth;

      function onMove(ev) {
        const dx = ev.clientX - startX;
        if (side === 'left') {
          const next = Math.max(240, startLeft + dx);
          setGraphState(ctx, { leftWidth: next });
          if (dom.workbench) {
            dom.workbench.style.setProperty('--graph-left-width', next + 'px');
          }
        } else {
          const next = Math.max(260, startRight - dx);
          setGraphState(ctx, { rightWidth: next });
          if (dom.workbench) {
            dom.workbench.style.setProperty('--graph-right-width', next + 'px');
          }
        }
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  attachResize(dom.leftHandle, 'left');
  attachResize(dom.rightHandle, 'right');

  dom.fitBtn?.addEventListener('click', () => {
    if (workbenchGraphView?.fit) workbenchGraphView.fit();
  });

  dom.clearBtn?.addEventListener('click', () => {
    setGraphWorkbenchSelection(ctx, null);
    renderGraphTab(ctx);
  });

  dom.filterDepth?.addEventListener('input', () => {
    const raw = dom.filterDepth.value;
    let nextDepth = null;
    if (raw !== '') {
      const n = parseInt(raw, 10);
      nextDepth = Number.isFinite(n) && n >= 0 ? n : null;
    }
    setGraphState(ctx, { filterDepth: nextDepth });
    renderGraphTab(ctx);
  });

  dom.filterDepthClear?.addEventListener('click', () => {
    dom.filterDepth.value = '';
    setGraphState(ctx, { filterDepth: null });
    renderGraphTab(ctx);
  });

  dom.filterUseSelection?.addEventListener('click', () => {
    const sel = getGraphState(getState(ctx)).selection;
    if (!sel || !sel.id) return;
    const t = normaliseSelectionType(sel.type);
    if (t === 'relation' || t === 'edge') return;
    setGraphState(ctx, { filterCenterId: sel.id });
    renderGraphTab(ctx);
  });

  dom.filterClearCenter?.addEventListener('click', () => {
    setGraphState(ctx, { filterCenterId: null });
    renderGraphTab(ctx);
  });

  dom.filterReset?.addEventListener('click', () => {
    setGraphState(ctx, { filterCenterId: null, filterDepth: null, filterNodeTypes: [] });
    renderGraphTab(ctx);
  });

  dom.searchKind?.addEventListener('change', () => {
    setGraphState(ctx, { searchKind: dom.searchKind.value || 'all' });
    renderGraphTab(ctx);
  });

  dom.searchQuery?.addEventListener('input', () => {
    setGraphState(ctx, { searchQuery: dom.searchQuery.value || '' });
    renderGraphTab(ctx);
  });

  dom.createEntityForm?.addEventListener('submit', e => {
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
      const entity = DomainService.addNewItem(state.snapshot, 'entities', state.currentMovementId);
      entity.name = name;
      entity.kind = kind;
      entity.summary = summary;
      entity.tags = tags;
      entity.sourcesOfTruth = sourcesOfTruth;
      entity.sourceEntityIds = sourceEntityIds;
      entity.notes = notes;

      DomainService.upsertItem(state.snapshot, 'entities', entity);
      getActions(ctx).saveSnapshot({ show: false });

      dom.createEntityName.value = '';
      dom.createEntityKind.value = '';
      dom.createEntitySummary.value = '';
      dom.createEntityTags.value = '';
      dom.createEntitySources.value = '';
      dom.createEntitySourceEntities.value = '';
      dom.createEntityNotes.value = '';

      setGraphWorkbenchSelection(ctx, { type: 'entity', id: entity.id });
      renderGraphTab(ctx);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create entity');
    }
  });
}

function renderGraphSearch(ctx, dom, graphState, baseGraphNodes) {
  if (!dom.searchKind || !dom.searchResults || !dom.searchQuery) return;
  const nodes = normaliseArray(baseGraphNodes);

  const nodeTypes = uniqueSorted(nodes.map(n => n.type));
  const opts = [{ value: 'all', label: 'All types' }].concat(
    nodeTypes.map(t => ({ value: t, label: labelForNodeType(t) }))
  );

  const prev = dom.searchKind.value || graphState.searchKind || 'all';
  dom.searchKind.innerHTML = '';
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

  dom.searchResults.innerHTML = '';

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
        setGraphWorkbenchSelection(ctx, { type, id: node.id });
        setGraphState(ctx, { filterCenterId: node.id });
        renderGraphTab(ctx);
      });

      dom.searchResults.appendChild(li);
    });
}

function renderGraphWorkbenchFilters(ctx, dom, baseGraph, graphState) {
  const nodes = normaliseArray(baseGraph?.nodes);
  const nodeTypes = uniqueSorted(nodes.map(n => n.type));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const activeState = getGraphState(getState(ctx));
  const filteredTypes = activeState.filterNodeTypes.filter(t => nodeTypes.includes(t));
  if (filteredTypes.length !== activeState.filterNodeTypes.length) {
    setGraphState(ctx, { filterNodeTypes: filteredTypes });
  }

  if (graphState.filterCenterId && !nodeMap.has(graphState.filterCenterId)) {
    setGraphState(ctx, { filterCenterId: null });
  }

  const centerNode = graphState.filterCenterId ? nodeMap.get(graphState.filterCenterId) : null;

  if (dom.filterCenterLabel) {
    dom.filterCenterLabel.textContent = centerNode
      ? `${centerNode.name || centerNode.id} (${labelForNodeType(centerNode.type)}) [${centerNode.id}]`
      : 'No center selected; showing full graph.';
  }

  if (dom.filterDepth) {
    const desired =
      graphState.filterDepth === null || graphState.filterDepth === undefined
        ? ''
        : String(graphState.filterDepth);
    if (dom.filterDepth.value !== desired) {
      dom.filterDepth.value = desired;
    }
  }

  if (!dom.filterTypes) return;
  dom.filterTypes.innerHTML = '';

  const selectedTypes = new Set(graphState.filterNodeTypes);

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
      const current = getGraphState(getState(ctx));
      if (cb.checked) {
        if (!current.filterNodeTypes.includes(type)) {
          setGraphState(ctx, {
            filterNodeTypes: current.filterNodeTypes.concat(type).filter(Boolean)
          });
        }
      } else {
        setGraphState(ctx, { filterNodeTypes: current.filterNodeTypes.filter(t => t !== type) });
      }
      renderGraphTab(ctx);
    });

    const label = document.createElement('span');
    label.textContent = labelForNodeType(type);

    chip.appendChild(cb);
    chip.appendChild(label);
    dom.filterTypes.appendChild(chip);
  });
}

function renderGenericNodeEditor(ctx, dom, node, config, snapshot, graphState) {
  const { DomainService } = ctx.services || {};
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

    if (field.name === 'content' || field.type === 'markdown') {
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
      DomainService.upsertItem(snapshot, config.collection, updated);
      getActions(ctx).saveSnapshot({ show: false });
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
      DomainService.deleteItem(snapshot, config.collection, item.id);
      setGraphWorkbenchSelection(ctx, null);
      getActions(ctx).saveSnapshot({ show: false });
      renderGraphTab(ctx);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  });
}

function renderSelected(ctx, dom, graphState, baseGraph) {
  dom.selectedBody.innerHTML = '';
  const state = getState(ctx);
  const snapshot = state.snapshot;

  const selection = graphState.selection;
  if (!selection) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Click a node or edge to view/edit details.';
    dom.selectedBody.appendChild(p);
    return;
  }

  const selectionType = normaliseSelectionType(selection.type);

  const allEntities = normaliseArray(snapshot?.entities);
  const entityIndexAll = buildEntityIndex(allEntities);
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
        btn.addEventListener('click', () => {
          const jump = getActions(ctx).jumpToReferencedItem;
          jump(edge.source.collection, edge.source.id);
        });
        edgeCard.appendChild(btn);
      }
    }

    dom.selectedBody.appendChild(edgeCard);
    return;
  }

  if (selectionType === 'entity') {
    const entity = entityIndexAll.get(selection.id);
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
    addInput('Name', 'name', entity.name || '');
    addInput('Kind', 'kind', entity.kind || '');
    addTextarea('Summary', 'summary', entity.summary || '');
    addInput('Tags (csv)', 'tags', normaliseArray(entity.tags).join(', '));
    addInput(
      'Sources of truth (csv)',
      'sourcesOfTruth',
      normaliseArray(entity.sourcesOfTruth).join(', ')
    );
    addInput(
      'Source entity IDs (csv)',
      'sourceEntityIds',
      normaliseArray(entity.sourceEntityIds).join(', ')
    );
    addTextarea('Notes', 'notes', entity.notes || '', 3);

    dom.selectedBody.appendChild(form);

    btnSave.addEventListener('click', () => {
      const fd = new FormData(form);
      const updated = { ...entity };

      updated.name = (fd.get('name') || '').toString();
      updated.kind = (fd.get('kind') || '').toString() || null;
      updated.summary = (fd.get('summary') || '').toString() || null;
      updated.tags = parseCsvInput(fd.get('tags') || '');
      updated.sourcesOfTruth = parseCsvInput(fd.get('sourcesOfTruth') || '');
      updated.sourceEntityIds = parseCsvInput(fd.get('sourceEntityIds') || '');
      updated.notes = (fd.get('notes') || '').toString() || null;

      ctx.services.DomainService.upsertItem(snapshot, 'entities', updated);
      getActions(ctx).saveSnapshot({ show: false });
      renderGraphTab(ctx);
    });

    btnDelete.addEventListener('click', () => {
      const ok = window.confirm(
        `Delete this entity?\n\n${entity.name || entity.id}\n\nThis cannot be undone.`
      );
      if (!ok) return;
      ctx.services.DomainService.deleteItem(snapshot, 'entities', entity.id);
      setGraphWorkbenchSelection(ctx, null);
      getActions(ctx).saveSnapshot({ show: false });
      renderGraphTab(ctx);
    });

    return;
  }

  const node = nodeIndex.get(selection.id);

  if (node) {
    const config = GRAPH_NODE_EDIT_CONFIG[normaliseSelectionType(node.type)];

    if (config) {
      renderGenericNodeEditor(ctx, dom, node, config, snapshot, graphState);
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
  const snapshot = state.snapshot;
  const graphState = getGraphState(state);
  const { ViewModels, EntityGraphView } = ctx.services || {};

  const root = document.getElementById('graph-workbench-root');
  if (!root) return;

  if (!state.graphWorkbenchState) {
    setGraphState(ctx, graphState);
  }

  if (!state.currentMovementId) {
    root.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Create or select a movement on the left to use the graph editor.';
    root.appendChild(p);
    return;
  }

  if (!ViewModels || typeof ViewModels.buildMovementGraphModel !== 'function') {
    root.innerHTML = '<p class="hint">ViewModels module not loaded.</p>';
    return;
  }

  const dom = ensureGraphWorkbenchDom(ctx);
  if (!dom) return;
  attachDomHandlers(ctx, dom);

  dom.workbench?.style.setProperty('--graph-left-width', graphState.leftWidth + 'px');
  dom.workbench?.style.setProperty('--graph-right-width', graphState.rightWidth + 'px');

  const baseGraph = ViewModels.buildMovementGraphModel(snapshot, {
    movementId: state.currentMovementId
  });

  const baseNodeIds = new Set(normaliseArray(baseGraph.nodes).map(n => n.id));
  const baseEdgeIds = new Set(normaliseArray(baseGraph.edges).map(e => e.id));

  const { visibleEntities, entityById } = getGraphDatasetForCurrentMovement(state);
  const entityIds = new Set(visibleEntities.map(e => e.id));

  if (graphState.selection) {
    const sel = graphState.selection;
    const selType = normaliseSelectionType(sel.type);

    if (selType === 'entity') {
      const exists = baseNodeIds.has(sel.id) && entityIds.has(sel.id);
      if (!exists) {
        setGraphWorkbenchSelection(ctx, null);
      }
    } else if (selType === 'edge') {
      const exists = baseEdgeIds.has(sel.id);
      if (!exists) {
        setGraphWorkbenchSelection(ctx, null);
      }
    } else if (sel && !baseNodeIds.has(sel.id)) {
      setGraphWorkbenchSelection(ctx, null);
    }
  }

  renderGraphWorkbenchFilters(ctx, dom, baseGraph, getGraphState(getState(ctx)));

  const kinds = uniqueSorted(visibleEntities.map(e => e.kind));
  if (dom.entityKindDatalist) {
    dom.entityKindDatalist.innerHTML = '';
    kinds.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      dom.entityKindDatalist.appendChild(opt);
    });
  }

  const effectiveGraphState = getGraphState(getState(ctx));
  renderGraphSearch(ctx, dom, effectiveGraphState, baseGraph.nodes);
  renderSelected(ctx, dom, effectiveGraphState, baseGraph);

  if (!workbenchGraphView) {
    workbenchGraphView = new EntityGraphView({
      onNodeClick: (id, node) => {
        const type = normaliseSelectionType(node?.type) || 'node';
        setGraphWorkbenchSelection(ctx, { type, id });
        setGraphState(ctx, { filterCenterId: id });
        renderGraphTab(ctx);
      },
      onLinkClick: id => {
        setGraphWorkbenchSelection(ctx, { type: 'edge', id });
        renderGraphTab(ctx);
      },
      onBackgroundClick: () => {
        setGraphWorkbenchSelection(ctx, null);
        renderGraphTab(ctx);
      }
    });
  }

  const filteredGraph = ViewModels.filterGraphModel(baseGraph, {
    centerNodeId: effectiveGraphState.filterCenterId,
    depth: effectiveGraphState.filterDepth,
    nodeTypeFilter: effectiveGraphState.filterNodeTypes
  });

  const selectedType = normaliseSelectionType(
    effectiveGraphState.selection && effectiveGraphState.selection.type
  );

  const selectedNodeIdForGraph =
    effectiveGraphState.selection && selectedType !== 'edge'
      ? effectiveGraphState.selection.id
      : null;

  workbenchGraphView.render(dom.canvas, filteredGraph, {
    selectedEntityId: selectedNodeIdForGraph,
    selectedEdgeId: selectedType === 'edge' ? effectiveGraphState.selection.id : null,
    focusEntityId: effectiveGraphState.filterCenterId
  });
}

export function registerGraphTab(ctx) {
  const tab = {
    mount(context) {
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'graph') return;
        rerender();
      };
      unsubscribeStore = context?.subscribe ? context.subscribe(handleStateChange) : null;
    },
    render: renderGraphTab,
    unmount() {
      if (typeof unsubscribeStore === 'function') {
        unsubscribeStore();
        unsubscribeStore = null;
      }
    }
  };

  movementEngineerCtxTabs.graph = tab;
  if (ctx?.tabs) ctx.tabs.graph = tab;
  return tab;
}
