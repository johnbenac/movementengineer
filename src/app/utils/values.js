export function parseCsvInput(value) {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function normaliseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  if (Number.isFinite(value)) return [value];
  return [];
}

export function uniqueSorted(values) {
  const set = new Set((values || []).filter(Boolean));
  return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
}

export function collectDescendants(textId, nodesById, acc = new Set()) {
  const node = nodesById[textId];
  if (!node || acc.has(textId)) return acc;
  acc.add(textId);
  (node.childIds || []).forEach(childId => collectDescendants(childId, nodesById, acc));
  return acc;
}
