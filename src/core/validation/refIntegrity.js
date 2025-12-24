(function () {
  'use strict';

  function resolveCollectionName(model, ref) {
    if (!ref || !model?.collections) return null;
    if (model.collections[ref]) return ref;
    const match = Object.values(model.collections).find(def => def?.typeName === ref || def?.collectionName === ref);
    return match?.collectionName || null;
  }

  function addIssue(issues, issue, ctx) {
    issues.push(issue);
    if (ctx?.maxIssues && issues.length >= ctx.maxIssues) {
      return false;
    }
    return true;
  }

  function validateRefValue({
    issues,
    collectionName,
    record,
    fieldPath,
    refTarget,
    refValue,
    idSetsByCollection,
    ctx
  }) {
    if (!refTarget) {
      return addIssue(
        issues,
        {
          source: 'model',
          severity: 'warning',
          collection: collectionName,
          recordId: record?.id,
          fieldPath,
          code: 'REF_TARGET_UNKNOWN',
          message: 'Reference target could not be resolved.',
          actual: refValue,
          meta: { refTarget }
        },
        ctx
      );
    }

    const targetSet = idSetsByCollection[refTarget];
    if (!targetSet) {
      return addIssue(
        issues,
        {
          source: 'model',
          severity: 'warning',
          collection: collectionName,
          recordId: record?.id,
          fieldPath,
          code: 'REF_TARGET_UNKNOWN',
          message: 'Reference target collection not found in snapshot.',
          actual: refValue,
          meta: { refTarget }
        },
        ctx
      );
    }

    if (typeof refValue !== 'string' || !targetSet.has(refValue)) {
      return addIssue(
        issues,
        {
          source: 'model',
          severity: 'error',
          collection: collectionName,
          recordId: record?.id,
          fieldPath,
          code: 'REF_MISSING',
          message: `Missing reference target ${refValue}.`,
          actual: refValue,
          meta: { refTargetCollection: refTarget, refValue }
        },
        ctx
      );
    }

    return true;
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    if (!model?.collections) return issues;
    const idSetsByCollection = {};

    Object.keys(model.collections).forEach(collectionName => {
      const records = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
      idSetsByCollection[collectionName] = new Set(
        records.map(record => record?.id).filter(id => typeof id === 'string' && id)
      );
    });

    Object.entries(model.collections).some(([collectionName, collectionDef]) => {
      const fields = collectionDef?.fields || {};
      const records = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];

      for (const record of records) {
        for (const [fieldName, fieldDef] of Object.entries(fields)) {
          const ref = fieldDef?.ref;
          const itemsRef = fieldDef?.items?.ref;
          const value = record?.[fieldName];

          if (ref) {
            const targetCollection = resolveCollectionName(model, ref);
            if (value !== undefined && value !== null) {
              if (!validateRefValue({
                issues,
                collectionName,
                record,
                fieldPath: fieldName,
                refTarget: targetCollection,
                refValue: value,
                idSetsByCollection,
                ctx
              })) {
                return true;
              }
            }
          }

          if (itemsRef && Array.isArray(value)) {
            const targetCollection = resolveCollectionName(model, itemsRef);
            for (let i = 0; i < value.length; i += 1) {
              const itemValue = value[i];
              if (itemValue === undefined || itemValue === null) continue;
              if (!validateRefValue({
                issues,
                collectionName,
                record,
                fieldPath: `${fieldName}[${i}]`,
                refTarget: targetCollection,
                refValue: itemValue,
                idSetsByCollection,
                ctx
              })) {
                return true;
              }
            }
          }

          if (ctx?.maxIssues && issues.length >= ctx.maxIssues) {
            return true;
          }
        }
        if (ctx?.maxIssues && issues.length >= ctx.maxIssues) {
          return true;
        }
      }
      return false;
    });

    return issues;
  }

  const RefIntegrity = {
    validateRefIntegrity
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefIntegrity;
  }

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  if (globalScope) {
    const namespace = (globalScope.MovementEngineerValidation =
      globalScope.MovementEngineerValidation || {});
    namespace.refIntegrity = RefIntegrity;
  }
})();
