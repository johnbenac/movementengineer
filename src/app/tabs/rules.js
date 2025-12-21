import { normaliseArray, parseCsvInput } from '../utils/values.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

let selectedRuleId = null;
let lastMovementId = null;

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

function setHintText(el, text) {
  if (!el) return;
  el.textContent = text || '';
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

function cloneSnapshot(snapshot) {
  if (!snapshot) return null;
  try {
    return structuredClone(snapshot);
  } catch (e) {
    return JSON.parse(JSON.stringify(snapshot));
  }
}

function buildOption(value, label) {
  return { value, label: label || value };
}

function ensureMultiSelectOptions(selectEl, options = [], selectedValues = []) {
  if (!selectEl) return;
  const selectedSet = new Set(normaliseArray(selectedValues));
  fallbackClear(selectEl);
  const combined = [...options];
  selectedSet.forEach(value => {
    if (!combined.some(opt => opt.value === value)) {
      combined.push(buildOption(value, value));
    }
  });
  combined
    .filter(opt => opt?.value)
    .sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')))
    .forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = selectedSet.has(opt.value);
      selectEl.appendChild(option);
    });
}

function collectSelectedValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || []).map(opt => opt.value).filter(Boolean);
}

function buildReferenceOptions(snapshot, movementId) {
  const texts = (snapshot?.texts || []).filter(t => t.movementId === movementId);
  const claims = (snapshot?.claims || []).filter(c => c.movementId === movementId);
  const practices = (snapshot?.practices || []).filter(p => p.movementId === movementId);
  const entities = (snapshot?.entities || []).filter(e => e.movementId === movementId);

  const options = {
    texts: texts.map(t =>
      buildOption(
        t.id,
        `${t.title || t.id}${t.label ? ` (${t.label})` : ''}`.trim()
      )
    ),
    claims: claims.map(c =>
      buildOption(
        c.id,
        `${c.category ? `[${c.category}] ` : ''}${c.text || c.id}`.trim()
      )
    ),
    practices: practices.map(p =>
      buildOption(p.id, `${p.name || p.id}${p.kind ? ` (${p.kind})` : ''}`.trim())
    ),
    entities: entities.map(e =>
      buildOption(e.id, `${e.name || e.id}${e.kind ? ` (${e.kind})` : ''}`.trim())
    )
  };

  return options;
}

function getRuleEditorElements() {
  return {
    ruleSelect: document.getElementById('rules-rule-select'),
    addBtn: document.getElementById('rules-add-btn'),
    saveBtn: document.getElementById('rules-save-btn'),
    deleteBtn: document.getElementById('rules-delete-btn'),
    shortText: document.getElementById('rule-short-text'),
    kind: document.getElementById('rule-kind-input'),
    details: document.getElementById('rule-details-input'),
    appliesTo: document.getElementById('rule-applies-to'),
    domain: document.getElementById('rule-domain-input'),
    tags: document.getElementById('rule-tags-input'),
    supportingTexts: document.getElementById('rule-supporting-texts'),
    supportingClaims: document.getElementById('rule-supporting-claims'),
    relatedPractices: document.getElementById('rule-related-practices'),
    sourceEntities: document.getElementById('rule-source-entities'),
    sourcesOfTruth: document.getElementById('rule-sources-of-truth'),
    hint: document.getElementById('rules-editor-hint')
  };
}

function clearRuleForm(form) {
  if (!form) return;
  if (form.shortText) form.shortText.value = '';
  if (form.kind) form.kind.value = '';
  if (form.details) form.details.value = '';
  if (form.appliesTo) form.appliesTo.value = '';
  if (form.domain) form.domain.value = '';
  if (form.tags) form.tags.value = '';
  if (form.sourcesOfTruth) form.sourcesOfTruth.value = '';
  ensureMultiSelectOptions(form.supportingTexts, [], []);
  ensureMultiSelectOptions(form.supportingClaims, [], []);
  ensureMultiSelectOptions(form.relatedPractices, [], []);
  ensureMultiSelectOptions(form.sourceEntities, [], []);
}

function setRuleFormDisabled(form, disabled) {
  if (!form) return;
  Object.values(form).forEach(el => {
    if (!el || typeof el.disabled === 'undefined') return;
    el.disabled = disabled;
  });
}

