// src/app/ui/chips.js
import { createDomUtils } from './dom.js';

const chipDom = createDomUtils();

export const {
  createChip,
  createChipRow,
  appendChipRow,
  readChipTargetFromEl,
  assertNoBareChips
} = chipDom;

export function appendInlineLabel(container, text, opts = {}) {
  const { fontSize = '0.75rem', className = '' } = opts;
  const el = document.createElement('div');
  if (className) el.className = className;
  el.style.fontSize = fontSize;
  el.textContent = text;
  container.appendChild(el);
  return el;
}
