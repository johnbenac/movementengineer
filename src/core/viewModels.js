/*
 * View Model builders for Movement Engineer.
 *
 * These functions translate raw collection data (as described by data-model v3.6)
 * into derived shapes optimised for specific UI needs. Each builder expects a
 * `data` object containing arrays named after the collections:
 * movements, textCollections, texts, entities, practices, events,
 * rules, claims, media, notes.
 *
 * The output mirrors the canonical view models described in the project brief.
 */

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

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

function getNodeIndexModule() {
  if (globalScope?.NodeIndex) return globalScope.NodeIndex;
  if (typeof module !== 'undefined' && module.exports) {
    try {
      return require('./nodeIndex');
    } catch (err) {
      return null;
    }
  }
  return null;
}

function getGraphIndexModule() {
  if (globalScope?.GraphIndex) return globalScope.GraphIndex;
  if (typeof module !== 'undefined' && module.exports) {
    try {
      return require('./graphIndex');
    } catch (err) {
      return null;
    }
  }
  return null;
}

function getModelForData(data) {
  const registry = getModelRegistry();
  if (!registry?.getModel) return null;
  const specVersion = data?.specVersion || registry.DEFAULT_SPEC_VERSION || '2.3';
  return registry.getModel(specVersion);
}

function normaliseArray(value) {
  return Array.isArray(value) ? value : [];
}

function labelForItem(item) {
  if (!item || typeof item !== 'object') return '';
  return (
    item.name ||
    item.title ||
    item.shortText ||
    item.text ||
    item.id ||
    ''
  );
}

function buildLookup(items) {
  const map = new Map();
  normaliseArray(items).forEach(item => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });
  return map;
}

function pickTop(items, limit = 5) {
  return normaliseArray(items)
    .slice()
    .sort(
      (a, b) =>
        (normaliseArray(b.tags).length || 0) -
        (normaliseArray(a.tags).length || 0)
    )
    .slice(0, limit);
}

