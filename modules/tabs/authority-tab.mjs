// modules/tabs/authority-tab.mjs
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
  if (ctx?.legacy?.getState) return ctx.legacy.getState();
  return {};
}

function getSnapshotFromState(state, ctx) {
  if (state?.snapshot) return state.snapshot;
  if (ctx?.legacy?.snapshot) return ctx.legacy.snapshot;
  if (typeof ctx?.legacy?.getState === 'function') return ctx.legacy.getState()?.snapshot;
  return {};
}

function getMovementIdFromState(state, ctx) {
  if (state && 'currentMovementId' in state) return state.currentMovementId;
  if (ctx?.legacy && 'currentMovementId' in ctx.legacy) return ctx.legacy.currentMovementId;
  if (typeof ctx?.legacy?.getState === 'function') {
    const legacyState = ctx.legacy.getState();
    if (legacyState && 'currentMovementId' in legacyState) return legacyState.currentMovementId;
  }
  return null;
}

function getViewModels(ctx) {
  return ctx?.ViewModels || ctx?.services?.ViewModels || window.ViewModels;
}

ME.tabs.authority = {
  render(ctx) {
    const state = getState(ctx);
    const snapshot = getSnapshotFromState(state, ctx);
    const currentMovementId = getMovementIdFromState(state, ctx);

    const srcWrapper = document.getElementById('authority-sources');
    const entWrapper = document.getElementById('authority-entities');
    if (!srcWrapper || !entWrapper) return;

    clear(srcWrapper);
    clear(entWrapper);

    if (!currentMovementId) {
      srcWrapper.appendChild(
        hint('Create or select a movement on the left to explore this section.')
      );
      entWrapper.appendChild(
        hint('Create or select a movement on the left to explore this section.')
      );
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

    // Sources of truth
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

    // Authority entities
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
};
