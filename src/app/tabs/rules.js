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

function parseCsvInput(value) {
  const helper = window.MovementEngineer?.utils?.values?.parseCsvInput;
  if (typeof helper === 'function') return helper(value);
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function normaliseArray(value) {
  const helper = window.MovementEngineer?.utils?.values?.normaliseArray;
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

function getRuleActions(ctx) {
  const actions = ctx?.actions || movementEngineerGlobal.actions || {};
  const legacy = ctx?.legacy || movementEngineerGlobal.legacy || {};
  return {
    createRule: actions.createRule || legacy.createRule,
    saveRule: actions.saveRule || legacy.saveRule,
    deleteRule: actions.deleteRule || legacy.deleteRule,
    setStatus: ctx?.setStatus || legacy.setStatus || (() => {})
  };
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

function setMultiSelectValues(selectEl, values) {
  if (!selectEl) return;
  const selected = new Set(normaliseArray(values));
  Array.from(selectEl.options || []).forEach(opt => {
    opt.selected = selected.has(opt.value);
  });
}

function getMultiSelectValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || [])
    .map(opt => opt.value)
    .filter(Boolean);
}

let selectedRuleId = null;

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

function renderRuleEditor(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const movementId = state.currentMovementId;
  const editor = document.getElementById('rules-editor');
  const ruleSelect = document.getElementById('rules-select');
  const kindSelect = document.getElementById('rule-kind');
  const shortInput = document.getElementById('rule-short-text');
  const detailsInput = document.getElementById('rule-details');
  const domainInput = document.getElementById('rule-domain');
  const domainDatalist = document.getElementById('rule-domain-options');
  const appliesInput = document.getElementById('rule-applies-to');
  const tagsInput = document.getElementById('rule-tags');
  const textsSelect = document.getElementById('rule-supporting-texts');
  const claimsSelect = document.getElementById('rule-supporting-claims');
  const practicesSelect = document.getElementById('rule-related-practices');
  const entitiesSelect = document.getElementById('rule-source-entities');
  const sourcesInput = document.getElementById('rule-sources-of-truth');
  const addBtn = document.getElementById('btn-add-rule');
  const saveBtn = document.getElementById('btn-save-rule');
  const deleteBtn = document.getElementById('btn-delete-rule');
  const statusEl = document.getElementById('rule-editor-status');

  const allInputs = [
    ruleSelect,
    kindSelect,
    shortInput,
    detailsInput,
    domainInput,
    appliesInput,
    tagsInput,
    textsSelect,
    claimsSelect,
    practicesSelect,
    entitiesSelect,
    sourcesInput
  ];

  if (!editor || !ruleSelect || !kindSelect || !shortInput || !detailsInput) return;

  const disableEditor = message => {
    allInputs.forEach(el => {
      if (!el) return;
      el.disabled = true;
      if (el.tagName === 'SELECT') {
        ensureSelectOptions(el, [], el.multiple ? undefined : '—');
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = '';
      }
    });
    [addBtn, saveBtn, deleteBtn].forEach(btn => btn && (btn.disabled = true));
    if (statusEl) {
      statusEl.textContent = message || '';
      statusEl.classList.toggle('hidden', !message);
    }
  };

  if (!movementId) {
    disableEditor('Create or select a movement to add rules.');
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildRuleEditorViewModel !== 'function') {
    disableEditor('ViewModels module not loaded.');
    return;
  }

  const vm = ViewModels.buildRuleEditorViewModel(snapshot, { movementId });
  const ruleOptions = (vm.rules || []).map(r => ({ value: r.id, label: r.label }));
  ensureSelectOptions(ruleSelect, ruleOptions, 'Choose rule');

  const availableRuleIds = vm.rules.map(r => r.id);
  if (!availableRuleIds.includes(selectedRuleId)) {
    selectedRuleId = availableRuleIds[0] || null;
  }
  if (selectedRuleId) ruleSelect.value = selectedRuleId;

  const kindValues = Array.from(
    new Set(
      ['must_do', 'must_not_do', 'should_do', 'ideal', 'guideline']
        .concat(vm.rules.map(r => r.kind).filter(Boolean))
        .filter(Boolean)
    )
  ).sort((a, b) => String(a).localeCompare(String(b)));
  ensureSelectOptions(
    kindSelect,
    kindValues.map(value => ({ value, label: value })),
    ''
  );

  if (domainDatalist) {
    clear(domainDatalist);
    (vm.domainOptions || []).forEach(domain => {
      const opt = document.createElement('option');
      opt.value = domain;
      domainDatalist.appendChild(opt);
    });
  }

  const actions = getRuleActions(ctx);
  const rules = snapshot?.rules || [];
  const activeRule = rules.find(r => r.id === selectedRuleId) || null;

  const opts = vm.referenceOptions || {};
  ensureSelectOptions(textsSelect, opts.texts || [], undefined);
  ensureSelectOptions(claimsSelect, opts.claims || [], undefined);
  ensureSelectOptions(practicesSelect, opts.practices || [], undefined);
  ensureSelectOptions(entitiesSelect, opts.entities || [], undefined);

  const isEditingExisting = !!activeRule;
  [shortInput, detailsInput, domainInput, appliesInput, tagsInput, sourcesInput].forEach(
    el => el && (el.disabled = false)
  );
  [kindSelect, textsSelect, claimsSelect, practicesSelect, entitiesSelect].forEach(
    el => el && (el.disabled = false)
  );
  [addBtn, saveBtn].forEach(btn => btn && (btn.disabled = false));
  if (deleteBtn) deleteBtn.disabled = !isEditingExisting;

  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
  }

  if (!activeRule) {
    shortInput.value = '';
    kindSelect.value = '';
    detailsInput.value = '';
    domainInput.value = '';
    appliesInput.value = '';
    tagsInput.value = '';
    sourcesInput.value = '';
    setMultiSelectValues(textsSelect, []);
    setMultiSelectValues(claimsSelect, []);
    setMultiSelectValues(practicesSelect, []);
    setMultiSelectValues(entitiesSelect, []);
    return;
  }

  shortInput.value = activeRule.shortText || '';
  kindSelect.value = activeRule.kind || '';
  detailsInput.value = activeRule.details || '';
  domainInput.value = normaliseArray(activeRule.domain).join(', ');
  appliesInput.value = normaliseArray(activeRule.appliesTo).join(', ');
  tagsInput.value = normaliseArray(activeRule.tags).join(', ');
  sourcesInput.value = normaliseArray(activeRule.sourcesOfTruth).join(', ');

  setMultiSelectValues(textsSelect, activeRule.supportingTextIds);
  setMultiSelectValues(claimsSelect, activeRule.supportingClaimIds);
  setMultiSelectValues(practicesSelect, activeRule.relatedPracticeIds);
  setMultiSelectValues(entitiesSelect, activeRule.sourceEntityIds);

  const handleCreate = () => {
    const created = actions.createRule?.(movementId);
    if (!created) return;
    selectedRuleId = created.id;
    actions.setStatus('Rule created');
    renderRulesTab(ctx);
  };

  const handleSave = () => {
    const payload = {
      movementId,
      shortText: shortInput.value.trim() || 'New rule',
      kind: kindSelect.value || null,
      details: detailsInput.value.trim() || null,
      domain: parseCsvInput(domainInput.value),
      appliesTo: parseCsvInput(appliesInput.value),
      tags: parseCsvInput(tagsInput.value),
      supportingTextIds: getMultiSelectValues(textsSelect),
      supportingClaimIds: getMultiSelectValues(claimsSelect),
      relatedPracticeIds: getMultiSelectValues(practicesSelect),
      sourcesOfTruth: parseCsvInput(sourcesInput.value),
      sourceEntityIds: getMultiSelectValues(entitiesSelect)
    };
    const updated = actions.saveRule?.(selectedRuleId, payload);
    if (!updated) return;
    selectedRuleId = updated.id;
    actions.setStatus('Rule saved');
    renderRulesTab(ctx);
  };

  const handleDelete = () => {
    if (!selectedRuleId) return;
    const ok = window.confirm('Delete this rule? This cannot be undone.');
    if (!ok) return;
    const deleted = actions.deleteRule?.(selectedRuleId);
    if (!deleted) return;
    selectedRuleId = vm.rules.find(r => r.id !== selectedRuleId)?.id || null;
    actions.setStatus('Rule deleted');
    renderRulesTab(ctx);
  };

  const bindClick = (btn, handler) => {
    if (!btn) return;
    if (btn.__rulesHandler) {
      btn.removeEventListener('click', btn.__rulesHandler);
    }
    btn.__rulesHandler = event => {
      event.preventDefault();
      handler();
    };
    btn.addEventListener('click', btn.__rulesHandler);
  };

  bindClick(addBtn, handleCreate);
  bindClick(saveBtn, handleSave);
  bindClick(deleteBtn, handleDelete);
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
    renderRuleEditor(ctx);
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
  renderRuleEditor(ctx);
}

export function registerRulesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const kindSelect = document.getElementById('rules-kind-filter');
      const domainInput = document.getElementById('rules-domain-filter');
      const ruleSelect = document.getElementById('rules-select');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'rules') return;
        rerender();
      };

      if (kindSelect) kindSelect.addEventListener('change', rerender);
      if (domainInput) domainInput.addEventListener('input', rerender);
      if (ruleSelect) {
        ruleSelect.addEventListener('change', () => {
          selectedRuleId = ruleSelect.value || null;
          rerender();
        });
      }

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { kindSelect, domainInput, ruleSelect, rerender, unsubscribe };
    },
    render: renderRulesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.kindSelect) h.kindSelect.removeEventListener('change', h.rerender);
      if (h.domainInput) h.domainInput.removeEventListener('input', h.rerender);
      if (h.ruleSelect) h.ruleSelect.removeEventListener('change', h.rerender);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      selectedRuleId = null;
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.rules = tab;
  if (ctx?.tabs) {
    ctx.tabs.rules = tab;
  }
  return tab;
}