function histogram(items, keyAccessor) {
  return normaliseArray(items).reduce((acc, item) => {
    const key = keyAccessor(item) ?? 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function uniqueSorted(values) {
  return Array.from(new Set(normaliseArray(values).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function buildTextHierarchy(texts) {
  const childrenByParent = new Map();
  const textById = new Map();
  normaliseArray(texts).forEach(text => {
    if (!text || !text.id) return;
    textById.set(text.id, text);
    const parentKey = text.parentId || null;
    const bucket = childrenByParent.get(parentKey) || [];
    bucket.push(text.id);
    childrenByParent.set(parentKey, bucket);
  });

  const depthById = new Map();
  const queue = [];
  const enqueue = (id, depth) => {
    if (!id) return;
    const existing = depthById.get(id);
    if (existing !== undefined && existing <= depth) return;
    depthById.set(id, depth);
    queue.push({ id, depth });
  };

  const initialRoots = new Set(childrenByParent.get(null) || []);
  textById.forEach(text => {
    if (!text.parentId || !textById.has(text.parentId)) {
      initialRoots.add(text.id);
    }
  });
  initialRoots.forEach(id => enqueue(id, 0));

  while (queue.length) {
    const { id, depth } = queue.shift();
    (childrenByParent.get(id) || []).forEach(childId => enqueue(childId, depth + 1));
  }

  textById.forEach((_, id) => {
    if (depthById.has(id)) return;
    enqueue(id, 0);
    while (queue.length) {
      const { id: currentId, depth } = queue.shift();
      (childrenByParent.get(currentId) || []).forEach(childId =>
        enqueue(childId, depth + 1)
      );
    }
  });

  return { childrenByParent, depthById };
}

function filterByMovement(items, movementId) {
  return normaliseArray(items).filter(
    item => item && item.movementId === movementId
  );
}

function buildMovementDashboardViewModel(data, input) {
  const { movementId } = input;
  const movements = buildLookup(data.movements);
  const movement = movements.get(movementId) || null;

  const textCollections = filterByMovement(data.textCollections, movementId);
  const texts = filterByMovement(data.texts, movementId);
  const entities = filterByMovement(data.entities, movementId);
  const practices = filterByMovement(data.practices, movementId);
  const events = filterByMovement(data.events, movementId);
  const rules = filterByMovement(data.rules, movementId);
  const claims = filterByMovement(data.claims, movementId);
  const media = filterByMovement(data.media, movementId);
  const { depthById } = buildTextHierarchy(texts);
  const depthHistogram = histogram(texts, text => {
    const depth = depthById.get(text.id);
    return Number.isFinite(depth) ? depth : 'unknown';
  });
  const depthKeys = Object.keys(depthHistogram)
    .map(key => Number(key))
    .filter(Number.isFinite);
  const textStats = {
    totalTexts: texts.length,
    byDepth: depthHistogram,
    rootCount: depthHistogram[0] || 0,
    maxDepth: depthKeys.length ? Math.max(...depthKeys) : null
  };

  const entityStats = {
    totalEntities: entities.length,
    byKind: histogram(entities, item => item.kind)
  };

  const practiceStats = {
    totalPractices: practices.length,
    byKind: histogram(practices, item => item.kind)
  };

  const eventStats = {
    totalEvents: events.length,
    byRecurrence: histogram(events, item => item.recurrence)
  };

  const exampleNodes = {
    keyEntities: pickTop(entities),
    keyPractices: pickTop(practices),
    keyEvents: pickTop(events)
  };

  return {
    movement,
    textCollections,
    textStats,
    entityStats,
    practiceStats,
    eventStats,
    ruleCount: rules.length,
    claimCount: claims.length,
    mediaCount: media.length,
    exampleNodes
  };
}

function buildCanonTreeViewModel(data, input) {
  const { movementId, textCollectionId } = input;
  const collections = buildLookup(data.textCollections);
  const collection = textCollectionId
    ? collections.get(textCollectionId) || null
    : null;
  const texts = filterByMovement(data.texts, movementId);
  const { childrenByParent, depthById } = buildTextHierarchy(texts);
  const claims = filterByMovement(data.claims, movementId);
  const events = filterByMovement(data.events, movementId);
  const entities = buildLookup(filterByMovement(data.entities, movementId));

  const referencedByClaims = new Map();
  claims.forEach(claim => {
    normaliseArray(claim.sourceTextIds).forEach(textId => {
      const bucket = referencedByClaims.get(textId) || [];
      bucket.push({
        id: claim.id,
        text: claim.text,
        category: claim.category ?? null
      });
      referencedByClaims.set(textId, bucket);
    });
  });

  const usedInEvents = new Map();
  events.forEach(event => {
    normaliseArray(event.readingTextIds).forEach(textId => {
      const bucket = usedInEvents.get(textId) || [];
      bucket.push({
        id: event.id,
        name: event.name,
        recurrence: event.recurrence
      });
      usedInEvents.set(textId, bucket);
    });
  });

  const nodesById = {};
  texts.forEach(text => {
    const mentionsEntities = normaliseArray(text.mentionsEntityIds)
      .map(id => entities.get(id))
      .filter(Boolean)
      .map(entity => ({
        id: entity.id,
        name: entity.name,
        kind: entity.kind ?? null
      }));

    nodesById[text.id] = {
      id: text.id,
      parentId: text.parentId || null,
      depth: depthById.get(text.id) ?? null,
      title: text.title,
      label: text.label,
      mainFunction: text.mainFunction ?? null,
      tags: normaliseArray(text.tags),
      content: text.content || '',
      hasContent: Boolean(text.content && text.content.trim()),
      childIds: childrenByParent.get(text.id) || [],
      mentionsEntityIds: normaliseArray(text.mentionsEntityIds),
      mentionsEntities,
      referencedByClaims: referencedByClaims.get(text.id) || [],
      usedInEvents: usedInEvents.get(text.id) || []
    };
  });

  const roots = [];
  if (collection && Array.isArray(collection.rootTextIds)) {
    collection.rootTextIds.forEach(id => {
      if (nodesById[id]) roots.push(nodesById[id]);
    });
  } else {
    (childrenByParent.get(null) || []).forEach(id => {
      if (nodesById[id]) roots.push(nodesById[id]);
    });
  }

  return {
    collection,
    roots,
    nodesById
  };
}

function buildLibraryEditorViewModel(data, input) {
  const {
    movementId,
    activeShelfId = null,
    activeBookId = null,
    activeNodeId = null,
    searchQuery = null,
    filters = {}
  } = input;

  const collections = buildLookup(filterByMovement(data.textCollections, movementId));
  const shelves = Array.from(collections.values());
  const texts = filterByMovement(data.texts, movementId);
  const { childrenByParent, depthById } = buildTextHierarchy(texts);
  const claims = filterByMovement(data.claims, movementId);
  const events = filterByMovement(data.events, movementId);
  const entities = buildLookup(filterByMovement(data.entities, movementId));

  function labelValue(label) {
    if (!label) return Number.POSITIVE_INFINITY;
    const num = parseFloat(label);
    return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
  }

  function sortChildren(ids) {
    return ids.slice().sort((a, b) => {
      const A = nodesById[a];
      const B = nodesById[b];
      const aLabel = labelValue(A?.label);
      const bLabel = labelValue(B?.label);
      if (aLabel !== bLabel) return aLabel - bLabel;
      return (A?.title || '').localeCompare(B?.title || '');
    });
  }

  const referencedByClaims = new Map();
  claims.forEach(claim => {
    normaliseArray(claim.sourceTextIds).forEach(textId => {
      const bucket = referencedByClaims.get(textId) || [];
      bucket.push({
        id: claim.id,
        text: claim.text,
        category: claim.category ?? null
      });
      referencedByClaims.set(textId, bucket);
    });
  });

  const usedInEvents = new Map();
  events.forEach(event => {
    normaliseArray(event.readingTextIds).forEach(textId => {
      const bucket = usedInEvents.get(textId) || [];
      bucket.push({
        id: event.id,
        name: event.name,
        recurrence: event.recurrence
      });
      usedInEvents.set(textId, bucket);
    });
  });

  const nodesById = {};
  texts.forEach(text => {
    const mentionsEntities = normaliseArray(text.mentionsEntityIds)
      .map(id => entities.get(id))
      .filter(Boolean)
      .map(entity => ({
        id: entity.id,
        name: entity.name,
        kind: entity.kind ?? null
      }));

    nodesById[text.id] = {
      id: text.id,
      parentId: text.parentId || null,
      depth: depthById.get(text.id) ?? null,
      title: text.title,
      label: text.label,
      mainFunction: text.mainFunction ?? null,
      tags: normaliseArray(text.tags),
      content: text.content || '',
      hasContent: Boolean(text.content && text.content.trim()),
      childIds: [],
      mentionsEntityIds: normaliseArray(text.mentionsEntityIds),
      mentionsEntities,
      referencedByClaims: referencedByClaims.get(text.id) || [],
      usedInEvents: usedInEvents.get(text.id) || []
    };
  });

  childrenByParent.forEach((ids, parentId) => {
    const sorted = sortChildren(ids);
    if (parentId === null) return;
    if (nodesById[parentId]) nodesById[parentId].childIds = sorted;
  });

  const shelvesByBookId = {};
  const bookIdByNodeId = {};
  function walk(rootId, bookId) {
    bookIdByNodeId[rootId] = bookId;
    (nodesById[rootId]?.childIds || []).forEach(childId => walk(childId, bookId));
  }

  const bookRoots = (childrenByParent.get(null) || []).filter(id => nodesById[id]);
  bookRoots.forEach(rootId => walk(rootId, rootId));

  shelves.forEach(shelf => {
    normaliseArray(shelf.rootTextIds).forEach(rootId => {
      if (!nodesById[rootId]) return;
      const bucket = shelvesByBookId[rootId] || [];
      bucket.push(shelf.id);
      shelvesByBookId[rootId] = bucket;
    });
  });

  const shelvesVM = shelves.map(shelf => {
    const bookIds = normaliseArray(shelf.rootTextIds).filter(id => nodesById[id]);
    const textCount = bookIds.reduce((acc, rootId) => {
      const stack = [rootId];
      let count = 0;
      while (stack.length) {
        const id = stack.pop();
        if (!nodesById[id]) continue;
        count += 1;
        stack.push(...(nodesById[id].childIds || []));
      }
      return acc + count;
    }, 0);
    return {
      id: shelf.id,
      name: shelf.name,
      description: shelf.description,
      tags: normaliseArray(shelf.tags),
      bookIds,
      bookCount: bookIds.length,
      textCount
    };
  });

  const shelvesLookup = shelvesVM.reduce((acc, shelf) => {
    acc[shelf.id] = shelf;
    return acc;
  }, {});

  const shelvesRootSet = new Set();
  shelvesVM.forEach(shelf => shelf.bookIds.forEach(id => shelvesRootSet.add(id)));
  const unshelvedBookIds = bookRoots.filter(id => !shelvesRootSet.has(id));

  const booksById = {};
  bookRoots.forEach(rootId => {
    const root = nodesById[rootId];
    if (!root) return;
    let descendants = 0;
    let contentNodes = 0;
    const stack = [...(root.childIds || [])];
    while (stack.length) {
      const id = stack.pop();
      const node = nodesById[id];
      if (!node) continue;
      descendants += 1;
      if (node.hasContent) contentNodes += 1;
      stack.push(...(node.childIds || []));
    }
    booksById[rootId] = {
      id: rootId,
      title: root.title,
      label: root.label,
      depth: root.depth ?? 0,
      descendantCount: descendants,
      contentCount: contentNodes,
      tags: root.tags,
      mainFunction: root.mainFunction || null,
      shelves: shelvesByBookId[rootId] || []
    };
  });

  const activeShelf = activeShelfId ? shelvesLookup[activeShelfId] || null : null;
  const activeBook = activeBookId ? booksById[activeBookId] || null : null;
  const activeNode = activeNodeId ? nodesById[activeNodeId] || null : null;

  let tocRootId = null;
  if (activeBook) tocRootId = activeBook.id;
  else if (activeShelf && activeShelf.bookIds.length) tocRootId = activeShelf.bookIds[0];
  else if (bookRoots.length) tocRootId = bookRoots[0];

  const tocChildrenByParentId = new Map();
  if (tocRootId) {
    const stack = [tocRootId];
    while (stack.length) {
      const id = stack.pop();
      const childIds = nodesById[id]?.childIds || [];
      tocChildrenByParentId.set(id, childIds);
      stack.push(...childIds);
    }
  }

  let tocVisibleNodeIds = [];
  if (tocRootId) {
    const matchQuery = (node) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (node.title || '').toLowerCase().includes(q) ||
        (node.label || '').toLowerCase().includes(q) ||
        (node.content || '').toLowerCase().includes(q) ||
        normaliseArray(node.tags).some(tag => (tag || '').toLowerCase().includes(q))
      );
    };
    const stack = [tocRootId];
    while (stack.length) {
      const id = stack.pop();
      const node = nodesById[id];
      if (!node) continue;
      if (matchQuery(node)) tocVisibleNodeIds.push(id);
      stack.push(...(node.childIds || []));
    }
  }

  const searchResults = [];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    Object.values(nodesById).forEach(node => {
      const matches =
        (node.title || '').toLowerCase().includes(q) ||
        (node.label || '').toLowerCase().includes(q) ||
        (node.content || '').toLowerCase().includes(q) ||
        normaliseArray(node.tags).some(tag => (tag || '').toLowerCase().includes(q)) ||
        (node.mainFunction || '').toLowerCase().includes(q);
      if (!matches) return;
      const bookId = bookIdByNodeId[node.id] || null;
      const shelfIds = bookId ? shelvesByBookId[bookId] || [] : [];
      searchResults.push({
        nodeId: node.id,
        bookId,
        shelfIds,
        pathLabel: buildPathLabel(node.id, nodesById, shelvesLookup, shelvesByBookId),
        matchSnippet: null
      });
    });
  }

  return {
    movement: filterByMovement(data.movements, movementId)[0] || null,
    shelves: shelvesVM,
    unshelvedBookIds,
    nodesById,
    booksById,
    shelvesById: shelvesLookup,
    activeShelf,
    activeBook,
    activeNode,
    tocRootId,
    tocVisibleNodeIds,
    tocChildrenByParentId,
    bookIdByNodeId,
    shelvesByBookId,
    searchResults
  };

  function buildPathLabel(nodeId, nodeLookup, shelfLookup, shelvesByBook) {
    const path = [];
    let cursor = nodeLookup[nodeId];
    const bookId = bookIdByNodeId[nodeId];
    const shelfNames = (shelvesByBook[bookId] || []).map(
      id => shelfLookup[id]?.name || 'Shelf'
    );
    while (cursor) {
      const prefix = cursor.label ? `${cursor.label} ` : '';
      path.unshift(`${prefix}${cursor.title || 'Untitled'}`.trim());
      cursor = cursor.parentId ? nodeLookup[cursor.parentId] : null;
    }
    if (shelfNames.length) path.unshift(shelfNames[0]);
    return path.join(' › ');
  }
}

function buildEntityDetailViewModel(data, input) {
  const { entityId } = input;
  const entityLookup = buildLookup(data.entities);
  const textLookup = buildLookup(data.texts);

  const entity = entityLookup.get(entityId) || null;
  const { depthById } = buildTextHierarchy(
    filterByMovement(data.texts, entity?.movementId || null)
  );

  const claims = normaliseArray(data.claims)
    .filter(claim => normaliseArray(claim.aboutEntityIds).includes(entityId))
    .map(claim => ({
      id: claim.id,
      text: claim.text,
      category: claim.category ?? null,
      sourceTexts: normaliseArray(claim.sourceTextIds)
        .map(id => textLookup.get(id))
        .filter(Boolean)
        .map(text => ({ id: text.id, title: text.title }))
    }));

  const mentioningTexts = normaliseArray(data.texts)
    .filter(text => normaliseArray(text.mentionsEntityIds).includes(entityId))
    .map(text => ({
      id: text.id,
      title: text.title,
      depth: depthById.get(text.id) ?? null,
      mainFunction: text.mainFunction ?? null
    }));

  const practices = normaliseArray(data.practices)
    .filter(practice =>
      normaliseArray(practice.involvedEntityIds).includes(entityId)
    )
    .map(practice => ({
      id: practice.id,
      name: practice.name,
      kind: practice.kind ?? null,
      frequency: practice.frequency
    }));

  const events = normaliseArray(data.events)
    .filter(event => normaliseArray(event.mainEntityIds).includes(entityId))
    .map(event => ({
      id: event.id,
      name: event.name,
      recurrence: event.recurrence
    }));

  const media = normaliseArray(data.media)
    .filter(asset => normaliseArray(asset.linkedEntityIds).includes(entityId))
    .map(asset => ({
      id: asset.id,
      kind: asset.kind,
      uri: asset.uri,
      title: asset.title
    }));

  const movementId = entity?.movementId ?? null;
  const graph = buildMovementGraphModel(data, { movementId });
  const graphNodeLookup = new Map(normaliseArray(graph.nodes).map(n => [n.id, n]));

  const connections = normaliseArray(graph.edges)
    .filter(edge => edge.fromId === entityId || edge.toId === entityId)
    .map(edge => {
      const direction = edge.fromId === entityId ? 'outgoing' : 'incoming';
      const otherId = direction === 'outgoing' ? edge.toId : edge.fromId;
      const otherNode = graphNodeLookup.get(otherId);
      return {
        id: edge.id,
        relationType: edge.relationType,
        direction,
        node: otherNode
          ? {
              id: otherNode.id,
              name: otherNode.name,
              type: otherNode.type,
              kind: otherNode.kind ?? null
            }
          : { id: otherId, name: otherId, type: null, kind: null },
        source: edge.source ?? null
      };
    });

  return {
    entity,
    claims,
    mentioningTexts,
    practices,
    events,
    media,
    connections
  };
}

function buildEntityGraphViewModel(data, input) {
  const { movementId, centerEntityId, depth, relationTypeFilter } = input;
  const baseGraph = buildMovementGraphModel(data, { movementId, relationTypeFilter });

  if (!centerEntityId || !Number.isFinite(depth)) {
    return { ...baseGraph, centerEntityId };
  }

  const adjacency = new Map();
  baseGraph.edges.forEach(edge => {
    const fromList = adjacency.get(edge.fromId) || [];
    fromList.push(edge.toId);
    adjacency.set(edge.fromId, fromList);

    const toList = adjacency.get(edge.toId) || [];
    toList.push(edge.fromId);
    adjacency.set(edge.toId, toList);
  });

  const visited = new Set([centerEntityId]);
  let frontier = [centerEntityId];
  for (let step = 0; step < depth; step += 1) {
    const next = [];
    frontier.forEach(nodeId => {
      (adjacency.get(nodeId) || []).forEach(neighbour => {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          next.push(neighbour);
        }
      });
    });
    frontier = next;
    if (frontier.length === 0) break;
  }

  const nodes = baseGraph.nodes.filter(n => visited.has(n.id));
  const edges = baseGraph.edges.filter(
    edge => visited.has(edge.fromId) && visited.has(edge.toId)
  );

  return { nodes, edges, centerEntityId };
}

function buildMovementGraphModel(data, input) {
  const { movementId, relationTypeFilter } = input;
  const relationFilterSet = Array.isArray(relationTypeFilter)
    ? new Set(relationTypeFilter)
    : null;

  const model = getModelForData(data);
  const nodeIndexModule = getNodeIndexModule();
  const graphIndexModule = getGraphIndexModule();
  const nodeIndex = nodeIndexModule?.buildNodeIndex
    ? nodeIndexModule.buildNodeIndex(data, model)
    : { all: [], get: () => null };
  const graphIndex = graphIndexModule?.buildGraphIndex
    ? graphIndexModule.buildGraphIndex(data, model, nodeIndex)
    : { outEdgesById: new Map() };

  const nodes = [];
  const nodeMap = new Map();

  nodeIndex.all.forEach(node => {
    if (movementId && node.movementId !== movementId) return;
    const name = node.title || node.id;
    const kind = node.record?.kind ?? node.subtitle ?? null;
    const entry = {
      id: node.id,
      name,
      type: node.typeName || node.collectionName,
      kind,
      collectionName: node.collectionName
    };
    nodeMap.set(node.id, entry);
    nodes.push(entry);
  });

  const edges = [];
  graphIndex.outEdgesById.forEach((links, fromId) => {
    links.forEach((edge, index) => {
      const relationType = edge.fieldPath || edge.field || 'ref';
      if (relationFilterSet && !relationFilterSet.has(relationType)) return;
      if (!nodeMap.has(fromId) || !nodeMap.has(edge.toId)) return;
      edges.push({
        id: `${fromId}-${relationType}-${edge.toId}-${index}`,
        fromId,
        toId: edge.toId,
        relationType,
        source: {
          collection: edge.fromCollection,
          field: edge.fieldPath,
          toCollection: edge.toCollection
        }
      });
    });
  });

  return { nodes, edges };
}

function filterGraphModel(graph, filters = {}) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];

  const { centerNodeId, depth, nodeTypeFilter } = filters;

  const nodeIdSet = new Set(nodes.map(n => n.id));
  const hasCenter = Boolean(centerNodeId && nodeIdSet.has(centerNodeId));
  const hasDepth = Number.isFinite(depth) && depth >= 0;
  const hopFilterActive = hasCenter && hasDepth;

  const adjacency = new Map();
  const addAdj = (a, b) => {
    if (!a || !b) return;
    const list = adjacency.get(a) || [];
    list.push(b);
    adjacency.set(a, list);
  };

  edges.forEach(e => {
    addAdj(e.fromId, e.toId);
    addAdj(e.toId, e.fromId);
  });

  let visited;
  if (hopFilterActive) {
    visited = new Set([centerNodeId]);
    let frontier = [centerNodeId];
    for (let step = 0; step < depth; step += 1) {
      const next = [];
      frontier.forEach(id => {
        (adjacency.get(id) || []).forEach(nb => {
          if (!visited.has(nb)) {
            visited.add(nb);
            next.push(nb);
          }
        });
      });
      frontier = next;
      if (!frontier.length) break;
    }
  } else {
    visited = new Set(nodes.map(n => n.id));
  }

  let hopNodes = nodes.filter(n => visited.has(n.id));
  let hopEdges = edges.filter(e => visited.has(e.fromId) && visited.has(e.toId));

  const typeFilterSet =
    Array.isArray(nodeTypeFilter) && nodeTypeFilter.filter(Boolean).length
      ? new Set(nodeTypeFilter.filter(Boolean))
      : null;

  if (typeFilterSet) {
    hopNodes = hopNodes.filter(n => {
      if (typeFilterSet.has(n.type)) return true;
      return hopFilterActive && n.id === centerNodeId;
    });

    const allowedIds = new Set(hopNodes.map(n => n.id));
    hopEdges = hopEdges.filter(e => allowedIds.has(e.fromId) && allowedIds.has(e.toId));
  }

  return { nodes: hopNodes, edges: hopEdges };
}

