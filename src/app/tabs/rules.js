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

function parseCsvInput(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
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
    tdTexts.textContent = (r.supportingTexts || []).map(t => t.title || t.id).join(', ');
    tr.appendChild(tdTexts);

    const tdClaims = document.createElement('td');
    tdClaims.textContent = (r.supportingClaims || [])
      .map(c => (c.category ? `[${c.category}] ${c.text}` : c.text))
      .join('; ');
    tr.appendChild(tdClaims);

    const tdPractices = document.createElement('td');
    tdPractices.textContent = (r.relatedPractices || []).map(p => p.name || p.id).join(', ');
    tr.appendChild(tdPractices);

    const tdSources = document.createElement('td');
    tdSources.textContent = (r.sourcesOfTruth || []).join(', ');
    tr.appendChild(tdSources);

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
  if (!wrapper || !kindSelect || !domainInput) return;

  const viewModels = getViewModels(ctx);

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

  const movementRules = (snapshot?.rules || []).filter(
    rule => rule.movementId === currentMovementId
  );
  const kinds = Array.from(new Set(movementRules.map(r => r.kind).filter(Boolean))).sort(
    (a, b) => String(a).localeCompare(String(b))
  );

  ensureSelectOptions(
    kindSelect,
    kinds.map(kind => ({ value: kind, label: kind })),
    'All'
  );

  const kindVal = kindSelect.value || '';
  const domainFilter = parseCsvInput(domainInput.value || '');

  if (!viewModels || typeof viewModels.buildRuleExplorerViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const vm = viewModels.buildRuleExplorerViewModel(snapshot, {
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
    render: renderRulesTab,
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
