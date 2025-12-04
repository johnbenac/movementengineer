(function (global) {
  'use strict';

  const COLLECTION_NAMES = [
    'movements',
    'textCollections',
    'texts',
    'entities',
    'practices',
    'events',
    'rules',
    'claims',
    'media',
    'notes',
    'relations'
  ];

  const COLLECTIONS_WITH_MOVEMENT_ID = new Set([
    'textCollections',
    'texts',
    'entities',
    'practices',
    'events',
    'rules',
    'claims',
    'media',
    'notes',
    'relations'
  ]);

  function generateId(prefix) {
    const base = prefix || 'id-';
    return base + Math.random().toString(36).substr(2, 9);
  }

  function getMovementById(snapshot, id) {
    if (!snapshot || !Array.isArray(snapshot.movements)) return null;
    return snapshot.movements.find(r => r.id === id) || null;
  }

  function addMovement(snapshot) {
    const movement = {
      id: generateId('mov-'),
      name: 'New Movement',
      shortName: 'New',
      summary: '',
      notes: null,
      tags: []
    };
    if (snapshot && Array.isArray(snapshot.movements)) {
      snapshot.movements.push(movement);
    }
    return movement;
  }

  function removeMovement(snapshot, movementId) {
    if (!snapshot || !movementId) return false;
    const hasMovement = getMovementById(snapshot, movementId);
    if (!hasMovement) return false;

    snapshot.movements = (snapshot.movements || []).filter(
      r => r.id !== movementId
    );

    COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      snapshot[collName] = (snapshot[collName] || []).filter(
        item => item.movementId !== movementId
      );
    });

    return true;
  }

  function createSkeletonItem(collectionName, movementId) {
    const rid = movementId || null;

    switch (collectionName) {
      case 'entities':
        return {
          id: generateId('ent-'),
          movementId: rid,
          name: 'New entity',
          kind: null,
          summary: '',
          notes: null,
          tags: [],
          sourcesOfTruth: [],
          sourceEntityIds: []
        };
      case 'practices':
        return {
          id: generateId('prc-'),
          movementId: rid,
          name: 'New practice',
          kind: null,
          description: '',
          frequency: 'weekly',
          isPublic: true,
          notes: null,
          tags: [],
          involvedEntityIds: [],
          instructionsTextIds: [],
          supportingClaimIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: []
        };
      case 'events':
        return {
          id: generateId('evt-'),
          movementId: rid,
          name: 'New event',
          description: '',
          recurrence: 'yearly',
          timingRule: 'TBD',
          notes: null,
          tags: [],
          mainPracticeIds: [],
          mainEntityIds: [],
          readingTextIds: [],
          supportingClaimIds: []
        };
      case 'rules':
        return {
          id: generateId('rul-'),
          movementId: rid,
          shortText: 'New rule',
          kind: 'must_do',
          details: null,
          appliesTo: [],
          domain: [],
          tags: [],
          supportingTextIds: [],
          supportingClaimIds: [],
          relatedPracticeIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: []
        };
      case 'claims':
        return {
          id: generateId('clm-'),
          movementId: rid,
          text: 'New claim',
          category: null,
          tags: [],
          sourceTextIds: [],
          aboutEntityIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: [],
          notes: null
        };
      case 'textCollections':
        return {
          id: generateId('tc-'),
          movementId: rid,
          name: 'New text collection',
          description: null,
          tags: [],
          rootTextIds: []
        };
      case 'texts':
        return {
          id: generateId('txt-'),
          movementId: rid,
          parentId: null,
          level: 'work',
          title: 'New text',
          label: '1',
          content: '',
          mainFunction: null,
          tags: [],
          mentionsEntityIds: []
        };
      case 'media':
        return {
          id: generateId('med-'),
          movementId: rid,
          kind: 'image',
          uri: '',
          title: 'New media asset',
          description: null,
          tags: [],
          linkedEntityIds: [],
          linkedPracticeIds: [],
          linkedEventIds: [],
          linkedTextIds: []
        };
      case 'notes':
        return {
          id: generateId('note-'),
          movementId: rid,
          targetType: 'Entity',
          targetId: '',
          author: null,
          body: '',
          context: null,
          tags: []
        };
      case 'relations':
        return {
          id: generateId('rel-'),
          movementId: rid,
          fromEntityId: '',
          toEntityId: '',
          relationType: 'related_to',
          tags: [],
          supportingClaimIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: [],
          notes: null
        };
      default:
        return { id: generateId('id-') };
    }
  }

  function getLabelForItem(item) {
    if (!item || typeof item !== 'object') return '';
    return (
      item.name ||
      item.title ||
      item.shortText ||
      item.text ||
      item.id ||
      '[no label]'
    );
  }

  function mapIdToLabel(snapshot, collectionName, id) {
    if (!id) return '—';
    if (collectionName === 'movements') {
      const movement = getMovementById(snapshot, id);
      return movement ? movement.name || movement.id : id;
    }
    const coll = snapshot ? snapshot[collectionName] : [];
    const item = Array.isArray(coll) ? coll.find(it => it.id === id) : null;
    return item ? getLabelForItem(item) : id;
  }

  function upsertItem(snapshot, collectionName, obj) {
    if (!snapshot || !collectionName || !obj) return null;
    if (!snapshot[collectionName]) snapshot[collectionName] = [];
    const coll = snapshot[collectionName];
    const idx = coll.findIndex(it => it.id === obj.id);
    if (idx >= 0) {
      coll[idx] = obj;
    } else {
      coll.push(obj);
    }
    return obj;
  }

  function removeItem(snapshot, collectionName, itemId) {
    if (!snapshot || !collectionName || !itemId) return false;
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) return false;
    const existing = coll.some(it => it.id === itemId);
    if (!existing) return false;
    snapshot[collectionName] = coll.filter(it => it.id !== itemId);
    return true;
  }

  global.Domain = {
    COLLECTION_NAMES,
    COLLECTIONS_WITH_MOVEMENT_ID,
    generateId,
    getMovementById,
    addMovement,
    removeMovement,
    createSkeletonItem,
    getLabelForItem,
    mapIdToLabel,
    upsertItem,
    removeItem
  };
})(window);
