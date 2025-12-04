/* data-service.js
 *
 * Domain-level operations for Movement Engineer v3.
 * Contains collection definitions and CRUD helpers that operate on snapshots.
 */

const DataService = (function () {
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

  function addMovement(snapshot) {
    const movement = {
      id: generateId('mov-'),
      name: 'New Movement',
      shortName: 'New',
      summary: '',
      notes: null,
      tags: []
    };
    snapshot.movements.push(movement);
    return movement;
  }

  function removeMovement(snapshot, id) {
    if (!id) return { removed: false, nextMovementId: snapshot.movements[0]?.id || null };

    const movement = snapshot.movements.find(r => r.id === id);
    if (!movement) {
      return { removed: false, nextMovementId: snapshot.movements[0]?.id || null };
    }

    snapshot.movements = snapshot.movements.filter(r => r.id !== id);

    COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      snapshot[collName] = (snapshot[collName] || []).filter(
        item => item.movementId !== id
      );
    });

    return { removed: true, nextMovementId: snapshot.movements[0]?.id || null };
  }

  function upsertItem(snapshot, collectionName, item) {
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) {
      throw new Error('Unknown collection: ' + collectionName);
    }

    const idx = coll.findIndex(it => it.id === item.id);
    if (idx >= 0) {
      coll[idx] = item;
    } else {
      coll.push(item);
    }
    return item;
  }

  function deleteItem(snapshot, collectionName, itemId) {
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) {
      throw new Error('Unknown collection: ' + collectionName);
    }

    const originalLength = coll.length;
    snapshot[collectionName] = coll.filter(it => it.id !== itemId);
    return originalLength !== snapshot[collectionName].length;
  }

  return {
    COLLECTION_NAMES,
    COLLECTIONS_WITH_MOVEMENT_ID,
    generateId,
    createSkeletonItem,
    addMovement,
    removeMovement,
    upsertItem,
    deleteItem
  };
})();