function buildPracticeDetailViewModel(data, input) {
  const { practiceId } = input;
  const practiceLookup = buildLookup(data.practices);
  const entityLookup = buildLookup(data.entities);
  const textLookup = buildLookup(data.texts);
  const claimLookup = buildLookup(data.claims);

  const practice = practiceLookup.get(practiceId) || null;
  const { depthById } = buildTextHierarchy(
    filterByMovement(data.texts, practice?.movementId || null)
  );

  const entities = normaliseArray(practice?.involvedEntityIds)
    .map(id => {
      const entity = entityLookup.get(id);
      return entity
        ? { id: entity.id, name: entity.name, kind: entity.kind ?? null }
        : null;
    })
    .filter(Boolean);

  const instructionsTexts = normaliseArray(practice?.instructionsTextIds)
    .map(id => {
      const text = textLookup.get(id);
      return text
        ? {
            id: text.id,
            title: text.title,
            depth: depthById.get(text.id) ?? null,
            mainFunction: text.mainFunction ?? null
          }
        : null;
    })
    .filter(Boolean);

  const supportingClaims = normaliseArray(practice?.supportingClaimIds)
    .map(id => {
      const claim = claimLookup.get(id);
      return claim
        ? { id: claim.id, text: claim.text, category: claim.category ?? null }
        : null;
    })
    .filter(Boolean);

  const attachedRules = normaliseArray(data.rules)
    .filter(rule => normaliseArray(rule.relatedPracticeIds).includes(practiceId))
    .map(rule => ({
      id: rule.id,
      shortText: rule.shortText,
      kind: rule.kind
    }));

  const attachedEvents = normaliseArray(data.events)
    .filter(event => normaliseArray(event.mainPracticeIds).includes(practiceId))
    .map(event => ({
      id: event.id,
      name: event.name,
      recurrence: event.recurrence
    }));

  const media = normaliseArray(data.media)
    .filter(asset => normaliseArray(asset.linkedPracticeIds).includes(practiceId))
    .map(asset => ({
      id: asset.id,
      kind: asset.kind,
      uri: asset.uri,
      title: asset.title
    }));

  return {
    practice,
    entities,
    instructionsTexts,
    supportingClaims,
    attachedRules,
    attachedEvents,
    media
  };
}

