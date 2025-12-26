(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function getCleanId() {
    if (globalScope?.CleanId?.cleanId) return globalScope.CleanId.cleanId;
    if (typeof module !== 'undefined' && module.exports) {
      try {
        const mod = require('./ids/cleanId');
        if (mod?.cleanId) return mod.cleanId;
      } catch (err) {
        // ignore
      }
    }
    return value => {
      if (value === null || value === undefined) return null;
      const str = String(value).trim();
      if (!str) return null;
      const match = str.match(/^\[\[([^\]]+)\]\]$/);
      return (match ? match[1] : str).trim() || null;
    };
  }

  const cleanId = getCleanId();

  function buildNodeIndex(snapshot, model) {
    const byId = new Map();
    const all = [];
    if (!snapshot || !model?.collections) {
      return {
        byId,
        all,
        get: id => byId.get(cleanId(id) || ''),
        has: id => byId.has(cleanId(id) || '')
      };
    }

    Object.entries(model.collections).forEach(([collectionName, collectionDef]) => {
      const items = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
      const typeName = collectionDef?.typeName || collectionName;
      const titleField = collectionDef?.ui?.titleField || 'id';
      const subtitleField = collectionDef?.ui?.subtitleField || null;

      items.forEach(record => {
        const id = cleanId(record?.id);
        if (!id) return;
        const movementId = cleanId(record?.movementId) || (collectionName === 'movements' ? id : null);
        const title = record?.[titleField] ?? record?.name ?? record?.title ?? id;
        const subtitle = subtitleField ? (record?.[subtitleField] ?? null) : null;

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
