import {
  HINT_TEXT,
  createHint,
  guardMissingViewModels,
  guardNoMovement
} from '../../ui/hints.js';
import { DEFAULT_GRAPH_WORKBENCH_STATE } from '../../store.js';
import { FieldRenderer } from '../../../ui/genericCrud/FieldRenderer.js';
import { getBodyField, getCollectionLabel } from '../../../ui/genericCrud/genericCrudHelpers.js';
import { getModelForSnapshot } from '../../ui/schemaDoc.js';
import { getSubtitleField, getTitleField } from '../../ui/modelUiHints.js';
const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const MIN_LEFT_WIDTH = 240;
const MIN_RIGHT_WIDTH = 260;

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

let workbenchGraphView = null;
let graphWorkbenchDom = null;

function getStore(ctx) {
  return ctx.store;
}

function getState(ctx) {
  const store = getStore(ctx);
  return store?.getState?.() || {};
}

function getServices(ctx) {
  return ctx.services;
}

function getDomainService(ctx) {
  const services = getServices(ctx);
  return services.DomainService;
}

function getViewModels(ctx) {
  const services = getServices(ctx);
  return services.ViewModels;
}

function getEntityGraphView(ctx) {
  const services = getServices(ctx);
  return services.EntityGraphView;
}

function getUi(ctx) {
  return ctx.ui;
}

function getActions(ctx) {
  return ctx.actions;
}

function setStatus(ctx, text) {
  const ui = getUi(ctx);
  if (ui?.setStatus) {
    ui.setStatus(text);
    return;
  }
  if (ctx?.setStatus) {
    ctx.setStatus(text);
    return;
  }
  getStore(ctx)?.setStatus?.(text);
}

function clearElement(ctx, el) {
  if (!el) return;
  ctx.dom.clearElement(el);
}

function getValueUtils(ctx) {
  return ctx.utils?.values || {};
}

function normaliseArray(ctx, value) {
  const helper = getValueUtils(ctx).normaliseArray;
  if (typeof helper === 'function') return helper(value);
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  if (Number.isFinite(value)) return [value];
  return [];
}

