const legacyDom = () => (globalThis.ME && globalThis.ME.dom) || {};

export function $(selector) {
  const dom = legacyDom();
  if (dom.$ && dom.$ !== $) return dom.$(selector);
  return document.querySelector(selector);
}

export function clearElement(el) {
  const dom = legacyDom();
  if (dom.clearElement && dom.clearElement !== clearElement) {
    return dom.clearElement(el);
  }
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export function getActiveTabName() {
  const dom = legacyDom();
  if (dom.getActiveTabName && dom.getActiveTabName !== getActiveTabName) {
    return dom.getActiveTabName();
  }
  const btn = document.querySelector('.tab.active');
  return btn ? btn.dataset.tab : 'dashboard';
}
