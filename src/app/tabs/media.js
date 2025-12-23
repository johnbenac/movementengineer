import {
  HINT_TEXT,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../ui/hints.js';
import { appendChipRow, appendInlineLabel } from '../ui/chips.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function getState(ctx) {
  return ctx.store.getState() || {};
}

function renderMediaCards(wrapper, items, clear) {
  clear(wrapper);

  if (!items || items.length === 0) {
    renderHint(wrapper, 'No media match this filter.');
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
      appendChipRow(card, m.tags, {
        variant: 'tag',
        getTarget: val => ({ kind: 'facet', facet: 'tag', value: val }),
        onClick: val => ctx.actions.openFacet?.('tag', val)
      });
    }

    if (m.entities && m.entities.length) {
      appendInlineLabel(card, 'Entities:');
      appendChipRow(card, m.entities, {
        variant: 'entity',
        getLabel: e => e.name || e.id,
        getTarget: e => ({ kind: 'item', collection: 'entities', id: e.id }),
        onClick: e => ctx.actions.jumpToEntity?.(e.id)
      });
    }

    if (m.practices && m.practices.length) {
      appendInlineLabel(card, 'Practices:');
      appendChipRow(card, m.practices, {
        getLabel: p => p.name || p.id,
        getTarget: p => ({ kind: 'item', collection: 'practices', id: p.id }),
        onClick: p => ctx.actions.jumpToPractice?.(p.id)
      });
    }

    if (m.events && m.events.length) {
      appendInlineLabel(card, 'Events:');
      appendChipRow(card, m.events, {
        getLabel: e => e.name || e.id,
        getTarget: e => ({ kind: 'item', collection: 'events', id: e.id }),
        onClick: e => ctx.actions.jumpToReferencedItem?.('events', e.id)
      });
    }

    if (m.texts && m.texts.length) {
      appendInlineLabel(card, 'Texts:');
      appendChipRow(card, m.texts, {
        getLabel: t => t.title || t.id,
        getTarget: t => ({ kind: 'item', collection: 'texts', id: t.id }),
        onClick: t => ctx.actions.jumpToText?.(t.id)
      });
    }

    wrapper.appendChild(card);
  });
}

function renderMediaTab(ctx) {
  const { clearElement: clear, ensureSelectOptions } = ctx.dom;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const wrapper = document.getElementById('media-gallery');
  const entitySelect = document.getElementById('media-entity-filter');
  const practiceSelect = document.getElementById('media-practice-filter');
  const eventSelect = document.getElementById('media-event-filter');
  const textSelect = document.getElementById('media-text-filter');
  if (!wrapper || !entitySelect || !practiceSelect || !eventSelect || !textSelect) return;

  const allFilters = [entitySelect, practiceSelect, eventSelect, textSelect];
  setDisabled(allFilters, false);

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [wrapper],
      controls: allFilters,
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  ) {
    allFilters.forEach(f => {
      f.value = '';
    });
    ensureSelectOptions(entitySelect, [], 'Any');
    ensureSelectOptions(practiceSelect, [], 'Any');
    ensureSelectOptions(eventSelect, [], 'Any');
    ensureSelectOptions(textSelect, [], 'Any');
    return;
  }

  setDisabled(allFilters, false);

  const ViewModels = ctx.services.ViewModels;
  clear(wrapper);
  if (
    guardMissingViewModels({
      ok: ViewModels && typeof ViewModels.buildMediaGalleryViewModel === 'function',
      wrappers: [wrapper],
      controls: allFilters,
      dom: ctx.dom
    })
  )
    return;

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

  renderMediaCards(wrapper, vm?.items || [], clear);
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
