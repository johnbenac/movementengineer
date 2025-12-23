import {
  HINT_TEXT,
  guardMissingViewModels,
  guardNoMovement,
  renderHint,
  setDisabled
} from '../ui/hints.js';
import { appendSection } from '../ui/sections.js';
import { appendChipRow } from '../ui/chips.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function getActions(ctx) {
  return ctx.actions;
}

function renderPracticesTab(ctx) {
  const { clearElement: clear, ensureSelectOptions } = ctx.dom;
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const select = document.getElementById('practice-select');
  const detailContainer = document.getElementById('practice-detail');
  if (!select || !detailContainer) return;
  clear(detailContainer);

  const controls = [select];

  if (
    guardNoMovement({
      movementId: currentMovementId,
      wrappers: [detailContainer],
      controls,
      dom: ctx.dom,
      message: HINT_TEXT.MOVEMENT_REQUIRED
    })
  ) {
    ensureSelectOptions(select, [], 'Choose practice');
    select.value = '';
    return;
  }

  setDisabled(controls, false);

  const practices = (snapshot?.practices || []).filter(
    p => p.movementId === currentMovementId
  );
  const options = practices
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(p => ({ value: p.id, label: p.name || p.id }));
  ensureSelectOptions(select, options, 'Choose practice');

  let practiceId = select.value || null;
  const hasValidSelection = options.some(opt => opt.value === practiceId);
  if (!hasValidSelection) {
    practiceId = options.length ? options[0].value : null;
    select.value = practiceId || '';
  }

  if (!practiceId) {
    renderHint(detailContainer, 'No practices found for this movement.');
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (
    guardMissingViewModels({
      ok: ViewModels && typeof ViewModels.buildPracticeDetailViewModel === 'function',
      wrappers: [detailContainer],
      controls,
      dom: ctx.dom
    })
  )
    return;

  const vm = ViewModels.buildPracticeDetailViewModel(snapshot, {
    practiceId
  });

  if (!vm?.practice) {
    renderHint(detailContainer, 'Practice not found.');
    return;
  }

  const actions = getActions(ctx);

  const title = document.createElement('h3');
  title.textContent =
    vm.practice.name + (vm.practice.kind ? ` (${vm.practice.kind})` : '');
  detailContainer.appendChild(title);

  const meta = document.createElement('p');
  meta.style.fontSize = '0.8rem';
  const frequencyLabel = vm.practice.frequency || '—';
  const publicLabel = vm.practice.isPublic ? 'yes' : 'no';
  meta.textContent = `Frequency: ${frequencyLabel} · Public: ${publicLabel}`;
  detailContainer.appendChild(meta);

  if (vm.practice.description) {
    const desc = document.createElement('p');
    desc.textContent = vm.practice.description;
    detailContainer.appendChild(desc);
  }

  if (vm.entities && vm.entities.length) {
    appendSection(detailContainer, 'Involves entities', section => {
      appendChipRow(section, vm.entities, {
        variant: 'entity',
        getLabel: e => e.name || e.id,
        getTitle: e => e.kind || '',
        getTarget: e => ({ kind: 'item', collection: 'entities', id: e.id }),
        onClick: e => actions.jumpToEntity?.(e.id)
      });
    });
  }

  if (vm.instructionsTexts && vm.instructionsTexts.length) {
    appendSection(detailContainer, 'Instruction texts', section => {
      appendChipRow(section, vm.instructionsTexts, {
        getLabel: t => t.title || t.id,
        getTitle: t => (Number.isFinite(t.depth) ? `Depth ${t.depth}` : ''),
        getTarget: t => ({ kind: 'item', collection: 'texts', id: t.id }),
        onClick: t => actions.jumpToText?.(t.id)
      });
    });
  }

  if (vm.supportingClaims && vm.supportingClaims.length) {
    appendSection(detailContainer, 'Supporting claims', section => {
      const ul = document.createElement('ul');
      vm.supportingClaims.forEach(c => {
        const li = document.createElement('li');
        li.textContent = (c.category ? '[' + c.category + '] ' : '') + c.text;
        ul.appendChild(li);
      });
      section.appendChild(ul);
    });
  }

  if (vm.attachedRules && vm.attachedRules.length) {
    appendSection(detailContainer, 'Related rules', section => {
      const ul = document.createElement('ul');
      vm.attachedRules.forEach(r => {
        const li = document.createElement('li');
        li.textContent = (r.kind ? '[' + r.kind + '] ' : '') + r.shortText;
        ul.appendChild(li);
      });
      section.appendChild(ul);
    });
  }

  if (vm.attachedEvents && vm.attachedEvents.length) {
    appendSection(detailContainer, 'Scheduled in events', section => {
      appendChipRow(section, vm.attachedEvents, {
        getLabel: ev => `${ev.name} (${ev.recurrence})`,
        getTarget: ev => ({ kind: 'item', collection: 'events', id: ev.id }),
        onClick: ev => actions.jumpToReferencedItem?.('events', ev.id)
      });
    });
  }

  if (vm.media && vm.media.length) {
    appendSection(detailContainer, 'Media', section => {
      const ul = document.createElement('ul');
      vm.media.forEach(m => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = m.uri;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `${m.title} (${m.kind})`;
        li.appendChild(a);
        ul.appendChild(li);
      });
      section.appendChild(ul);
    });
  }
}

export function registerPracticesTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const select = document.getElementById('practice-select');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'practices') return;
        rerender();
      };

      if (select) select.addEventListener('change', rerender);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = { select, rerender, unsubscribe };
    },
    render: renderPracticesTab,
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.select) h.select.removeEventListener('change', h.rerender);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.practices = tab;
  if (ctx?.tabs) {
    ctx.tabs.practices = tab;
  }
  return tab;
}
