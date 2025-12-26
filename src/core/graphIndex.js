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

  function getModelRegistry() {
    if (globalScope?.ModelRegistry) return globalScope.ModelRegistry;
    if (typeof module !== 'undefined' && module.exports) {
      try {
        return require('./modelRegistry');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  const cleanId = getCleanId();

  function extractIds(value) {
    if (Array.isArray(value)) {
      return value.map(cleanId).filter(Boolean);
    }
    const single = cleanId(value);
    return single ? [single] : [];
  }

  function buildGraphIndex(snapshot, model, nodeIndex) {
    const outEdgesById = new Map();
    const inEdgesById = new Map();
    if (!snapshot || !model?.collections || !nodeIndex) {
      return { outEdgesById, inEdgesById };
    }

    const registry = getModelRegistry();
    const listRefFieldPaths = registry?.listRefFieldPaths;
    const resolveCollectionName = registry?.resolveCollectionName;

    function addEdge(fromId, toId, meta) {
      if (!fromId || !toId) return;
      if (!outEdgesById.has(fromId)) outEdgesById.set(fromId, []);
      if (!inEdgesById.has(toId)) inEdgesById.set(toId, []);
      outEdgesById.get(fromId).push({ toId, ...meta });
      inEdgesById.get(toId).push({ fromId, ...meta });
    }

    Object.entries(model.collections).forEach(([collectionName, collectionDef]) => {
      const records = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
      const refFields = typeof listRefFieldPaths === 'function'
        ? listRefFieldPaths(collectionDef)
        : [];

      records.forEach(record => {
        const fromId = cleanId(record?.id);
        if (!fromId) return;
        const fromNode = nodeIndex.get(fromId);
        const fromMovementId = fromNode?.movementId || cleanId(record?.movementId);

        refFields.forEach(({ path, def }) => {
          const ids = extractIds(record?.[path]);
          if (!ids.length) return;
          const targetRef = def?.ref || null;

          ids.forEach(toId => {
            const toNode = nodeIndex.get(toId);
            if (!toNode) return;
            if (targetRef && targetRef !== '*') {
              const resolved = resolveCollectionName
                ? resolveCollectionName(targetRef, model?.specVersion)
                : targetRef;
              if (resolved && toNode.collectionName !== resolved) return;
            }
            if (fromMovementId && toNode.movementId && fromMovementId !== toNode.movementId) {
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
