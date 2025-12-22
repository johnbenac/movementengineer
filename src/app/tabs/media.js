const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
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
    meta.textContent = m.uri;
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

    if (m.entities && m.entities.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Entities:';
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      m.entities.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-entity';
        chip.textContent = e.name || e.id;
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (m.practices && m.practices.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Practices:';
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      m.practices.forEach(p => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = p.name || p.id;
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (m.events && m.events.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Events:';
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      m.events.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = e.name || e.id;
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (m.texts && m.texts.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Texts:';
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      m.texts.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = t.title || t.id;
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    wrapper.appendChild(card);
  });
}

function renderMediaTab(ctx) {
  const { clearElement, ensureSelectOptions } = ctx.dom;
  const state = ctx.store.getState();
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('media-gallery');
  const entitySelect = document.getElementById('media-entity-filter');
  const practiceSelect = document.getElementById('media-practice-filter');
  const eventSelect = document.getElementById('media-event-filter');
  const textSelect = document.getElementById('media-text-filter');
  if (!wrapper || !entitySelect || !practiceSelect || !eventSelect || !textSelect) return;

  const allFilters = [entitySelect, practiceSelect, eventSelect, textSelect];

  if (!currentMovementId) {
    allFilters.forEach(f => {
      f.disabled = true;
      f.value = '';
    });
    clearElement(wrapper);
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    ensureSelectOptions(entitySelect, [], 'Any');
    ensureSelectOptions(practiceSelect, [], 'Any');
    ensureSelectOptions(eventSelect, [], 'Any');
    ensureSelectOptions(textSelect, [], 'Any');
    return;
  }

  allFilters.forEach(f => {
    f.disabled = false;
  });

  const ViewModels = ctx.services.ViewModels;

  const entities = (snapshot?.entities || []).filter(e => e.movementId === currentMovementId);
  const practices = (snapshot?.practices || []).filter(p => p.movementId === currentMovementId);
  const events = (snapshot?.events || []).filter(e => e.movementId === currentMovementId);
  const texts = (snapshot?.texts || []).filter(t => t.movementId === currentMovementId);

  ensureSelectOptions(
    entitySelect,
    entities
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(e => ({ value: e.id, label: e.name || e.id })),
    'Any'
  );
  ensureSelectOptions(
    practiceSelect,
    practices
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(p => ({ value: p.id, label: p.name || p.id })),
    'Any'
  );
  ensureSelectOptions(
    eventSelect,
    events
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(e => ({ value: e.id, label: e.name || e.id })),
    'Any'
  );
  ensureSelectOptions(
    textSelect,
    texts
      .slice()
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      .map(t => ({ value: t.id, label: t.title || t.id })),
    'Any'
  );

  const entityIdFilter = entitySelect.value || null;
  const practiceIdFilter = practiceSelect.value || null;
  const eventIdFilter = eventSelect.value || null;
  const textIdFilter = textSelect.value || null;

  const vm = ViewModels.buildMediaGalleryViewModel(snapshot, {
    movementId: currentMovementId,
    entityIdFilter: entityIdFilter || null,
    practiceIdFilter: practiceIdFilter || null,
    eventIdFilter: eventIdFilter || null,
    textIdFilter: textIdFilter || null
  });

  renderMediaCards(wrapper, vm?.items || [], clearElement);
}

export function registerMediaTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const entitySelect = document.getElementById('media-entity-filter');
      const practiceSelect = document.getElementById('media-practice-filter');
      const eventSelect = document.getElementById('media-event-filter');
      const textSelect = document.getElementById('media-text-filter');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'media') return;
        rerender();
      };

      [entitySelect, practiceSelect, eventSelect, textSelect].forEach(selectEl => {
        if (!selectEl) return;
        selectEl.addEventListener('change', rerender);
      });

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        entitySelect,
        practiceSelect,
        eventSelect,
        textSelect,
        rerender,
        unsubscribe
      };
    },
    render: renderMediaTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      [h.entitySelect, h.practiceSelect, h.eventSelect, h.textSelect].forEach(selectEl => {
        if (!selectEl) return;
        selectEl.removeEventListener('change', h.rerender);
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
