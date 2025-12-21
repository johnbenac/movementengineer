const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

function fallbackClear(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
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

function createHint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function renderAuthorityTab(ctx) {
  const clear = getClear(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const currentMovementId = state.currentMovementId;

  const srcWrapper = document.getElementById('authority-sources');
  const entWrapper = document.getElementById('authority-entities');
  if (!srcWrapper || !entWrapper) return;

  clear(srcWrapper);
  clear(entWrapper);

  if (!currentMovementId) {
    const message = createHint('Create or select a movement on the left to explore this section.');
    srcWrapper.appendChild(message.cloneNode(true));
    entWrapper.appendChild(message.cloneNode(true));
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildAuthorityViewModel !== 'function') {
    srcWrapper.appendChild(createHint('ViewModels module not loaded.'));
    return;
  }

  const vm = ViewModels.buildAuthorityViewModel(snapshot, {
    movementId: currentMovementId
  });

  if (!vm.sourcesByLabel || vm.sourcesByLabel.length === 0) {
    srcWrapper.appendChild(createHint('No sources of truth recorded yet.'));
  } else {
    vm.sourcesByLabel.forEach(source => {
      const card = document.createElement('div');
      card.className = 'card';

      const heading = document.createElement('h4');
      heading.textContent = source.label;
      card.appendChild(heading);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = [
        `Claims: ${source.usedByClaims.length}`,
        `Rules: ${source.usedByRules.length}`,
        `Practices: ${source.usedByPractices.length}`,
        `Entities: ${source.usedByEntities.length}`
      ].join(' · ');
      card.appendChild(meta);

      srcWrapper.appendChild(card);
    });
  }

  if (!vm.authorityEntities || vm.authorityEntities.length === 0) {
    entWrapper.appendChild(createHint('No authority entities recorded yet.'));
  } else {
    vm.authorityEntities.forEach(entity => {
      const card = document.createElement('div');
      card.className = 'card';

      const heading = document.createElement('h4');
      heading.textContent = entity.name + (entity.kind ? ` (${entity.kind})` : '');
      card.appendChild(heading);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = [
        `Claims: ${entity.usedAsSourceIn.claims.length}`,
        `Rules: ${entity.usedAsSourceIn.rules.length}`,
        `Practices: ${entity.usedAsSourceIn.practices.length}`,
        `Entities: ${entity.usedAsSourceIn.entities.length}`
      ].join(' · ');
      card.appendChild(meta);

      entWrapper.appendChild(card);
    });
  }
}

export function registerAuthorityTab(ctx) {
  const tab = {
    __handlers: null,
    mount(context) {
      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'authority') return;
        rerender();
      };

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;
      this.__handlers = { rerender, unsubscribe };
    },
    render(context) {
      renderAuthorityTab(context);
    },
    unmount() {
      const h = this.__handlers;
      if (typeof h?.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
    }
  };

  movementEngineerGlobal.tabs.authority = tab;
  if (ctx?.tabs) {
    ctx.tabs.authority = tab;
  }

  return tab;
}
