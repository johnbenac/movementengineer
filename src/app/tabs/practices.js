const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function fallbackEnsureSelectOptions(selectEl, options = [], includeEmptyLabel) {
  if (!selectEl) return;
  const previous = selectEl.value;
  fallbackClear(selectEl);
  if (includeEmptyLabel) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = includeEmptyLabel;
    selectEl.appendChild(opt);
  }
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    selectEl.appendChild(opt);
  });
  if (previous && options.some(option => option.value === previous)) {
    selectEl.value = previous;
  }
}

function getClear(ctx) {
  return ctx?.dom?.clearElement || fallbackClear;
}

function getEnsureSelectOptions(ctx) {
  return ctx?.dom?.ensureSelectOptions || fallbackEnsureSelectOptions;
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
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

function mkSection(container, label, contentBuilder) {
  const heading = document.createElement('div');
  heading.className = 'section-heading small';
  heading.textContent = label;
  container.appendChild(heading);
  const section = document.createElement('div');
  section.style.fontSize = '0.8rem';
  contentBuilder(section);
  container.appendChild(section);
}

function renderPracticesTab(ctx) {
  const clear = getClear(ctx);
  const ensureSelectOptions = getEnsureSelectOptions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const select = document.getElementById('practice-select');
  const detailContainer = document.getElementById('practice-detail');
  if (!select || !detailContainer) return;
  clear(detailContainer);

  if (!currentMovementId) {
    select.disabled = true;
    ensureSelectOptions(select, [], 'Choose practice');
    detailContainer.appendChild(
      hint('Create or select a movement on the left to explore this section.')
    );
    return;
  }

  select.disabled = false;

  const practices = (snapshot?.practices || []).filter(
    p => p.movementId === currentMovementId
  );
  const options = practices
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(p => ({ value: p.id, label: p.name || p.id }));
  ensureSelectOptions(select, options, 'Choose practice');

  const practiceId = select.value || (options.length ? options[0].value : null);
  if (practiceId) select.value = practiceId;

  if (!practiceId) {
    detailContainer.appendChild(hint('No practices found for this movement.'));
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildPracticeDetailViewModel !== 'function') {
    detailContainer.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const vm = ViewModels.buildPracticeDetailViewModel(snapshot, {
    practiceId
  });

  if (!vm?.practice) {
    detailContainer.appendChild(hint('Practice not found.'));
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
    mkSection(detailContainer, 'Involves entities', section => {
      const row = document.createElement('div');
      row.className = 'chip-row';
      vm.entities.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip chip-entity clickable';
        chip.textContent = e.name || e.id;
        chip.title = e.kind || '';
        chip.addEventListener('click', () => actions.jumpToEntity?.(e.id));
        row.appendChild(chip);
      });
      section.appendChild(row);
    });
  }

  if (vm.instructionsTexts && vm.instructionsTexts.length) {
    mkSection(detailContainer, 'Instruction texts', section => {
      const row = document.createElement('div');
      row.className = 'chip-row';
      vm.instructionsTexts.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip clickable';
        chip.textContent = t.title || t.id;
        chip.title = Number.isFinite(t.depth) ? `Depth ${t.depth}` : '';
        chip.addEventListener('click', () => actions.jumpToText?.(t.id));
        row.appendChild(chip);
      });
      section.appendChild(row);
    });
  }

  if (vm.supportingClaims && vm.supportingClaims.length) {
    mkSection(detailContainer, 'Supporting claims', section => {
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
    mkSection(detailContainer, 'Related rules', section => {
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
    mkSection(detailContainer, 'Scheduled in events', section => {
      const row = document.createElement('div');
      row.className = 'chip-row';
      vm.attachedEvents.forEach(ev => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = `${ev.name} (${ev.recurrence})`;
        row.appendChild(chip);
      });
      section.appendChild(row);
    });
  }

  if (vm.media && vm.media.length) {
    mkSection(detailContainer, 'Media', section => {
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
