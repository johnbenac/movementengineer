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

function resolveTitle(record, collectionDef, id) {
  const titleField = collectionDef?.ui?.titleField || collectionDef?.display?.titleField || null;
  if (titleField && record?.[titleField]) return record[titleField];
  return record?.name || record?.title || record?.label || id;
}

function resolveSubtitle(record, collectionDef) {
  const subtitleField =
    collectionDef?.ui?.subtitleField || collectionDef?.display?.subtitleField || null;
  if (!subtitleField) return null;
  return record?.[subtitleField] ?? null;
}

export function buildNodeIndex(snapshot, model) {
  const byId = new Map();
  const all = [];

  const collections = model?.collections || {};
  Object.entries(collections).forEach(([collectionName, collectionDef]) => {
    const items = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
    const typeName = collectionDef?.typeName || collectionName;

    items.forEach(record => {
      const id = cleanId(record?.id);
      if (!id) return;
      const movementId =
        cleanId(record?.movementId) ||
        (collectionName === 'movements' ? id : null);
      const title = resolveTitle(record, collectionDef, id);
      const subtitle = resolveSubtitle(record, collectionDef);
      const node = {
        id,
        collectionName,
        typeName,
        movementId,
        title,
        subtitle,
        record
      };
      byId.set(id, node);
      all.push(node);
    });
  });

  return {
    byId,
    all,
    get: id => byId.get(cleanId(id) || ''),
    has: id => byId.has(cleanId(id) || '')
  };
}
