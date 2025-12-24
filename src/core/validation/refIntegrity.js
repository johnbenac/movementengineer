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

  function buildIdSets(snapshot, model) {
    const idSets = {};
    listCollections(model).forEach(collectionName => {
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      idSets[collectionName] = new Set(records.map(record => record?.id).filter(Boolean));
    });
    return idSets;
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
    }
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    if (!snapshot || !model || !model.collections) return issues;
    const idSets = buildIdSets(snapshot, model);

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
    validateRefIntegrity
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.RefIntegrity = api;
  }
})();
