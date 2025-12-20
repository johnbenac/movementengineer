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

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';

    const h = document.createElement('h4');
    h.textContent = item.title + (item.kind ? ` (${item.kind})` : '');
    card.appendChild(h);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = item.uri;
    card.appendChild(meta);

    if (item.description) {
      const p = document.createElement('p');
      p.textContent = item.description;
      card.appendChild(p);
    }

    if (item.tags && item.tags.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      item.tags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-tag';
        chip.textContent = tag;
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    const sections = [
      { label: 'Entities:', values: item.entities, text: e => e.name || e.id },
      { label: 'Practices:', values: item.practices, text: p => p.name || p.id },
      { label: 'Events:', values: item.events, text: e => e.name || e.id },
      { label: 'Texts:', values: item.texts, text: t => t.title || t.id }
    ];

    sections.forEach(section => {
      if (!section.values || !section.values.length) return;
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = section.label;
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      section.values.forEach(val => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = section.text(val);
        row.appendChild(chip);
      });
      card.appendChild(row);
    });

    wrapper.appendChild(card);
  });
}

function renderMediaTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('media-gallery');
  const entSelect = document.getElementById('media-entity-filter');
  const prSelect = document.getElementById('media-practice-filter');
  const evSelect = document.getElementById('media-event-filter');
  const txSelect = document.getElementById('media-text-filter');
  if (!wrapper || !entSelect || !prSelect || !evSelect || !txSelect) return;

  const viewModels = getViewModels(ctx);

  if (!currentMovementId) {
    [entSelect, prSelect, evSelect, txSelect].forEach(el => {
      if (el) el.disabled = true;
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

  [entSelect, prSelect, evSelect, txSelect].forEach(el => {
    if (el) el.disabled = false;
  });

  const baseEntities = (snapshot?.entities || [])
    .filter(e => e.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => ({ value: e.id, label: e.name || e.id }));
  const basePractices = (snapshot?.practices || [])
    .filter(p => p.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(p => ({ value: p.id, label: p.name || p.id }));
  const baseEvents = (snapshot?.events || [])
    .filter(e => e.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(e => ({ value: e.id, label: e.name || e.id }));
  const baseTexts = (snapshot?.texts || [])
    .filter(t => t.movementId === currentMovementId)
    .slice()
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    .map(t => ({ value: t.id, label: t.title || t.id }));

  ensureSelectOptions(entSelect, baseEntities, 'Any');
  ensureSelectOptions(prSelect, basePractices, 'Any');
  ensureSelectOptions(evSelect, baseEvents, 'Any');
  ensureSelectOptions(txSelect, baseTexts, 'Any');

  const entityIdFilter = entSelect.value || '';
  const practiceIdFilter = prSelect.value || '';
  const eventIdFilter = evSelect.value || '';
  const textIdFilter = txSelect.value || '';

  if (!viewModels || typeof viewModels.buildMediaGalleryViewModel !== 'function') {
    clear(wrapper);
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const vm = viewModels.buildMediaGalleryViewModel(snapshot, {
    movementId: currentMovementId,
    entityIdFilter: entityIdFilter || null,
    practiceIdFilter: practiceIdFilter || null,
    eventIdFilter: eventIdFilter || null,
    textIdFilter: textIdFilter || null
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

      [entSelect, prSelect, evSelect, txSelect].forEach(el => {
        if (el) el.addEventListener('change', rerender);
      });

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { entSelect, prSelect, evSelect, txSelect, rerender, unsubscribe };
    },
    render: renderMediaTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      [h.entSelect, h.prSelect, h.evSelect, h.txSelect].forEach(el => {
        if (el) el.removeEventListener('change', h.rerender);
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