function buildCalendarViewModel(data, input) {
  const { movementId, recurrenceFilter } = input;
  let events = filterByMovement(data.events, movementId);
  if (Array.isArray(recurrenceFilter) && recurrenceFilter.length > 0) {
    events = events.filter(event => recurrenceFilter.includes(event.recurrence));
  }

  const practiceLookup = buildLookup(data.practices);
  const entityLookup = buildLookup(data.entities);
  const textLookup = buildLookup(data.texts);
  const claimLookup = buildLookup(data.claims);
  const { depthById } = buildTextHierarchy(filterByMovement(data.texts, movementId));

  const eventCards = events.map(event => ({
    id: event.id,
    name: event.name,
    description: event.description,
    recurrence: event.recurrence,
    timingRule: event.timingRule,
    tags: normaliseArray(event.tags),
    mainPractices: normaliseArray(event.mainPracticeIds)
      .map(id => practiceLookup.get(id))
      .filter(Boolean)
      .map(practice => ({
        id: practice.id,
        name: practice.name,
        kind: practice.kind ?? null
      })),
    mainEntities: normaliseArray(event.mainEntityIds)
      .map(id => entityLookup.get(id))
      .filter(Boolean)
      .map(entity => ({
        id: entity.id,
        name: entity.name,
        kind: entity.kind ?? null
      })),
    readings: normaliseArray(event.readingTextIds)
      .map(id => textLookup.get(id))
      .filter(Boolean)
      .map(text => ({ id: text.id, title: text.title, depth: depthById.get(text.id) ?? null })),
    supportingClaims: normaliseArray(event.supportingClaimIds)
      .map(id => claimLookup.get(id))
      .filter(Boolean)
      .map(claim => ({
        id: claim.id,
        text: claim.text,
        category: claim.category ?? null
      }))
  }));

  return {
    movementId,
    events: eventCards
  };
}

