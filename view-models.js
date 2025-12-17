/*
 * View Model builders for Movement Engineer.
 *
 * These functions translate raw collection data (as described by data-model v3.5)
 * into derived shapes optimised for specific UI needs. Each builder expects a
 * `data` object containing arrays named after the collections:
 * movements, textCollections, texts, entities, practices, events,
 * rules, claims, media, notes.
 *
 * The output mirrors the canonical view models described in the project brief.
 */

function normaliseArray(value) {
  return Array.isArray(value) ? value : [];
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

  const textStats = {
    totalTexts: texts.length,
    works: texts.filter(t => t.level === 'work').length,
    sections: texts.filter(t => t.level === 'section').length,
    passages: texts.filter(t => t.level === 'passage').length,
    lines: texts.filter(t => t.level === 'line').length
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
  const claims = filterByMovement(data.claims, movementId);
  const events = filterByMovement(data.events, movementId);
  const entities = buildLookup(filterByMovement(data.entities, movementId));

  const childrenByParent = new Map();
  texts.forEach(text => {
    const bucket = childrenByParent.get(text.parentId || null) || [];
    bucket.push(text.id);
    childrenByParent.set(text.parentId || null, bucket);
  });

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
      level: text.level,
      title: text.title,
      label: text.label,
      mainFunction: text.mainFunction ?? null,
      tags: normaliseArray(text.tags),
      hasContent: Boolean(text.content && text.content.trim()),
      childIds: childrenByParent.get(text.id) || [],
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

function buildEntityDetailViewModel(data, input) {
  const { entityId } = input;
  const entityLookup = buildLookup(data.entities);
  const textLookup = buildLookup(data.texts);

  const entity = entityLookup.get(entityId) || null;

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
      level: text.level,
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

  const graph = buildMovementGraphModel(data, { movementId: entity?.movementId });
  const graphNodeLookup = new Map(normaliseArray(graph.nodes).map(n => [n.id, n]));
  const connections = normaliseArray(graph.edges)
    .filter(edge => edge.fromId === entityId || edge.toId === entityId)
    .map(edge => {
      const outgoing = edge.fromId === entityId;
      const neighbourId = outgoing ? edge.toId : edge.fromId;
      const neighbour = graphNodeLookup.get(neighbourId);
      const node = neighbour
        ? {
            id: neighbour.id,
            name: neighbour.name,
            type: neighbour.type,
            kind: neighbour.kind ?? null
          }
        : { id: neighbourId, name: neighbourId, type: null, kind: null };
      return {
        id: edge.id,
        relationType: edge.relationType,
        direction: outgoing ? 'out' : 'in',
        node,
        source: edge.source || null
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
    edge => visited.has(edge.fromId) || visited.has(edge.toId)
  );

  return { nodes, edges, centerEntityId };
}

function buildMovementGraphModel(data, input) {
  const { movementId, relationTypeFilter } = input;
  const relationFilterSet = Array.isArray(relationTypeFilter)
    ? new Set(relationTypeFilter)
    : null;

  const lookups = {
    Movement: buildLookup(filterByMovement(data.movements, movementId)),
    TextCollection: buildLookup(filterByMovement(data.textCollections, movementId)),
    TextNode: buildLookup(filterByMovement(data.texts, movementId)),
    Entity: buildLookup(filterByMovement(data.entities, movementId)),
    Practice: buildLookup(filterByMovement(data.practices, movementId)),
    Event: buildLookup(filterByMovement(data.events, movementId)),
    Rule: buildLookup(filterByMovement(data.rules, movementId)),
    Claim: buildLookup(filterByMovement(data.claims, movementId)),
    MediaAsset: buildLookup(filterByMovement(data.media, movementId)),
    Note: buildLookup(filterByMovement(data.notes, movementId))
  };

  const nodes = new Map();
  const edges = [];

  const ensureNode = (type, id, fallbackName, fallbackKind) => {
    if (!id) return null;
    const existing = nodes.get(id);
    if (existing) return existing;

    const lookup = lookups[type];
    const item = lookup ? lookup.get(id) : null;

    const name =
      item?.name ||
      item?.title ||
      item?.shortText ||
      item?.text ||
      item?.label ||
      fallbackName ||
      id;
    const kind = item?.kind ?? fallbackKind ?? null;

    const node = { id, name, type, kind };
    nodes.set(id, node);
    return node;
  };

  const pushEdge = (fromId, toId, relationType, idHint, source) => {
    if (!fromId || !toId || !relationType) return;
    if (relationFilterSet && !relationFilterSet.has(relationType)) return;
    if (!nodes.has(fromId) || !nodes.has(toId)) return;
    const id = idHint || `${fromId}-${relationType}-${toId}-${edges.length}`;
    edges.push({ id, fromId, toId, relationType, source: source || null });
  };

  // Entities
  filterByMovement(data.entities, movementId).forEach(entity => {
    ensureNode('Entity', entity.id, entity.name, entity.kind ?? null);
    normaliseArray(entity.sourceEntityIds).forEach(srcId => {
      ensureNode('Entity', srcId, srcId, null);
      pushEdge(srcId, entity.id, 'authority_for', null, {
        collection: 'entities',
        id: entity.id,
        field: 'sourceEntityIds'
      });
    });
  });

  // Canon: Text collections and text nodes
  filterByMovement(data.textCollections, movementId).forEach(col => {
    ensureNode('TextCollection', col.id, col.name, null);
    normaliseArray(col.rootTextIds).forEach(textId => {
      ensureNode('TextNode', textId, textId, null);
      pushEdge(col.id, textId, 'canon_root', null, {
        collection: 'textCollections',
        id: col.id,
        field: 'rootTextIds'
      });
    });
  });

  filterByMovement(data.texts, movementId).forEach(text => {
    ensureNode('TextNode', text.id, text.title || text.label, null);
    if (text.parentId) {
      ensureNode('TextNode', text.parentId, text.parentId, null);
      pushEdge(text.parentId, text.id, 'contains_text', null, {
        collection: 'texts',
        id: text.id,
        field: 'parentId'
      });
    }
    normaliseArray(text.mentionsEntityIds).forEach(entityId => {
      ensureNode('Entity', entityId, entityId, null);
      pushEdge(text.id, entityId, 'mentions', null, {
        collection: 'texts',
        id: text.id,
        field: 'mentionsEntityIds'
      });
    });
  });

  // Practices
  filterByMovement(data.practices, movementId).forEach(practice => {
    ensureNode('Practice', practice.id, practice.name, practice.kind ?? null);
    normaliseArray(practice.involvedEntityIds).forEach(entityId => {
      ensureNode('Entity', entityId, entityId, null);
      pushEdge(practice.id, entityId, 'involves', null, {
        collection: 'practices',
        id: practice.id,
        field: 'involvedEntityIds'
      });
    });
    normaliseArray(practice.instructionsTextIds).forEach(textId => {
      ensureNode('TextNode', textId, textId, null);
      pushEdge(practice.id, textId, 'instructions', null, {
        collection: 'practices',
        id: practice.id,
        field: 'instructionsTextIds'
      });
    });
    normaliseArray(practice.supportingClaimIds).forEach(claimId => {
      ensureNode('Claim', claimId, claimId, null);
      pushEdge(claimId, practice.id, 'supports_practice', null, {
        collection: 'practices',
        id: practice.id,
        field: 'supportingClaimIds'
      });
    });
    normaliseArray(practice.sourceEntityIds).forEach(srcId => {
      ensureNode('Entity', srcId, srcId, null);
      pushEdge(srcId, practice.id, 'authority_for', null, {
        collection: 'practices',
        id: practice.id,
        field: 'sourceEntityIds'
      });
    });
  });

  // Events / calendar
  filterByMovement(data.events, movementId).forEach(event => {
    ensureNode('Event', event.id, event.name, event.recurrence ?? null);
    normaliseArray(event.mainPracticeIds).forEach(practiceId => {
      ensureNode('Practice', practiceId, practiceId, null);
      pushEdge(event.id, practiceId, 'uses_practice', null, {
        collection: 'events',
        id: event.id,
        field: 'mainPracticeIds'
      });
    });
    normaliseArray(event.mainEntityIds).forEach(entityId => {
      ensureNode('Entity', entityId, entityId, null);
      pushEdge(event.id, entityId, 'focuses_on', null, {
        collection: 'events',
        id: event.id,
        field: 'mainEntityIds'
      });
    });
    normaliseArray(event.readingTextIds).forEach(textId => {
      ensureNode('TextNode', textId, textId, null);
      pushEdge(event.id, textId, 'reads', null, {
        collection: 'events',
        id: event.id,
        field: 'readingTextIds'
      });
    });
    normaliseArray(event.supportingClaimIds).forEach(claimId => {
      ensureNode('Claim', claimId, claimId, null);
      pushEdge(claimId, event.id, 'supports_event', null, {
        collection: 'events',
        id: event.id,
        field: 'supportingClaimIds'
      });
    });
  });

  // Rules
  filterByMovement(data.rules, movementId).forEach(rule => {
    ensureNode('Rule', rule.id, rule.shortText, rule.kind ?? null);
    normaliseArray(rule.supportingTextIds).forEach(textId => {
      ensureNode('TextNode', textId, textId, null);
      pushEdge(textId, rule.id, 'supports_rule', null, {
        collection: 'rules',
        id: rule.id,
        field: 'supportingTextIds'
      });
    });
    normaliseArray(rule.supportingClaimIds).forEach(claimId => {
      ensureNode('Claim', claimId, claimId, null);
      pushEdge(claimId, rule.id, 'supports_rule', null, {
        collection: 'rules',
        id: rule.id,
        field: 'supportingClaimIds'
      });
    });
    normaliseArray(rule.relatedPracticeIds).forEach(practiceId => {
      ensureNode('Practice', practiceId, practiceId, null);
      pushEdge(rule.id, practiceId, 'fulfilled_by', null, {
        collection: 'rules',
        id: rule.id,
        field: 'relatedPracticeIds'
      });
    });
    normaliseArray(rule.sourceEntityIds).forEach(srcId => {
      ensureNode('Entity', srcId, srcId, null);
      pushEdge(srcId, rule.id, 'authority_for', null, {
        collection: 'rules',
        id: rule.id,
        field: 'sourceEntityIds'
      });
    });
  });

  // Claims
  filterByMovement(data.claims, movementId).forEach(claim => {
    ensureNode('Claim', claim.id, claim.text, claim.category ?? null);
    normaliseArray(claim.sourceTextIds).forEach(textId => {
      ensureNode('TextNode', textId, textId, null);
      pushEdge(textId, claim.id, 'supports_claim', null, {
        collection: 'claims',
        id: claim.id,
        field: 'sourceTextIds'
      });
    });
    normaliseArray(claim.aboutEntityIds).forEach(entityId => {
      ensureNode('Entity', entityId, entityId, null);
      pushEdge(claim.id, entityId, 'about', null, {
        collection: 'claims',
        id: claim.id,
        field: 'aboutEntityIds'
      });
    });
    normaliseArray(claim.sourceEntityIds).forEach(srcId => {
      ensureNode('Entity', srcId, srcId, null);
      pushEdge(srcId, claim.id, 'authority_for', null, {
        collection: 'claims',
        id: claim.id,
        field: 'sourceEntityIds'
      });
    });
  });

  // Media assets
  filterByMovement(data.media, movementId).forEach(asset => {
    ensureNode('MediaAsset', asset.id, asset.title, asset.kind ?? null);
    normaliseArray(asset.linkedEntityIds).forEach(entityId => {
      ensureNode('Entity', entityId, entityId, null);
      pushEdge(asset.id, entityId, 'depicts', null, {
        collection: 'media',
        id: asset.id,
        field: 'linkedEntityIds'
      });
    });
    normaliseArray(asset.linkedPracticeIds).forEach(practiceId => {
      ensureNode('Practice', practiceId, practiceId, null);
      pushEdge(asset.id, practiceId, 'depicts', null, {
        collection: 'media',
        id: asset.id,
        field: 'linkedPracticeIds'
      });
    });
    normaliseArray(asset.linkedEventIds).forEach(eventId => {
      ensureNode('Event', eventId, eventId, null);
      pushEdge(asset.id, eventId, 'depicts', null, {
        collection: 'media',
        id: asset.id,
        field: 'linkedEventIds'
      });
    });
    normaliseArray(asset.linkedTextIds).forEach(textId => {
      ensureNode('TextNode', textId, textId, null);
      pushEdge(asset.id, textId, 'depicts', null, {
        collection: 'media',
        id: asset.id,
        field: 'linkedTextIds'
      });
    });
  });

  // Notes
  filterByMovement(data.notes, movementId).forEach(note => {
    const preview = (note.body || '').slice(0, 60) || note.id;
    ensureNode('Note', note.id, preview, null);
    if (note.targetType && note.targetId) {
      ensureNode(note.targetType, note.targetId, note.targetId, null);
      pushEdge(note.id, note.targetId, 'annotates', null, {
        collection: 'notes',
        id: note.id,
        field: 'targetId'
      });
    }
  });

  return { nodes: Array.from(nodes.values()), edges };
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
            level: text.level,
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
      .map(text => ({ id: text.id, title: text.title, level: text.level })),
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
    sourceTexts: normaliseArray(claim.sourceTextIds)
      .map(id => textLookup.get(id))
      .filter(Boolean)
      .map(text => ({ id: text.id, title: text.title, level: text.level })),
    sourcesOfTruth: normaliseArray(claim.sourcesOfTruth)
  }));

  return { claims: claimRows };
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
      .map(text => ({ id: text.id, title: text.title, level: text.level })),
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
        works: dashboard.textStats.works,
        totalTexts: dashboard.textStats.totalTexts
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
  let notes = filterByMovement(data.notes, movementId);
  if (targetTypeFilter) {
    notes = notes.filter(note => note.targetType === targetTypeFilter);
  }
  if (targetIdFilter) {
    notes = notes.filter(note => note.targetId === targetIdFilter);
  }

  const lookups = {
    Movement: buildLookup(data.movements),
    TextNode: buildLookup(data.texts),
    Entity: buildLookup(data.entities),
    Practice: buildLookup(data.practices),
    Event: buildLookup(data.events),
    Rule: buildLookup(data.rules),
    Claim: buildLookup(data.claims),
    MediaAsset: buildLookup(data.media)
  };

  const resolveLabel = (targetType, targetId) => {
    const lookup = lookups[targetType];
    const item = lookup ? lookup.get(targetId) : null;
    if (!item) return targetId;
    return item.name || item.title || item.shortText || targetId;
  };

  const noteRows = notes.map(note => ({
    id: note.id,
    targetType: note.targetType,
    targetId: note.targetId,
    targetLabel: resolveLabel(note.targetType, note.targetId),
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
  buildEntityDetailViewModel,
  buildEntityGraphViewModel,
  filterGraphModel,
  buildMovementGraphModel,
  buildPracticeDetailViewModel,
  buildCalendarViewModel,
  buildClaimsExplorerViewModel,
  buildRuleExplorerViewModel,
  buildAuthorityViewModel,
  buildMediaGalleryViewModel,
  buildComparisonViewModel,
  buildNotesViewModel
};

if (typeof module !== 'undefined') {
  module.exports = ViewModels;
} else if (typeof window !== 'undefined') {
  window.ViewModels = ViewModels;
}
