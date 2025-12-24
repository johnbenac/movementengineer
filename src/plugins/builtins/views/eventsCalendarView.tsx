import { createDomUtils } from '../../../app/ui/dom.js';
import { appendInlineLabel } from '../../../app/ui/chips.js';

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

function resolveMovementId() {
  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  return globalScope?.MovementEngineer?.ctx?.getState?.()?.currentMovementId || null;
}

function resolveRecurrenceOptions(modelRegistry, snapshot) {
  const specVersion = snapshot?.specVersion || modelRegistry?.DEFAULT_SPEC_VERSION || '2.3';
  const model = modelRegistry?.getModel ? modelRegistry.getModel(specVersion) : null;
  const options = model?.enums?.EventRecurrence;
  if (Array.isArray(options) && options.length) return options;
  return ['once', 'daily', 'weekly', 'monthly', 'yearly', 'other'];
}

function renderPlaceholder(message) {
  const placeholder = document.createElement('div');
  placeholder.className = 'generic-crud-empty';
  placeholder.textContent = message;
  return placeholder;
}

export function EventsCalendarView({
  modelRegistry,
  collectionName,
  snapshot,
  selectedId,
  setSelectedId,
  openEditor
}) {
  const wrapper = document.createElement('div');
  const ViewModels = globalThis?.ViewModels;

  if (!ViewModels || typeof ViewModels.buildCalendarViewModel !== 'function') {
    wrapper.appendChild(renderPlaceholder('Calendar view is unavailable.'));
    return wrapper;
  }

  const movementId = resolveMovementId();
  if (!movementId) {
    wrapper.appendChild(renderPlaceholder('Select a movement to view the calendar.'));
    return wrapper;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'generic-crud-view-toolbar';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'generic-crud-view-toolbar-group';

  const filterLabel = document.createElement('label');
  filterLabel.textContent = 'Recurrence:';

  const select = document.createElement('select');
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All';
  select.appendChild(allOption);
  resolveRecurrenceOptions(modelRegistry, snapshot).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });

  filterLabel.appendChild(select);
  leftGroup.appendChild(filterLabel);

  const actions = document.createElement('div');
  actions.className = 'generic-crud-view-toolbar-group';
  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.textContent = 'New event';
  newButton.addEventListener('click', () => openEditor({ mode: 'create' }));
  actions.appendChild(newButton);

  toolbar.appendChild(leftGroup);
  toolbar.appendChild(actions);
  wrapper.appendChild(toolbar);

  const list = document.createElement('div');
  list.className = 'card-grid';
  wrapper.appendChild(list);

  const dom = createDomUtils();

  function renderEvents() {
    list.innerHTML = '';
    const recurrenceFilter = select.value ? [select.value] : [];
    const vm = ViewModels.buildCalendarViewModel(snapshot, {
      movementId,
      recurrenceFilter
    });

    if (!vm?.events?.length) {
      list.appendChild(renderPlaceholder('No events in the calendar for this filter.'));
      return;
    }

    vm.events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'card generic-crud-calendar-card';
      if (event.id && event.id === selectedId) {
        card.classList.add('active');
      }

      const title = document.createElement('h4');
      title.textContent = event.name;
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${event.recurrence || 'once'} · ${event.timingRule || '—'}`;
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
          getLabel: entity => entity.name || entity.id,
          getTarget: entity => ({ kind: 'item', collection: 'entities', id: entity.id })
        });
      }

      if (event.readings?.length) {
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
          li.textContent = (claim.category ? '[' + claim.category + '] ' : '') + claim.text;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      const cardActions = document.createElement('div');
      cardActions.className = 'generic-crud-calendar-card-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', eventClick => {
        eventClick.stopPropagation();
        if (event.id) {
          setSelectedId(event.id);
          openEditor({ mode: 'edit', id: event.id });
        }
      });
      cardActions.appendChild(editButton);
      card.appendChild(cardActions);

      card.addEventListener('click', () => {
        if (event.id) {
          setSelectedId(event.id);
        }
      });

      list.appendChild(card);
    });
  }

  select.addEventListener('change', () => renderEvents());

  renderEvents();

  return wrapper;
}
