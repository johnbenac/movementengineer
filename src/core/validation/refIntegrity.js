(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function getValidationTypes() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./validationTypes');
    }
    return globalScope?.ValidationTypes || null;
  }

  const validationTypes = getValidationTypes();

  function listCollections(model) {
    if (!model) return [];
    if (Array.isArray(model.collectionOrder)) return model.collectionOrder.slice();
    return Object.keys(model.collections || {}).sort();
  }

  function resolveCollectionName(model, ref) {
    if (!ref || !model || !model.collections) return null;
    if (model.collections[ref]) return ref;
    const entries = Object.values(model.collections);
    const match = entries.find(entry => entry.collectionName === ref || entry.typeName === ref);
    return match?.collectionName || null;
  }

  function buildRefIndex(snapshot, model) {
    const idSets = {};
    const recordById = {};
    listCollections(model).forEach(collectionName => {
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      const idSet = new Set();
      const recordMap = new Map();
      records.forEach(record => {
        const id = record?.id;
        if (!id) return;
        idSet.add(id);
        recordMap.set(id, record);
      });
      idSets[collectionName] = idSet;
      recordById[collectionName] = recordMap;
    });
    return { idSets, recordById };
  }

  function pushIssue(issues, issue, ctx) {
    if (!issue) return;
    if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
    issues.push(issue);
  }

  function shouldCheckMovementMismatch({ targetCollection, record, targetRecord }) {
    if (targetCollection === 'movements') return false;
    const sourceMovementId = record?.movementId;
    const targetMovementId = targetRecord?.movementId;
    if (!sourceMovementId || !targetMovementId) return false;
    return sourceMovementId !== targetMovementId;
  }

  function validateRefValue({
    collectionName,
    record,
    fieldPath,
    refTarget,
    refValue,
    idSets,
    recordById,
    issues,
    ctx
  }) {
    if (typeof refValue !== 'string') return;
    const resolved = resolveCollectionName(ctx.model, refTarget);
    if (!resolved || !idSets[resolved]) return;
    if (!idSets[resolved].has(refValue)) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'REF_MISSING',
          collection: collectionName,
          recordId: record?.id,
          fieldPath,
          message: `Missing reference to ${resolved} "${refValue}".`,
          expected: resolved,
          actual: refValue,
          meta: {
            refTargetCollection: resolved,
            refTargetType: refTarget,
            refValue
          }
        }),
        ctx
      );
      return;
    }

    const targetRecord = recordById?.[resolved]?.get(refValue);
    if (
      targetRecord &&
      shouldCheckMovementMismatch({ targetCollection: resolved, record, targetRecord })
    ) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'REF_CROSS_MOVEMENT',
          collection: collectionName,
          recordId: record?.id,
          fieldPath,
          message: `Reference crosses movements: ${collectionName}/${record?.id || 'unknown'} ${fieldPath} -> ${resolved}/${refValue} (movementId mismatch).`,
          expected: record?.movementId,
          actual: targetRecord?.movementId,
          meta: {
            refTargetCollection: resolved,
            refTargetType: refTarget,
            refValue,
            sourceMovementId: record?.movementId,
            targetMovementId: targetRecord?.movementId
          }
        }),
        ctx
      );
    }
  }

  function validateNoteTarget(note, model, recordById, ctx) {
    const issues = [];
    const targetType = note?.targetType;
    const targetId = note?.targetId;
    if (!targetType || typeof targetId !== 'string') return issues;
    const targetCollection = resolveCollectionName(model, targetType);
    if (!targetCollection) return issues;
    const targetMap = recordById?.[targetCollection];
    if (!targetMap) return issues;
    const targetRecord = targetMap.get(targetId);
    if (!targetRecord) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'NOTE_TARGET_MISSING',
          collection: 'notes',
          recordId: note?.id,
          fieldPath: 'targetId',
          message: `Missing note target ${targetCollection} "${targetId}".`,
          expected: targetCollection,
          actual: targetId,
          meta: {
            targetType,
            targetCollection,
            targetId
          }
        }),
        ctx
      );
      return issues;
    }

    if (targetCollection === 'movements') {
      if (note?.movementId && targetId !== note?.movementId) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'NOTE_TARGET_WRONG_MOVEMENT',
            collection: 'notes',
            recordId: note?.id,
            fieldPath: 'targetId',
            message: `Note target movement mismatch: expected ${note?.movementId}, received ${targetId}.`,
            expected: note?.movementId,
            actual: targetId,
            meta: {
              targetType,
              targetCollection,
              targetId,
              noteMovementId: note?.movementId
            }
          }),
          ctx
        );
      }
      return issues;
    }

    const noteMovementId = note?.movementId;
    const targetMovementId = targetRecord?.movementId;
    if (noteMovementId && targetMovementId && noteMovementId !== targetMovementId) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'NOTE_TARGET_CROSS_MOVEMENT',
          collection: 'notes',
          recordId: note?.id,
          fieldPath: 'targetId',
          message: `Note target crosses movements: notes/${note?.id || 'unknown'} -> ${targetCollection}/${targetId}.`,
          expected: noteMovementId,
          actual: targetMovementId,
          meta: {
            targetType,
            targetCollection,
            targetId,
            noteMovementId,
            targetMovementId
          }
        }),
        ctx
      );
    }

    return issues;
  }

  function validateNoteTargets(snapshot, model, recordById, ctx) {
    const issues = [];
    const notes = Array.isArray(snapshot?.notes) ? snapshot.notes : [];
    notes.forEach(note => {
      if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
      const noteIssues = validateNoteTarget(note, model, recordById, ctx);
      noteIssues.forEach(issue => pushIssue(issues, issue, ctx));
    });
    return issues;
  }

  function validateRecordRefs(record, collectionDef, snapshot, model, ctx = {}) {
    const issues = [];
    if (!record || !collectionDef || !snapshot || !model?.collections) return issues;
    const { idSets, recordById } = buildRefIndex(snapshot, model);
    const collectionName = collectionDef.collectionName || collectionDef.collection || collectionDef.typeName;
    if (!collectionDef?.fields) return issues;

    Object.entries(collectionDef.fields).forEach(([fieldName, fieldDef]) => {
      if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
      if (fieldDef?.ref) {
        const value = record?.[fieldName];
        if (typeof value !== 'string') return;
        validateRefValue({
          collectionName,
          record,
          fieldPath: fieldName,
          refTarget: fieldDef.ref,
          refValue: value,
          idSets,
          recordById,
          issues,
          ctx
        });
      }

      if (fieldDef?.type === 'array' && fieldDef.items?.ref) {
        const value = record?.[fieldName];
        if (!Array.isArray(value)) return;
        value.forEach((itemValue, index) => {
          if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
          validateRefValue({
            collectionName,
            record,
            fieldPath: `${fieldName}[${index}]`,
            refTarget: fieldDef.items.ref,
            refValue: itemValue,
            idSets,
            recordById,
            issues,
            ctx
          });
        });
      }
    });

    if (collectionName === 'notes') {
      const noteIssues = validateNoteTarget(record, model, recordById, ctx);
      noteIssues.forEach(issue => pushIssue(issues, issue, ctx));
    }

    return issues;
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    if (!snapshot || !model || !model.collections) return issues;
    const { idSets, recordById } = buildRefIndex(snapshot, model);

    listCollections(model).forEach(collectionName => {
      if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
      const collectionDef = model.collections[collectionName];
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      if (!collectionDef?.fields) return;

      records.forEach(record => {
        if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
        Object.entries(collectionDef.fields).forEach(([fieldName, fieldDef]) => {
          if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;

          if (fieldDef?.ref) {
            const value = record?.[fieldName];
            if (typeof value !== 'string') return;
            validateRefValue({
              collectionName,
              record,
              fieldPath: fieldName,
              refTarget: fieldDef.ref,
              refValue: value,
              idSets,
              recordById,
              issues,
              ctx
            });
          }

          if (fieldDef?.type === 'array' && fieldDef.items?.ref) {
            const value = record?.[fieldName];
            if (!Array.isArray(value)) return;
            value.forEach((itemValue, index) => {
              if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
              validateRefValue({
                collectionName,
                record,
                fieldPath: `${fieldName}[${index}]`,
                refTarget: fieldDef.items.ref,
                refValue: itemValue,
                idSets,
                recordById,
                issues,
                ctx
              });
            });
          }
        });
      });
    });

    const noteIssues = validateNoteTargets(snapshot, model, recordById, ctx);
    noteIssues.forEach(issue => pushIssue(issues, issue, ctx));

    return issues;
  }

  const api = {
    validateRefIntegrity,
    validateRecordRefs
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.RefIntegrity = api;
  }
})();
