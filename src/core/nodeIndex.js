(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function getIdUtils() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./ids/cleanId');
    }
    return globalScope?.IdUtils || null;
  }

  const idUtils = getIdUtils();
  const cleanId = idUtils?.cleanId || (value => (value == null ? null : String(value).trim() || null));

  function buildNodeIndex(snapshot, model) {
    const byId = new Map();
    const all = [];

    const collections = model?.collections || {};
    Object.entries(collections).forEach(([collectionName, collectionDef]) => {
      const items = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
      const typeName = collectionDef?.typeName || collectionName;
      const titleField =
        collectionDef?.ui?.titleField || collectionDef?.display?.titleField || 'id';
      const subtitleField = collectionDef?.ui?.subtitleField || null;

      items.forEach(record => {
        const id = cleanId(record?.id);
        if (!id) return;
        const movementId = cleanId(record?.movementId) || (collectionName === 'movements' ? id : null);
        const title =
          record?.[titleField] ??
          record?.name ??
          record?.title ??
          record?.label ??
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
      get: id => byId.get(cleanId(id) || ''),
      has: id => byId.has(cleanId(id) || '')
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
