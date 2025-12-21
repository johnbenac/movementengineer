const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getState(ctx) {
  return ctx?.getState?.() || ctx?.store?.getState?.() || {};
}

function getViewModels(ctx) {
  return ctx?.services?.ViewModels || ctx?.ViewModels || window.ViewModels;
}

function getActions(ctx) {
  return ctx?.actions || movementEngineerGlobal.actions || {};
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function appendChipRow(container, chips) {
  const row = document.createElement('div');
  row.className = 'chip-row';
  chips.forEach(chip => row.appendChild(chip));
  container.appendChild(row);
}

function createTagChips(tags = []) {
  return tags.map(tag => {
    const chip = document.createElement('span');
    chip.className = 'chip chip-tag';
    chip.textContent = tag;
    return chip;
  });
}

function createPracticeChips(practices = [], actions = {}) {
  return practices.map(practice => {
    const chip = document.createElement('span');
    chip.className = 'chip clickable';
    chip.textContent = practice.name || practice.id;
    chip.addEventListener('click', () => actions.jumpToPractice?.(practice.id));
    return chip;
  });
}

function createEntityChips(entities = [], actions = {}) {
  return entities.map(entity => {
    const chip = document.createElement('span');
    chip.className = 'chip chip-entity clickable';
    chip.textContent = entity.name || entity.id;
    chip.addEventListener('click', () => actions.jumpToEntity?.(entity.id));
    return chip;
  });
}

function createReadingChips(texts = [], actions = {}) {
  return texts.map(text => {
    const chip = document.createElement('span');
    chip.className = 'chip clickable';
    chip.textContent = text.title || text.id;
    chip.addEventListener('click', () => actions.jumpToText?.(text.id));
    return chip;
  });
}

function renderEventCard(event, actions) {
  const card = document.createElement('div');
  card.className = 'card';

  const title = document.createElement('h4');
  title.textContent = event.name;
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${event.recurrence} · ${event.timingRule}`;
  card.appendChild(meta);

  if (event.description) {
    const p = document.createElement('p');
    p.textContent = event.description;
    card.appendChild(p);
  }

  if (event.tags?.length) {
    appendChipRow(card, createTagChips(event.tags));
  }

  if (event.mainPractices?.length) {
    const heading = document.createElement('div');
    heading.style.fontSize = '0.75rem';
    heading.textContent = 'Practices:';
    card.appendChild(heading);
    appendChipRow(card, createPracticeChips(event.mainPractices, actions));
  }

  if (event.mainEntities?.length) {
    const heading = document.createElement('div');
    heading.style.fontSize = '0.75rem';
    heading.textContent = 'Entities:';
    card.appendChild(heading);
    appendChipRow(card, createEntityChips(event.mainEntities, actions));
  }

  if (event.readings?.length) {
    const heading = document.createElement('div');
    heading.style.fontSize = '0.75rem';
    heading.textContent = 'Readings:';
    card.appendChild(heading);
    appendChipRow(card, createReadingChips(event.readings, actions));
  }

  if (event.supportingClaims?.length) {
    const heading = document.createElement('div');
    heading.style.fontSize = '0.75rem';
    heading.textContent = 'Supporting claims:';
    card.appendChild(heading);

    const ul = document.createElement('ul');
    event.supportingClaims.forEach(claim => {
      const li = document.createElement('li');
      li.textContent = (claim.category ? `[${claim.category}] ` : '') + claim.text;
      ul.appendChild(li);
    });
    card.appendChild(ul);
  }

  return card;
}

function renderCalendarTab(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('calendar-view');
  const select = document.getElementById('calendar-recurrence-filter');
  if (!wrapper || !select) return;

  clear(wrapper);

  if (!currentMovementId) {
    select.disabled = true;
    wrapper.appendChild(hint('Create or select a movement on the left to explore this section.'));
    return;
  }

  select.disabled = false;

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildCalendarViewModel !== 'function') {
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const recurrenceFilter = select.value ? [select.value] : [];
  const vm = ViewModels.buildCalendarViewModel(snapshot, { movementId: currentMovementId, recurrenceFilter });
  const events = vm?.events || [];

  if (!events.length) {
    wrapper.appendChild(hint('No events in the calendar for this filter.'));
    return;
  }

  const actions = getActions(ctx);
  events.forEach(event => wrapper.appendChild(renderEventCard(event, actions)));
}

export function registerCalendarTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const filter = document.getElementById('calendar-recurrence-filter');
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'calendar') return;
        rerender();
      };

      if (filter) filter.addEventListener('change', rerender);
      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { filter, rerender, unsubscribe };
    },
    render: renderCalendarTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.filter) h.filter.removeEventListener('change', h.rerender);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.calendar = tab;
  if (ctx?.tabs) {
    ctx.tabs.calendar = tab;
  }
  return tab;
}
