import { createTab } from './_tabKit.js';

function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  return p;
}

function renderAuthorityTab(ctx) {
  const { clearElement } = ctx.dom;
  const state = ctx.store.getState() || {};
  const snapshot = state.snapshot || {};
  const { currentMovementId } = state;

  const srcWrapper = document.getElementById('authority-sources');
  const entWrapper = document.getElementById('authority-entities');
  if (!srcWrapper || !entWrapper) return;

  clearElement(srcWrapper);
  clearElement(entWrapper);

  if (!currentMovementId) {
    const message = hint('Create or select a movement on the left to explore this section.');
    srcWrapper.appendChild(message.cloneNode(true));
    entWrapper.appendChild(message.cloneNode(true));
    return;
  }

  const ViewModels = ctx.services.ViewModels;
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

export function registerAuthorityTab(ctx) {
  return createTab(ctx, {
    name: 'authority',
    render: renderAuthorityTab
  });
}
