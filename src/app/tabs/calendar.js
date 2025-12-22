import { createTab } from './_tabKit.js';

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function getActions(ctx) {
  return ctx.actions;
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function renderCalendarTab(ctx) {
  const clear = ctx.dom.clearElement;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;
  const ViewModels = getViewModels(ctx);
  const actions = getActions(ctx);

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

  if (!ViewModels || typeof ViewModels.buildCalendarViewModel !== 'function') {
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const val = select.value;
  const recurrenceFilter = val ? [val] : [];

  const vm = ViewModels.buildCalendarViewModel(snapshot, {
    movementId: currentMovementId,
    recurrenceFilter
  });

  if (!vm?.events?.length) {
    wrapper.appendChild(hint('No events in the calendar for this filter.'));
    return;
  }

  vm.events.forEach(e => {
    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('h4');
    title.textContent = e.name;
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${e.recurrence} · ${e.timingRule}`;
    card.appendChild(meta);

    if (e.description) {
      const p = document.createElement('p');
      p.textContent = e.description;
      card.appendChild(p);
    }

    if (e.tags?.length) {
      const row = document.createElement('div');
      row.className = 'chip-row';
      e.tags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-tag';
        chip.textContent = tag;
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (e.mainPractices?.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Practices:';
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      e.mainPractices.forEach(p => {
        const chip = document.createElement('span');
        chip.className = 'chip clickable';
        chip.textContent = p.name || p.id;
        chip.addEventListener('click', () => actions.jumpToPractice?.(p.id));
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (e.mainEntities?.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Entities:';
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      e.mainEntities.forEach(ent => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-entity clickable';
        chip.textContent = ent.name || ent.id;
        chip.addEventListener('click', () => actions.jumpToEntity?.(ent.id));
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (e.readings?.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Readings:';
      card.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'chip-row';
      e.readings.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip clickable';
        chip.textContent = t.title || t.id;
        chip.addEventListener('click', () => actions.jumpToText?.(t.id));
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (e.supportingClaims?.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Supporting claims:';
      card.appendChild(heading);

      const ul = document.createElement('ul');
      e.supportingClaims.forEach(c => {
        const li = document.createElement('li');
        li.textContent = (c.category ? '[' + c.category + '] ' : '') + c.text;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    wrapper.appendChild(card);
  });
}

export function registerCalendarTab(ctx) {
  return createTab(ctx, {
    name: 'calendar',
    render: renderCalendarTab,
    setup({ bucket, rerender }) {
      const select = document.getElementById('calendar-recurrence-filter');
      if (select) bucket.on(select, 'change', () => rerender());
    }
  });
}
