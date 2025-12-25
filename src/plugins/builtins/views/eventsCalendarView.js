import { appendInlineLabel } from '../../../app/ui/chips.js';
import {
  HINT_TEXT,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../../../app/ui/hints.js';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getCtx() {
  return globalScope?.MovementEngineer?.ctx || null;
}

function buildRecurrenceSelect() {
  const select = document.createElement('select');
  const options = [''].concat(['once', 'daily', 'weekly', 'monthly', 'yearly', 'other']);
  options.forEach(value => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value ? value : 'All';
    select.appendChild(opt);
  });
  return select;
}

function renderEventCards({
  wrapper,
  dom,
  events,
  onSelect,
  onEdit
}) {
  wrapper.innerHTML = '';

  if (!events?.length) {
    renderHint(wrapper, 'No events in the calendar for this filter.');
    return;
  }

  events.forEach(event => {
    const card = document.createElement('div');
    card.className = 'card';
    card.addEventListener('click', e => {
      if (e.target?.closest?.('button')) return;
      onSelect?.(event.id);
    });

    const header = document.createElement('div');
    header.className = 'generic-crud-detail-header';

    const title = document.createElement('h4');
    title.textContent = event.name;
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', e => {
      e.stopPropagation();
      onSelect?.(event.id);
      onEdit?.(event.id);
    });
    actions.appendChild(editButton);
    header.appendChild(actions);
    card.appendChild(header);

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
      dom.appendChipRow(card, event.tags, {
        variant: 'tag',
        getTarget: tag => ({ kind: 'facet', facet: 'tag', value: tag })
      });
    }

    if (event.mainPractices?.length) {
      appendInlineLabel(card, 'Practices:');
      dom.appendChipRow(card, event.mainPractices, {
        getLabel: practice => practice.name || practice.id,
        getTarget: practice => ({ kind: 'item', collection: 'practices', id: practice.id })
      });
    }

    if (event.mainEntities?.length) {
      appendInlineLabel(card, 'Entities:');
      dom.appendChipRow(card, event.mainEntities, {
        variant: 'entity',
        getLabel: ent => ent.name || ent.id,
        getTarget: ent => ({ kind: 'item', collection: 'entities', id: ent.id })
      });
    }

    if (event.readings?.length) {
      appendInlineLabel(card, 'Readings:');
      dom.appendChipRow(card, event.readings, {
        getLabel: t => t.title || t.id,
        getTarget: t => ({ kind: 'item', collection: 'texts', id: t.id })
      });
    }

    if (event.supportingClaims?.length) {
      const heading = document.createElement('div');
      heading.style.fontSize = '0.75rem';
      heading.textContent = 'Supporting claims:';
      card.appendChild(heading);

      const ul = document.createElement('ul');
      event.supportingClaims.forEach(c => {
        const li = document.createElement('li');
        li.textContent = (c.category ? `[${c.category}] ` : '') + c.text;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    wrapper.appendChild(card);
  });
}

export function EventsCalendarView({ snapshot, collectionName, setSelectedId, openEditor }) {
  const ctx = getCtx();
  const dom = ctx?.dom;
  const viewModels = ctx?.services?.ViewModels;
  const currentMovementId = ctx?.store?.getState?.()?.currentMovementId || null;

  const wrapper = document.createElement('div');
  const toolbar = document.createElement('div');
  toolbar.className = 'subtab-toolbar';

  const label = document.createElement('label');
  label.textContent = 'Recurrence:';

  const select = buildRecurrenceSelect();
  label.appendChild(select);
  toolbar.appendChild(label);

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.textContent = 'New event';
  createButton.addEventListener('click', () => openEditor?.({ mode: 'create' }));
  toolbar.appendChild(createButton);

  const cards = document.createElement('div');
  cards.className = 'card-grid';

  wrapper.appendChild(toolbar);
  wrapper.appendChild(cards);

  function renderCalendar() {
    dom?.clearElement?.(cards);
    setDisabled([select, createButton], false);

    if (
      guardNoMovement({
        movementId: currentMovementId,
        wrappers: [cards],
        controls: [select, createButton],
        dom,
        message: HINT_TEXT.MOVEMENT_REQUIRED
      })
    )
      return;

    if (
      guardMissingViewModels({
        ok: viewModels && typeof viewModels.buildCalendarViewModel === 'function',
        wrappers: [cards],
        controls: [select, createButton],
        dom
      })
    )
      return;

    const val = select.value;
    const recurrenceFilter = val ? [val] : [];

    const vm = viewModels.buildCalendarViewModel(snapshot, {
      movementId: currentMovementId,
      recurrenceFilter
    });

    renderEventCards({
      wrapper: cards,
      dom,
      events: vm?.events || [],
      onSelect: id => setSelectedId?.(id),
      onEdit: id => openEditor?.({ mode: 'edit', id })
    });
  }

  select.addEventListener('change', () => renderCalendar());

  renderCalendar();
  return wrapper;
}
