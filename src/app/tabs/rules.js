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