function uniqueSorted(ctx, values) {
  const helper = getValueUtils(ctx).uniqueSorted;
  if (typeof helper === 'function') return helper(values);
  return Array.from(new Set((values || []).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );
}

function parseCsvInput(ctx, value) {
  const helper = getValueUtils(ctx).parseCsvInput;
  if (typeof helper === 'function') return helper(value);
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

const labelForNodeType = type => GRAPH_NODE_TYPE_LABELS[type] || type || 'Unknown';
const EDIT_FIELD_EXCLUSIONS = new Set(['id', '_id', 'createdAt', 'updatedAt']);

function getModel(ctx, snapshot) {
  return getModelForSnapshot(snapshot);
}

function getCollectionNameForGraphNode(node, model) {
  if (!node) return null;
  if (node.collectionName) return node.collectionName;
  const type = node.type || null;
  if (!type) return null;
  if (model?.collections?.[type]) return type;
  const match = Object.values(model?.collections || {}).find(
    collection => collection?.collectionName === type || collection?.typeName === type
  );
  return match?.collectionName || type;
}

function getRecordForCollection(snapshot, collectionName, recordId) {
  const collection = snapshot?.[collectionName] || [];
  return Array.isArray(collection) ? collection.find(item => item?.id === recordId) : null;
}

function getRecordDisplayTitle(ctx, collectionName, record) {
  if (!record) return '—';
  const titleField = getTitleField(ctx, collectionName);
  if (titleField && record[titleField]) return record[titleField];
  return (
    record.name ||
    record.title ||
    record.label ||
    record.shortText ||
    record.text ||
    record.id ||
    '—'
  );
}

function getRecordDisplaySubtitle(ctx, collectionName, record) {
  if (!record) return null;
  const subtitleField = getSubtitleField(ctx, collectionName);
  if (subtitleField && record[subtitleField]) return record[subtitleField];
  return null;
}

function getNodeDisplayInfo(ctx, node, snapshot, model) {
  const collectionName = getCollectionNameForGraphNode(node, model);
  const collectionDef = collectionName ? model?.collections?.[collectionName] || null : null;
  const record = collectionName ? getRecordForCollection(snapshot, collectionName, node?.id) : null;
  const title = record ? getRecordDisplayTitle(ctx, collectionName, record) : node?.name || node?.id || '—';
  const subtitle = record ? getRecordDisplaySubtitle(ctx, collectionName, record) : node?.kind || null;
  return {
    collectionName,
    collectionDef,
    record,
    title,
    subtitle
  };
}

function getStableFieldOrder(collectionDef) {
  if (!collectionDef) return [];
  const fields = collectionDef.fields || {};
  const ordered = [];
  const seen = new Set();
  const frontMatterFields = Array.isArray(collectionDef.serialization?.frontMatterFields)
    ? collectionDef.serialization.frontMatterFields
    : [];
  frontMatterFields.forEach(field => {
    if (field in fields && !seen.has(field)) {
      ordered.push(field);
      seen.add(field);
    }
  });
  const bodyField = getBodyField(collectionDef);
  if (bodyField && !seen.has(bodyField) && bodyField in fields) {
    ordered.push(bodyField);
    seen.add(bodyField);
  }
  Object.keys(fields)
    .sort()
    .forEach(field => {
      if (seen.has(field)) return;
      ordered.push(field);
    });
  return ordered;
}

function getGraphEditableFields(ctx, collectionName, collectionDef) {
  if (!collectionDef) return [];
  const fields = collectionDef.fields || {};
  const explicitFields = Array.isArray(collectionDef.ui?.graphEditFields)
    ? collectionDef.ui.graphEditFields
    : [];
  const orderedByUi = Array.isArray(collectionDef.ui?.fieldOrder) ? collectionDef.ui.fieldOrder : [];
  const baseFields = explicitFields.length
    ? explicitFields
    : orderedByUi.length
      ? orderedByUi
      : getStableFieldOrder(collectionDef);

  return baseFields.filter(fieldName => {
    const fieldDef = fields[fieldName];
    if (!fieldDef) return false;
    if (fieldDef.readOnly || fieldDef.ui?.readOnly) return false;
    if (explicitFields.length) return true;
    return !EDIT_FIELD_EXCLUSIONS.has(fieldName);
  });
}

function renderModelRecordEditor(ctx, { collectionName, record, snapshot, model, onPatch }) {
  const collectionDef = model?.collections?.[collectionName] || null;
  const fields = getGraphEditableFields(ctx, collectionName, collectionDef);
  const bodyField = getBodyField(collectionDef);
  const nodeIndex = ctx?.store?.getState?.()?.nodeIndex || null;
  const form = document.createElement('form');
  form.className = 'form-stack';
  form.addEventListener('submit', event => event.preventDefault());

  fields.forEach(fieldName => {
    const fieldDef = collectionDef?.fields?.[fieldName] || {};
    const row = document.createElement('div');
    row.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = fieldName;
    row.appendChild(label);

    const control = FieldRenderer({
      fieldDef,
      fieldName,
      collectionName,
      value: record?.[fieldName],
      record,
      model,
      snapshot,
      nodeIndex,
      isBodyField: fieldName === bodyField,
      error: null,
      onChange: nextValue => onPatch({ [fieldName]: nextValue })
    });

    row.appendChild(control);
    form.appendChild(row);
  });

  return form;
}

function colorForNodeType(ctx, type) {
  const services = getServices(ctx);
  const colors = services.MovementEngineerColors || services.EntityGraphColors;
  if (colors?.colorForNodeType) {
    return colors.colorForNodeType(type);
  }
  return '#1f2937';
}

function normaliseSelectionType(type) {
  return typeof type === 'string' ? type.toLowerCase() : null;
}

function getWorkbenchState(ctx) {
  const state = getState(ctx);
  return { ...DEFAULT_GRAPH_WORKBENCH_STATE, ...(state.graphWorkbenchState || {}) };
}

function patchWorkbenchState(ctx, patch) {
  const store = getStore(ctx);
  if (!store) return getWorkbenchState(ctx);
  if (typeof store.update === 'function') {
    return store.update(prev => {
      const current = {
        ...DEFAULT_GRAPH_WORKBENCH_STATE,
        ...(prev?.graphWorkbenchState || {})
      };
      const next = { ...current, ...(patch || {}) };
      if (prev && prev.graphWorkbenchState === next) return prev;
      return { ...(prev || {}), graphWorkbenchState: next };
    });
  }
  const state = store.getState?.() || {};
  const next = {
    ...DEFAULT_GRAPH_WORKBENCH_STATE,
    ...(state.graphWorkbenchState || {}),
    ...(patch || {})
  };
  store.setState?.({ ...(state || {}), graphWorkbenchState: next });
  return next;
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

function buildEntityIndex(entities) {
  const map = new Map();
  (entities || []).forEach(e => {
    if (e && e.id) map.set(e.id, e);
  });
  return map;
}

function getGraphDatasetForMovement(ctx, snapshot, movementId) {
  const allEntities = normaliseArray(ctx, snapshot?.entities);
  const visibleEntities = allEntities.filter(entity => entity?.movementId === movementId);
  const entityById = buildEntityIndex(visibleEntities);
  return { visibleEntities, entityById };
}

function ensureGraphWorkbenchDom(ctx, workbenchState) {
  const root = document.getElementById('graph-workbench-root');
  if (!root) return null;

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
          nextLeft = Math.max(MIN_LEFT_WIDTH, startLeft + dx);
        } else {
          nextRight = Math.max(MIN_RIGHT_WIDTH, startRight - dx);
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
        renderGraphWorkbench(ctx);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  attachResize(dom.leftHandle, 'left');
  attachResize(dom.rightHandle, 'right');

  dom.fitBtn.addEventListener('click', () => {
    if (workbenchGraphView) workbenchGraphView.fit();
  });

  dom.clearBtn.addEventListener('click', () => {
    setGraphWorkbenchSelection(ctx, null);
    renderGraphWorkbench(ctx);
  });

  dom.filterDepth.addEventListener('input', () => {
    const raw = dom.filterDepth.value;
    let nextDepth = null;
    if (raw !== '') {
      const n = parseInt(raw, 10);
      nextDepth = Number.isFinite(n) && n >= 0 ? n : null;
    }
    patchWorkbenchState(ctx, { filterDepth: nextDepth });
    renderGraphWorkbench(ctx);
  });

  dom.filterDepthClear.addEventListener('click', () => {
    patchWorkbenchState(ctx, { filterDepth: null });
    dom.filterDepth.value = '';
    renderGraphWorkbench(ctx);
  });

  dom.filterUseSelection.addEventListener('click', () => {
    const nextState = getWorkbenchState(ctx);
    const sel = nextState.selection;
    if (!sel || !sel.id) return;
    const t = normaliseSelectionType(sel.type);
    if (t === 'relation' || t === 'edge') return;
    patchWorkbenchState(ctx, {
      filterCenterId: sel.id,
      focusEntityId: sel.id
    });
    renderGraphWorkbench(ctx);
  });

  dom.filterClearCenter.addEventListener('click', () => {
    patchWorkbenchState(ctx, { filterCenterId: null, focusEntityId: null });
    renderGraphWorkbench(ctx);
  });

  dom.filterReset.addEventListener('click', () => {
    patchWorkbenchState(ctx, {
      filterCenterId: null,
      filterDepth: null,
      filterNodeTypes: [],
      focusEntityId: null
    });
    renderGraphWorkbench(ctx);
  });

  dom.searchKind.addEventListener('change', () => {
    patchWorkbenchState(ctx, { searchKind: dom.searchKind.value || 'all' });
    renderGraphWorkbench(ctx);
  });

  dom.searchQuery.addEventListener('input', () => {
    patchWorkbenchState(ctx, { searchQuery: dom.searchQuery.value || '' });
    renderGraphWorkbench(ctx);
  });

  dom.createEntityForm.addEventListener('submit', e => {
    e.preventDefault();
    const { currentMovementId } = getState(ctx);
    const DomainService = getDomainService(ctx);
    if (!DomainService?.addNewItem || !DomainService?.upsertItem) return;
    if (!currentMovementId) return;

    const snapshot = ctx.persistence.cloneSnapshot();
    const name = (dom.createEntityName.value || '').trim();
    if (!name) return;

    const kind = (dom.createEntityKind.value || '').trim() || null;
    const summary = (dom.createEntitySummary.value || '').trim() || null;
    const tags = parseCsvInput(ctx, dom.createEntityTags.value);
    const sourcesOfTruth = parseCsvInput(ctx, dom.createEntitySources.value);
    const sourceEntityIds = parseCsvInput(ctx, dom.createEntitySourceEntities.value);
    const notes = (dom.createEntityNotes.value || '').trim() || null;

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
      ctx.persistence.commitSnapshot(snapshot, {
        dirtyScope: 'item',
        save: { show: false }
      });
      setStatus(ctx, 'Entity created');

      dom.createEntityName.value = '';
      dom.createEntityKind.value = '';
      dom.createEntitySummary.value = '';
      dom.createEntityTags.value = '';
      dom.createEntitySources.value = '';
      dom.createEntitySourceEntities.value = '';
      dom.createEntityNotes.value = '';

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

function renderGraphSearch(ctx, dom, baseGraphNodes, snapshot, workbenchState) {
  const nodes = normaliseArray(ctx, baseGraphNodes);
  const model = getModel(ctx, snapshot);

  const nodeTypes = uniqueSorted(ctx, nodes.map(n => n.type));
  const opts = [{ value: 'all', label: 'All types' }].concat(
    nodeTypes.map(t => ({ value: t, label: labelForNodeType(t) }))
  );

  const prev = dom.searchKind.value || workbenchState.searchKind || 'all';
  clearElement(ctx, dom.searchKind);
  opts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    dom.searchKind.appendChild(opt);
  });
  dom.searchKind.value = opts.some(o => o.value === prev) ? prev : 'all';

  if (dom.searchQuery.value !== (workbenchState.searchQuery || '')) {
    dom.searchQuery.value = workbenchState.searchQuery || '';
  }

  const q = (workbenchState.searchQuery || '').trim().toLowerCase();
  const typeFilter = dom.searchKind.value || 'all';

  const filtered = nodes.filter(node => {
    const matchesType = typeFilter === 'all' || node.type === typeFilter;
    if (!matchesType) return false;
    if (!q) return true;
    const info = getNodeDisplayInfo(ctx, node, snapshot, model);
    const hay = `${info.title || ''} ${node.id || ''} ${(info.subtitle || '')}`.toLowerCase();
    return hay.includes(q);
  });

  clearElement(ctx, dom.searchResults);

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
    .map(node => ({ node, info: getNodeDisplayInfo(ctx, node, snapshot, model) }))
    .sort((a, b) => (a.info.title || a.node.id).localeCompare(b.info.title || b.node.id))
    .forEach(({ node, info }) => {
      const li = document.createElement('li');
      li.className = 'graph-search-item' + (selectedNodeId === node.id ? ' selected' : '');
      const left = document.createElement('span');
      left.textContent = info.title || node.id;

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

function renderGraphWorkbenchFilters(ctx, dom, baseGraph, snapshot, workbenchState) {
  const nodes = normaliseArray(ctx, baseGraph?.nodes);
  const nodeTypes = uniqueSorted(ctx, nodes.map(n => n.type));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const model = getModel(ctx, snapshot);

  const filteredTypes = workbenchState.filterNodeTypes.filter(t => nodeTypes.includes(t));
  const nextPatch = {};
  if (filteredTypes.length !== workbenchState.filterNodeTypes.length) {
    nextPatch.filterNodeTypes = filteredTypes;
  }

  if (workbenchState.filterCenterId && !nodeMap.has(workbenchState.filterCenterId)) {
    nextPatch.filterCenterId = null;
    nextPatch.focusEntityId = null;
  }

  if (Object.keys(nextPatch).length) {
    patchWorkbenchState(ctx, nextPatch);
    return true;
  }

  const centerNode = workbenchState.filterCenterId
    ? nodeMap.get(workbenchState.filterCenterId)
    : null;

  if (dom.filterCenterLabel) {
    dom.filterCenterLabel.textContent = centerNode
      ? `${getNodeDisplayInfo(ctx, centerNode, snapshot, model).title || centerNode.id} (${labelForNodeType(centerNode.type)}) [${centerNode.id}]`
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

  if (!dom.filterTypes) return false;
  clearElement(ctx, dom.filterTypes);

  const selectedTypes = new Set(workbenchState.filterNodeTypes);

  nodeTypes.forEach(type => {
    const chip = document.createElement('label');
    chip.className = 'filter-pill';
    const color = colorForNodeType(ctx, type);
    chip.style.backgroundColor = color;
    chip.style.borderColor = color;
    chip.style.color = '#fff';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = type;
    cb.checked = selectedTypes.has(type);
    cb.addEventListener('change', () => {
      const updatedTypes = cb.checked
        ? workbenchState.filterNodeTypes.concat(type).filter(Boolean)
        : workbenchState.filterNodeTypes.filter(t => t !== type);
      patchWorkbenchState(ctx, { filterNodeTypes: updatedTypes });
      renderGraphWorkbench(ctx);
    });

    const label = document.createElement('span');
    label.textContent = labelForNodeType(type);

    chip.appendChild(cb);
    chip.appendChild(label);
    dom.filterTypes.appendChild(chip);
  });

  return false;
}

function renderSelected(ctx, dom, baseGraph, snapshot, workbenchState) {
  clearElement(ctx, dom.selectedBody);

  const selection = workbenchState.selection;
  if (!selection) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Click a node or edge to view/edit details.';
    dom.selectedBody.appendChild(p);
    return;
  }

  const selectionType = normaliseSelectionType(selection.type);

  const nodes = normaliseArray(ctx, baseGraph?.nodes);
  const edges = normaliseArray(ctx, baseGraph?.edges);
  const nodeIndex = new Map(nodes.map(n => [n.id, n]));
  const model = getModel(ctx, snapshot);

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
    const fromLabel = from
      ? getNodeDisplayInfo(ctx, from, snapshot, model).title || from.id
      : edge.fromId;
    const toLabel = to
      ? getNodeDisplayInfo(ctx, to, snapshot, model).title || to.id
      : edge.toId;
    subtitle.textContent = `${fromLabel} → ${edge.relationType || 'link'} → ${toLabel}`;

    edgeCard.appendChild(title);
    edgeCard.appendChild(subtitle);

    if (edge.source) {
      const fieldLabel = edge.source.field ? `.${edge.source.field}` : '';
      const info = createHint(
        `Edge derived from ${edge.source.collection || 'record'}${fieldLabel} on ${edge.source.id || 'unknown'}.`
      );
      edgeCard.appendChild(info);

      if (edge.source.collection && edge.source.id) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.type = 'button';
        btn.textContent = 'Jump to source record';
        btn.addEventListener('click', () =>
          getActions(ctx).openItem?.(edge.source.collection, edge.source.id)
        );
        edgeCard.appendChild(btn);
      }
    }

    dom.selectedBody.appendChild(edgeCard);
    return;
  }

  const node = nodeIndex.get(selection.id);

  if (node) {
    const DomainService = getDomainService(ctx);
    if (!DomainService) {
      dom.selectedBody.textContent = 'Domain service unavailable.';
      return;
    }

    const displayInfo = getNodeDisplayInfo(ctx, node, snapshot, model);
    const { collectionName, collectionDef, record, title, subtitle } = displayInfo;

    if (!collectionName || !collectionDef) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '10px';
      card.style.marginBottom = '10px';
      const titleEl = document.createElement('p');
      titleEl.className = 'graph-selected-title';
      titleEl.textContent = node.name || node.id;
      const subtitleEl = document.createElement('p');
      subtitleEl.className = 'graph-selected-subtitle';
      subtitleEl.textContent = `${labelForNodeType(node.type)} · ${node.id}`;
      card.appendChild(titleEl);
      card.appendChild(subtitleEl);
      card.appendChild(createHint('Editing is not available for this node type yet.'));
      dom.selectedBody.appendChild(card);
      return;
    }

    if (!record) {
      dom.selectedBody.textContent = 'Selected item not found.';
      return;
    }

    const header = document.createElement('div');
    header.className = 'graph-selected-header';

    const titleWrap = document.createElement('div');
    const titleEl = document.createElement('p');
    titleEl.className = 'graph-selected-title';
    titleEl.textContent = title;
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'graph-selected-subtitle';
    const collectionLabel = getCollectionLabel(collectionDef, collectionName);
    const subtitleParts = [collectionLabel];
    if (subtitle) subtitleParts.push(subtitle);
    subtitleParts.push(record.id);
    subtitleEl.textContent = subtitleParts.join(' · ');
    titleWrap.appendChild(titleEl);
    titleWrap.appendChild(subtitleEl);

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

    const draft = { ...record };
    const form = renderModelRecordEditor(ctx, {
      collectionName,
      record: draft,
      snapshot,
      model,
      onPatch: patch => {
        Object.entries(patch || {}).forEach(([fieldName, nextValue]) => {
          if (nextValue === undefined) delete draft[fieldName];
          else draft[fieldName] = nextValue;
        });
      }
    });

    dom.selectedBody.appendChild(form);

    btnSave.addEventListener('click', () => {
      try {
        const nextSnapshot = ctx.persistence.cloneSnapshot();
        DomainService.upsertItem?.(nextSnapshot, collectionName, draft);
        ctx.persistence.commitSnapshot(nextSnapshot, {
          dirtyScope: 'item',
          save: { show: false }
        });
        setStatus(ctx, `${collectionLabel} saved`);
        renderGraphWorkbench(ctx);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save item');
      }
    });

    btnDelete.addEventListener('click', () => {
      const ok = window.confirm(
        `Delete this ${collectionLabel.toLowerCase()}?\n\n${title}\n\nThis cannot be undone.`
      );
      if (!ok) return;

      try {
        const nextSnapshot = ctx.persistence.cloneSnapshot();
        DomainService.deleteItem?.(nextSnapshot, collectionName, record.id);
        patchWorkbenchState(ctx, { selection: null });
        ctx.persistence.commitSnapshot(nextSnapshot, {
          dirtyScope: 'item',
          save: { show: false }
        });
        setStatus(ctx, `${collectionLabel} deleted`);
        renderGraphWorkbench(ctx);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete item');
      }
    });

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
  const snapshot = state.snapshot || {};
  const currentMovementId = state.currentMovementId;
  const workbenchState = getWorkbenchState(ctx);

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [root],
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  )
    return;

  const dom = ensureGraphWorkbenchDom(ctx, workbenchState);
  if (!dom) return;

  dom.workbench?.style.setProperty('--graph-left-width', `${workbenchState.leftWidth}px`);
  dom.workbench?.style.setProperty('--graph-right-width', `${workbenchState.rightWidth}px`);

  const ViewModels = getViewModels(ctx);
  if (
    !ViewModels?.buildMovementGraphModel ||
    typeof ViewModels.buildMovementGraphModel !== 'function' ||
    typeof ViewModels.filterGraphModel !== 'function'
  ) {
    guardMissingViewModels({
      ok: false,
      wrappers: [dom.root],
      dom: ctx.dom,
      message: 'Graph view is unavailable. ViewModels module not loaded.',
      hintOptions: { className: 'muted' }
    });
    return;
  }

  const baseGraph = ViewModels.buildMovementGraphModel(snapshot, {
    movementId: currentMovementId
  });

  const baseNodes = normaliseArray(ctx, baseGraph?.nodes);
  const baseEdges = normaliseArray(ctx, baseGraph?.edges);
  const baseNodeIds = new Set(baseNodes.map(n => n.id));
  const baseEdgeIds = new Set(baseEdges.map(e => e.id));

  const { visibleEntities } = getGraphDatasetForMovement(ctx, snapshot, currentMovementId);
  const entityIds = new Set(visibleEntities.map(e => e.id));

  if (workbenchState.selection) {
    const sel = workbenchState.selection;
    const selType = normaliseSelectionType(sel.type);
    const patches = {};

    if (selType === 'entity') {
      const exists = baseNodeIds.has(sel.id) && entityIds.has(sel.id);
      if (!exists) patches.selection = null;
    } else if (selType === 'edge') {
      const exists = baseEdgeIds.has(sel.id);
      if (!exists) patches.selection = null;
    } else if (sel && !baseNodeIds.has(sel.id)) {
      patches.selection = null;
    }

    if (Object.keys(patches).length) {
      patchWorkbenchState(ctx, patches);
      return;
    }
  }

  const filtersPatched = renderGraphWorkbenchFilters(ctx, dom, baseGraph, snapshot, workbenchState);
  if (filtersPatched) return;

  const kinds = uniqueSorted(ctx, visibleEntities.map(e => e.kind));
  clearElement(ctx, dom.entityKindDatalist);
  kinds.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    dom.entityKindDatalist.appendChild(opt);
  });

  renderGraphSearch(ctx, dom, baseGraph.nodes, snapshot, getWorkbenchState(ctx));
  renderSelected(ctx, dom, baseGraph, snapshot, getWorkbenchState(ctx));

  if (!workbenchGraphView) {
    const GraphViewCtor = getEntityGraphView(ctx);
    if (!GraphViewCtor) return;
    workbenchGraphView = new GraphViewCtor({
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

  const latestState = getWorkbenchState(ctx);
  const filteredGraph = ViewModels.filterGraphModel(baseGraph, {
    centerNodeId: latestState.filterCenterId,
    depth: latestState.filterDepth,
    nodeTypeFilter: latestState.filterNodeTypes
  });

  const selectedType = normaliseSelectionType(latestState.selection?.type);
  const selectedNodeIdForGraph =
    latestState.selection && selectedType !== 'edge' ? latestState.selection.id : null;

  const nextFocus =
    selectedType === 'edge' ? latestState.focusEntityId : latestState.filterCenterId;
  if (nextFocus !== latestState.focusEntityId) {
    patchWorkbenchState(ctx, { focusEntityId: nextFocus });
  }

  workbenchGraphView.render(dom.canvas, filteredGraph, {
    selectedEntityId: selectedNodeIdForGraph,
    selectedEdgeId: selectedType === 'edge' ? latestState.selection.id : null,
    focusEntityId: latestState.filterCenterId
  });
}

export function mountGraphWorkbench() {
  graphWorkbenchDom = null;
}

export function unmountGraphWorkbench(ctx) {
  if (graphWorkbenchDom?.root) {
    graphWorkbenchDom.root.innerHTML = '';
  }
  graphWorkbenchDom = null;
  workbenchGraphView = null;
  const store = getStore(ctx);
  if (store?.setState) {
    store.setState(prev => ({
      ...(prev || {}),
      graphWorkbenchState: { ...getWorkbenchState(ctx) }
    }));
  }
}