function buildClaimsExplorerViewModel(data, input) {
  const { movementId, categoryFilter, entityIdFilter } = input;
  let claims = filterByMovement(data.claims, movementId);
  if (Array.isArray(categoryFilter) && categoryFilter.length > 0) {
    claims = claims.filter(
      claim => claim.category && categoryFilter.includes(claim.category)
    );
  }
  if (entityIdFilter) {
    claims = claims.filter(claim =>
      normaliseArray(claim.aboutEntityIds).includes(entityIdFilter)
    );
  }

  const entityLookup = buildLookup(data.entities);
  const textLookup = buildLookup(data.texts);
  const { depthById } = buildTextHierarchy(filterByMovement(data.texts, movementId));

  const claimRows = claims.map(claim => ({
    id: claim.id,
    text: claim.text,
    category: claim.category ?? null,
    tags: normaliseArray(claim.tags),
    aboutEntities: normaliseArray(claim.aboutEntityIds)
      .map(id => entityLookup.get(id))
      .filter(Boolean)
      .map(entity => ({
        id: entity.id,
        name: entity.name,
        kind: entity.kind ?? null
      })),
    sourceEntities: normaliseArray(claim.sourceEntityIds)
      .map(id => entityLookup.get(id))
      .filter(Boolean)
      .map(entity => ({
        id: entity.id,
        name: entity.name,
        kind: entity.kind ?? null
      })),
    sourceTexts: normaliseArray(claim.sourceTextIds)
      .map(id => textLookup.get(id))
      .filter(Boolean)
      .map(text => ({ id: text.id, title: text.title, depth: depthById.get(text.id) ?? null })),
    sourcesOfTruth: normaliseArray(claim.sourcesOfTruth)
  }));

  return { claims: claimRows };
}

