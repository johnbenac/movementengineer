const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.utils = movementEngineerGlobal.utils || {};

export function parseCsvInput(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function normaliseArray(value) {
  return Array.isArray(value) ? value : [];
}

export function uniqueSorted(values) {
  return Array.from(new Set((values || []).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );
}

export function collectDescendants(textId, nodesById, acc = new Set()) {
  const node = nodesById?.[textId];
  if (!node || acc.has(textId)) return acc;
  acc.add(textId);
  (node.childIds || []).forEach(childId => collectDescendants(childId, nodesById, acc));
  return acc;
}

movementEngineerGlobal.utils.values = Object.assign(movementEngineerGlobal.utils.values || {}, {
  parseCsvInput,
  normaliseArray,
  uniqueSorted,
  collectDescendants
});
