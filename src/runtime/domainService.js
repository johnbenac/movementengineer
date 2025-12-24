/* domainService.js
 *
 * Snapshot mutation helpers for Movement Engineer.
 * Keeps CRUD and data-shaping logic separate from the UI layer.
 */

(function () {
  'use strict';

  const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
  const ModelRegistry = globalScope.ModelRegistry;
  const StorageService = globalScope.StorageService || {};
  const DEFAULT_SPEC_VERSION = ModelRegistry?.DEFAULT_SPEC_VERSION || '2.3';

  function listCollectionNames(specVersion) {
    if (ModelRegistry?.listCollections) {
      return ModelRegistry.listCollections(specVersion || DEFAULT_SPEC_VERSION);
    }
    return Array.isArray(StorageService.COLLECTION_NAMES)
      ? [...StorageService.COLLECTION_NAMES]
      : [];
  }

  const COLLECTION_NAMES = listCollectionNames(DEFAULT_SPEC_VERSION);
  const COLLECTIONS_WITH_MOVEMENT_ID = StorageService.COLLECTIONS_WITH_MOVEMENT_ID || new Set();

  function generateId(prefix) {
    const base = prefix || 'id-';
    return base + Math.random().toString(36).substr(2, 9);
  }

  function addMovement(snapshot, overrides = {}) {
    const id = overrides.id || generateId('mov-');
    const movement = {
      id,
      movementId: overrides.movementId || id,
      name: 'New Movement',
      shortName: 'New',
      summary: '',
      notes: null,
      tags: [],
      ...overrides
    };
    snapshot.movements.push(movement);
    return movement;
  }

  function updateMovement(snapshot, movementId, updates) {
    if (!movementId) return null;
    const movement = snapshot.movements.find(m => m.id === movementId);
    if (!movement) return null;
    Object.assign(movement, updates);
    movement.movementId = movement.id;
    return movement;
  }

  function deleteMovement(snapshot, movementId) {
    if (!movementId) return null;
    const movement = snapshot.movements.find(m => m.id === movementId);
    if (!movement) return null;

    snapshot.movements = snapshot.movements.filter(m => m.id !== movementId);
    COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      snapshot[collName] = (snapshot[collName] || []).filter(
        item => item.movementId !== movementId
      );
    });

    const fallbackMovement = snapshot.movements[0] ? snapshot.movements[0].id : null;
    return fallbackMovement;
  }

  function createSkeletonItem(collectionName, movementId) {
    if (COLLECTIONS_WITH_MOVEMENT_ID.has(collectionName) && !movementId) {
      throw new Error('movementId is required to create items');
    }

    const rid = movementId;

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
      default:
        return { id: generateId('id-') };
    }
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

  function addNewItem(snapshot, collectionName, movementId) {
    const skeleton = createSkeletonItem(collectionName, movementId);
    upsertItem(snapshot, collectionName, skeleton);
    return skeleton;
  }

  function deleteItem(snapshot, collectionName, itemId) {
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) {
      throw new Error('Unknown collection: ' + collectionName);
    }
    const before = coll.length;
    snapshot[collectionName] = coll.filter(it => it.id !== itemId);
    return before !== snapshot[collectionName].length;
  }

  globalScope.DomainService = {
    COLLECTION_NAMES,
    COLLECTIONS_WITH_MOVEMENT_ID,
    listCollectionNames,
    generateId,
    addMovement,
    updateMovement,
    deleteMovement,
    createSkeletonItem,
    upsertItem,
    addNewItem,
    deleteItem
  };
})();
