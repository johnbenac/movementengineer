export const HINT_TEXT = {
  MOVEMENT_REQUIRED: 'Create or select a movement on the left to explore this section.',
  VIEWMODELS_MISSING: 'ViewModels module not loaded.'
};

export function createHint(text, { tag = 'p', className = 'hint', extraClasses = [] } = {}) {
  const el = document.createElement(tag);
  const classes = [className, ...extraClasses].filter(Boolean).join(' ');
  if (classes) el.className = classes;
  el.textContent = text || '';
  return el;
}

export function renderHint(target, text, { clear = false, dom = null, ...opts } = {}) {
  if (!target) return null;
  if (clear) {
    if (dom?.clearElement) dom.clearElement(target);
    else target.innerHTML = '';
  }
  const el = createHint(text, opts);
  target.appendChild(el);
  return el;
}

export function renderHintMany(targets, text, options) {
  (targets || []).filter(Boolean).forEach(t => renderHint(t, text, options));
}

export function setDisabled(elements, disabled) {
  (elements || []).forEach(el => {
    if (el) el.disabled = !!disabled;
  });
}

export function guardNoMovement({
  movementId,
  wrappers = [],
  controls = [],
  dom = null,
  message = HINT_TEXT.MOVEMENT_REQUIRED
} = {}) {
  if (movementId) return false;
  setDisabled(controls, true);
  renderHintMany(wrappers, message, { clear: true, dom });
  return true;
}

export function guardMissingViewModels({
  ok,
  wrappers = [],
  controls = [],
  dom = null,
  message = HINT_TEXT.VIEWMODELS_MISSING
} = {}) {
  if (ok) return false;
  setDisabled(controls, true);
  renderHintMany(wrappers, message, { clear: false, dom });
  return true;
}
