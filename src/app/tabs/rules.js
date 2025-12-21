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

function getDomainService(ctx) {
  return ctx?.services?.DomainService || ctx?.DomainService || window.DomainService;
}

function parseCsvInput(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function setMultiSelectValues(selectEl, values = []) {
  if (!selectEl) return;
  const valueSet = new Set(values);
  Array.from(selectEl.options).forEach(opt => {
    opt.selected = valueSet.has(opt.value);
  });
}

function buildLookupOptions(items = [], labelKey = 'name') {
  return items.map(item => ({
    value: item.id,
    label: item[labelKey] || item.id
  }));
}

function ensureEditorContainer(clear) {
  const panel = document.getElementById('tab-rules');
  if (!panel) return null;
  let editor = document.getElementById('rules-editor');
  if (!editor) {
    editor = document.createElement('div');
    editor.id = 'rules-editor';
    panel.querySelector('.panel-body')?.appendChild(editor);
  }
  clear(editor);
  return editor;
}

function updateSnapshot(ctx, updater) {
  if (typeof updater !== 'function') return null;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  if (!snapshot) return null;
  const nextSnapshot = JSON.parse(JSON.stringify(snapshot));
  const result = updater(nextSnapshot);
  if (typeof ctx?.update === 'function') {
    ctx.update(prev => ({ ...prev, snapshot: nextSnapshot }));
  } else if (typeof ctx?.setState === 'function') {
    ctx.setState({ ...state, snapshot: nextSnapshot });
  } else {
    state.snapshot = nextSnapshot;
  }
  if (typeof ctx?.setStatus === 'function') {
    ctx.setStatus('Rules updated');
  }
  return { snapshot: nextSnapshot, result };
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
    'Sources of truth'
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

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
}

function renderRuleEditor(ctx, vm, tabState, clear) {
  const editor = ensureEditorContainer(clear);
  if (!editor) return;

  const state = getState(ctx);
  const currentMovementId = state.currentMovementId;
  const DomainService = getDomainService(ctx);

  if (!currentMovementId) {
    editor.appendChild(hint('Create or select a movement to manage rules.'));
    return;
  }

  const lookups = vm?.lookups || {};
  const rules = vm?.rules || [];

  let selectedRule = rules.find(r => r.id === tabState?.selectedRuleId) || null;
  if (!selectedRule && rules.length) {
    selectedRule = rules[0];
  }
  if (tabState) tabState.selectedRuleId = selectedRule ? selectedRule.id : null;

  const heading = document.createElement('h3');
  heading.className = 'section-heading';
  heading.textContent = 'Manage rules';
  editor.appendChild(heading);

  const selectorRow = document.createElement('div');
  selectorRow.className = 'form-row';
  const selectorLabel = document.createElement('label');
  selectorLabel.textContent = 'Select rule';
  const selector = document.createElement('select');
  selector.id = 'rules-select-rule';
  selector.appendChild(new Option('Choose a rule', '', true, false));
  rules.forEach(rule => {
    const label = rule.shortText || rule.id;
    selector.appendChild(new Option(label, rule.id, false, rule.id === selectedRule?.id));
  });
  selector.addEventListener('change', () => {
    if (tabState) tabState.selectedRuleId = selector.value || null;
    renderRulesTab(ctx, tabState);
  });
  selectorLabel.appendChild(selector);
  selectorRow.appendChild(selectorLabel);

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const newBtn = document.createElement('button');
  newBtn.id = 'rules-btn-new';
  newBtn.type = 'button';
  newBtn.textContent = 'New rule';
  newBtn.addEventListener('click', () => {
    if (!DomainService) return;
    const result = updateSnapshot(ctx, snap =>
      DomainService.addNewItem(snap, 'rules', currentMovementId)
    );
    const newRule = result?.result;
    if (tabState) tabState.selectedRuleId = newRule?.id || null;
    renderRulesTab(ctx, tabState);
  });
  actions.appendChild(newBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.id = 'rules-btn-delete';
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete rule';
  deleteBtn.disabled = !selectedRule;
  deleteBtn.addEventListener('click', () => {
    if (!selectedRule || !DomainService) return;
    const ok = window.confirm('Delete this rule? This cannot be undone.');
    if (!ok) return;
    updateSnapshot(ctx, snap => DomainService.deleteItem(snap, 'rules', selectedRule.id));
    if (tabState) tabState.selectedRuleId = null;
    renderRulesTab(ctx, tabState);
  });
  actions.appendChild(deleteBtn);

  selectorRow.appendChild(actions);
  editor.appendChild(selectorRow);

  if (!selectedRule) {
    editor.appendChild(hint('No rules yet. Create one to begin.'));
    return;
  }

  const form = document.createElement('div');
  form.className = 'form-grid';

  const addInput = (labelText, inputEl) => {
    const row = document.createElement('div');
    row.className = 'form-row';
    const label = document.createElement('label');
    label.textContent = labelText;
    label.appendChild(inputEl);
    row.appendChild(label);
    form.appendChild(row);
  };

  const shortInput = document.createElement('input');
  shortInput.type = 'text';
  shortInput.value = selectedRule.shortText || '';
  addInput('Short text', shortInput);

  const kindSelect = document.createElement('select');
  ['must_do', 'must_not_do', 'should_do', 'ideal', 'Norm', 'Guideline'].forEach(kind => {
    const opt = new Option(kind, kind, false, selectedRule.kind === kind);
    kindSelect.appendChild(opt);
  });
  if (selectedRule.kind && !Array.from(kindSelect.options).some(o => o.value === selectedRule.kind)) {
    kindSelect.appendChild(new Option(selectedRule.kind, selectedRule.kind, false, true));
  }
  addInput('Kind', kindSelect);

  const appliesInput = document.createElement('input');
  appliesInput.type = 'text';
  appliesInput.value = (selectedRule.appliesTo || []).join(', ');
  if (lookups.appliesTo && lookups.appliesTo.length) {
    const list = document.createElement('datalist');
    list.id = 'rules-applies-to';
    lookups.appliesTo.forEach(val => list.appendChild(new Option(val, val)));
    appliesInput.setAttribute('list', list.id);
    form.appendChild(list);
  }
  addInput('Applies to (comma separated)', appliesInput);

  const domainInput = document.createElement('input');
  domainInput.type = 'text';
  domainInput.value = (selectedRule.domain || []).join(', ');
  if (lookups.domains && lookups.domains.length) {
    const list = document.createElement('datalist');
    list.id = 'rules-domains';
    lookups.domains.forEach(val => list.appendChild(new Option(val, val)));
    domainInput.setAttribute('list', list.id);
    form.appendChild(list);
  }
  addInput('Domain (comma separated)', domainInput);

  const tagsInput = document.createElement('input');
  tagsInput.type = 'text';
  tagsInput.value = (selectedRule.tags || []).join(', ');
  if (lookups.tags && lookups.tags.length) {
    const list = document.createElement('datalist');
    list.id = 'rules-tags';
    lookups.tags.forEach(val => list.appendChild(new Option(val, val)));
    tagsInput.setAttribute('list', list.id);
    form.appendChild(list);
  }
  addInput('Tags (comma separated)', tagsInput);

  const detailsInput = document.createElement('textarea');
  detailsInput.value = selectedRule.details || '';
  addInput('Details', detailsInput);

  const supportingTextsSelect = document.createElement('select');
  supportingTextsSelect.multiple = true;
  buildLookupOptions(lookups.texts || [], 'title').forEach(opt =>
    supportingTextsSelect.appendChild(new Option(opt.label, opt.value))
  );
  setMultiSelectValues(supportingTextsSelect, selectedRule.supportingTextIds || []);
  addInput('Supporting texts', supportingTextsSelect);

  const supportingClaimsSelect = document.createElement('select');
  supportingClaimsSelect.multiple = true;
  buildLookupOptions(lookups.claims || [], 'text').forEach(opt =>
    supportingClaimsSelect.appendChild(new Option(opt.label, opt.value))
  );
  setMultiSelectValues(supportingClaimsSelect, selectedRule.supportingClaimIds || []);
  addInput('Supporting claims', supportingClaimsSelect);

  const practicesSelect = document.createElement('select');
  practicesSelect.multiple = true;
  buildLookupOptions(lookups.practices || [], 'name').forEach(opt =>
    practicesSelect.appendChild(new Option(opt.label, opt.value))
  );
  setMultiSelectValues(practicesSelect, selectedRule.relatedPracticeIds || []);
  addInput('Related practices', practicesSelect);

  const sourceEntitiesSelect = document.createElement('select');
  sourceEntitiesSelect.multiple = true;
  buildLookupOptions(lookups.entities || [], 'name').forEach(opt =>
    sourceEntitiesSelect.appendChild(new Option(opt.label, opt.value))
  );
  setMultiSelectValues(sourceEntitiesSelect, selectedRule.sourceEntityIds || []);
  addInput('Source entities', sourceEntitiesSelect);

  const sourcesOfTruthInput = document.createElement('input');
  sourcesOfTruthInput.type = 'text';
  sourcesOfTruthInput.value = (selectedRule.sourcesOfTruth || []).join(', ');
  addInput('Sources of truth (comma separated)', sourcesOfTruthInput);

  const saveRow = document.createElement('div');
  saveRow.className = 'form-actions';
  const saveBtn = document.createElement('button');
  saveBtn.id = 'rules-btn-save';
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save rule';
  saveBtn.addEventListener('click', () => {
    if (!DomainService) return;
    const updated = {
      ...selectedRule,
      movementId: currentMovementId,
      shortText: shortInput.value.trim() || selectedRule.shortText || 'Untitled rule',
      kind: kindSelect.value || selectedRule.kind || null,
      details: detailsInput.value || null,
      appliesTo: parseCsvInput(appliesInput.value),
      domain: parseCsvInput(domainInput.value),
      tags: parseCsvInput(tagsInput.value),
      supportingTextIds: Array.from(supportingTextsSelect.selectedOptions).map(o => o.value),
      supportingClaimIds: Array.from(supportingClaimsSelect.selectedOptions).map(o => o.value),
      relatedPracticeIds: Array.from(practicesSelect.selectedOptions).map(o => o.value),
      sourcesOfTruth: parseCsvInput(sourcesOfTruthInput.value),
      sourceEntityIds: Array.from(sourceEntitiesSelect.selectedOptions).map(o => o.value)
    };
    updateSnapshot(ctx, snap => DomainService.upsertItem(snap, 'rules', updated));
    if (tabState) tabState.selectedRuleId = updated.id;
    renderRulesTab(ctx, tabState);
  });
  saveRow.appendChild(saveBtn);
  form.appendChild(saveRow);

  editor.appendChild(form);
}

function renderRulesTab(ctx, tabState) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('rules-table-wrapper');
  const kindSelect = document.getElementById('rules-kind-filter');
  const domainInput = document.getElementById('rules-domain-filter');
  if (!wrapper || !kindSelect || !domainInput) return;

  if (!currentMovementId) {
    kindSelect.disabled = true;
    domainInput.disabled = true;
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(kindSelect, [], 'All');
    domainInput.value = '';
    return;
  }

  kindSelect.disabled = false;
  domainInput.disabled = false;

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildRuleExplorerViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
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

  const vm = ViewModels.buildRuleExplorerViewModel(snapshot, {
    movementId: currentMovementId,
    kindFilter: kindVal ? [kindVal] : [],
    domainFilter
  });

  renderRulesTable(wrapper, vm?.rules || [], clear);
  renderRuleEditor(ctx, vm, tabState, clear);
}

export function registerRulesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const kindSelect = document.getElementById('rules-kind-filter');
      const domainInput = document.getElementById('rules-domain-filter');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'rules') return;
        rerender();
      };

      if (kindSelect) kindSelect.addEventListener('change', rerender);
      if (domainInput) domainInput.addEventListener('input', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { kindSelect, domainInput, rerender, unsubscribe };
    },
    render: context => renderRulesTab(context, tab),
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.kindSelect) h.kindSelect.removeEventListener('change', h.rerender);
      if (h.domainInput) h.domainInput.removeEventListener('input', h.rerender);
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
