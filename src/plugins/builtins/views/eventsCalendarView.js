import { appendInlineLabel } from '../../../app/ui/chips.js';
import { appendChipRow } from '../../../app/ui/chips.js';
import { getCollectionSnapshotKey } from '../../../ui/genericCrud/genericCrudHelpers.ts';

const RECURRENCE_OPTIONS = ['once', 'daily', 'weekly', 'monthly', 'yearly', 'other'];

function resolveViewModels() {
  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  return globalScope?.ViewModels || null;
}

function resolveMovementId() {
  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  return globalScope?.MovementEngineer?.ctx?.store?.getState?.()?.currentMovementId || null;
}

function getEventSnapshot(snapshot, collectionDef, modelRegistry) {
  const model = modelRegistry?.getModel?.(snapshot?.specVersion) || null;
  const snapshotKey = getCollectionSnapshotKey(collectionDef, model) || collectionDef?.collectionName;
  return {
    snapshotKey,
    events: snapshotKey && Array.isArray(snapshot?.[snapshotKey]) ? snapshot[snapshotKey] : []
  };
}

function renderEmpty(wrapper, message) {
  const empty = document.createElement('div');
  empty.className = 'generic-crud-empty';
  empty.textContent = message;
  wrapper.appendChild(empty);
}

export function EventsCalendarView({
  modelRegistry,
  collectionName,
  collectionDef,
  snapshot,
  setSelectedId,
  openEditor
}) {
  const wrapper = document.createElement('div');
  const toolbar = document.createElement('div');
  toolbar.className = 'subtab-toolbar';

  const label = document.createElement('label');
  label.textContent = 'Recurrence:';
  const select = document.createElement('select');
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All';
  select.appendChild(allOption);
  RECURRENCE_OPTIONS.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
  label.appendChild(select);
  toolbar.appendChild(label);

  const actions = document.createElement('div');
  actions.className = 'toolbar-actions';
  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.textContent = 'New event';
  newButton.addEventListener('click', () => {
    openEditor?.({ mode: 'create' });
  });
  actions.appendChild(newButton);
  toolbar.appendChild(actions);

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  wrapper.appendChild(toolbar);
  wrapper.appendChild(grid);

  function renderCalendar() {
    grid.innerHTML = '';

    const ViewModels = resolveViewModels();
    if (!ViewModels?.buildCalendarViewModel) {
      renderEmpty(grid, 'Calendar view model unavailable.');
      return;
    }

    const movementId = resolveMovementId();
    if (!movementId) {
      renderEmpty(grid, 'Select a movement to view the calendar.');
      return;
    }

    const { events, snapshotKey } = getEventSnapshot(snapshot, collectionDef, modelRegistry);
    const vm = ViewModels.buildCalendarViewModel({
      ...snapshot,
      [snapshotKey || collectionName]: events
    }, {
      movementId,
      recurrenceFilter: select.value ? [select.value] : []
    });

    if (!vm?.events?.length) {
      renderEmpty(grid, 'No events in the calendar for this filter.');
      return;
    }

    vm.events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'card';
      card.addEventListener('click', () => {
        setSelectedId?.(event.id);
      });

      const title = document.createElement('h4');
      title.textContent = event.name;
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${event.recurrence || '—'} · ${event.timingRule || '—'}`;
      card.appendChild(meta);

      if (event.description) {
        const p = document.createElement('p');
        p.textContent = event.description;
        card.appendChild(p);
      }

      if (event.tags?.length) {
        appendChipRow(card, event.tags, {
          variant: 'tag',
          getTarget: tag => ({ kind: 'facet', facet: 'tag', value: tag })
        });
      }

      if (event.mainPractices?.length) {
        appendInlineLabel(card, 'Practices:');
        appendChipRow(card, event.mainPractices, {
          getLabel: practice => practice.name || practice.id,
          getTarget: practice => ({ kind: 'item', collection: 'practices', id: practice.id })
        });
      }

      if (event.mainEntities?.length) {
        appendInlineLabel(card, 'Entities:');
        appendChipRow(card, event.mainEntities, {
          variant: 'entity',
          getLabel: entity => entity.name || entity.id,
          getTarget: entity => ({ kind: 'item', collection: 'entities', id: entity.id })
        });
      }

      if (event.readings?.length) {
        appendInlineLabel(card, 'Readings:');
        appendChipRow(card, event.readings, {
          getLabel: text => text.title || text.id,
          getTarget: text => ({ kind: 'item', collection: 'texts', id: text.id })
        });
      }

      if (event.supportingClaims?.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Supporting claims:';
        card.appendChild(heading);

        const list = document.createElement('ul');
        event.supportingClaims.forEach(claim => {
          const li = document.createElement('li');
          li.textContent = (claim.category ? `[${claim.category}] ` : '') + claim.text;
          list.appendChild(li);
        });
        card.appendChild(list);
      }

      const actionsRow = document.createElement('div');
      actionsRow.className = 'inline-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', eventClick => {
        eventClick.stopPropagation();
        setSelectedId?.(event.id);
        openEditor?.({ mode: 'edit', id: event.id });
      });
      actionsRow.appendChild(editButton);
      card.appendChild(actionsRow);

      grid.appendChild(card);
    });
  }

  select.addEventListener('change', () => renderCalendar());
  renderCalendar();

  return wrapper;
}
