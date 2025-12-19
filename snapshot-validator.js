(function () {
  'use strict';

  const NOTE_TARGET_TYPES = new Set([
    'Movement',
    'TextNode',
    'Entity',
    'Practice',
    'Event',
    'Rule',
    'Claim',
    'MediaAsset'
  ]);

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function buildLookup(items) {
    const map = new Map();
    ensureArray(items).forEach(item => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
    return map;
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function validateIncomingSnapshot(incomingSnapshot) {
    if (!incomingSnapshot || typeof incomingSnapshot !== 'object') {
      throw new Error('Snapshot is missing or not an object.');
    }

    const normalised = StorageService.ensureAllCollections(incomingSnapshot);
    const movementIds = new Set();

    normalised.movements.forEach(movement => {
      assert(movement && movement.id, 'Movement is missing an id.');
      assert(
        typeof movement.id === 'string' && movement.id.trim(),
        `Movement id must be a non-empty string (got ${movement.id})`
      );
      if (movementIds.has(movement.id)) {
        throw new Error(`Duplicate movement id detected: ${movement.id}`);
      }
      movementIds.add(movement.id);
    });

    assert(movementIds.size > 0, 'No movements found in snapshot.');

    // movementId presence + existence
    StorageService.COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      normalised[collName].forEach(item => {
        assert(item && item.id, `${collName} item missing id.`);
        assert(
          typeof item.movementId === 'string' && item.movementId.trim(),
          `${collName} ${item.id} missing movementId.`
        );
        assert(
          movementIds.has(item.movementId),
          `${collName} ${item.id} references missing movement ${item.movementId}.`
        );
      });
    });

    // Duplicate detection per collection
    StorageService.COLLECTION_NAMES.forEach(collName => {
      const seen = new Set();
      normalised[collName].forEach(item => {
        if (seen.has(item.id)) {
          throw new Error(
            `Duplicate id ${item.id} found in collection ${collName}.`
          );
        }
        seen.add(item.id);
      });
    });

    const lookups = {};
    StorageService.COLLECTION_NAMES.forEach(collName => {
      lookups[collName] = buildLookup(normalised[collName]);
    });

    const movementFor = item => item && item.movementId;

    const ensureRef = (collName, item, field, targetColl, id) => {
      if (!id) return;
      const target = lookups[targetColl].get(id);
      if (!target) {
        throw new Error(
          `${collName} ${item.id} has missing reference in ${field}: ${id}`
        );
      }
      if (movementFor(item) && movementFor(target) && movementFor(item) !== movementFor(target)) {
        throw new Error(
          `${collName} ${item.id} references ${id} in ${field}, but movementId does not match.`
        );
      }
    };

    normalised.texts.forEach(text => {
      if (text.parentId) {
        ensureRef('texts', text, 'parentId', 'texts', text.parentId);
      }
      ensureArray(text.mentionsEntityIds).forEach(ref =>
        ensureRef('texts', text, 'mentionsEntityIds', 'entities', ref)
      );
    });

    normalised.textCollections.forEach(tc => {
      ensureArray(tc.rootTextIds).forEach(ref =>
        ensureRef('textCollections', tc, 'rootTextIds', 'texts', ref)
      );
    });

    normalised.practices.forEach(practice => {
      ensureArray(practice.involvedEntityIds).forEach(ref =>
        ensureRef('practices', practice, 'involvedEntityIds', 'entities', ref)
      );
      ensureArray(practice.instructionsTextIds).forEach(ref =>
        ensureRef('practices', practice, 'instructionsTextIds', 'texts', ref)
      );
      ensureArray(practice.supportingClaimIds).forEach(ref =>
        ensureRef('practices', practice, 'supportingClaimIds', 'claims', ref)
      );
      ensureArray(practice.sourceEntityIds).forEach(ref =>
        ensureRef('practices', practice, 'sourceEntityIds', 'entities', ref)
      );
    });

    normalised.events.forEach(event => {
      ensureArray(event.mainPracticeIds).forEach(ref =>
        ensureRef('events', event, 'mainPracticeIds', 'practices', ref)
      );
      ensureArray(event.mainEntityIds).forEach(ref =>
        ensureRef('events', event, 'mainEntityIds', 'entities', ref)
      );
      ensureArray(event.readingTextIds).forEach(ref =>
        ensureRef('events', event, 'readingTextIds', 'texts', ref)
      );
      ensureArray(event.supportingClaimIds).forEach(ref =>
        ensureRef('events', event, 'supportingClaimIds', 'claims', ref)
      );
    });

    normalised.rules.forEach(rule => {
      ensureArray(rule.supportingTextIds).forEach(ref =>
        ensureRef('rules', rule, 'supportingTextIds', 'texts', ref)
      );
      ensureArray(rule.supportingClaimIds).forEach(ref =>
        ensureRef('rules', rule, 'supportingClaimIds', 'claims', ref)
      );
      ensureArray(rule.relatedPracticeIds).forEach(ref =>
        ensureRef('rules', rule, 'relatedPracticeIds', 'practices', ref)
      );
      ensureArray(rule.sourceEntityIds).forEach(ref =>
        ensureRef('rules', rule, 'sourceEntityIds', 'entities', ref)
      );
    });

    normalised.claims.forEach(claim => {
      ensureArray(claim.sourceTextIds).forEach(ref =>
        ensureRef('claims', claim, 'sourceTextIds', 'texts', ref)
      );
      ensureArray(claim.aboutEntityIds).forEach(ref =>
        ensureRef('claims', claim, 'aboutEntityIds', 'entities', ref)
      );
      ensureArray(claim.sourceEntityIds).forEach(ref =>
        ensureRef('claims', claim, 'sourceEntityIds', 'entities', ref)
      );
    });

    normalised.media.forEach(media => {
      ensureArray(media.linkedEntityIds).forEach(ref =>
        ensureRef('media', media, 'linkedEntityIds', 'entities', ref)
      );
      ensureArray(media.linkedPracticeIds).forEach(ref =>
        ensureRef('media', media, 'linkedPracticeIds', 'practices', ref)
      );
      ensureArray(media.linkedEventIds).forEach(ref =>
        ensureRef('media', media, 'linkedEventIds', 'events', ref)
      );
      ensureArray(media.linkedTextIds).forEach(ref =>
        ensureRef('media', media, 'linkedTextIds', 'texts', ref)
      );
    });

    normalised.notes.forEach(note => {
      assert(
        NOTE_TARGET_TYPES.has(note.targetType),
        `Note ${note.id} has invalid targetType: ${note.targetType}`
      );
      const map = {
        Movement: 'movements',
        TextNode: 'texts',
        Entity: 'entities',
        Practice: 'practices',
        Event: 'events',
        Rule: 'rules',
        Claim: 'claims',
        MediaAsset: 'media'
      };
      const targetCollection = map[note.targetType];
      ensureRef('notes', note, 'targetId', targetCollection, note.targetId);
    });

    return normalised;
  }

  function verifyCatholicImport(snapshot) {
    const data = validateIncomingSnapshot(snapshot);

    assert(
      data.movements.length === 1,
      'Expected exactly 1 movement after import.'
    );
    const movement = data.movements[0];
    assert(movement.id === 'mov-catholic', 'Movement id should be mov-catholic.');
    assert(movement.name === 'Catholic Church', 'Movement name should be Catholic Church.');

    const expectCount = (collection, expected) => {
      assert(
        data[collection].length === expected,
        `${collection} expected ${expected} items, found ${data[collection].length}.`
      );
    };

    expectCount('texts', 13);
    expectCount('textCollections', 2);
    expectCount('entities', 23);
    expectCount('practices', 7);
    expectCount('events', 8);
    expectCount('rules', 4);
    expectCount('claims', 8);
    expectCount('media', 5);
    expectCount('notes', 2);

    const countByLevel = level =>
      data.texts.filter(t => t.level === level).length;
    assert(countByLevel('work') === 4, 'texts.work count should be 4.');
    assert(countByLevel('section') === 1, 'texts.section count should be 1.');
    assert(countByLevel('passage') === 7, 'texts.passage count should be 7.');
    assert(countByLevel('line') === 1, 'texts.line count should be 1.');

    const findById = (collection, id) =>
      data[collection].find(item => item.id === id);

    const jesus = findById('entities', 'ent-jesus-christ');
    assert(jesus, 'Entity ent-jesus-christ is missing.');
    assert(jesus.name === 'Jesus Christ', 'Entity ent-jesus-christ has wrong name.');

    const sundayPractice = findById('practices', 'pr-sunday-mass');
    assert(sundayPractice, 'Practice pr-sunday-mass is missing.');
    assert(sundayPractice.name === 'Sunday Mass', 'Practice pr-sunday-mass has wrong name.');

    const sundayEvent = findById('events', 'ev-sunday-mass');
    assert(sundayEvent, 'Event ev-sunday-mass is missing.');
    assert(sundayEvent.name === 'Sunday Mass', 'Event ev-sunday-mass has wrong name.');

    const catechismShelf = findById('textCollections', 'tc-catechism');
    assert(catechismShelf, 'Text collection tc-catechism is missing.');
    assert(
      catechismShelf.name === 'Catechism of the Catholic Church',
      'tc-catechism has wrong name.'
    );

    const nicene = findById('texts', 'txt-nicene-creed');
    assert(nicene, 'Text txt-nicene-creed is missing.');
    const content = (nicene.content || '').trim();
    assert(content, 'Text txt-nicene-creed must have non-empty content.');
    assert(
      content.includes('I believe in one God'),
      'Text txt-nicene-creed content missing expected phrase.'
    );

    return true;
  }

  window.validateIncomingSnapshot = validateIncomingSnapshot;
  window.verifyCatholicImport = verifyCatholicImport;
})();
