const ME = window.MovementEngineer || (window.MovementEngineer = {});
ME.tabs = ME.tabs || {};

function clear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function getState(ctx) {
  if (ctx?.store?.getState) return ctx.store.getState();
  if (typeof ctx?.getState === 'function') return ctx.getState();
  return {};
}

function getViewModels(ctx) {
  return ctx?.ViewModels || ctx?.services?.ViewModels || window.ViewModels;
}

function renderAuthority(ctx) {
  const state = getState(ctx) || {};
  const { snapshot, currentMovementId } = state;

  const srcWrapper = document.getElementById('authority-sources');
  const entWrapper = document.getElementById('authority-entities');
  if (!srcWrapper || !entWrapper) return;

  clear(srcWrapper);
  clear(entWrapper);

  if (!currentMovementId) {
    const message = hint('Create or select a movement on the left to explore this section.');
    srcWrapper.appendChild(message.cloneNode(true));
    entWrapper.appendChild(message);
    return;
  }

  const ViewModels = getViewModels(ctx);
  if (!ViewModels || typeof ViewModels.buildAuthorityViewModel !== 'function') {
    srcWrapper.appendChild(hint('ViewModels module not loaded.'));
    return;
  }

  const vm = ViewModels.buildAuthorityViewModel(snapshot, {
    movementId: currentMovementId
  });

  if (!vm.sourcesByLabel || vm.sourcesByLabel.length === 0) {
    srcWrapper.appendChild(hint('No sources of truth recorded yet.'));
  } else {
    vm.sourcesByLabel.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card';

      const h = document.createElement('h4');
      h.textContent = s.label;
      card.appendChild(h);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = [
        `Claims: ${s.usedByClaims.length}`,
        `Rules: ${s.usedByRules.length}`,
        `Practices: ${s.usedByPractices.length}`,
        `Entities: ${s.usedByEntities.length}`
      ].join(' · ');
      card.appendChild(meta);

      srcWrapper.appendChild(card);
    });
  }

  if (!vm.authorityEntities || vm.authorityEntities.length === 0) {
    entWrapper.appendChild(hint('No authority entities recorded yet.'));
  } else {
    vm.authorityEntities.forEach(e => {
      const card = document.createElement('div');
      card.className = 'card';

      const h = document.createElement('h4');
      h.textContent = e.name + (e.kind ? ` (${e.kind})` : '');
      card.appendChild(h);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = [
        `Claims: ${e.usedAsSourceIn.claims.length}`,
        `Rules: ${e.usedAsSourceIn.rules.length}`,
        `Practices: ${e.usedAsSourceIn.practices.length}`,
        `Entities: ${e.usedAsSourceIn.entities.length}`
      ].join(' · ');
      card.appendChild(meta);

      entWrapper.appendChild(card);
    });
  }
}

ME.tabs.authority = {
  render: renderAuthority
};

if (ME.ctx?.tabs) {
  ME.ctx.tabs.authority = ME.tabs.authority;
}