function populateRuleForm(rule, form, referenceOptions) {
  if (!form) return;
  const refs =
    referenceOptions || { texts: [], claims: [], practices: [], entities: [] };
  if (!rule) {
    clearRuleForm(form);
    return;
  }
  if (form.shortText) form.shortText.value = rule.shortText || '';
  if (form.kind) form.kind.value = rule.kind || '';
  if (form.details) form.details.value = rule.details || '';
  if (form.appliesTo) form.appliesTo.value = normaliseArray(rule.appliesTo).join(', ');
  if (form.domain) form.domain.value = normaliseArray(rule.domain).join(', ');
  if (form.tags) form.tags.value = normaliseArray(rule.tags).join(', ');
  if (form.sourcesOfTruth)
    form.sourcesOfTruth.value = normaliseArray(rule.sourcesOfTruth).join(', ');

  ensureMultiSelectOptions(
    form.supportingTexts,
    refs.texts,
    normaliseArray(rule.supportingTextIds)
  );
  ensureMultiSelectOptions(
    form.supportingClaims,
    refs.claims,
    normaliseArray(rule.supportingClaimIds)
  );
  ensureMultiSelectOptions(
    form.relatedPractices,
    refs.practices,
    normaliseArray(rule.relatedPracticeIds)
  );
  ensureMultiSelectOptions(
    form.sourceEntities,
    refs.entities,
    normaliseArray(rule.sourceEntityIds)
  );
}

function readRuleForm(form) {
  if (!form) return null;
  const detailsVal = form.details?.value || '';
  return {
    shortText: form.shortText?.value?.trim() || 'New rule',
    kind: form.kind?.value || null,
    details: detailsVal ? detailsVal : null,
    appliesTo: parseCsvInput(form.appliesTo?.value || ''),
    domain: parseCsvInput(form.domain?.value || ''),
    tags: parseCsvInput(form.tags?.value || ''),
    supportingTextIds: collectSelectedValues(form.supportingTexts),
    supportingClaimIds: collectSelectedValues(form.supportingClaims),
    relatedPracticeIds: collectSelectedValues(form.relatedPractices),
    sourcesOfTruth: parseCsvInput(form.sourcesOfTruth?.value || ''),
    sourceEntityIds: collectSelectedValues(form.sourceEntities)
  };
}

function commitSnapshot(ctx, snapshot, flags = {}) {
  if (!ctx || !snapshot) return;
  const state = getState(ctx) || {};
  const nextFlags = { ...(state.flags || {}), ...flags };
  const nextState = { ...state, snapshot, flags: nextFlags };
  if (typeof ctx.setState === 'function') {
    ctx.setState(nextState);
  } else if (ctx.store?.setState) {
    ctx.store.setState(nextState);
  }
}

function createRule(ctx) {
  const state = getState(ctx) || {};
  if (!state.currentMovementId) return null;
  const snapshot = cloneSnapshot(state.snapshot);
  if (!snapshot) return null;
  const DomainService = getDomainService(ctx);
  const createSkeleton = DomainService?.createSkeletonItem;
  const upsert = DomainService?.upsertItem;
  const item = createSkeleton
    ? createSkeleton('rules', state.currentMovementId)
    : {
        id: 'rul-' + Math.random().toString(36).slice(2, 9),
        movementId: state.currentMovementId,
        shortText: 'New rule',
        kind: 'must_do',
        details: null,
        appliesTo: [],
        domain: [],
        tags: [],
        supportingTextIds: [],
        supportingClaimIds: [],
        relatedPracticeIds: [],
        sourcesOfTruth: [],
        sourceEntityIds: []
      };
  if (upsert) {
    upsert(snapshot, 'rules', item);
  } else {
    snapshot.rules = snapshot.rules || [];
    snapshot.rules.push(item);
  }
  commitSnapshot(ctx, snapshot, { snapshotDirty: true });
  ctx?.setStatus?.('Rule added');
  return item.id;
}

function saveRule(ctx, ruleId, formValues) {
  if (!ruleId || !formValues) return;
  const state = getState(ctx) || {};
  const snapshot = cloneSnapshot(state.snapshot);
  if (!snapshot) return;
  const rules = snapshot.rules || [];
  const idx = rules.findIndex(r => r.id === ruleId);
  if (idx === -1) return;
  const DomainService = getDomainService(ctx);
  const upsert = DomainService?.upsertItem;
  const updated = { ...rules[idx], ...formValues, movementId: state.currentMovementId };
  if (upsert) {
    upsert(snapshot, 'rules', updated);
  } else {
    rules[idx] = updated;
  }
  commitSnapshot(ctx, snapshot, { snapshotDirty: true });
  ctx?.setStatus?.('Rule saved');
}

