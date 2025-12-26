(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  const cleanId =
    globalScope?.cleanId ||
    function cleanId(raw) {
      if (raw === undefined || raw === null) return null;
      const s = String(raw).trim();
      if (!s) return null;
      const m = s.match(/^\[\[([^\]]+)\]\]$/);
      const unwrapped = m ? m[1] : s;
      const trimmed = String(unwrapped).trim();
      return trimmed || null;
    };

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
    if (ref === '*') return '*';
    if (model.collections[ref]) return ref;
    const entries = Object.values(model.collections);
    const match = entries.find(entry => entry.collectionName === ref || entry.typeName === ref);
    return match?.collectionName || null;
  }

  function buildReferenceLookups(snapshot, model) {
    const idSets = {};
    const movementIdById = {};
    const targetById = new Map();
    listCollections(model).forEach(collectionName => {
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      idSets[collectionName] = new Set(
        records
          .map(record => cleanId(record?.id))
          .filter(Boolean)
      );
      const movementMap = new Map();
      records.forEach(record => {
        const id = cleanId(record?.id);
        if (!id) return;
        const movementId =
          cleanId(record?.movementId) || (collectionName === 'movements' ? id : null);
        movementMap.set(id, movementId);
        if (!targetById.has(id)) {
          targetById.set(id, { collectionName, movementId });
        }
      });
      movementIdById[collectionName] = movementMap;
    });
    return { idSets, movementIdById, targetById };
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
    targetById,
    issues,
    ctx
  }) {
    const cleanedValue = cleanId(refValue);
    if (!cleanedValue) return;
    const resolved = resolveCollectionName(ctx.model, refTarget);
    if (!resolved) return;
    if (resolved === '*') {
      const target = targetById?.get(cleanedValue);
      if (!target) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'REF_MISSING',
            collection: collectionName,
            recordId: record?.id,
            fieldPath,
            message: `Missing reference to "${cleanedValue}".`,
            expected: 'any',
            actual: cleanedValue,
            meta: {
              refTargetCollection: '*',
              refTargetType: refTarget,
              refValue: cleanedValue
            }
          }),
          ctx
        );
        return;
      }
      if (target.collectionName === 'movements') {
        if (record?.movementId && target.movementId && record.movementId !== target.movementId) {
          pushIssue(
            issues,
            validationTypes.createIssue({
              source: 'model',
              severity: 'error',
              code: 'REF_CROSS_MOVEMENT',
              collection: collectionName,
              recordId: record?.id,
              fieldPath,
              message: `Reference crosses movements: ${collectionName}/${record?.id || 'unknown'} ${fieldPath} -> ${target.collectionName}/${cleanedValue} (movementId mismatch).`,
              expected: record.movementId,
              actual: target.movementId,
              meta: {
                refTargetCollection: target.collectionName,
                refTargetType: refTarget,
                refValue: cleanedValue,
                sourceMovementId: record?.movementId,
                targetMovementId: target.movementId
              }
            }),
            ctx
          );
        }
        return;
      }
      if (record?.movementId && target.movementId && record.movementId !== target.movementId) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'REF_CROSS_MOVEMENT',
            collection: collectionName,
            recordId: record?.id,
            fieldPath,
            message: `Reference crosses movements: ${collectionName}/${record?.id || 'unknown'} ${fieldPath} -> ${target.collectionName}/${cleanedValue} (movementId mismatch).`,
            expected: record.movementId,
            actual: target.movementId,
            meta: {
              refTargetCollection: target.collectionName,
              refTargetType: refTarget,
              refValue: cleanedValue,
              sourceMovementId: record?.movementId,
              targetMovementId: target.movementId
            }
          }),
          ctx
        );
      }
      return;
    }
    if (!idSets[resolved]) return;
    if (!idSets[resolved].has(cleanedValue)) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'REF_MISSING',
          collection: collectionName,
          recordId: record?.id,
          fieldPath,
          message: `Missing reference to ${resolved} "${cleanedValue}".`,
          expected: resolved,
          actual: cleanedValue,
          meta: {
            refTargetCollection: resolved,
            refTargetType: refTarget,
            refValue: cleanedValue
          }
        }),
        ctx
      );
      return;
    }

    if (resolved === 'movements') return;
    const sourceMovementId = cleanId(record?.movementId);
    const targetMovementId = movementIdById?.[resolved]?.get(cleanedValue);
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
          message: `Reference crosses movements: ${collectionName}/${record?.id || 'unknown'} ${fieldPath} -> ${resolved}/${cleanedValue} (movementId mismatch).`,
          expected: sourceMovementId,
          actual: targetMovementId,
          meta: {
            refTargetCollection: resolved,
            refTargetType: refTarget,
            refValue: cleanedValue,
            sourceMovementId,
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
    const { idSets, movementIdById, targetById } = buildReferenceLookups(snapshot, model);
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
          targetById,
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
            targetById,
            issues,
            ctx
          });
        });
      }
    });

    return issues;
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    if (!snapshot || !model || !model.collections) return issues;
    const { idSets, movementIdById, targetById } = buildReferenceLookups(snapshot, model);

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
                targetById,
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
                targetById,
                issues,
                ctx
              });
            });
          }
        });
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
