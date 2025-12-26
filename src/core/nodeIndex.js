(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function resolveCleanId() {
    if (globalScope?.MovementEngineer?.cleanId) return globalScope.MovementEngineer.cleanId;
    if (typeof module !== 'undefined' && module.exports) {
      return require('./ids/cleanId');
    }
    return value => {
      if (value === undefined || value === null) return null;
      const str = String(value).trim();
      if (!str) return null;
      const match = str.match(/^\[\[([^\]]+)\]\]$/);
      const unwrapped = match ? match[1] : str;
      const trimmed = unwrapped.trim();
      return trimmed || null;
    };
  }

  const cleanId = resolveCleanId();

  function buildNodeIndex(snapshot, model) {
    const byId = new Map();
    const all = [];

    const collections = model?.collections || {};
    Object.entries(collections).forEach(([collectionName, collectionDef]) => {
      const items = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
      const typeName = collectionDef?.typeName || collectionName;
      const titleField = collectionDef?.ui?.titleField || 'id';
      const subtitleField = collectionDef?.ui?.subtitleField || null;

      items.forEach(record => {
        const id = cleanId(record?.id);
        if (!id) return;
        const movementId =
          cleanId(record?.movementId) || (collectionName === 'movements' ? id : null);
        const title =
          record?.[titleField] ??
          record?.name ??
          record?.title ??
          record?.shortText ??
          record?.text ??
          id;
        const subtitle = subtitleField ? record?.[subtitleField] ?? null : null;

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
      get(id) {
        const cleaned = cleanId(id);
        return cleaned ? byId.get(cleaned) : undefined;
      },
      has(id) {
        const cleaned = cleanId(id);
        return cleaned ? byId.has(cleaned) : false;
      }
    };
  }

  const api = { buildNodeIndex };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.NodeIndex = api;
  }
})();
