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

  function buildReferenceLookups(snapshot, model) {
    const idSets = {};
    const movementIdById = {};
    listCollections(model).forEach(collectionName => {
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      idSets[collectionName] = new Set(records.map(record => record?.id).filter(Boolean));
      const movementMap = new Map();
      records.forEach(record => {
        if (!record?.id) return;
        movementMap.set(record.id, record.movementId);
      });
      movementIdById[collectionName] = movementMap;
    });
    return { idSets, movementIdById };
  }

  function pushIssue(issues, issue, ctx) {
    if (!issue) return;
    if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
    issues.push(issue);
  }

  function validateRefValue({
    collectionName,
    record,
    fieldPath,
    refTarget,
    refValue,
    idSets,
    movementIdById,
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

    if (resolved === 'movements') return;
    const sourceMovementId = record?.movementId;
    const targetMovementId = movementIdById?.[resolved]?.get(refValue);
    if (!sourceMovementId || !targetMovementId) return;
    if (sourceMovementId !== targetMovementId) {
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
          expected: sourceMovementId,
          actual: targetMovementId,
          meta: {
            refTargetCollection: resolved,
            refTargetType: refTarget,
            refValue,
            sourceMovementId,
            targetMovementId
          }
        }),
        ctx
      );
    }
  }

  function validateNoteTarget(note, model, idSets, movementIdById, issues, ctx) {
    if (!note || typeof note.targetType !== 'string' || typeof note.targetId !== 'string') return;
    const targetCollection = resolveCollectionName(model, note.targetType);
    if (!targetCollection || !idSets[targetCollection]) return;

    if (!idSets[targetCollection].has(note.targetId)) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'NOTE_TARGET_MISSING',
          collection: 'notes',
          recordId: note?.id,
          fieldPath: 'targetId',
          message: `Missing note target in ${targetCollection} "${note.targetId}".`,
          expected: targetCollection,
          actual: note.targetId,
          meta: {
            targetType: note.targetType,
            targetCollection,
            targetId: note.targetId
          }
        }),
        ctx
      );
      return;
    }

    if (targetCollection === 'movements') {
      if (note.movementId && note.targetId !== note.movementId) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'NOTE_TARGET_WRONG_MOVEMENT',
            collection: 'notes',
            recordId: note?.id,
            fieldPath: 'targetId',
            message: `Note target movement does not match note movementId.`,
            expected: note.movementId,
            actual: note.targetId,
            meta: {
              targetType: note.targetType,
              targetCollection,
              targetId: note.targetId,
              noteMovementId: note.movementId
            }
          }),
          ctx
        );
      }
      return;
    }

    const targetMovementId = movementIdById?.[targetCollection]?.get(note.targetId);
    if (!note.movementId || !targetMovementId) return;
    if (targetMovementId !== note.movementId) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'NOTE_TARGET_CROSS_MOVEMENT',
          collection: 'notes',
          recordId: note?.id,
          fieldPath: 'targetId',
          message: `Note target crosses movements.`,
          expected: note.movementId,
          actual: targetMovementId,
          meta: {
            targetType: note.targetType,
            targetCollection,
            targetId: note.targetId,
            noteMovementId: note.movementId,
            targetMovementId
          }
        }),
        ctx
      );
    }
  }

  function validateRecordRefs(record, collectionDef, snapshot, model, ctx = {}) {
    const issues = [];
    if (!record || !collectionDef?.fields || !snapshot || !model) return issues;
    const { idSets, movementIdById } = buildReferenceLookups(snapshot, model);
    const collectionName =
      collectionDef.collectionName || collectionDef.collection || collectionDef.typeName || null;
    if (!collectionName) return issues;

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
          movementIdById,
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
            movementIdById,
            issues,
            ctx
          });
        });
      }
    });

    if (collectionName === 'notes') {
      validateNoteTarget(record, model, idSets, movementIdById, issues, ctx);
    }

    return issues;
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    if (!snapshot || !model || !model.collections) return issues;
    const { idSets, movementIdById } = buildReferenceLookups(snapshot, model);

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
                movementIdById,
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
                movementIdById,
                issues,
                ctx
              });
            });
          }
        });

        if (collectionName === 'notes') {
          validateNoteTarget(record, model, idSets, movementIdById, issues, ctx);
        }
      });
    });

    return issues;
  }

  const api = {
    validateRecordRefs,
    validateRefIntegrity
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.RefIntegrity = api;
  }
})();