function deleteRule(ctx, ruleId) {
  if (!ruleId) return false;
  const state = getState(ctx) || {};
  const snapshot = cloneSnapshot(state.snapshot);
  if (!snapshot) return false;
  const DomainService = getDomainService(ctx);
  const del = DomainService?.deleteItem;
  let removed = false;
  if (del) {
    removed = del(snapshot, 'rules', ruleId);
  } else {
    const before = snapshot.rules?.length || 0;
    snapshot.rules = (snapshot.rules || []).filter(r => r.id !== ruleId);
    removed = before !== snapshot.rules.length;
  }
  if (!removed) return false;
  commitSnapshot(ctx, snapshot, { snapshotDirty: true });
  ctx?.setStatus?.('Rule deleted');
  return true;
}

function renderRulesTable(wrapper, rules, clear) {
  clear(wrapper);

  if (!rules || rules.length === 0) {
    wrapper.appendChild(hint('No rules match this filter.'));
    return;
  }

  const table = document.createElement('table');
  const headerRow = document.createElement('tr');
  [
    'Kind',
    'Short text',
    'Domain',
    'Applies to',
    'Tags',
    'Supporting texts',
    'Supporting claims',
    'Related practices',
    'Sources of truth',
    'Edit'
  ].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  rules.forEach(r => {
    const tr = document.createElement('tr');

    const tdKind = document.createElement('td');
    tdKind.textContent = r.kind || '';
    tr.appendChild(tdKind);

    const tdShort = document.createElement('td');
    tdShort.textContent = r.shortText;
    tr.appendChild(tdShort);

    const tdDomain = document.createElement('td');
    tdDomain.textContent = (r.domain || []).join(', ');
    tr.appendChild(tdDomain);

    const tdApplies = document.createElement('td');
    tdApplies.textContent = (r.appliesTo || []).join(', ');
    tr.appendChild(tdApplies);

    const tdTags = document.createElement('td');
    tdTags.textContent = (r.tags || []).join(', ');
    tr.appendChild(tdTags);

    const tdTexts = document.createElement('td');
    if (r.supportingTexts && r.supportingTexts.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      r.supportingTexts.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = t.title || t.id;
        row.appendChild(chip);
      });
      tdTexts.appendChild(row);
    }
    tr.appendChild(tdTexts);

    const tdClaims = document.createElement('td');
    if (r.supportingClaims && r.supportingClaims.length) {
      const ul = document.createElement('ul');
      r.supportingClaims.forEach(c => {
        const li = document.createElement('li');
        li.textContent = (c.category ? '[' + c.category + '] ' : '') + c.text;
        ul.appendChild(li);
      });
      tdClaims.appendChild(ul);
    }
    tr.appendChild(tdClaims);

    const tdPractices = document.createElement('td');
    if (r.relatedPractices && r.relatedPractices.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      r.relatedPractices.forEach(p => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = p.name || p.id;
        row.appendChild(chip);
      });
      tdPractices.appendChild(row);
    }
    tr.appendChild(tdPractices);

    const tdSources = document.createElement('td');
    tdSources.textContent = (r.sourcesOfTruth || []).join(', ');
    tr.appendChild(tdSources);

    const tdEdit = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-button';
    btn.textContent = 'Edit';
    btn.addEventListener('click', () => {
      selectedRuleId = r.id;
      renderRulesTab(movementEngineerGlobal.ctx);
    });
    tdEdit.appendChild(btn);
    tr.appendChild(tdEdit);

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
}

function renderRulesTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('rules-table-wrapper');
  const kindSelect = document.getElementById('rules-kind-filter');
  const domainInput = document.getElementById('rules-domain-filter');
  const editor = getRuleEditorElements();
  if (!wrapper || !kindSelect || !domainInput) return;

  if (!currentMovementId) {
    kindSelect.disabled = true;
    domainInput.disabled = true;
    setRuleFormDisabled(editor, true);
    clearRuleForm(editor);
    setHintText(editor.hint, 'Create or select a movement to add or edit rules.');
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(kindSelect, [], 'All');
    if (editor?.ruleSelect) ensureSelectOptions(editor.ruleSelect, [], 'Choose rule');
    domainInput.value = '';
    return;
  }

  kindSelect.disabled = false;
  domainInput.disabled = false;
  setRuleFormDisabled(editor, false);
  setHintText(editor.hint, 'Use the form to create, update, or delete rules.');

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildRuleExplorerViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    setRuleFormDisabled(editor, true);
    return;
  }

  if (currentMovementId !== lastMovementId) {
    selectedRuleId = null;
    lastMovementId = currentMovementId;
  }

  const rulesForMovement = (snapshot?.rules || []).filter(r => r.movementId === currentMovementId);
  const kinds = Array.from(new Set(rulesForMovement.map(r => r.kind).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  ensureSelectOptions(
    kindSelect,
    kinds.map(k => ({ value: k, label: k })),
    'All'
  );

  const kindVal = kindSelect.value || '';
  const rawDomain = domainInput.value || '';
  const domainFilter = rawDomain
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const referenceOptions = buildReferenceOptions(snapshot, currentMovementId);

  if (editor?.ruleSelect) {
    ensureSelectOptions(
      editor.ruleSelect,
      rulesForMovement
        .slice()
        .sort((a, b) => (a.shortText || '').localeCompare(b.shortText || ''))
        .map(r => ({ value: r.id, label: r.shortText || r.id })),
      'Choose rule'
    );
  }

  if (!selectedRuleId && rulesForMovement.length) {
    selectedRuleId = rulesForMovement[0].id;
  }

  const activeRule = rulesForMovement.find(r => r.id === selectedRuleId) || null;
  if (editor?.ruleSelect && selectedRuleId) {
    editor.ruleSelect.value = selectedRuleId;
  }

  populateRuleForm(activeRule, editor, referenceOptions);

  if (editor?.saveBtn) editor.saveBtn.disabled = !activeRule;
  if (editor?.deleteBtn) editor.deleteBtn.disabled = !activeRule;

  const vm = ViewModels.buildRuleExplorerViewModel(snapshot, {
    movementId: currentMovementId,
    kindFilter: kindVal ? [kindVal] : [],
    domainFilter
  });

  renderRulesTable(wrapper, vm?.rules || [], clear);
}

export function registerRulesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const kindSelect = document.getElementById('rules-kind-filter');
      const domainInput = document.getElementById('rules-domain-filter');
      const editor = getRuleEditorElements();

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'rules') return;
        rerender();
      };

      if (kindSelect) kindSelect.addEventListener('change', rerender);
      if (domainInput) domainInput.addEventListener('input', rerender);
      const handleRuleSelect = () => {
        selectedRuleId = editor.ruleSelect?.value || null;
        rerender();
      };
      const handleAdd = () => {
        const id = createRule(context);
        if (id) {
          selectedRuleId = id;
          rerender();
        }
      };
      const handleSave = () => {
        const values = readRuleForm(editor);
        if (!selectedRuleId || !values) return;
        saveRule(context, selectedRuleId, values);
        rerender();
      };
      const handleDelete = () => {
        if (!selectedRuleId) return;
        const removed = deleteRule(context, selectedRuleId);
        if (removed) {
          selectedRuleId = null;
          rerender();
        }
      };
      if (editor.ruleSelect)
        editor.ruleSelect.addEventListener('change', handleRuleSelect);
      if (editor.addBtn) editor.addBtn.addEventListener('click', handleAdd);
      if (editor.saveBtn) editor.saveBtn.addEventListener('click', handleSave);
      if (editor.deleteBtn) editor.deleteBtn.addEventListener('click', handleDelete);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        kindSelect,
        domainInput,
        rerender,
        unsubscribe,
        editorHandlers: { handleRuleSelect, handleAdd, handleSave, handleDelete },
        editor
      };
    },
    render: renderRulesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.kindSelect) h.kindSelect.removeEventListener('change', h.rerender);
      if (h.domainInput) h.domainInput.removeEventListener('input', h.rerender);
      if (h.editor?.ruleSelect)
        h.editor.ruleSelect.removeEventListener('change', h.editorHandlers.handleRuleSelect);
      if (h.editor?.addBtn)
        h.editor.addBtn.removeEventListener('click', h.editorHandlers.handleAdd);
      if (h.editor?.saveBtn)
        h.editor.saveBtn.removeEventListener('click', h.editorHandlers.handleSave);
      if (h.editor?.deleteBtn)
        h.editor.deleteBtn.removeEventListener('click', h.editorHandlers.handleDelete);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.rules = tab;
  if (ctx?.tabs) {
    ctx.tabs.rules = tab;
  }
  return tab;
}