function matchesFacet(item, collectionName, facetName, facetValue) {
  const value = String(facetValue);
  const equalsValue = candidate => String(candidate) === value;

  switch (facetName) {
    case 'tag':
      return normaliseArray(item.tags).some(equalsValue);
    case 'sourceOfTruth':
      return normaliseArray(item.sourcesOfTruth).some(equalsValue);
    case 'domain':
      return normaliseArray(item.domain).some(equalsValue);
    case 'appliesTo':
      return normaliseArray(item.appliesTo).some(equalsValue);
    case 'category':
      return item.category !== undefined && item.category !== null
        ? equalsValue(item.category)
        : false;
    case 'kind':
      return item.kind !== undefined && item.kind !== null
        ? equalsValue(item.kind)
        : false;
    default:
      return false;
  }
}

function buildFacetExplorerViewModel(data, input) {
  const { movementId, facet, value, scope } = input || {};
  if (!facet || value === undefined || value === null) {
    return { facet: facet || null, value: value ?? null, scope: scope || null, results: [] };
  }

  const facetCollections = {
    tag: [
      'entities',
      'practices',
      'events',
      'rules',
      'claims',
      'textCollections',
      'texts',
      'media',
      'notes'
    ],
    sourceOfTruth: ['claims', 'rules', 'practices', 'entities', 'media'],
    domain: ['rules'],
    appliesTo: ['rules'],
    category: ['claims'],
    kind: ['entities', 'practices', 'rules', 'media', 'events']
  };

  const baseCollections = facetCollections[facet] || Object.keys(data || {});
  const collections =
    scope && scope !== 'all'
      ? baseCollections.filter(name => name === scope)
      : baseCollections;

  const results = [];
  collections.forEach(collectionName => {
    const items = normaliseArray(data[collectionName]);
    items.forEach(item => {
      if (!item || !item.id) return;
      if (movementId && item.movementId && item.movementId !== movementId) return;
      if (!matchesFacet(item, collectionName, facet, value)) return;
      results.push({
        collectionName,
        id: item.id,
        label: labelForItem(item) || item.id
      });
    });
  });

  results.sort((a, b) => {
    if (a.collectionName === b.collectionName) {
      return String(a.label || '').localeCompare(String(b.label || ''), undefined, {
        sensitivity: 'base'
      });
    }
    return String(a.collectionName || '').localeCompare(String(b.collectionName || ''));
  });

  return {
    facet,
    value,
    scope: scope || null,
    results
  };
}

function buildRuleExplorerViewModel(data, input) {
  const { movementId, kindFilter, domainFilter } = input;
  let rules = filterByMovement(data.rules, movementId);
  if (Array.isArray(kindFilter) && kindFilter.length > 0) {
    rules = rules.filter(rule => kindFilter.includes(rule.kind));
  }
  if (Array.isArray(domainFilter) && domainFilter.length > 0) {
    rules = rules.filter(rule =>
      normaliseArray(rule.domain).some(domain => domainFilter.includes(domain))
    );
  }

  const textLookup = buildLookup(data.texts);
  const claimLookup = buildLookup(data.claims);
  const practiceLookup = buildLookup(data.practices);
  const { depthById } = buildTextHierarchy(filterByMovement(data.texts, movementId));

  const ruleRows = rules.map(rule => ({
    id: rule.id,
    shortText: rule.shortText,
    kind: rule.kind,
    details: rule.details ?? null,
    appliesTo: normaliseArray(rule.appliesTo),
    domain: normaliseArray(rule.domain),
    tags: normaliseArray(rule.tags),
    supportingTexts: normaliseArray(rule.supportingTextIds)
      .map(id => textLookup.get(id))
      .filter(Boolean)
      .map(text => ({
        id: text.id,
        title: text.title,
        depth: depthById.get(text.id) ?? null
      })),
    supportingClaims: normaliseArray(rule.supportingClaimIds)
      .map(id => claimLookup.get(id))
      .filter(Boolean)
      .map(claim => ({
        id: claim.id,
        text: claim.text,
        category: claim.category ?? null
      })),
    relatedPractices: normaliseArray(rule.relatedPracticeIds)
      .map(id => practiceLookup.get(id))
      .filter(Boolean)
      .map(practice => ({
        id: practice.id,
        name: practice.name,
        kind: practice.kind ?? null
      })),
    sourcesOfTruth: normaliseArray(rule.sourcesOfTruth)
  }));

  return { rules: ruleRows };
}

