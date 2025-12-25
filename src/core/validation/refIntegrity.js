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

  function buildLookups(snapshot, model) {
    const idSets = {};
    const recordById = {};
    listCollections(model).forEach(collectionName => {
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      const ids = new Set();
      const lookup = new Map();
      records.forEach(record => {
        const id = record?.id;
        if (!id) return;
        ids.add(id);
        lookup.set(id, record);
      });
      idSets[collectionName] = ids;
      recordById[collectionName] = lookup;
    });
    return { idSets, recordById };
  }

  function shouldCheckMovement(sourceRecord, targetRecord, targetCollectionName) {
    if (targetCollectionName === 'movements') return false;
    if (!sourceRecord?.movementId || !targetRecord?.movementId) return false;
    return sourceRecord.movementId !== targetRecord.movementId;
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
    recordById,
    issues,
    ctx
  }) {
    if (typeof refValue !== 'string') return;
    const resolved = resolveCollectionName(ctx.model, refTarget);
    if (!resolved || !idSets[resolved]) return;
    const targetRecord = recordById?.[resolved]?.get(refValue) || null;
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

    if (shouldCheckMovement(record, targetRecord, resolved)) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'REF_CROSS_MOVEMENT',
          collection: collectionName,
          recordId: record?.id,
          fieldPath,
          message: `Reference crosses movements: ${collectionName}/${record?.id} ${fieldPath} -> ${resolved}/${refValue} (movementId mismatch)`,
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

  function validateRecordFields({ collectionName, record, collectionDef, lookups, issues, ctx }) {
    if (!collectionDef?.fields) return;
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
          idSets: lookups.idSets,
          recordById: lookups.recordById,
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
            idSets: lookups.idSets,
            recordById: lookups.recordById,
            issues,
            ctx
          });
        });
      }
    });
  }

  function validateNoteTarget({ note, issues, ctx, lookups }) {
    if (!note) return;
    const targetType = note.targetType;
    const targetId = note.targetId;
    if (typeof targetType !== 'string' || typeof targetId !== 'string') return;
    const targetCollection = resolveCollectionName(ctx.model, targetType);
    if (!targetCollection) return;
    const targetRecord = lookups.recordById?.[targetCollection]?.get(targetId) || null;
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
      return;
    }

    if (targetCollection === 'movements') {
      if (note?.movementId !== targetId) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'NOTE_TARGET_WRONG_MOVEMENT',
            collection: 'notes',
            recordId: note?.id,
            fieldPath: 'targetId',
            message: `Note target must match its movementId (${note?.movementId}).`,
            expected: note?.movementId,
            actual: targetId,
            meta: {
              targetType,
              targetCollection,
              targetId,
              movementId: note?.movementId
            }
          }),
          ctx
        );
      }
      return;
    }

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
          message: `Note target crosses movements: notes/${note?.id} -> ${targetCollection}/${targetId}.`,
          expected: note?.movementId,
          actual: targetRecord?.movementId,
          meta: {
            targetType,
            targetCollection,
            targetId,
            movementId: note?.movementId,
            targetMovementId: targetRecord?.movementId
          }
        }),
        ctx
      );
    }
  }

  function validateRecordRefs(record, collectionDef, ctx = {}) {
    const issues = [];
    if (!record || !collectionDef || !ctx?.snapshot || !ctx?.model) return issues;
    const lookups = buildLookups(ctx.snapshot, ctx.model);
    const collectionName = collectionDef.collectionName || collectionDef.collection || collectionDef.typeName;
    validateRecordFields({ collectionName, record, collectionDef, lookups, issues, ctx });
    if (collectionName === 'notes') {
      validateNoteTarget({ note: record, issues, ctx, lookups });
    }
    return issues;
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    if (!snapshot || !model || !model.collections) return issues;
    const resolvedCtx = ctx?.model ? ctx : { ...ctx, model };
    const lookups = buildLookups(snapshot, model);

    listCollections(model).forEach(collectionName => {
      if (resolvedCtx?.maxIssues && issues.length >= resolvedCtx.maxIssues) return;
      const collectionDef = model.collections[collectionName];
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      if (!collectionDef?.fields) return;

      records.forEach(record => {
        if (resolvedCtx?.maxIssues && issues.length >= resolvedCtx.maxIssues) return;
        validateRecordFields({ collectionName, record, collectionDef, lookups, issues, ctx: resolvedCtx });
      });
    });

    const notes = Array.isArray(snapshot.notes) ? snapshot.notes : [];
    notes.forEach(note => {
      if (resolvedCtx?.maxIssues && issues.length >= resolvedCtx.maxIssues) return;
      validateNoteTarget({ note, issues, ctx: resolvedCtx, lookups });
    });

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
