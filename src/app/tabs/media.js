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

function renderMediaCards(wrapper, items, clear) {
  clear(wrapper);

  if (!items || items.length === 0) {
    wrapper.appendChild(hint('No media match this filter.'));
    return;
  }

  items.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';

    const h = document.createElement('h4');
    h.textContent = m.title + (m.kind ? ` (${m.kind})` : '');
    card.appendChild(h);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = m.uri || '';
    card.appendChild(meta);

    if (m.description) {
      const p = document.createElement('p');
      p.textContent = m.description;
      card.appendChild(p);
    }

    if (m.tags && m.tags.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      m.tags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-tag';
        chip.textContent = tag;
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    const appendChipRow = (items, label, className = 'chip') => {
      if (!items || !items.length) return;
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = label;
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      items.forEach(item => {
        const chip = document.createElement('span');
        chip.className = className;
        chip.textContent = item.name || item.title || item.id || '';
        row.appendChild(chip);
      });
      card.appendChild(row);
    };

    appendChipRow(m.entities, 'Entities:', 'chip chip-entity');
    appendChipRow(m.practices, 'Practices:');
    appendChipRow(m.events, 'Events:');
    appendChipRow(m.texts, 'Texts:');

    wrapper.appendChild(card);
  });
}

function renderMediaTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('media-gallery');
  const entSelect = document.getElementById('media-entity-filter');
  const prSelect = document.getElementById('media-practice-filter');
  const evSelect = document.getElementById('media-event-filter');
  const txSelect = document.getElementById('media-text-filter');
  if (!wrapper || !entSelect || !prSelect || !evSelect || !txSelect) return;

  const selects = [entSelect, prSelect, evSelect, txSelect];

  if (!currentMovementId) {
    selects.forEach(select => {
      select.disabled = true;
    });
    clear(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(entSelect, [], 'Any');
    ensureSelectOptions(prSelect, [], 'Any');
    ensureSelectOptions(evSelect, [], 'Any');
    ensureSelectOptions(txSelect, [], 'Any');
    return;
  }

  selects.forEach(select => {
    select.disabled = false;
  });

  const ViewModels = getViewModels(ctx);
  if (!ViewModels?.buildMediaGalleryViewModel) {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const entities = (snapshot.entities || [])
    .filter(e => e.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const practices = (snapshot.practices || [])
    .filter(p => p.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const events = (snapshot.events || [])
    .filter(e => e.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const texts = (snapshot.texts || [])
    .filter(t => t.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  ensureSelectOptions(
    entSelect,
    entities.map(e => ({ value: e.id, label: e.name || e.id })),
    'Any'
  );
  ensureSelectOptions(
    prSelect,
    practices.map(p => ({ value: p.id, label: p.name || p.id })),
    'Any'
  );
  ensureSelectOptions(
    evSelect,
    events.map(e => ({ value: e.id, label: e.name || e.id })),
    'Any'
  );
  ensureSelectOptions(
    txSelect,
    texts.map(t => ({ value: t.id, label: t.title || t.id })),
    'Any'
  );

  const vm = ViewModels.buildMediaGalleryViewModel(snapshot, {
    movementId: currentMovementId,
    entityIdFilter: entSelect.value || null,
    practiceIdFilter: prSelect.value || null,
    eventIdFilter: evSelect.value || null,
    textIdFilter: txSelect.value || null
  });

  renderMediaCards(wrapper, vm?.items || [], clear);
}

export function registerMediaTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const entSelect = document.getElementById('media-entity-filter');
      const prSelect = document.getElementById('media-practice-filter');
      const evSelect = document.getElementById('media-event-filter');
      const txSelect = document.getElementById('media-text-filter');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'media') return;
        rerender();
      };

      [entSelect, prSelect, evSelect, txSelect].forEach(select => {
        if (select) select.addEventListener('change', rerender);
      });

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { entSelect, prSelect, evSelect, txSelect, rerender, unsubscribe };
    },
    render: renderMediaTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      [h.entSelect, h.prSelect, h.evSelect, h.txSelect].forEach(select => {
        if (select) select.removeEventListener('change', h.rerender);
      });
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.media = tab;
  if (ctx?.tabs) {
    ctx.tabs.media = tab;
  }
  return tab;
}
