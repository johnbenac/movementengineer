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

function createChipRow(items, className, onClick) {
  const row = document.createElement('div');
  row.className = 'chip-row';
  items.forEach(item => {
    const chip = document.createElement('span');
    chip.className = className;
    const label =
      typeof item === 'string' ? item : item.name || item.title || item.id;
    chip.textContent = label;
    if (typeof onClick === 'function') {
      chip.addEventListener('click', () => onClick(item));
    }
    row.appendChild(chip);
  });
  return row;
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
    wrapper.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    return;
  }

  select.disabled = false;

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildCalendarViewModel !== 'function') {
    wrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const recurrenceFilter = select.value ? [select.value] : [];
  const vm = ViewModels.buildCalendarViewModel(snapshot, {
    movementId: currentMovementId,
    recurrenceFilter
  });

  if (!vm?.events || vm.events.length === 0) {
    wrapper.appendChild(hint('No events in the calendar for this filter.'));
    return;
  }

  const actions = getActions(ctx);

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

    if (e.tags && e.tags.length) {
      card.appendChild(createChipRow(e.tags, 'chip chip-tag'));
    }

    if (e.mainPractices && e.mainPractices.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Practices:';
      card.appendChild(heading);

      card.appendChild(
        createChipRow(
          e.mainPractices,
          'chip clickable',
          practice => actions.jumpToPractice?.(practice.id)
        )
      );
    }

    if (e.mainEntities && e.mainEntities.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Entities:';
      card.appendChild(heading);

      card.appendChild(
        createChipRow(
          e.mainEntities,
          'chip chip-entity clickable',
          entity => actions.jumpToEntity?.(entity.id)
        )
      );
    }

    if (e.readings && e.readings.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Readings:';
      card.appendChild(heading);

      card.appendChild(
        createChipRow(
          e.readings,
          'chip clickable',
          text => actions.jumpToText?.(text.id)
        )
      );
    }

    if (e.supportingClaims && e.supportingClaims.length) {
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
  const tab = {
    __handlers: null,
    mount(context) {
      const select = document.getElementById('calendar-recurrence-filter');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'calendar') return;
        rerender();
      };

      if (select) select.addEventListener('change', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { select, rerender, unsubscribe };
    },
    render: renderCalendarTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.select) h.select.removeEventListener('change', h.rerender);
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
