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

  function buildReferenceIndex(snapshot, model) {
    const idSets = {};
    const recordById = {};
    listCollections(model).forEach(collectionName => {
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      idSets[collectionName] = new Set(records.map(record => record?.id).filter(Boolean));
      const map = new Map();
      records.forEach(record => {
        if (record?.id) {
          map.set(record.id, record);
        }
      });
      recordById[collectionName] = map;
    });
    return { idSets, recordById };
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
    model,
    idSets,
    recordById,
    issues,
    ctx
  }) {
    if (typeof refValue !== 'string') return;
    const resolved = resolveCollectionName(model, refTarget);
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

    if (resolved !== 'movements') {
      const targetRecord = recordById?.[resolved]?.get(refValue);
      if (record?.movementId && targetRecord?.movementId && record.movementId !== targetRecord.movementId) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'REF_CROSS_MOVEMENT',
            collection: collectionName,
            recordId: record?.id,
            fieldPath,
            message: `Reference crosses movements: ${collectionName}/${record?.id} ${fieldPath} -> ${resolved}/${refValue} (movementId mismatch).`,
            expected: record.movementId,
            actual: targetRecord.movementId,
            meta: {
              refTargetCollection: resolved,
              refTargetType: refTarget,
              refValue,
              sourceMovementId: record.movementId,
              targetMovementId: targetRecord.movementId
            }
          }),
          ctx
        );
      }
    }
  }

  function validateNoteTarget(note, index, { idSets, recordById, model, issues, ctx }) {
    if (!note) return;
    const targetType = note.targetType;
    const targetId = note.targetId;
    if (typeof targetType !== 'string' || typeof targetId !== 'string') return;
    const targetCollection = resolveCollectionName(model, targetType);
    const hasTarget = targetCollection && idSets[targetCollection]?.has(targetId);

    if (!hasTarget) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'NOTE_TARGET_MISSING',
          collection: 'notes',
          recordId: note?.id,
          fieldPath: 'targetId',
          message: `Missing note target for ${targetType} "${targetId}".`,
          expected: targetCollection || targetType,
          actual: targetId,
          meta: {
            targetType,
            targetCollection,
            targetId,
            index
          }
        }),
        ctx
      );
      return;
    }

    if (targetCollection === 'movements') {
      if (note?.movementId && note.movementId !== targetId) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'NOTE_TARGET_WRONG_MOVEMENT',
            collection: 'notes',
            recordId: note?.id,
            fieldPath: 'targetId',
            message: `Note target movement must match note.movementId (${note.movementId}).`,
            expected: note.movementId,
            actual: targetId,
            meta: {
              targetType,
              targetCollection,
              targetId,
              noteMovementId: note.movementId
            }
          }),
          ctx
        );
      }
      return;
    }

    const targetRecord = recordById?.[targetCollection]?.get(targetId);
    if (note?.movementId && targetRecord?.movementId && note.movementId !== targetRecord.movementId) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'NOTE_TARGET_CROSS_MOVEMENT',
          collection: 'notes',
          recordId: note?.id,
          fieldPath: 'targetId',
          message: `Note target crosses movements: ${targetCollection}/${targetId} is in ${targetRecord.movementId}.`,
          expected: note.movementId,
          actual: targetRecord.movementId,
          meta: {
            targetType,
            targetCollection,
            targetId,
            noteMovementId: note.movementId,
            targetMovementId: targetRecord.movementId
          }
        }),
        ctx
      );
    }
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    if (!snapshot || !model || !model.collections) return issues;
    const { idSets, recordById } = buildReferenceIndex(snapshot, model);

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
              model,
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
                model,
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

    const notes = Array.isArray(snapshot.notes) ? snapshot.notes : [];
    notes.forEach((note, index) => {
      if (ctx?.maxIssues && issues.length >= ctx.maxIssues) return;
      validateNoteTarget(note, index, { idSets, recordById, model, issues, ctx });
    });

    return issues;
  }

  function validateRecordRefs(record, collectionDef, snapshot, model, ctx = {}) {
    const issues = [];
    if (!record || !collectionDef?.fields || !snapshot || !model || !model.collections) return issues;
    const collectionName = collectionDef.collectionName || collectionDef.collection || collectionDef.typeName;
    const { idSets, recordById } = buildReferenceIndex(snapshot, model);

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
          model,
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
            model,
            idSets,
            recordById,
            issues,
            ctx
          });
        });
      }
    });

    if (collectionName === 'notes') {
      validateNoteTarget(record, null, { idSets, recordById, model, issues, ctx });
    }

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
