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

function buildMovementGraph(data, input) {
  const { movementId } = input;

  const nodes = new Map();
  const edges = [];
  const edgeKeys = new Set();

  const ensureNode = (type, item, opts = {}) => {
    if (!item || !item.id) return null;
    if (type !== 'Movement' && item.movementId !== movementId) return null;
    if (nodes.has(item.id)) return nodes.get(item.id);
    const node = {
      id: item.id,
      name: opts.label || item.name || item.title || item.shortText || item.text || item.id,
      kind: opts.kind || item.kind || type,
      type,
      tags: normaliseArray(item.tags)
    };
    nodes.set(node.id, node);
    return node;
  };

  const addEdge = (fromId, toId, relationType, id = null) => {
    if (!fromId || !toId || !nodes.has(fromId) || !nodes.has(toId)) return;
    const key = `${fromId}::${relationType || 'rel'}::${toId}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({
      id: id || key,
      fromId,
      toId,
      relationType: relationType || 'rel'
    });
  };

  const movement = normaliseArray(data.movements).find(m => m.id === movementId);
  if (movement) {
    ensureNode('Movement', movement, { kind: 'movement' });
  }

  const textCollections = filterByMovement(data.textCollections, movementId);
  const texts = filterByMovement(data.texts, movementId);
  const entities = filterByMovement(data.entities, movementId);
  const practices = filterByMovement(data.practices, movementId);
  const events = filterByMovement(data.events, movementId);
  const rules = filterByMovement(data.rules, movementId);
  const claims = filterByMovement(data.claims, movementId);
  const media = filterByMovement(data.media, movementId);
  const notes = filterByMovement(data.notes, movementId);
  const relations = filterByMovement(data.relations, movementId);

  const textLookup = buildLookup(texts);
  const entityLookup = buildLookup(entities);
  const practiceLookup = buildLookup(practices);
  const claimLookup = buildLookup(claims);
  const ruleLookup = buildLookup(rules);
  const eventLookup = buildLookup(events);
  const mediaLookup = buildLookup(media);
  const collectionLookup = buildLookup(textCollections);

  // Nodes: ensure every item in the canon appears in the graph.
  textCollections.forEach(tc => ensureNode('TextCollection', tc, { kind: 'text_collection' }));
  texts.forEach(t => ensureNode('Text', t, { label: t.title || t.label, kind: t.level || 'text' }));
  entities.forEach(e => ensureNode('Entity', e, { kind: e.kind || 'entity' }));
  practices.forEach(p => ensureNode('Practice', p, { kind: p.kind || 'practice' }));
  events.forEach(ev => ensureNode('Event', ev, { kind: ev.recurrence || 'event' }));
  rules.forEach(r => ensureNode('Rule', r, { label: r.shortText || r.id, kind: r.kind || 'rule' }));
  claims.forEach(c => ensureNode('Claim', c, { label: c.text || c.id, kind: c.category || 'claim' }));
  media.forEach(m => ensureNode('Media', m, { label: m.title || m.uri, kind: m.kind || 'media' }));
  notes.forEach(n => ensureNode('Note', n, { label: n.body || n.id, kind: 'note' }));

  // Root edges to the movement for visibility/connectivity.
  if (movement) {
    nodes.forEach(node => {
      if (node.id === movementId) return;
      addEdge(movementId, node.id, 'includes_item');
    });
  }

  // Text hierarchy and mentions.
  texts.forEach(text => {
    if (text.parentId && textLookup.has(text.parentId)) {
      addEdge(text.parentId, text.id, 'contains_text');
    }
    normaliseArray(text.mentionsEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(text.id, entId, 'mentions_entity');
    });
  });

  // Collections to root texts.
  textCollections.forEach(tc => {
    normaliseArray(tc.rootTextIds).forEach(textId => {
      if (textLookup.has(textId)) addEdge(tc.id, textId, 'root_text');
    });
  });

  // Entity sourcing.
  entities.forEach(entity => {
    normaliseArray(entity.sourceEntityIds).forEach(sourceId => {
      if (entityLookup.has(sourceId)) addEdge(entity.id, sourceId, 'source_entity');
    });
  });

  // Practices.
  practices.forEach(practice => {
    normaliseArray(practice.involvedEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(practice.id, entId, 'involves_entity');
    });
    normaliseArray(practice.instructionsTextIds).forEach(textId => {
      if (textLookup.has(textId)) addEdge(practice.id, textId, 'instructions');
    });
    normaliseArray(practice.supportingClaimIds).forEach(claimId => {
      if (claimLookup.has(claimId)) addEdge(practice.id, claimId, 'supported_by_claim');
    });
    normaliseArray(practice.sourceEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(practice.id, entId, 'source_entity');
    });
  });

  // Events / calendar items.
  events.forEach(ev => {
    normaliseArray(ev.mainPracticeIds).forEach(practiceId => {
      if (practiceLookup.has(practiceId)) addEdge(ev.id, practiceId, 'main_practice');
    });
    normaliseArray(ev.mainEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(ev.id, entId, 'features_entity');
    });
    normaliseArray(ev.readingTextIds).forEach(textId => {
      if (textLookup.has(textId)) addEdge(ev.id, textId, 'reading');
    });
    normaliseArray(ev.supportingClaimIds).forEach(claimId => {
      if (claimLookup.has(claimId)) addEdge(ev.id, claimId, 'supported_by_claim');
    });
  });

  // Rules.
  rules.forEach(rule => {
    normaliseArray(rule.supportingTextIds).forEach(textId => {
      if (textLookup.has(textId)) addEdge(rule.id, textId, 'supported_by_text');
    });
    normaliseArray(rule.supportingClaimIds).forEach(claimId => {
      if (claimLookup.has(claimId)) addEdge(rule.id, claimId, 'supported_by_claim');
    });
    normaliseArray(rule.relatedPracticeIds).forEach(practiceId => {
      if (practiceLookup.has(practiceId)) addEdge(rule.id, practiceId, 'related_practice');
    });
    normaliseArray(rule.sourceEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(rule.id, entId, 'source_entity');
    });
  });

  // Claims.
  claims.forEach(claim => {
    normaliseArray(claim.sourceTextIds).forEach(textId => {
      if (textLookup.has(textId)) addEdge(claim.id, textId, 'source_text');
    });
    normaliseArray(claim.aboutEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(claim.id, entId, 'about_entity');
    });
    normaliseArray(claim.sourceEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(claim.id, entId, 'source_entity');
    });
  });

  // Media assets.
  media.forEach(asset => {
    normaliseArray(asset.linkedEntityIds).forEach(entId => {
      if (entityLookup.has(entId)) addEdge(asset.id, entId, 'depicts_entity');
    });
    normaliseArray(asset.linkedPracticeIds).forEach(practiceId => {
      if (practiceLookup.has(practiceId)) addEdge(asset.id, practiceId, 'illustrates_practice');
    });
    normaliseArray(asset.linkedEventIds).forEach(eventId => {
      if (eventLookup.has(eventId)) addEdge(asset.id, eventId, 'documents_event');
    });
    normaliseArray(asset.linkedTextIds).forEach(textId => {
      if (textLookup.has(textId)) addEdge(asset.id, textId, 'linked_text');
    });
  });

  // Notes.
  notes.forEach(note => {
    const targetType = (note.targetType || '').toLowerCase();
    const targetId = note.targetId;
    const targetExists =
      (targetType === 'entity' && entityLookup.has(targetId)) ||
      (targetType === 'practice' && practiceLookup.has(targetId)) ||
      (targetType === 'event' && eventLookup.has(targetId)) ||
      (targetType === 'text' && textLookup.has(targetId)) ||
      (targetType === 'rule' && ruleLookup.has(targetId)) ||
      (targetType === 'claim' && claimLookup.has(targetId)) ||
      (targetType === 'media' && mediaLookup.has(targetId)) ||
      (targetType === 'textcollection' && collectionLookup.has(targetId)) ||
      (targetType === 'movement' && movement && movement.id === targetId);
    if (targetExists) {
      addEdge(note.id, targetId, 'note_on');
    }
  });

  // Explicit relations between entities remain edges in the graph.
  relations.forEach(rel => {
    if (!rel.fromEntityId || !rel.toEntityId) return;
    if (!entityLookup.has(rel.fromEntityId) || !entityLookup.has(rel.toEntityId)) return;
    addEdge(rel.fromEntityId, rel.toEntityId, rel.relationType || 'rel', rel.id);
  });

  return { nodes: Array.from(nodes.values()), edges };
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
  const { movementId, centerEntityId, depth, relationTypeFilter } = input;
  const fullGraph = buildMovementGraph(data, { movementId });

  let edges = fullGraph.edges;
  if (Array.isArray(relationTypeFilter) && relationTypeFilter.length > 0) {
    edges = edges.filter(edge => relationTypeFilter.includes(edge.relationType));
  }

  let nodeIds = new Set(fullGraph.nodes.map(n => n.id));
  if (centerEntityId && Number.isFinite(depth)) {
    const adjacency = new Map();
    edges.forEach(edge => {
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

    nodeIds = visited;
    edges = edges.filter(edge => visited.has(edge.fromId) || visited.has(edge.toId));
  }

  const nodes = fullGraph.nodes.filter(node => nodeIds.has(node.id));

  return {
    nodes,
    edges,
    centerEntityId
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
  buildMovementGraph,
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
  buildNotesViewModel
};

if (typeof module !== 'undefined') {
  module.exports = ViewModels;
} else if (typeof window !== 'undefined') {
  window.ViewModels = ViewModels;
}
