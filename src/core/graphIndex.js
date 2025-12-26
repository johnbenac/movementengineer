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

  function getModelRegistry() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./modelRegistry');
    }
    return globalScope?.ModelRegistry || null;
  }

  const idUtils = getIdUtils();
  const cleanId = idUtils?.cleanId || (value => (value == null ? null : String(value).trim() || null));

  function extractIds(value) {
    if (Array.isArray(value)) {
      return value.map(cleanId).filter(Boolean);
    }
    const one = cleanId(value);
    return one ? [one] : [];
  }

  function buildGraphIndex(snapshot, model, nodeIndex, registry = getModelRegistry()) {
    const outEdgesById = new Map();
    const inEdgesById = new Map();

    const addEdge = (fromId, toId, meta) => {
      if (!fromId || !toId) return;
      if (!outEdgesById.has(fromId)) outEdgesById.set(fromId, []);
      if (!inEdgesById.has(toId)) inEdgesById.set(toId, []);
      outEdgesById.get(fromId).push({ toId, ...meta });
      inEdgesById.get(toId).push({ fromId, ...meta });
    };

    const collections = model?.collections || {};
    Object.entries(collections).forEach(([collectionName, collectionDef]) => {
      const records = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
      const refFields = registry?.listRefFieldPaths
        ? registry.listRefFieldPaths(collectionDef)
        : [];

      records.forEach(record => {
        const fromId = cleanId(record?.id);
        if (!fromId) return;
        const fromNode = nodeIndex?.get?.(fromId) || null;
        const fromMovementId = fromNode?.movementId || cleanId(record?.movementId);

        refFields.forEach(({ path, def }) => {
          const ids = extractIds(record?.[path]);
          if (!ids.length) return;
          const target = def?.ref || def?.items?.ref || null;
          ids.forEach(toId => {
            const toNode = nodeIndex?.get?.(toId) || null;
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

  const api = { buildGraphIndex };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.GraphIndex = api;
  }
})();