function buildRuleEditorViewModel(data, input) {
  const { movementId } = input;
  const rules = filterByMovement(data.rules, movementId);
  const texts = filterByMovement(data.texts, movementId);
  const claims = filterByMovement(data.claims, movementId);
  const practices = filterByMovement(data.practices, movementId);
  const entities = filterByMovement(data.entities, movementId);
  const { depthById } = buildTextHierarchy(texts);

  const ruleRows = rules
    .slice()
    .sort((a, b) => (a.shortText || '').localeCompare(b.shortText || ''))
    .map(rule => ({
      id: rule.id,
      movementId: rule.movementId,
      shortText: rule.shortText,
      kind: rule.kind ?? null,
      details: rule.details ?? null,
      appliesTo: normaliseArray(rule.appliesTo),
      domain: normaliseArray(rule.domain),
      tags: normaliseArray(rule.tags),
      supportingTextIds: normaliseArray(rule.supportingTextIds),
      supportingClaimIds: normaliseArray(rule.supportingClaimIds),
      relatedPracticeIds: normaliseArray(rule.relatedPracticeIds),
      sourcesOfTruth: normaliseArray(rule.sourcesOfTruth),
      sourceEntityIds: normaliseArray(rule.sourceEntityIds)
    }));

  const buildOption = (value, label, extra = {}) => ({ value, label, ...extra });

  const textOptions = texts
    .map(text =>
      buildOption(text.id, text.title || text.id, {
        depth: depthById.get(text.id) ?? null
      })
    )
    .sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const claimOptions = claims
    .map(claim =>
      buildOption(
        claim.id,
        `${claim.category ? '[' + claim.category + '] ' : ''}${claim.text || claim.id}`
      )
    )
    .sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const practiceOptions = practices
    .map(practice =>
      buildOption(practice.id, practice.name || practice.id, {
        kind: practice.kind ?? null
      })
    )
    .sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const entityOptions = entities
    .map(entity =>
      buildOption(entity.id, entity.name || entity.id, {
        kind: entity.kind ?? null
      })
    )
    .sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const gatherValues = (collection, field) =>
    normaliseArray(collection).flatMap(item => normaliseArray(item?.[field]));

  const sourcesOfTruth = uniqueSorted(
    []
      .concat(gatherValues(rules, 'sourcesOfTruth'))
      .concat(gatherValues(practices, 'sourcesOfTruth'))
      .concat(gatherValues(claims, 'sourcesOfTruth'))
      .concat(gatherValues(entities, 'sourcesOfTruth'))
  );

  const ruleKinds = uniqueSorted(
    []
      .concat(['must_do', 'must_not_do', 'should_do', 'ideal'])
      .concat(rules.map(rule => rule.kind))
  );

  return {
    rules: ruleRows,
    options: {
      ruleKinds,
      appliesToValues: uniqueSorted(gatherValues(rules, 'appliesTo')),
      domainValues: uniqueSorted(gatherValues(rules, 'domain')),
      tagValues: uniqueSorted(gatherValues(rules, 'tags')),
      sourcesOfTruth,
      texts: textOptions,
      claims: claimOptions,
      practices: practiceOptions,
      entities: entityOptions
    }
  };
}

function buildAuthorityViewModel(data, input) {
  const { movementId } = input;
  const claims = filterByMovement(data.claims, movementId);
  const rules = filterByMovement(data.rules, movementId);
  const practices = filterByMovement(data.practices, movementId);
  const entities = filterByMovement(data.entities, movementId);

  const sources = new Map();
  const addSourceUsage = (label, key, id) => {
    if (!label) return;
    const record =
      sources.get(label) || {
        label,
        usedByClaims: [],
        usedByRules: [],
        usedByPractices: [],
        usedByEntities: []
      };
    if (!record[key].includes(id)) {
      record[key].push(id);
    }
    sources.set(label, record);
  };

  claims.forEach(claim => {
    normaliseArray(claim.sourcesOfTruth).forEach(label =>
      addSourceUsage(label, 'usedByClaims', claim.id)
    );
  });
  rules.forEach(rule => {
    normaliseArray(rule.sourcesOfTruth).forEach(label =>
      addSourceUsage(label, 'usedByRules', rule.id)
    );
  });
  practices.forEach(practice => {
    normaliseArray(practice.sourcesOfTruth).forEach(label =>
      addSourceUsage(label, 'usedByPractices', practice.id)
    );
  });
  entities.forEach(entity => {
    normaliseArray(entity.sourcesOfTruth).forEach(label =>
      addSourceUsage(label, 'usedByEntities', entity.id)
    );
  });

  const authorityEntitiesLookup = buildLookup(data.entities);
  const authorityEntities = new Map();
  const addEntityUsage = (entityId, key, id) => {
    if (!entityId) return;
    const base =
      authorityEntities.get(entityId) || {
        id: entityId,
        name: authorityEntitiesLookup.get(entityId)?.name || entityId,
        kind: authorityEntitiesLookup.get(entityId)?.kind ?? null,
        usedAsSourceIn: {
          claims: [],
          rules: [],
          practices: [],
          entities: []
        }
      };
    if (!base.usedAsSourceIn[key].includes(id)) {
      base.usedAsSourceIn[key].push(id);
    }
    authorityEntities.set(entityId, base);
  };

  claims.forEach(claim => {
    normaliseArray(claim.sourceEntityIds).forEach(entityId =>
      addEntityUsage(entityId, 'claims', claim.id)
    );
  });
  rules.forEach(rule => {
    normaliseArray(rule.sourceEntityIds).forEach(entityId =>
      addEntityUsage(entityId, 'rules', rule.id)
    );
  });
  practices.forEach(practice => {
    normaliseArray(practice.sourceEntityIds).forEach(entityId =>
      addEntityUsage(entityId, 'practices', practice.id)
    );
  });
  entities.forEach(ent => {
    normaliseArray(ent.sourceEntityIds).forEach(entityId =>
      addEntityUsage(entityId, 'entities', ent.id)
    );
  });

  return {
    sourcesByLabel: Array.from(sources.values()),
    authorityEntities: Array.from(authorityEntities.values())
  };
}

