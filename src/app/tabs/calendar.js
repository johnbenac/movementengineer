import { createTab } from './tabKit.js';
import {
  HINT_TEXT,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../ui/hints.js';
import { appendChipRow, appendInlineLabel } from '../ui/chips.js';

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function getActions(ctx) {
  return ctx.actions;
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
  setDisabled([select], false);

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [wrapper],
      controls: [select],
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  )
    return;

  if (
    guardMissingViewModels({
      ok: ViewModels && typeof ViewModels.buildCalendarViewModel === 'function',
      wrappers: [wrapper],
      controls: [select],
      dom: ctx.dom
    })
  )
    return;

  const val = select.value;
  const recurrenceFilter = val ? [val] : [];

  const vm = ViewModels.buildCalendarViewModel(snapshot, {
    movementId: currentMovementId,
    recurrenceFilter
  });

  if (!vm?.events?.length) {
    renderHint(wrapper, 'No events in the calendar for this filter.');
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

    if (e.mainPractices?.length) {
      appendInlineLabel(card, 'Practices:');
      appendChipRow(card, e.mainPractices, {
        getLabel: p => p.name || p.id,
        getTarget: p => ({ kind: 'item', collection: 'practices', id: p.id }),
        onClick: p => actions.jumpToPractice?.(p.id)
      });
    }

    if (e.mainEntities?.length) {
      appendInlineLabel(card, 'Entities:');
      appendChipRow(card, e.mainEntities, {
        variant: 'entity',
        getLabel: ent => ent.name || ent.id,
        getTarget: ent => ({ kind: 'item', collection: 'entities', id: ent.id }),
        onClick: ent => actions.jumpToEntity?.(ent.id)
      });
    }

    if (e.readings?.length) {
      appendInlineLabel(card, 'Readings:');
      appendChipRow(card, e.readings, {
        getLabel: t => t.title || t.id,
        getTarget: t => ({ kind: 'item', collection: 'texts', id: t.id }),
        onClick: t => actions.jumpToText?.(t.id)
      });
    }

    if (e.tags?.length) {
      appendChipRow(card, e.tags, {
        variant: 'tag',
        getTarget: val => ({ kind: 'facet', facet: 'tag', value: val }),
        onClick: val => actions.openFacet?.('tag', val)
      });
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
      if (select) {
        bucket.on(select, 'change', rerender);
      }
    }
  });
}
