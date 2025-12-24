(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function listCollections(model) {
    if (Array.isArray(model.collectionOrder)) {
      return model.collectionOrder.slice();
    }
    return Object.keys(model.collections || {}).sort();
  }

  function resolveCollectionName(model, refValue) {
    if (!refValue) return null;
    if (model.collections && model.collections[refValue]) {
      return refValue;
    }
    const entries = Object.entries(model.collections || {});
    const match = entries.find(([, def]) => def.typeName === refValue || def.collectionName === refValue);
    return match ? match[0] : null;
  }

  function createIssue({
    code,
    collection,
    recordId,
    fieldPath,
    message,
    expected,
    actual,
    meta
  }) {
    return {
      source: 'model',
      severity: 'error',
      code,
      collection,
      recordId,
      fieldPath,
      message,
      expected,
      actual,
      meta
    };
  }

  function pushIssue(issues, issue, ctx) {
    issues.push(issue);
    if (ctx.maxIssues && issues.length >= ctx.maxIssues) {
      return false;
    }
    return true;
  }

  function buildIdSets(snapshot, model) {
    const idSetsByCollection = {};
    listCollections(model).forEach(collectionName => {
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      idSetsByCollection[collectionName] = new Set(
        records.map(record => record && record.id).filter(Boolean)
      );
    });
    return idSetsByCollection;
  }

  function validateRefValue({
    collectionName,
    recordId,
    fieldPath,
    refValue,
    refTarget,
    idSetsByCollection,
    issues,
    ctx
  }) {
    if (!refValue || typeof refValue !== 'string') {
      return true;
    }
    const targetCollection = resolveCollectionName(ctx.model, refTarget);
    if (!targetCollection) {
      return true;
    }
    const idSet = idSetsByCollection[targetCollection];
    if (!idSet || !idSet.has(refValue)) {
      return pushIssue(
        issues,
        createIssue({
          code: 'REF_MISSING',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Missing reference: ${collectionName}/${recordId || '?'} ${fieldPath} -> ${refValue}`,
          expected: targetCollection,
          actual: refValue,
          meta: {
            refTargetCollection: targetCollection,
            refTargetType: refTarget,
            refValue
          }
        }),
        ctx
      );
    }
    return true;
  }

  function validateRefIntegrity(snapshot, model, ctx) {
    const issues = [];
    const idSetsByCollection = buildIdSets(snapshot, model);
    listCollections(model).forEach(collectionName => {
      const collectionDef = model.collections[collectionName];
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      const fields = collectionDef.fields || {};
      records.forEach(record => {
        const recordId = record && record.id;
        for (const [fieldName, fieldDef] of Object.entries(fields)) {
          if (fieldDef.ref) {
            const refValue = record[fieldName];
            if (!validateRefValue({
              collectionName,
              recordId,
              fieldPath: fieldName,
              refValue,
              refTarget: fieldDef.ref,
              idSetsByCollection,
              issues,
              ctx
            })) {
              return;
            }
          }
          if (fieldDef.type === 'array' && fieldDef.items && fieldDef.items.ref) {
            const values = Array.isArray(record[fieldName]) ? record[fieldName] : [];
            for (let i = 0; i < values.length; i += 1) {
              const refValue = values[i];
              if (!validateRefValue({
                collectionName,
                recordId,
                fieldPath: `${fieldName}[${i}]`,
                refValue,
                refTarget: fieldDef.items.ref,
                idSetsByCollection,
                issues,
                ctx
              })) {
                return;
              }
            }
          }
        }
      });
    });
    return issues;
  }

  const api = {
    validateRefIntegrity,
    resolveCollectionName
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.RefIntegrityValidator = api;
  }
})();
