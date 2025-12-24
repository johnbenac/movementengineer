(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  function getValidationTypes() {
    if (isNode()) {
      return require('./validationTypes');
    }
    return globalScope?.ValidationTypes || null;
  }

  const { Severity, Source } = getValidationTypes() || {
    Severity: { ERROR: 'error', WARNING: 'warning' },
    Source: { LEGACY: 'legacy', MODEL: 'model' }
  };

  function listCollectionsFromModel(model) {
    if (!model || typeof model !== 'object') return [];
    if (Array.isArray(model.collectionOrder)) return model.collectionOrder.slice();
    if (Array.isArray(model.collectionsOrder)) return model.collectionsOrder.slice();
    return Object.keys(model.collections || {}).sort();
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function appendIssue(issues, ctx, issue) {
    issues.push(issue);
    if (ctx?.maxIssues && issues.length >= ctx.maxIssues) {
      return true;
    }
    return false;
  }

  function createIssue({ code, collection, recordId, fieldPath, message, expected, actual, meta }) {
    return {
      source: Source.MODEL,
      severity: Severity.ERROR,
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

  function buildIdSets(snapshot, collections) {
    const idSets = {};
    collections.forEach(name => {
      const records = ensureArray(snapshot?.[name]);
      idSets[name] = new Set(records.map(record => record?.id).filter(Boolean));
    });
    return idSets;
  }

  function getRefTargets(fieldDef) {
    if (!fieldDef) return null;
    if (fieldDef.type === 'array' && fieldDef.items) {
      const ref = fieldDef.items.ref || (fieldDef.items.type === 'ref' ? fieldDef.items.ref : null);
      return ref ? { ref, isArray: true } : null;
    }
    const ref = fieldDef.ref || (fieldDef.type === 'ref' ? fieldDef.ref : null);
    return ref ? { ref, isArray: false } : null;
  }

  function validateRefIntegrity(snapshot, model, ctx = {}) {
    const issues = [];
    const collections = listCollectionsFromModel(model);
    const idSets = buildIdSets(snapshot, collections);

    collections.forEach(collectionName => {
      if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
      const collectionDef = model.collections?.[collectionName];
      const records = ensureArray(snapshot?.[collectionName]);
      if (!collectionDef?.fields) return;

      records.forEach(record => {
        if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
        const recordId = record?.id;
        Object.entries(collectionDef.fields).forEach(([fieldName, fieldDef]) => {
          if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
          const refInfo = getRefTargets(fieldDef);
          if (!refInfo) return;
          const targetCollection = refInfo.ref;
          const idSet = idSets[targetCollection] || new Set();
          const value = record?.[fieldName];

          if (refInfo.isArray) {
            ensureArray(value).forEach((item, index) => {
              if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
              if (!item) return;
              if (!idSet.has(item)) {
                appendIssue(
                  issues,
                  ctx,
                  createIssue({
                    code: 'REF_MISSING',
                    collection: collectionName,
                    recordId,
                    fieldPath: `${fieldName}[${index}]`,
                    message: `Missing reference: ${collectionName}/${recordId} ${fieldName} -> ${item}.`,
                    expected: targetCollection,
                    actual: item,
                    meta: {
                      refTargetCollection: targetCollection,
                      refValue: item
                    }
                  })
                );
              }
            });
            return;
          }

          if (!value) return;
          if (!idSet.has(value)) {
            appendIssue(
              issues,
              ctx,
              createIssue({
                code: 'REF_MISSING',
                collection: collectionName,
                recordId,
                fieldPath: fieldName,
                message: `Missing reference: ${collectionName}/${recordId} ${fieldName} -> ${value}.`,
                expected: targetCollection,
                actual: value,
                meta: {
                  refTargetCollection: targetCollection,
                  refValue: value
                }
              })
            );
          }
        });
      });
    });

    return issues;
  }

  const RefIntegrityValidator = { validateRefIntegrity };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefIntegrityValidator;
  }
  if (globalScope) {
    globalScope.RefIntegrityValidator = RefIntegrityValidator;
  }
})();
