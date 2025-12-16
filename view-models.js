/*
 * View Model builders for Movement Engineer.
 *
 * These functions translate raw collection data (as described by data-model v3.4)
 * into derived shapes optimised for specific UI needs. Each builder expects a
 * `data` object containing arrays named after the collections:
 * movements, textCollections, texts, entities, practices, events,
 * rules, claims, media, notes, relations.
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

  const relationsOut = normaliseArray(data.relations)
    .filter(rel => rel.fromEntityId === entityId)
    .map(rel => ({
      id: rel.id,
      relationType: rel.relationType,
      to: (() => {
        const target = entityLookup.get(rel.toEntityId);
        return target
          ? {
              id: target.id,
              name: target.name,
              kind: target.kind ?? null
            }
          : { id: rel.toEntityId, name: rel.toEntityId, kind: null };
      })()
    }));

  const relationsIn = normaliseArray(data.relations)
    .filter(rel => rel.toEntityId === entityId)
    .map(rel => ({
      id: rel.id,
      relationType: rel.relationType,
      from: (() => {
        const source = entityLookup.get(rel.fromEntityId);
        return source
          ? {
              id: source.id,
              name: source.name,
              kind: source.kind ?? null
            }
          : { id: rel.fromEntityId, name: rel.fromEntityId, kind: null };
      })()
    }));

  return {
    entity,
    claims,
    mentioningTexts,
    practices,
    events,
    media,
    relationsOut,
    relationsIn
  };
}

function buildEntityGraphViewModel(data, input) {
  return buildGraphModel(data, {
    movementId: input.movementId,
    centerNodeId: input.centerEntityId,
    depth: input.depth,
    relationTypeFilter: input.relationTypeFilter
  });
}

function buildGraphModel(data, input) {
  const {
    movementId,
    centerNodeId = null,
    depth = null,
    relationTypeFilter = null
  } = input;

  const nodes = new Map();
  const edges = [];
  let edgeCounter = 0;

  const addNode = (id, name, type, kind = null) => {
    if (!id || nodes.has(id)) return;
    nodes.set(id, {
      id,
      name: name || id,
      type,
      kind: kind || type
    });
  };

  const addEdge = (fromId, toId, relationType, origin = null) => {
    if (!fromId || !toId) return;
    if (!nodes.has(fromId) || !nodes.has(toId)) return;
    const relationLabel = relationType || 'related_to';
    const id = origin || `edge-${(edgeCounter += 1)}`;
    edges.push({ id, fromId, toId, relationType: relationLabel, origin });
  };

  // Base nodes for all movement content
  filterByMovement(data.entities, movementId).forEach(entity => {
    addNode(entity.id, entity.name, 'Entity', entity.kind ?? 'Entity');
  });

  filterByMovement(data.textCollections, movementId).forEach(coll => {
    addNode(coll.id, coll.name, 'TextCollection');
  });

  filterByMovement(data.texts, movementId).forEach(text => {
    addNode(text.id, text.title, 'Text', text.level ?? 'Text');
  });

  filterByMovement(data.practices, movementId).forEach(practice => {
    addNode(practice.id, practice.name, 'Practice', practice.kind ?? 'Practice');
  });

  filterByMovement(data.events, movementId).forEach(event => {
    addNode(event.id, event.name, 'Event', event.recurrence ?? 'Event');
  });

  filterByMovement(data.rules, movementId).forEach(rule => {
    addNode(rule.id, rule.shortText, 'Rule', rule.kind ?? 'Rule');
  });

  filterByMovement(data.claims, movementId).forEach(claim => {
    addNode(claim.id, claim.text, 'Claim', claim.category ?? 'Claim');
  });

  filterByMovement(data.media, movementId).forEach(asset => {
    addNode(asset.id, asset.title, 'Media', asset.kind ?? 'Media');
  });

  filterByMovement(data.notes, movementId).forEach(note => {
    const label = (note.body || '').slice(0, 80) || note.id;
    addNode(note.id, label, 'Note', note.targetType ?? 'Note');
  });

  // Text structure + references
  filterByMovement(data.textCollections, movementId).forEach(coll => {
    normaliseArray(coll.rootTextIds).forEach(textId => {
      addEdge(coll.id, textId, 'includes', 'text-collection');
    });
  });

  filterByMovement(data.texts, movementId).forEach(text => {
    if (text.parentId) addEdge(text.parentId, text.id, 'contains', 'text-parent');
    normaliseArray(text.mentionsEntityIds).forEach(entityId => {
      addEdge(text.id, entityId, 'mentions', 'text-mention');
    });
  });

  // Entity source links
  filterByMovement(data.entities, movementId).forEach(entity => {
    normaliseArray(entity.sourceEntityIds).forEach(sourceId => {
      addEdge(sourceId, entity.id, 'influences', 'entity-source');
    });
  });

  // Practices
  filterByMovement(data.practices, movementId).forEach(practice => {
    normaliseArray(practice.involvedEntityIds).forEach(entityId => {
      addEdge(practice.id, entityId, 'involves', 'practice-entity');
    });
    normaliseArray(practice.instructionsTextIds).forEach(textId => {
      addEdge(practice.id, textId, 'instructions', 'practice-text');
    });
    normaliseArray(practice.supportingClaimIds).forEach(claimId => {
      addEdge(practice.id, claimId, 'supported_by', 'practice-claim');
    });
    normaliseArray(practice.sourceEntityIds).forEach(sourceId => {
      addEdge(sourceId, practice.id, 'authority_for', 'practice-source');
    });
  });

  // Calendar events
  filterByMovement(data.events, movementId).forEach(event => {
    normaliseArray(event.mainPracticeIds).forEach(practiceId => {
      addEdge(event.id, practiceId, 'features', 'event-practice');
    });
    normaliseArray(event.mainEntityIds).forEach(entityId => {
      addEdge(event.id, entityId, 'honours', 'event-entity');
    });
    normaliseArray(event.readingTextIds).forEach(textId => {
      addEdge(event.id, textId, 'reads', 'event-text');
    });
    normaliseArray(event.supportingClaimIds).forEach(claimId => {
      addEdge(event.id, claimId, 'supported_by', 'event-claim');
    });
  });

  // Rules
  filterByMovement(data.rules, movementId).forEach(rule => {
    normaliseArray(rule.supportingTextIds).forEach(textId => {
      addEdge(rule.id, textId, 'supported_by', 'rule-text');
    });
    normaliseArray(rule.supportingClaimIds).forEach(claimId => {
      addEdge(rule.id, claimId, 'supported_by', 'rule-claim');
    });
    normaliseArray(rule.relatedPracticeIds).forEach(practiceId => {
      addEdge(rule.id, practiceId, 'related_practice', 'rule-practice');
    });
    normaliseArray(rule.sourceEntityIds).forEach(sourceId => {
      addEdge(sourceId, rule.id, 'authority_for', 'rule-source');
    });
  });

  // Claims
  filterByMovement(data.claims, movementId).forEach(claim => {
    normaliseArray(claim.sourceTextIds).forEach(textId => {
      addEdge(claim.id, textId, 'cites', 'claim-text');
    });
    normaliseArray(claim.aboutEntityIds).forEach(entityId => {
      addEdge(claim.id, entityId, 'about', 'claim-entity');
    });
    normaliseArray(claim.sourceEntityIds).forEach(sourceId => {
      addEdge(sourceId, claim.id, 'authority_for', 'claim-source');
    });
  });

  // Media
  filterByMovement(data.media, movementId).forEach(asset => {
    normaliseArray(asset.linkedEntityIds).forEach(entityId => {
      addEdge(asset.id, entityId, 'depicts', 'media-entity');
    });
    normaliseArray(asset.linkedPracticeIds).forEach(practiceId => {
      addEdge(asset.id, practiceId, 'depicts', 'media-practice');
    });
    normaliseArray(asset.linkedEventIds).forEach(eventId => {
      addEdge(asset.id, eventId, 'depicts', 'media-event');
    });
    normaliseArray(asset.linkedTextIds).forEach(textId => {
      addEdge(asset.id, textId, 'depicts', 'media-text');
    });
  });

  // Notes
  filterByMovement(data.notes, movementId).forEach(note => {
    if (note.targetId) {
      addEdge(note.id, note.targetId, 'note_on', 'note');
    }
  });

  // Explicit relations between entities (treated as edges)
  filterByMovement(data.relations, movementId).forEach(rel => {
    addEdge(rel.fromEntityId, rel.toEntityId, rel.relationType, rel.id);
  });

  let filteredEdges = edges;
  if (Array.isArray(relationTypeFilter) && relationTypeFilter.length > 0) {
    filteredEdges = edges.filter(edge =>
      relationTypeFilter.includes(edge.relationType)
    );
  }

  let nodeSet = new Set(nodes.keys());
  if (centerNodeId && Number.isFinite(depth)) {
    const adjacency = new Map();
    filteredEdges.forEach(edge => {
      const fromList = adjacency.get(edge.fromId) || [];
      fromList.push(edge.toId);
      adjacency.set(edge.fromId, fromList);

      const toList = adjacency.get(edge.toId) || [];
      toList.push(edge.fromId);
      adjacency.set(edge.toId, toList);
    });

    const visited = new Set([centerNodeId]);
    let frontier = [centerNodeId];
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
      if (!frontier.length) break;
    }
    nodeSet = visited;
    filteredEdges = filteredEdges.filter(
      edge => nodeSet.has(edge.fromId) || nodeSet.has(edge.toId)
    );
  }

  const finalNodes = Array.from(nodeSet)
    .filter(id => nodes.has(id))
    .map(id => nodes.get(id));

  return {
    nodes: finalNodes,
    edges: filteredEdges,
    centerEntityId: centerNodeId
  };
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
  const relations = filterByMovement(data.relations, movementId);

  const sources = new Map();
  const addSourceUsage = (label, key, id) => {
    if (!label) return;
    const record =
      sources.get(label) || {
        label,
        usedByClaims: [],
        usedByRules: [],
        usedByPractices: [],
        usedByEntities: [],
        usedByRelations: []
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
  relations.forEach(relation => {
    normaliseArray(relation.sourcesOfTruth).forEach(label =>
      addSourceUsage(label, 'usedByRelations', relation.id)
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
          entities: [],
          relations: []
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
  relations.forEach(rel => {
    normaliseArray(rel.sourceEntityIds).forEach(entityId =>
      addEntityUsage(entityId, 'relations', rel.id)
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

function buildRelationExplorerViewModel(data, input) {
  const { movementId, relationTypeFilter, entityIdFilter } = input;
  let relations = filterByMovement(data.relations, movementId);

  if (Array.isArray(relationTypeFilter) && relationTypeFilter.length > 0) {
    relations = relations.filter(rel =>
      relationTypeFilter.includes(rel.relationType)
    );
  }
  if (entityIdFilter) {
    relations = relations.filter(
      rel =>
        rel.fromEntityId === entityIdFilter || rel.toEntityId === entityIdFilter
    );
  }

  const entityLookup = buildLookup(data.entities);
  const claimLookup = buildLookup(data.claims);

  const relationRows = relations.map(rel => {
    const from = entityLookup.get(rel.fromEntityId);
    const to = entityLookup.get(rel.toEntityId);
    return {
      id: rel.id,
      relationType: rel.relationType,
      from: from
        ? { id: from.id, name: from.name, kind: from.kind ?? null }
        : { id: rel.fromEntityId, name: rel.fromEntityId, kind: null },
      to: to
        ? { id: to.id, name: to.name, kind: to.kind ?? null }
        : { id: rel.toEntityId, name: rel.toEntityId, kind: null },
      tags: normaliseArray(rel.tags),
      supportingClaims: normaliseArray(rel.supportingClaimIds)
        .map(id => claimLookup.get(id))
        .filter(Boolean)
        .map(claim => ({ id: claim.id, text: claim.text })),
      sourcesOfTruth: normaliseArray(rel.sourcesOfTruth)
    };
  });

  return { relations: relationRows };
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
    MediaAsset: buildLookup(data.media),
    Relation: buildLookup(data.relations)
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
  buildPracticeDetailViewModel,
  buildCalendarViewModel,
  buildClaimsExplorerViewModel,
  buildRuleExplorerViewModel,
  buildAuthorityViewModel,
  buildMediaGalleryViewModel,
  buildRelationExplorerViewModel,
  buildComparisonViewModel,
  buildGraphModel,
  buildNotesViewModel
};

if (typeof module !== 'undefined') {
  module.exports = ViewModels;
} else if (typeof window !== 'undefined') {
  window.ViewModels = ViewModels;
}
