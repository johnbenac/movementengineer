/* global StorageService */

(function () {
  'use strict';

  const COLLECTION_NAMES = StorageService.getCollectionNames();
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

  let snapshot = StorageService.createEmptySnapshot();

  function setSnapshot(next) {
    snapshot = StorageService.ensureAllCollections(next);
    return snapshot;
  }

  function getSnapshot() {
    return snapshot;
  }

  function generateId(prefix) {
    const base = prefix || 'id-';
    return base + Math.random().toString(36).substr(2, 9);
  }

  function getMovementById(id) {
    return snapshot.movements.find(r => r.id === id) || null;
  }

  function addMovement() {
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

  function deleteMovement(id) {
    if (!id) return null;
    const movement = getMovementById(id);
    if (!movement) return null;

    snapshot.movements = snapshot.movements.filter(r => r.id !== id);

    COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      snapshot[collName] = snapshot[collName].filter(item => item.movementId !== id);
    });

    return movement;
  }

  function updateMovement(id, updates) {
    const movement = getMovementById(id);
    if (!movement) return null;
    Object.assign(movement, updates);
    return movement;
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

  function upsertItem(collectionName, obj) {
    if (!obj || !obj.id) return null;
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) return null;

    const idx = coll.findIndex(it => it.id === obj.id);
    if (idx >= 0) {
      coll[idx] = obj;
    } else {
      coll.push(obj);
    }
    return obj;
  }

  function createItem(collectionName, movementId) {
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) return null;
    const skeleton = createSkeletonItem(collectionName, movementId);
    coll.push(skeleton);
    return skeleton;
  }

  function deleteItem(collectionName, id) {
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) return null;
    const item = coll.find(it => it.id === id);
    if (!item) return null;
    snapshot[collectionName] = coll.filter(it => it.id !== id);
    return item;
  }

  function importSnapshot(data) {
    return setSnapshot(StorageService.ensureAllCollections(data));
  }

  function resetSnapshot() {
    return setSnapshot(StorageService.createEmptySnapshot());
  }

  function loadSample(sampleData) {
    return setSnapshot(StorageService.ensureAllCollections(sampleData));
  }

  window.DomainService = {
    COLLECTION_NAMES,
    COLLECTIONS_WITH_MOVEMENT_ID,
    setSnapshot,
    getSnapshot,
    getMovementById,
    addMovement,
    updateMovement,
    deleteMovement,
    createSkeletonItem,
    createItem,
    upsertItem,
    deleteItem,
    importSnapshot,
    resetSnapshot,
    loadSample
  };
})();
