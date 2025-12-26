const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

const cleanId =
  globalScope?.cleanId ||
  function cleanId(raw) {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const m = s.match(/^\[\[([^\]]+)\]\]$/);
    const unwrapped = m ? m[1] : s;
    const trimmed = String(unwrapped).trim();
    return trimmed || null;
  };

function extractIds(value) {
  if (Array.isArray(value)) {
    return value.map(cleanId).filter(Boolean);
  }
  const one = cleanId(value);
  return one ? [one] : [];
}

export function buildGraphIndex(snapshot, model, nodeIndex, registry) {
  const outEdgesById = new Map();
  const inEdgesById = new Map();
  const listRefFieldPaths = registry?.listRefFieldPaths;

  const addEdge = (fromId, toId, meta) => {
    if (!fromId || !toId) return;
    if (!outEdgesById.has(fromId)) outEdgesById.set(fromId, []);
    if (!inEdgesById.has(toId)) inEdgesById.set(toId, []);
    outEdgesById.get(fromId).push({ toId, ...meta });
    inEdgesById.get(toId).push({ fromId, ...meta });
  };

  const collections = model?.collections || {};
  Object.entries(collections).forEach(([collectionName, collectionDef]) => {
    const items = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
    const refFields = typeof listRefFieldPaths === 'function'
      ? listRefFieldPaths(collectionDef)
      : [];

    items.forEach(record => {
      const fromId = cleanId(record?.id);
      if (!fromId) return;

      const fromNode = nodeIndex?.get?.(fromId);
      const fromMovementId = fromNode?.movementId || cleanId(record?.movementId) || null;

      refFields.forEach(({ path, def }) => {
        const rawValue = record?.[path];
        const ids = extractIds(rawValue);
        const target = def?.ref || def?.items?.ref || null;

        ids.forEach(toId => {
          const toNode = nodeIndex?.get?.(toId);
          if (!toNode) return;

          if (fromMovementId && toNode.movementId && fromMovementId !== toNode.movementId) {
            return;
          }

          if (target && target !== '*' && toNode.collectionName !== target) {
            return;
          }

          addEdge(fromId, toId, {
            fieldPath: path,
            fromCollection: collectionName,
            toCollection: toNode.collectionName
          });
        });
      });
    });
  });

  return { outEdgesById, inEdgesById };
}