function buildMediaGalleryViewModel(data, input) {
  const { movementId, entityIdFilter, practiceIdFilter, eventIdFilter, textIdFilter } =
    input;
  let media = filterByMovement(data.media, movementId);

  media = media.filter(asset => {
    if (
      entityIdFilter &&
      !normaliseArray(asset.linkedEntityIds).includes(entityIdFilter)
    )
      return false;
    if (
      practiceIdFilter &&
      !normaliseArray(asset.linkedPracticeIds).includes(practiceIdFilter)
    )
      return false;
    if (
      eventIdFilter &&
      !normaliseArray(asset.linkedEventIds).includes(eventIdFilter)
    )
      return false;
    if (
      textIdFilter &&
      !normaliseArray(asset.linkedTextIds).includes(textIdFilter)
    )
      return false;
    return true;
  });

  const entityLookup = buildLookup(data.entities);
  const practiceLookup = buildLookup(data.practices);
  const eventLookup = buildLookup(data.events);
  const textLookup = buildLookup(data.texts);

  const items = media.map(asset => ({
    id: asset.id,
    kind: asset.kind,
    uri: asset.uri,
    title: asset.title,
    description: asset.description ?? null,
    tags: normaliseArray(asset.tags),
    entities: normaliseArray(asset.linkedEntityIds)
      .map(id => entityLookup.get(id))
      .filter(Boolean)
      .map(entity => ({ id: entity.id, name: entity.name })),
    practices: normaliseArray(asset.linkedPracticeIds)
      .map(id => practiceLookup.get(id))
      .filter(Boolean)
      .map(practice => ({ id: practice.id, name: practice.name })),
    events: normaliseArray(asset.linkedEventIds)
      .map(id => eventLookup.get(id))
      .filter(Boolean)
      .map(event => ({ id: event.id, name: event.name })),
    texts: normaliseArray(asset.linkedTextIds)
      .map(id => textLookup.get(id))
      .filter(Boolean)
      .map(text => ({ id: text.id, title: text.title }))
  }));

  return { items };
}

function buildComparisonViewModel(data, input) {
  const { movementIds } = input;

  const buildRow = movementId => {
    const dashboard = buildMovementDashboardViewModel(data, { movementId });
    return {
      movement: dashboard.movement,
      textCounts: {
        totalTexts: dashboard.textStats.totalTexts,
        byDepth: dashboard.textStats.byDepth,
        rootCount: dashboard.textStats.rootCount,
        maxDepth: dashboard.textStats.maxDepth
      },
      entityCounts: {
        total: dashboard.entityStats.totalEntities,
        byKind: dashboard.entityStats.byKind
      },
      practiceCounts: {
        total: dashboard.practiceStats.totalPractices,
        byKind: dashboard.practiceStats.byKind
      },
      eventCounts: {
        total: dashboard.eventStats.totalEvents,
        byRecurrence: dashboard.eventStats.byRecurrence
      },
      ruleCount: dashboard.ruleCount,
      claimCount: dashboard.claimCount
    };
  };

  return { rows: normaliseArray(movementIds).map(buildRow) };
}

function buildNotesViewModel(data, input) {
  const { movementId, targetTypeFilter, targetIdFilter } = input;
  const model = getModelForData(data);
  const nodeIndexModule = getNodeIndexModule();
  const nodeIndex = nodeIndexModule?.buildNodeIndex
    ? nodeIndexModule.buildNodeIndex(data, model)
    : { get: () => null };

  let notes = filterByMovement(data.notes, movementId);
  if (targetTypeFilter) {
    notes = notes.filter(note => {
      const node = note?.targetId ? nodeIndex.get(note.targetId) : null;
      const resolvedType = note?.targetType || node?.typeName || null;
      return resolvedType === targetTypeFilter;
    });
  }
  if (targetIdFilter) {
    notes = notes.filter(note => note.targetId === targetIdFilter);
  }

  const noteRows = notes.map(note => ({
    id: note.id,
    targetType: note.targetType || nodeIndex.get(note.targetId)?.typeName || null,
    targetId: note.targetId,
    targetLabel: nodeIndex.get(note.targetId)?.title || note.targetId,
    author: note.author ?? null,
    body: note.body,
    context: note.context ?? null,
    tags: normaliseArray(note.tags)
  }));

  return { notes: noteRows };
}

const ViewModels = {
  buildMovementDashboardViewModel,
  buildCanonTreeViewModel,
  buildLibraryEditorViewModel,
  buildEntityDetailViewModel,
  buildEntityGraphViewModel,
  filterGraphModel,
  buildMovementGraphModel,
  buildPracticeDetailViewModel,
  buildCalendarViewModel,
  buildClaimsExplorerViewModel,
  buildFacetExplorerViewModel,
  buildRuleExplorerViewModel,
  buildRuleEditorViewModel,
  buildAuthorityViewModel,
  buildMediaGalleryViewModel,
  buildComparisonViewModel,
  buildNotesViewModel
};

if (typeof module !== 'undefined') {
  module.exports = ViewModels;
} else if (globalScope) {
  globalScope.ViewModels = ViewModels;
}
