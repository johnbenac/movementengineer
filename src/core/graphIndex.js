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

  function resolveNodeIndex() {
    if (globalScope?.NodeIndex?.buildNodeIndex) return globalScope.NodeIndex;
    if (typeof module !== 'undefined' && module.exports) {
      return require('./nodeIndex');
    }
    return null;
  }

  const cleanId = resolveCleanId();

  function extractIds(value) {
    if (Array.isArray(value)) return value.map(cleanId).filter(Boolean);
    const one = cleanId(value);
    return one ? [one] : [];
  }

  function listRefFieldPaths(modelRegistry, collectionDef) {
    if (modelRegistry?.listRefFieldPaths) {
      return modelRegistry.listRefFieldPaths(collectionDef);
    }
    const fields = collectionDef?.fields || {};
    return Object.entries(fields)
      .map(([path, def]) => {
        if (def?.ref) return { path, def };
        if (def?.type === 'array' && def?.items?.ref) return { path, def };
        return null;
      })
      .filter(Boolean);
  }

  function buildGraphIndex(snapshot, model, nodeIndex, modelRegistry) {
    const registry = modelRegistry || globalScope?.ModelRegistry || null;
    const NodeIndex = resolveNodeIndex();
    const resolvedNodeIndex =
      nodeIndex?.get && nodeIndex?.all ? nodeIndex : NodeIndex?.buildNodeIndex?.(snapshot, model);

    const outEdgesById = new Map();
    const inEdgesById = new Map();

    const addEdge = (fromId, toId, meta) => {
      if (!fromId || !toId) return;
      if (!outEdgesById.has(fromId)) outEdgesById.set(fromId, []);
      if (!inEdgesById.has(toId)) inEdgesById.set(toId, []);
      outEdgesById.get(fromId).push({ toId, ...meta });
      inEdgesById.get(toId).push({ fromId, ...meta });
    };

    Object.entries(model?.collections || {}).forEach(([collectionName, collectionDef]) => {
      const items = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
      const refFields = listRefFieldPaths(registry, collectionDef);
      if (!refFields.length) return;

      items.forEach(record => {
        const fromId = cleanId(record?.id);
        if (!fromId) return;
        const fromNode = resolvedNodeIndex?.get?.(fromId);
        const fromMovementId =
          fromNode?.movementId || cleanId(record?.movementId) || null;

        refFields.forEach(({ path, def }) => {
          const refTarget = def?.ref || def?.items?.ref;
          const raw = record?.[path];
          const ids = extractIds(raw);

          ids.forEach(toId => {
            const toNode = resolvedNodeIndex?.get?.(toId);
            if (!toNode) return;

            if (refTarget !== '*' && toNode.collectionName !== refTarget) {
              const resolvedTarget = registry?.resolveCollectionName
                ? registry.resolveCollectionName(refTarget, model?.specVersion)
                : refTarget;
              if (resolvedTarget && toNode.collectionName !== resolvedTarget) return;
            }

            if (
              fromMovementId &&
              toNode.movementId &&
              fromMovementId !== toNode.movementId
            ) {
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

  function buildGraphModel({ nodeIndex, graphIndex, movementId, relationTypeFilter } = {}) {
    if (!nodeIndex || !graphIndex) return { nodes: [], edges: [] };
    const relationFilterSet = Array.isArray(relationTypeFilter)
      ? new Set(relationTypeFilter)
      : null;

    const nodes = nodeIndex.all
      .filter(node => {
        if (!movementId) return true;
        if (node.collectionName === 'movements') return node.id === movementId;
        return node.movementId === movementId;
      })
      .map(node => ({
        id: node.id,
        name: node.title || node.id,
        type: node.typeName,
        kind: node.record?.kind ?? null,
        collectionName: node.collectionName
      }));

    const nodeIdSet = new Set(nodes.map(node => node.id));
    const edges = [];

    graphIndex.outEdgesById.forEach((edgesForNode, fromId) => {
      if (!nodeIdSet.has(fromId)) return;
      edgesForNode.forEach((edge, index) => {
        if (!nodeIdSet.has(edge.toId)) return;
        if (relationFilterSet && !relationFilterSet.has(edge.fieldPath)) return;
        edges.push({
          id: `${fromId}-${edge.fieldPath}-${edge.toId}-${index}`,
          fromId,
          toId: edge.toId,
          relationType: edge.fieldPath,
          source: {
            collection: edge.fromCollection || null,
            id: fromId,
            field: edge.fieldPath
          }
        });
      });
    });

    return { nodes, edges };
  }

  const api = { buildGraphIndex, buildGraphModel };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.GraphIndex = api;
  }
})();
