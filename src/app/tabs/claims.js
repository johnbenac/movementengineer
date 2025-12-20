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

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function renderClaimsTable(wrapper, claims, clear) {
  clear(wrapper);

  if (!claims || !claims.length) {
    wrapper.appendChild(hint('No claims match this filter.'));
    return;
  }

  const table = document.createElement('table');
  const headerRow = document.createElement('tr');
  [
    'Category',
    'Text',
    'Tags',
    'About entities',
    'Source texts',
    'Sources of truth'
  ].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  claims.forEach(c => {
    const tr = document.createElement('tr');

    const tdCat = document.createElement('td');
    tdCat.textContent = c.category || '';
    tr.appendChild(tdCat);

    const tdText = document.createElement('td');
    tdText.textContent = c.text || '';
    tr.appendChild(tdText);

    const tdTags = document.createElement('td');
    tdTags.textContent = (c.tags || []).join(', ');
    tr.appendChild(tdTags);

    const tdEnts = document.createElement('td');
    if (c.aboutEntities && c.aboutEntities.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      c.aboutEntities.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-entity';
        chip.textContent = e.name || e.id;
        row.appendChild(chip);
      });
      tdEnts.appendChild(row);
    }
    tr.appendChild(tdEnts);

    const tdTexts = document.createElement('td');
    if (c.sourceTexts && c.sourceTexts.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      c.sourceTexts.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = t.title || t.id;
        row.appendChild(chip);
      });
      tdTexts.appendChild(row);
    }
    tr.appendChild(tdTexts);

    const tdSources = document.createElement('td');
    tdSources.textContent = (c.sourcesOfTruth || []).join(', ');
    tr.appendChild(tdSources);

    table.appendChild(tr);
  });

  wrapper.appendChild(table);
}

function renderClaimsTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('claims-table-wrapper');
  const catSelect = document.getElementById('claims-category-filter');
  const entSelect = document.getElementById('claims-entity-filter');
  if (!wrapper || !catSelect || !entSelect) return;

  if (!currentMovementId) {
    catSelect.disabled = true;
    entSelect.disabled = true;
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(catSelect, [], 'All');
    ensureSelectOptions(entSelect, [], 'Any');
    return;
  }

  catSelect.disabled = false;
  entSelect.disabled = false;

  const allClaims = (snapshot.claims || []).filter(c => c.movementId === currentMovementId);
  const categories = Array.from(
    new Set(allClaims.map(c => c.category).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)));

  const entities = (snapshot.entities || []).filter(e => e.movementId === currentMovementId);

  ensureSelectOptions(
    catSelect,
    categories.map(value => ({ value, label: value })),
    'All'
  );
  ensureSelectOptions(
    entSelect,
    entities
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(entity => ({ value: entity.id, label: entity.name || entity.id })),
    'Any'
  );

  const categoryVal = catSelect.value || '';
  const entityVal = entSelect.value || '';

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildClaimsExplorerViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const vm = ViewModels.buildClaimsExplorerViewModel(snapshot, {
    movementId: currentMovementId,
    categoryFilter: categoryVal ? [categoryVal] : [],
    entityIdFilter: entityVal || null
  });

  renderClaimsTable(wrapper, vm?.claims || [], clear);
}

export function registerClaimsTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const catSelect = document.getElementById('claims-category-filter');
      const entSelect = document.getElementById('claims-entity-filter');
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'claims') return;
        rerender();
      };

      if (catSelect) catSelect.addEventListener('change', rerender);
      if (entSelect) entSelect.addEventListener('change', rerender);
      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { catSelect, entSelect, rerender, unsubscribe };
    },
    render: renderClaimsTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.catSelect) h.catSelect.removeEventListener('change', h.rerender);
      if (h.entSelect) h.entSelect.removeEventListener('change', h.rerender);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.claims = tab;
  if (ctx?.tabs) {
    ctx.tabs.claims = tab;
  }
  return tab;
}
