import { appendInlineLabel } from '../../../app/ui/chips.js';
import { HINT_TEXT, renderHint } from '../../../app/ui/hints.js';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function resolveCtx() {
  return globalScope?.MovementEngineer?.ctx || null;
}

function resolveViewModels() {
  return globalScope?.ViewModels || globalScope?.MovementEngineer?.ctx?.services?.ViewModels || null;
}

function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

const RECURRENCE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'once', label: 'once' },
  { value: 'daily', label: 'daily' },
  { value: 'weekly', label: 'weekly' },
  { value: 'monthly', label: 'monthly' },
  { value: 'yearly', label: 'yearly' },
  { value: 'other', label: 'other' }
];

export function EventsCalendarView({
  collectionName,
  snapshot,
  selectedId,
  setSelectedId,
  openEditor
}) {
  const wrapper = document.createElement('div');
  const ctx = resolveCtx();
  const dom = ctx?.dom || null;
  const viewModels = resolveViewModels();
  const state = ctx?.store?.getState?.() || {};
  const movementId = state.currentMovementId || null;

  const toolbar = document.createElement('div');
  toolbar.className = 'subtab-toolbar';

  const label = document.createElement('label');
  label.textContent = 'Recurrence:';

  const select = document.createElement('select');
  RECURRENCE_OPTIONS.forEach(option => {
    select.appendChild(createOption(option.value, option.label));
  });

  label.appendChild(select);
  toolbar.appendChild(label);

  const actions = document.createElement('div');
  actions.className = 'toolbar-actions';
  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.textContent = 'New event';
  createButton.addEventListener('click', () => openEditor({ mode: 'create' }));
  actions.appendChild(createButton);
  toolbar.appendChild(actions);

  wrapper.appendChild(toolbar);

  const list = document.createElement('div');
  list.className = 'card-grid';
  wrapper.appendChild(list);

  function renderEvents() {
    list.innerHTML = '';

    if (!movementId) {
      renderHint(list, HINT_TEXT.MOVEMENT_REQUIRED, { clear: true });
      return;
    }

    if (!viewModels?.buildCalendarViewModel) {
      renderHint(list, HINT_TEXT.VIEWMODELS_MISSING, { clear: true });
      return;
    }

    const val = select.value;
    const recurrenceFilter = val ? [val] : [];
    const vm = viewModels.buildCalendarViewModel(snapshot || {}, {
      movementId,
      recurrenceFilter
    });

    if (!vm?.events?.length) {
      renderHint(list, 'No events in the calendar for this filter.', { clear: true });
      return;
    }

    vm.events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'card';
      if (event.id === selectedId) card.classList.add('selected');
      card.addEventListener('click', () => setSelectedId(event.id));

      const title = document.createElement('h4');
      title.textContent = event.name;
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${event.recurrence} · ${event.timingRule}`;
      card.appendChild(meta);

      if (event.description) {
        const desc = document.createElement('p');
        desc.textContent = event.description;
        card.appendChild(desc);
      }

      if (event.tags?.length && dom?.appendChipRow) {
        dom.appendChipRow(card, event.tags, {
          variant: 'tag',
          getTarget: tag => ({ kind: 'facet', facet: 'tag', value: tag })
        });
      }

      if (event.mainPractices?.length && dom?.appendChipRow) {
        appendInlineLabel(card, 'Practices:');
        dom.appendChipRow(card, event.mainPractices, {
          getLabel: practice => practice.name || practice.id,
          getTarget: practice => ({ kind: 'item', collection: 'practices', id: practice.id })
        });
      }

      if (event.mainEntities?.length && dom?.appendChipRow) {
        appendInlineLabel(card, 'Entities:');
        dom.appendChipRow(card, event.mainEntities, {
          variant: 'entity',
          getLabel: entity => entity.name || entity.id,
          getTarget: entity => ({ kind: 'item', collection: 'entities', id: entity.id })
        });
      }

      if (event.readings?.length && dom?.appendChipRow) {
        appendInlineLabel(card, 'Readings:');
        dom.appendChipRow(card, event.readings, {
          getLabel: text => text.title || text.id,
          getTarget: text => ({ kind: 'item', collection: 'texts', id: text.id })
        });
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

      const cardActions = document.createElement('div');
      cardActions.className = 'form-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', eventClick => {
        eventClick.stopPropagation();
        openEditor({ mode: 'edit', id: event.id });
      });
      cardActions.appendChild(editButton);
      card.appendChild(cardActions);

      list.appendChild(card);
    });
  }

  select.addEventListener('change', renderEvents);
  renderEvents();

  return wrapper;
}
